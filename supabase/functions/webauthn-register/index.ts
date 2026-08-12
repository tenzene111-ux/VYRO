import { createClient } from "npm:@supabase/supabase-js@2";
import { generateRegistrationOptions, verifyRegistrationResponse } from "npm:@simplewebauthn/server@13";
import type { AuthenticatorTransportFuture } from "npm:@simplewebauthn/server@13";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const DEFAULT_ALLOWED_ORIGINS = ["https://tenzene111-ux.github.io", "http://localhost:5173", "http://localhost:4173"];

function allowedOrigins(): string[] {
  const extra = Deno.env.get("WEBAUTHN_ALLOWED_ORIGINS");
  const fromEnv = extra ? extra.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...fromEnv])];
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const origin = req.headers.get("origin") ?? "";
    if (!allowedOrigins().includes(origin)) return json({ error: "This origin isn't allowed to register passkeys." }, 403);
    const rpID = new URL(origin).hostname;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();

    if (body.step === "options") {
      const { data: existing } = await admin.from("passkeys").select("credential_id, transports").eq("user_id", user.id);

      const options = await generateRegistrationOptions({
        rpName: "VYRO",
        rpID,
        userName: user.email ?? user.id,
        userID: new TextEncoder().encode(user.id),
        attestationType: "none",
        excludeCredentials: (existing ?? []).map((p) => ({
          id: p.credential_id,
          transports: (p.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
        })),
        authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
      });

      const { data: challengeRow, error: chErr } = await admin
        .from("webauthn_challenges")
        .insert({ user_id: user.id, challenge: options.challenge })
        .select("id")
        .single();
      if (chErr || !challengeRow) return json({ error: "Couldn't start registration." }, 500);

      return json({ options, challengeId: challengeRow.id });
    }

    if (body.step === "verify") {
      const { attestation, challengeId, name } = body;
      const { data: challengeRow } = await admin
        .from("webauthn_challenges")
        .select("id, challenge, created_at")
        .eq("id", challengeId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!challengeRow) return json({ error: "This registration attempt expired. Try again." }, 400);
      await admin.from("webauthn_challenges").delete().eq("id", challengeId);
      if (Date.now() - new Date(challengeRow.created_at).getTime() > 5 * 60 * 1000) {
        return json({ error: "This registration attempt expired. Try again." }, 400);
      }

      const verification = await verifyRegistrationResponse({
        response: attestation,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
      if (!verification.verified || !verification.registrationInfo) {
        return json({ error: "Couldn't verify this passkey." }, 400);
      }

      const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
      const { error: insertError } = await admin.from("passkeys").insert({
        user_id: user.id,
        credential_id: credential.id,
        public_key: toBase64(credential.publicKey),
        counter: credential.counter,
        device_type: credentialDeviceType,
        backed_up: credentialBackedUp,
        transports: credential.transports ?? [],
        name: name || "Passkey",
      });
      if (insertError) return json({ error: "Couldn't save this passkey." }, 500);

      return json({ ok: true });
    }

    return json({ error: "Unknown step" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
