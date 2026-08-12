import { startRegistration, startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { supabase } from "./supabase";

export function isPasskeySupported(): boolean {
  return browserSupportsWebAuthn();
}

export type Passkey = {
  id: string;
  name: string | null;
  device_type: string | null;
  created_at: string;
  last_used_at: string | null;
};

export async function listMyPasskeys(userId: string): Promise<Passkey[]> {
  const { data, error } = await supabase
    .from("passkeys")
    .select("id, name, device_type, created_at, last_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function deletePasskey(id: string) {
  const { error } = await supabase.from("passkeys").delete().eq("id", id);
  if (error) throw error;
}

function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "NotAllowedError") return "Cancelled or timed out.";
    if (err.name === "InvalidStateError") return "This device is already registered.";
    return err.message;
  }
  return "Something went wrong.";
}

export async function registerPasskey(name?: string): Promise<void> {
  const { data: optionsData, error: e1 } = await supabase.functions.invoke("webauthn-register", { body: { step: "options" } });
  if (e1) throw new Error(e1.message ?? "Couldn't start registration.");
  if (optionsData?.error) throw new Error(optionsData.error);

  let attestation;
  try {
    attestation = await startRegistration({ optionsJSON: optionsData.options });
  } catch (err) {
    throw new Error(friendlyError(err));
  }

  const { data: verifyData, error: e2 } = await supabase.functions.invoke("webauthn-register", {
    body: { step: "verify", attestation, challengeId: optionsData.challengeId, name },
  });
  if (e2) throw new Error(e2.message ?? "Couldn't verify this passkey.");
  if (verifyData?.error) throw new Error(verifyData.error);
}

export async function loginWithPasskey(): Promise<void> {
  const { data: optionsData, error: e1 } = await supabase.functions.invoke("webauthn-login", { body: { step: "options" } });
  if (e1) throw new Error(e1.message ?? "Couldn't start sign-in.");
  if (optionsData?.error) throw new Error(optionsData.error);

  let assertion;
  try {
    assertion = await startAuthentication({ optionsJSON: optionsData.options });
  } catch (err) {
    throw new Error(friendlyError(err));
  }

  const { data: verifyData, error: e2 } = await supabase.functions.invoke("webauthn-login", {
    body: { step: "verify", assertion, challengeId: optionsData.challengeId },
  });
  if (e2) throw new Error(e2.message ?? "Couldn't verify this passkey.");
  if (verifyData?.error) throw new Error(verifyData.error);

  const { email, hashedToken } = verifyData as { email: string; hashedToken: string };
  const { error: otpError } = await supabase.auth.verifyOtp({ email, token: hashedToken, type: "magiclink" });
  if (otpError) throw otpError;
}
