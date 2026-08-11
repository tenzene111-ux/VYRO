// Supabase Edge Function: mints a LiveKit access token for a live session.
//
// The client never sees the LiveKit API secret — it only ever gets a short-lived,
// scoped token back from this function. Deploy with:
//   supabase functions deploy livekit-token
// and set these secrets in the Supabase dashboard (Edge Functions -> Secrets):
//   LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
// (SUPABASE_URL and SUPABASE_ANON_KEY are provided automatically.)

import { createClient } from "npm:@supabase/supabase-js@2";
import { AccessToken } from "npm:livekit-server-sdk@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { liveId } = await req.json();
    if (!liveId) return json({ error: "liveId is required" }, 400);

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

    const { data: live, error: liveError } = await supabase
      .from("live_sessions")
      .select("id, host_id, room_name, status")
      .eq("id", liveId)
      .single();
    if (liveError || !live) return json({ error: "Live session not found" }, 404);
    if (live.status === "deleted" || live.status === "ended") {
      return json({ error: "This live has ended" }, 409);
    }

    let role: "host" | "guest" | "viewer" = "viewer";
    let canPublish = false;

    if (live.host_id === user.id) {
      role = "host";
      canPublish = true;
    } else {
      const { data: guest } = await supabase
        .from("live_guests")
        .select("status")
        .eq("live_id", liveId)
        .eq("guest_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();
      if (guest) {
        role = "guest";
        canPublish = true;
      }
    }

    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const wsUrl = Deno.env.get("LIVEKIT_URL");
    if (!apiKey || !apiSecret || !wsUrl) {
      return json({ error: "Live streaming is not configured on the server yet" }, 500);
    }

    const at = new AccessToken(apiKey, apiSecret, { identity: user.id, name: user.id, ttl: "6h" });
    at.addGrant({
      room: live.room_name,
      roomJoin: true,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    return json({ token, url: wsUrl, role });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
