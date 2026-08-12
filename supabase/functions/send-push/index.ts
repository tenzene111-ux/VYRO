import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { targetUserId, title, body, url } = await req.json();
    if (!targetUserId || !title) return json({ error: "targetUserId and title are required" }, 400);

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

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!vapidPublic || !vapidPrivate) return json({ error: "Push isn't configured on the server yet" }, 500);
    webpush.setVapidDetails("mailto:support@vyro.app", vapidPublic, vapidPrivate);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", targetUserId);

    const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/" });

    const results = await Promise.allSettled(
      (subs ?? []).map((s) =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      )
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "rejected") {
        const statusCode = (r.reason as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", subs![i].id);
        }
      }
    }

    return json({ sent: results.filter((r) => r.status === "fulfilled").length });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
