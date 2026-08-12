import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const MODEL = "claude-haiku-4-5-20251001";

async function askClaude(apiKey: string, system: string, userPrompt: string, maxTokens = 512): Promise<string> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Anthropic API error (${resp.status}): ${errText.slice(0, 200)}`);
  }
  const data = await resp.json();
  const text = data.content?.[0]?.text;
  if (typeof text !== "string") throw new Error("Unexpected response from Anthropic API");
  return text;
}

function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
}

const JSON_ONLY = "Respond with ONLY a single valid JSON object. No markdown fences, no commentary, no extra text.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
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

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "AI Assist is not configured on the server yet" }, 500);

    const body = await req.json();
    const mode = body.mode as string;

    if (mode === "chat_reply") {
      const recentMessages = (body.recentMessages ?? []) as { fromMe: boolean; text: string }[];
      const transcript = recentMessages
        .slice(-8)
        .map((m) => `${m.fromMe ? "Me" : "Them"}: ${m.text}`)
        .join("\n");
      const text = await askClaude(
        apiKey,
        `You suggest short, natural chat reply options for a messaging app. Given the recent conversation, propose up to 3 short replies (each under 12 words) the user might want to send next, in a range of tones. ${JSON_ONLY} Shape: {"suggestions": string[]}`,
        transcript || "(no messages yet)"
      );
      return json(parseJson(text));
    }

    if (mode === "caption") {
      const intent = String(body.intent ?? "").slice(0, 300);
      const text = await askClaude(
        apiKey,
        `You write short, punchy social media captions for a short-form video app. Given a one-line description of a video, propose 3 distinct caption options (each under 100 characters, no hashtags in the caption itself) and up to 6 relevant hashtags (no # symbol, lowercase, no spaces). ${JSON_ONLY} Shape: {"captions": string[], "hashtags": string[]}`,
        intent || "A short video"
      );
      return json(parseJson(text));
    }

    if (mode === "video_edit") {
      const instruction = String(body.instruction ?? "").slice(0, 300);
      const context = body.context ?? {};
      const allowed = [
        "trim_silence",
        "auto_color",
        "auto_cover",
        "shorten_15",
        "cinematic_filter",
        "warm_filter",
        "cool_filter",
        "bw_filter",
        "vintage_filter",
        "enable_captions",
      ];
      const text = await askClaude(
        apiKey,
        `You are a video editing assistant for a short-video app. The editor can only perform these exact real actions: ${allowed.join(
          ", "
        )} (trim_silence cuts dead air from clips, auto_color balances exposure, auto_cover picks the best cover frame, shorten_15 trims the timeline to 15s, the *_filter actions apply a color grade to every clip, enable_captions turns on caption display). Given the user's instruction and the project context (${JSON.stringify(
          context
        )}), pick zero or more of the allowed actions that best satisfy the request, and write a one-sentence explanation of what you're doing in plain language. If the request can't be satisfied with these actions, return an empty actions array and explain why in plain language. ${JSON_ONLY} Shape: {"explanation": string, "actions": [{"type": string}]}`,
        instruction
      );
      const parsed = parseJson(text) as { explanation?: string; actions?: { type: string }[] };
      const actions = (parsed.actions ?? []).filter((a) => allowed.includes(a.type));
      return json({ explanation: parsed.explanation ?? "", actions });
    }

    if (mode === "translate") {
      const text = String(body.text ?? "").slice(0, 2000);
      const targetLang = String(body.targetLang ?? "en").slice(0, 10);
      const result = await askClaude(
        apiKey,
        `Translate the user's message into the language with code "${targetLang}". Preserve tone and meaning; keep it natural and casual if the original is casual. ${JSON_ONLY} Shape: {"translated": string}`,
        text
      );
      return json(parseJson(result));
    }

    return json({ error: "Unknown mode" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
