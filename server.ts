import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, getDoc, setDoc, getDocs, arrayRemove, deleteField, deleteDoc, collection, addDoc } from "firebase/firestore";
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import webpush from "web-push";

dotenv.config();

// Web Push (VAPID) configuration
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:orbitx@example.com";
if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  console.log("[SYSTEM] Web Push (VAPID) configured.");
} else {
  console.log("[SYSTEM] VAPID keys missing — Web Push disabled.");
}

// Initialize Supabase Admin client if credentials are provided
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey && supabaseServiceKey !== "your-service-role-key" && supabaseServiceKey !== ""
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (supabaseAdmin) {
  console.log("[SYSTEM] Supabase Admin active for backend database operations and token verification.");
} else {
  console.log("[SYSTEM] Supabase Admin is inactive. Defaulting backend to Firebase.");
}

// Initialize Firebase for server-side cleanups
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8")
);
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Admin globally once (needed for token verification)
try {
  if (getAdminApps().length === 0) {
    initializeAdminApp({
      projectId: firebaseConfig.projectId,
    });
  }
  console.log("[SYSTEM] Firebase Admin initialized globally on database:", firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.log("[SYSTEM] Firebase Admin already initialized. Reusing connection.", e);
}

// Simple in-memory rate limiter (per key, max hits inside a sliding window).
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimitKey(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

// Whether two users share an active/pending challenge (needed to allow
// challenge notifications to reach an opponent without opening a spam hole).
async function hasChallengeRelation(uidA: string, uidB: string): Promise<boolean> {
  if (!supabaseAdmin) return true; // legacy Firebase backend — kept permissive
  try {
    const { data, error } = await supabaseAdmin
      .from("documents")
      .select("data")
      .like("path", "challenges/%");
    if (error || !data) return false;
    return data.some((row: any) => {
      const d = row?.data || {};
      if (d.status !== "active" && d.status !== "pending") return false;
      const involved = [d.challengerId, d.challengedId];
      return involved.includes(uidA) && involved.includes(uidB);
    });
  } catch {
    return false;
  }
}

// Server-side database operation wrappers
async function compatGetDoc(docRef: any): Promise<any> {
  if (supabaseAdmin) {
    const docPath = typeof docRef === "string" ? docRef : docRef.path;
    const parts = docPath.split("/");
    const id = parts[parts.length - 1];
    try {
      const { data, error } = await supabaseAdmin.from("documents").select("data").eq("path", docPath).maybeSingle();
      if (error) throw error;
      return {
        exists: () => !!data,
        data: () => data?.data || null,
        id
      };
    } catch (err) {
      console.error("[Supabase Server compatGetDoc] failed:", err);
      return { exists: () => false, data: () => null, id };
    }
  }
  return await getDoc(docRef);
}

async function compatUpdateDoc(docRef: any, updates: any): Promise<void> {
  if (supabaseAdmin) {
    const docPath = typeof docRef === "string" ? docRef : docRef.path;
    const parts = docPath.split("/");
    const collectionName = parts[parts.length - 2];
    const id = parts[parts.length - 1];
    try {
      // Fetch current
      const { data: current, error: getErr } = await supabaseAdmin.from("documents").select("data").eq("path", docPath).maybeSingle();
      if (getErr) throw getErr;
      
      let mergedData = current?.data || {};
      for (const key in updates) {
        const val = updates[key];
        // Handle deleteField sentinel and arrayRemove mock
        if (val && typeof val === "object" && val._methodName === "FieldValue.delete") {
          delete mergedData[key];
        } else if (val && typeof val === "object" && val._methodName === "FieldValue.arrayRemove") {
          const arr = Array.isArray(mergedData[key]) ? mergedData[key] : [];
          const toRemove = val._elements || [];
          mergedData[key] = arr.filter((item: any) => !toRemove.includes(item));
        } else {
          mergedData[key] = val;
        }
      }

      const { error } = await supabaseAdmin.from("documents").upsert({
        path: docPath,
        collection: collectionName,
        id,
        data: mergedData,
        updated_at: new Date().toISOString()
      }, { onConflict: "path" });
      if (error) throw error;
      return;
    } catch (err) {
      console.error("[Supabase Server compatUpdateDoc] failed:", err);
      throw err;
    }
  }
  return await updateDoc(docRef, updates);
}

async function compatAddDoc(colRef: any, docData: any): Promise<any> {
  if (supabaseAdmin) {
    const colPath = typeof colRef === "string" ? colRef : colRef.path;
    const parts = colPath.split("/");
    const collectionName = parts[parts.length - 1];
    const randomId = "id_srv_" + Math.random().toString(36).substr(2, 9);
    const docPath = colPath + "/" + randomId;
    try {
      const { error } = await supabaseAdmin.from("documents").upsert({
        path: docPath,
        collection: collectionName,
        id: randomId,
        data: docData,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      return { id: randomId, path: docPath };
    } catch (err) {
      console.error("[Supabase Server compatAddDoc] failed:", err);
      throw err;
    }
  }
  return await addDoc(colRef, docData);
}

async function compatDeleteDoc(docRef: any): Promise<void> {
  if (supabaseAdmin) {
    const docPath = typeof docRef === "string" ? docRef : docRef.path;
    try {
      const { error } = await supabaseAdmin.from("documents").delete().eq("path", docPath);
      if (error) throw error;
      return;
    } catch (err) {
      console.error("[Supabase Server compatDeleteDoc] failed:", err);
      throw err;
    }
  }
  return await deleteDoc(docRef);
}

async function compatSetDoc(docRef: any, data: any): Promise<void> {
  if (supabaseAdmin) {
    const docPath = typeof docRef === "string" ? docRef : docRef.path;
    const parts = docPath.split("/");
    const collectionName = parts[parts.length - 2];
    const id = parts[parts.length - 1];
    const { error } = await supabaseAdmin.from("documents").upsert({
      path: docPath,
      collection: collectionName,
      id,
      data,
      updated_at: new Date().toISOString(),
    }, { onConflict: "path" });
    if (error) throw error;
    return;
  }
  await setDoc(docRef, data, { merge: true });
}

// Collect every web-push subscription stored under push_subscriptions/{uid}.
async function getAllPushSubscriptions(): Promise<Array<{ endpoint: string; keys: any }>> {
  const subs: Array<{ endpoint: string; keys: any }> = [];
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("documents")
      .select("data")
      .like("path", "push_subscriptions/%");
    if (error) throw error;
    (data || []).forEach((row: any) => {
      const list = Array.isArray(row?.data?.subscriptions) ? row.data.subscriptions : [];
      list.forEach((s: any) => {
        if (s?.endpoint && s?.keys) subs.push(s);
      });
    });
    return subs;
  }
  const snap = await getDocs(collection(db, "push_subscriptions"));
  snap.forEach((d: any) => {
    const list = Array.isArray(d.data()?.subscriptions) ? d.data().subscriptions : [];
    list.forEach((s: any) => {
      if (s?.endpoint && s?.keys) subs.push(s);
    });
  });
  return subs;
}

// ── Daily habit reminder (once per calendar day, at DAILY_REMINDER_HOUR UTC) ──
const DAILY_REMINDER_HOUR = Number(process.env.DAILY_REMINDER_HOUR || 15);
const dailyReminderPath = "system/daily_reminder";

async function sendDailyReminder(): Promise<{ sent: number; skipped: boolean }> {
  if (!vapidPublicKey || !vapidPrivateKey) return { sent: 0, skipped: true };
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  if (now.getUTCHours() < DAILY_REMINDER_HOUR) return { sent: 0, skipped: true };

  const snap = await compatGetDoc(dailyReminderPath as any);
  if (snap?.data?.()?.lastSentDate === today) return { sent: 0, skipped: true };

  const subscriptions = await getAllPushSubscriptions();
  const payload = JSON.stringify({
    title: "🚀 OrbitX — وقت الرحلة اليومية!",
    body: "زملاؤك عم يبدؤوا جلسات تركيز. افتح الموقع ولا تخسر سلسلتك 🔥",
    url: "/",
  });
  const results = await Promise.allSettled(
    subscriptions.map((sub) => webpush.sendNotification(sub, payload)),
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;

  await compatSetDoc(dailyReminderPath as any, {
    lastSentDate: today,
    sentAt: new Date().toISOString(),
    sent,
  });
  return { sent, skipped: false };
}


async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());

  // ── Security headers ──────────────────────────────────────────────
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), payment=(), accelerometer=(), gyroscope=(), magnetometer=()"
    );
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      res.setHeader(
        "Content-Security-Policy",
        [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: blob: https://api.dicebear.com https://images.unsplash.com https://www.transparenttextures.com https://grainy-gradients.vercel.app https://raw.githubusercontent.com https://unpkg.com https://*.googleusercontent.com",
          "media-src 'self' blob: https://*.mp3quran.net https://archive.org https://assets.mixkit.co",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
          "worker-src 'self' blob:",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
        ].join("; ")
      );
    }
    next();
  });

  // Helper to verify ID token and return user info
  async function verifyUserToken(req: express.Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.split("Bearer ")[1];

    if (supabaseAdmin) {
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && user) {
          return {
            uid: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || "رائد فضاء",
            picture: user.user_metadata?.avatar_url || "",
          };
        }
      } catch (err) {
        // Fall back to Firebase verification if token is a Firebase token
      }
    }

    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      return decodedToken;
    } catch (e) {
      console.error("[Auth] Error verifying user token:", e);
    }

    // Last resort: verify a Supabase JWT using the public anon key as the HS256 secret.
    // Works even when the service-role key is not configured (e.g. local/preview runs).
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
      if (header.alg !== "HS256") return null;
      const secret = process.env.VITE_SUPABASE_ANON_KEY || "";
      if (!secret) return null;
      const expected = crypto.createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest("base64url");
      if (expected !== parts[2]) return null;
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      if (payload.exp && Date.now() / 1000 > payload.exp) return null;
      if (!payload.sub) return null;
      return {
        uid: payload.sub,
        email: payload.email || null,
        name: payload.user_metadata?.full_name || payload.user_metadata?.name || "رائد فضاء",
        picture: payload.user_metadata?.avatar_url || "",
      };
    } catch (e) {
      return null;
    }
  }

  // Daily.co API Key
  const DAILY_API_KEY = process.env.DAILY_API_KEY;

  // API Route to leave a room immediately (used for keepalive beacon during tab close)
  app.post("/api/leave-room", async (req, res) => {
    const { userId, roomId, userName, token } = req.body;
    if (!userId || !roomId) {
      return res.status(400).json({ error: "Missing userId or roomId" });
    }

    // Beacons can't set Authorization headers, so the token travels in the body.
    if (token) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        req.headers.authorization = `Bearer ${token}`;
      }
    }
    const verified = await verifyUserToken(req);
    if (!verified || verified.uid !== userId) {
      return res.status(403).json({ error: "Unauthorized: can only leave on your own behalf" });
    }

    try {
      console.log(`[Server API] User ${userId} (${userName}) leaving room ${roomId}`);

      const doLeaveRoom = async () => {
        const roomRef = doc(db, "rooms", roomId);
        const roomSnap = await compatGetDoc(roomRef);

        if (roomSnap.exists()) {
          const rData = roomSnap.data();
          const participants = rData.participants || [];
          const rem = participants.filter((p: string) => p !== userId);

          const updates: any = {
            participants: arrayRemove(userId),
            emptyAt: rem.length === 0 ? new Date() : deleteField(),
          };

          const currentHostId = rData.hostId || rData.creatorId;
          if (currentHostId === userId && rem.length > 0) {
            updates.hostId = rem[0];
          }
          if (rem.length === 0) {
            updates.timerStatus = "idle";
          }

          await compatUpdateDoc(roomRef, updates);

          // Optional: add system message if there are other participants
          if (rem.length > 0) {
            const msgCol = collection(db, "rooms", roomId, "messages");
            await compatAddDoc(msgCol, {
              text: `🚀 غادر المحرك (${userName || userId}) المحطة (إغلاق التبويب/المتصفح).`,
              userId: "system",
              userName: "نظام التنبيه",
              userPhoto: "",
              timestamp: new Date(),
              type: "text",
            });
          }

          // Delete empty room after 5 minutes
          if (rem.length === 0) {
            setTimeout(async () => {
              try {
                const checkSnap = await compatGetDoc(roomRef);
                if (checkSnap.exists() && (!(checkSnap.data() as any).participants || (checkSnap.data() as any).participants.length === 0)) {
                  await compatDeleteDoc(roomRef);
                }
              } catch (e) {}
            }, 300000);
          }
        }

        // Also reset currentActivity for the user
        const userRef = doc(db, "users", userId);
        await compatUpdateDoc(userRef, {
          currentActivity: "في لوحة التحكم",
        });

        // Instantly delete typing indicator document on the server as well
        try {
          const typingRef = doc(db, "rooms", roomId, "typing", userId);
          await compatDeleteDoc(typingRef);
        } catch (e) {}
      };

      await Promise.race([
        doLeaveRoom(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000))
      ]);

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Server API] Error or Timeout leaving room:", error.message || error);
      res.status(500).json({ error: "Failed to process leave room" });
    }
  });

  // API Route to create a Daily.co room
  app.post("/api/create-daily-room", async (req, res) => {
    if (!DAILY_API_KEY) {
      console.error("DAILY_API_KEY is not set in environment variables.");
      return res.status(500).json({ error: "Daily.co API key is missing" });
    }

    try {
      const verified = await verifyUserToken(req);
      if (!verified) return res.status(401).json({ error: "Unauthorized" });
      if (!rateLimitKey(`daily:${verified.uid}`, 10, 60 * 60 * 1000)) {
        return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
      }

      const response = await axios.post(
        "https://api.daily.co/v1/rooms",
        {
          properties: {
            enable_chat: true,
            start_video_off: true,
            start_audio_off: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${DAILY_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      res.json({ url: response.data.url });
    } catch (error: any) {
      console.error("Error creating Daily.co room:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to create voice room" });
    }
  });

  // ── Web Push endpoints ─────────────────────────────────────────────
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const verified = await verifyUserToken(req);
      if (!verified) return res.status(401).json({ error: "Unauthorized" });
      const { uid, subscription } = req.body || {};
      if (verified.uid !== uid) return res.status(403).json({ error: "Can only subscribe your own uid" });
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ error: "subscription is required" });
      }
      const docPath = `push_subscriptions/${uid}`;
      const snap = await compatGetDoc(docPath as any);
      const existing: any[] = snap?.data?.()?.subscriptions || [];
      const filtered = existing.filter((s) => s.endpoint !== subscription.endpoint);
      filtered.push(subscription);
      await compatUpdateDoc(docPath as any, { subscriptions: filtered });
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Push] subscribe failed:", error.message || error);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const verified = await verifyUserToken(req);
      if (!verified) return res.status(401).json({ error: "Unauthorized" });
      const { uid, endpoint } = req.body || {};
      if (verified.uid !== uid) return res.status(403).json({ error: "Can only unsubscribe your own uid" });
      if (!endpoint) return res.status(400).json({ error: "endpoint is required" });
      const docPath = `push_subscriptions/${uid}`;
      const snap = await compatGetDoc(docPath as any);
      const existing: any[] = snap?.data?.()?.subscriptions || [];
      await compatUpdateDoc(docPath as any, {
        subscriptions: existing.filter((s) => s.endpoint !== endpoint),
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Push] unsubscribe failed:", error.message || error);
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  app.post("/api/push/send", async (req, res) => {
    if (!vapidPublicKey || !vapidPrivateKey) {
      return res.status(503).json({ error: "Web Push not configured" });
    }
    try {
      const verified = await verifyUserToken(req);
      if (!verified) return res.status(401).json({ error: "Unauthorized" });
      const { uid, title, body, url } = req.body || {};
      if (!uid || !title) return res.status(400).json({ error: "uid and title are required" });
      // Only allow notifying yourself or an active/pending challenge opponent,
      // so an authenticated user cannot spam arbitrary subscribers.
      if (uid !== verified.uid && !(await hasChallengeRelation(verified.uid, uid))) {
        return res.status(403).json({ error: "Can only notify yourself or a challenge opponent" });
      }
      if (!rateLimitKey(`push:${verified.uid}`, 20, 60 * 1000)) {
        return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
      }
      const docPath = `push_subscriptions/${uid}`;
      const snap = await compatGetDoc(docPath as any);
      const subscriptions: any[] = snap?.data?.()?.subscriptions || [];
      if (subscriptions.length === 0) return res.json({ success: true, sent: 0 });

      const payload = JSON.stringify({ title, body: body || "", url: url || "/OrbitX../" });
      const results = await Promise.allSettled(
        subscriptions.map((sub) =>
          webpush.sendNotification(sub, payload).catch(async (err: any) => {
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              await compatUpdateDoc(docPath as any, {
                subscriptions: subscriptions.filter((s) => s.endpoint !== sub.endpoint),
              });
            }
            throw err;
          })
        )
      );
      const sent = results.filter((r) => r.status === "fulfilled").length;
      res.json({ success: true, sent });
    } catch (error: any) {
      console.error("[Push] send failed:", error.message || error);
      res.status(500).json({ error: "Failed to send push" });
    }
  });

  // Daily habit reminder. Triggered by the in-server scheduler and/or a
  // GitHub Actions cron via ?secret= or the X-Cron-Secret header. Protected
  // so anonymous users cannot spam every subscriber.
  app.post("/api/push/daily-reminder", async (req, res) => {
    try {
      const secret = process.env.DAILY_REMINDER_SECRET;
      const provided =
        req.query?.secret ||
        req.headers["x-cron-secret"] ||
        req.body?.secret;
      if (secret && provided !== secret) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (!rateLimitKey("daily-reminder", 10, 60 * 60 * 1000)) {
        return res.status(429).json({ error: "Too many requests" });
      }
      const result = await sendDailyReminder();
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[Push] daily reminder failed:", error?.message || error);
      res.status(500).json({ error: "Failed to run daily reminder" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // ── Precompressed assets ─────────────────────────────────────────
    // JS/CSS are compressed once at build time (see precompress.mjs).
    // Streaming the prebuilt .br/.gz here costs nothing at runtime, unlike
    // on-the-fly brotli which pegged the single-core server on every request.
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (!req.path.startsWith("/assets/")) return next();
      const accept = req.headers["accept-encoding"] as string | undefined;
      if (!accept) return next();
      const filePath = path.join(distPath, req.path);
      let encodedPath: string | null = null;
      let encoding: "br" | "gzip" | null = null;
      if (accept.includes("br")) {
        const candidate = filePath + ".br";
        if (fs.existsSync(candidate)) {
          encodedPath = candidate;
          encoding = "br";
        }
      }
      if (!encodedPath && accept.includes("gzip")) {
        const candidate = filePath + ".gz";
        if (fs.existsSync(candidate)) {
          encodedPath = candidate;
          encoding = "gzip";
        }
      }
      if (!encodedPath) return next();
      res.setHeader("Content-Encoding", encoding);
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.type(path.extname(req.path));
      if (req.method === "HEAD") {
        return res.end();
      }
      fs.createReadStream(encodedPath).pipe(res);
    });
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.includes(path.sep + "assets" + path.sep)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      })
    );
    // Missing file-like paths (e.g. a stale hashed chunk after a redeploy)
    // must 404 instead of receiving index.html with the wrong MIME type.
    app.get(/\.[a-z0-9]{1,10}$/i, (req, res) => {
      res.status(404).type("text/plain").send("Not found");
    });
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Self-scheduler for the daily reminder (best-effort; fires even if the
  // GitHub Actions cron is not configured). Idempotent thanks to the
  // system/daily_reminder lastSentDate guard.
  setTimeout(() => sendDailyReminder().catch(() => {}), 60 * 1000);
  setInterval(() => sendDailyReminder().catch(() => {}), 30 * 60 * 1000);
}

startServer();
