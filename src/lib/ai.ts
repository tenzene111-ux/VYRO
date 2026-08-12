import { supabase } from "./supabase";

async function callAiAssist<T>(mode: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("ai-assist", { body: { mode, ...payload } });
  if (error) throw new Error(error.message ?? "AI Assist is unavailable.");
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export type ChatReplySuggestions = { suggestions: string[] };
export function suggestChatReplies(recentMessages: { fromMe: boolean; text: string }[]) {
  return callAiAssist<ChatReplySuggestions>("chat_reply", { recentMessages });
}

export type CaptionSuggestions = { captions: string[]; hashtags: string[] };
export function suggestCaptions(intent: string) {
  return callAiAssist<CaptionSuggestions>("caption", { intent });
}

export type VideoEditAction = { type: string };
export type VideoEditPlan = { explanation: string; actions: VideoEditAction[] };
export function planVideoEdit(
  instruction: string,
  context: { clipCount: number; durationSec: number; hasMusic: boolean; captionsEnabled: boolean }
) {
  return callAiAssist<VideoEditPlan>("video_edit", { instruction, context });
}

export type TranslateResult = { translated: string };
export function translateText(text: string, targetLang: string) {
  return callAiAssist<TranslateResult>("translate", { text, targetLang });
}

export const TRANSLATE_LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "hi", label: "Hindi" },
  { code: "ne", label: "Nepali" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ar", label: "Arabic" },
];
