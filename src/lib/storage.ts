import { supabase } from "./supabase";

export async function uploadImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  return uploadToMedia(userId, file, ext);
}

export async function uploadVideoBlob(userId: string, blob: Blob, ext = "webm"): Promise<string> {
  return uploadToMedia(userId, blob, ext);
}

export async function uploadAudioBlob(userId: string, blob: Blob, ext = "webm"): Promise<string> {
  return uploadToMedia(userId, blob, ext);
}

async function uploadToMedia(userId: string, file: Blob, ext: string): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadChatFile(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  return uploadToMedia(userId, file, ext);
}
