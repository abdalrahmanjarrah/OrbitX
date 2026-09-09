const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
import { authClient } from "../supabaseAuth";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function getAccessToken(): Promise<string> {
  try {
    const { data } = await authClient.getSession();
    return data.session?.access_token || "";
  } catch {
    return "";
  }
}

async function post(path: string, body: unknown): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!VAPID_PUBLIC_KEY;
}

export async function ensurePushSubscription(uid: string): Promise<boolean> {
  if (!isPushSupported() || !uid) return false;
  try {
    if (Notification.permission === "denied") return false;
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;
    }
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const json = subscription.toJSON() as { keys?: { p256dh?: string; auth?: string } };
    return await post("/api/push/subscribe", {
      uid,
      subscription: {
        endpoint: subscription.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      },
    });
  } catch {
    return false;
  }
}

export async function unsubscribePush(uid: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await post("/api/push/unsubscribe", { uid, endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }
  } catch {
    /* noop */
  }
}

export async function sendPushToUser(uid: string, title: string, body?: string, url?: string): Promise<boolean> {
  if (!uid) return false;
  return post("/api/push/send", { uid, title, body: body || "", url: url || import.meta.env.BASE_URL });
}
