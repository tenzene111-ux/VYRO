import { createClient } from "npm:@supabase/supabase-js@2";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "npm:@simplewebauthn/server@13";

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

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const origin = req.headers.get("origin") ?? "";
    if (!allowedOrigins().includes(origin)) return json({ error: "This origin isn't allowed to sign in with a passkey." }, 403);
    const rpID = new URL(origin).hostname;

    // No user session exists yet — this endpoint is how a session gets created.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();

    if (body.step === "options") {
      const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred", allowCredentials: [] });
      const { data: challengeRow, error } = await admin
        .from("webauthn_challenges")
        .insert({ challenge: options.challenge })
        .select("id")
        .single();
      if (error || !challengeRow) return json({ error: "Couldn't start sign-in." }, 500);
      return json({ options, challengeId: challengeRow.id });
    }

    if (body.step === "verify") {
      const { assertion, challengeId } = body;
      const { data: challengeRow } = await admin
        .from("webauthn_challenges")
        .select("id, challenge, created_at")
        .eq("id", challengeId)
        .is("user_id", null)
        .maybeSingle();
      if (!challengeRow) return json({ error: "This sign-in attempt expired. Try again." }, 400);
      await admin.from("webauthn_challenges").delete().eq("id", challengeId);
      if (Date.now() - new Date(challengeRow.created_at).getTime() > 5 * 60 * 1000) {
        return json({ error: "This sign-in attempt expired. Try again." }, 400);
      }

      const credentialId = assertion?.id;
      if (!credentialId) return json({ error: "Malformed passkey response." }, 400);

      const { data: passkey } = await admin.from("passkeys").select("*").eq("credential_id", credentialId).maybeSingle();
      if (!passkey) return json({ error: "This passkey isn't registered with VYRO on this device." }, 400);

      const verification = await verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkey.credential_id,
          publicKey: fromBase64(passkey.public_key),
          counter: Number(passkey.counter),
          transports: passkey.transports ?? undefined,
        },
      });
      if (!verification.verified) return json({ error: "Couldn't verify this passkey." }, 400);

      await admin
        .from("passkeys")
        .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
        .eq("id", passkey.id);

      const { data: userRow, error: userErr } = await admin.auth.admin.getUserById(passkey.user_id);
      if (userErr || !userRow.user?.email) return json({ error: "Couldn't sign you in." }, 500);

      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: userRow.user.email,
      });
      if (linkErr || !linkData) return json({ error: "Couldn't sign you in." }, 500);

      return json({ email: userRow.user.email, hashedToken: linkData.properties.hashed_token });
    }

    return json({ error: "Unknown step" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
