// Real end-to-end encryption for 1:1 DMs, using the browser's native Web Crypto API.
//
// Each device generates its own ECDH (P-256) key pair. The private key is created
// non-extractable and never leaves this browser's IndexedDB — it is never exported,
// never sent to any server. Only the public key is uploaded (to profiles.public_key_jwk),
// which is safe by design: a public key has no confidentiality requirement.
//
// Honest limitation: this is static ECDH, not a full Double Ratchet (Signal-style)
// protocol. There's no forward secrecy — if a private key is ever extracted from a
// device, every message in that conversation (past and future) could be decrypted
// with it. What this DOES guarantee: the server/database never sees plaintext, and
// nobody without one of the two devices' private keys can read the messages.
//
// Also: keys are per-device. Logging in on a new browser/device generates a new key
// pair, and messages encrypted for the old key can't be decrypted there.

const DB_NAME = "vyro-keys";
const STORE = "keys";
const KEY_ID = "me";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let cachedKeyPair: CryptoKeyPair | null = null;

async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]) as Promise<CryptoKeyPair>;
}

/** Loads this device's keypair from IndexedDB, generating one on first use. Returns the public key JWK to publish. */
export async function ensureKeyPair(): Promise<{ keyPair: CryptoKeyPair; publicJwk: JsonWebKey; isNew: boolean }> {
  if (cachedKeyPair) {
    const publicJwk = await crypto.subtle.exportKey("jwk", cachedKeyPair.publicKey);
    return { keyPair: cachedKeyPair, publicJwk, isNew: false };
  }
  const stored = await idbGet<CryptoKeyPair>(KEY_ID);
  if (stored) {
    cachedKeyPair = stored;
    const publicJwk = await crypto.subtle.exportKey("jwk", stored.publicKey);
    return { keyPair: stored, publicJwk, isNew: false };
  }
  const keyPair = await generateKeyPair();
  await idbSet(KEY_ID, keyPair);
  cachedKeyPair = keyPair;
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return { keyPair, publicJwk, isNew: true };
}

export async function deriveSharedKey(myPrivateKey: CryptoKey, theirPublicJwk: JsonWebKey): Promise<CryptoKey> {
  const theirPublicKey = await crypto.subtle.importKey(
    "jwk",
    theirPublicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPublicKey },
    myPrivateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function base64ToBuf(b64: string): ArrayBuffer {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
}

export async function encryptText(sharedKey: CryptoKey, plaintext: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, sharedKey, data);
  return { ciphertext: bufToBase64(encrypted), iv: bufToBase64(iv.buffer) };
}

export async function decryptText(sharedKey: CryptoKey, ciphertextB64: string, ivB64: string): Promise<string> {
  const encrypted = base64ToBuf(ciphertextB64);
  const iv = base64ToBuf(ivB64);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, sharedKey, encrypted);
  return new TextDecoder().decode(decrypted);
}
