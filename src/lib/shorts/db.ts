import type { ShortProject } from "./types";

const DB_NAME = "vyro-shorts";
const DB_VERSION = 1;
const PROJECTS_STORE = "projects";
const BLOBS_STORE = "blobs";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(BLOBS_STORE)) {
        db.createObjectStore(BLOBS_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProject(project: ShortProject): Promise<void> {
  await tx(PROJECTS_STORE, "readwrite", (store) => store.put(project));
}

export async function loadProject(id: string): Promise<ShortProject | undefined> {
  return tx(PROJECTS_STORE, "readonly", (store) => store.get(id));
}

export async function listProjects(): Promise<ShortProject[]> {
  const all = await tx<ShortProject[]>(PROJECTS_STORE, "readonly", (store) => store.getAll());
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProject(id: string): Promise<void> {
  const project = await loadProject(id);
  if (project) {
    const keys = [
      ...project.clips.map((c) => c.blobKey),
      ...project.audioTracks.map((a) => a.blobKey),
      ...(project.coverBlobKey ? [project.coverBlobKey] : []),
    ];
    await Promise.all(keys.map((k) => deleteBlob(k)));
  }
  await tx(PROJECTS_STORE, "readwrite", (store) => store.delete(id));
}

export async function putBlob(blob: Blob): Promise<string> {
  const key = crypto.randomUUID();
  await tx(BLOBS_STORE, "readwrite", (store) => store.put(blob, key));
  return key;
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  return tx(BLOBS_STORE, "readonly", (store) => store.get(key));
}

export async function deleteBlob(key: string): Promise<void> {
  await tx(BLOBS_STORE, "readwrite", (store) => store.delete(key));
}

export async function estimateStorage(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage, quota } = await navigator.storage.estimate();
  return { usage: usage ?? 0, quota: quota ?? 0 };
}
