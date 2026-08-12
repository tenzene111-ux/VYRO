import { supabase } from "./supabase";

// Public VAPID key — safe to embed client-side by design (it has no confidentiality
// requirement; only the matching private key, held server-side, can sign push messages).
const VAPID_PUBLIC_KEY = "BH_YIHUc2Ts-bPeNivlXUhE_EEdnWsPELGXajlt8KlvaGapvQ1TK4J3U2W29TRb3poyilqNQ9ckj3G1YvEWd8Pc";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  if (swRegistration) return swRegistration;
  swRegistration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  return swRegistration;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  const reg = await registerServiceWorker();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function enablePush(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: "Push notifications aren't supported in this browser." };
  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, error: "Couldn't register the service worker." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Notification permission was not granted." };

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: "Subscription is missing required keys." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function disablePush(): Promise<void> {
  const sub = await getExistingSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function sendPushNotification(targetUserId: string, title: string, body: string, url?: string) {
  await supabase.functions.invoke("send-push", { body: { targetUserId, title, body, url } }).catch(() => {});
}
