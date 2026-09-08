var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_axios = __toESM(require("axios"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var import_app2 = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_web_push = __toESM(require("web-push"), 1);
var import_supabase_js = require("@supabase/supabase-js");
import_dotenv.default.config();
var vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
var vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
var vapidSubject = process.env.VAPID_SUBJECT || "mailto:orbitx@example.com";
if (vapidPublicKey && vapidPrivateKey) {
  import_web_push.default.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  console.log("[SYSTEM] Web Push (VAPID) configured.");
} else {
  console.log("[SYSTEM] VAPID keys missing \u2014 Web Push disabled.");
}
var supabaseUrl = process.env.VITE_SUPABASE_URL;
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
var supabaseAdmin = supabaseUrl && supabaseServiceKey && supabaseServiceKey !== "your-service-role-key" && supabaseServiceKey !== "" ? (0, import_supabase_js.createClient)(supabaseUrl, supabaseServiceKey) : null;
if (supabaseAdmin) {
  console.log("[SYSTEM] Supabase Admin active for backend database operations and token verification.");
} else {
  console.log("[SYSTEM] Supabase Admin is inactive. Defaulting backend to Firebase.");
}
var firebaseConfig = JSON.parse(
  import_fs.default.readFileSync(import_path.default.join(process.cwd(), "firebase-applet-config.json"), "utf8")
);
var firebaseApp = (0, import_app.initializeApp)(firebaseConfig);
var db = (0, import_firestore.getFirestore)(firebaseApp, firebaseConfig.firestoreDatabaseId);
try {
  if ((0, import_app2.getApps)().length === 0) {
    (0, import_app2.initializeApp)({
      projectId: firebaseConfig.projectId
    });
  }
  console.log("[SYSTEM] Firebase Admin initialized globally on database:", firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.log("[SYSTEM] Firebase Admin already initialized. Reusing connection.", e);
}
var rateBuckets = /* @__PURE__ */ new Map();
function rateLimitKey(key, max, windowMs) {
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
async function hasChallengeRelation(uidA, uidB) {
  if (!supabaseAdmin) return true;
  try {
    const { data, error } = await supabaseAdmin.from("documents").select("data").like("path", "challenges/%");
    if (error || !data) return false;
    return data.some((row) => {
      const d = row?.data || {};
      if (d.status !== "active" && d.status !== "pending") return false;
      const involved = [d.challengerId, d.challengedId];
      return involved.includes(uidA) && involved.includes(uidB);
    });
  } catch {
    return false;
  }
}
async function compatGetDoc(docRef) {
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
  return await (0, import_firestore.getDoc)(docRef);
}
async function compatUpdateDoc(docRef, updates) {
  if (supabaseAdmin) {
    const docPath = typeof docRef === "string" ? docRef : docRef.path;
    const parts = docPath.split("/");
    const collectionName = parts[parts.length - 2];
    const id = parts[parts.length - 1];
    try {
      const { data: current, error: getErr } = await supabaseAdmin.from("documents").select("data").eq("path", docPath).maybeSingle();
      if (getErr) throw getErr;
      let mergedData = current?.data || {};
      for (const key in updates) {
        const val = updates[key];
        if (val && typeof val === "object" && val._methodName === "FieldValue.delete") {
          delete mergedData[key];
        } else if (val && typeof val === "object" && val._methodName === "FieldValue.arrayRemove") {
          const arr = Array.isArray(mergedData[key]) ? mergedData[key] : [];
          const toRemove = val._elements || [];
          mergedData[key] = arr.filter((item) => !toRemove.includes(item));
        } else {
          mergedData[key] = val;
        }
      }
      const { error } = await supabaseAdmin.from("documents").upsert({
        path: docPath,
        collection: collectionName,
        id,
        data: mergedData,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }, { onConflict: "path" });
      if (error) throw error;
      return;
    } catch (err) {
      console.error("[Supabase Server compatUpdateDoc] failed:", err);
      throw err;
    }
  }
  return await (0, import_firestore.updateDoc)(docRef, updates);
}
async function compatAddDoc(colRef, docData) {
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
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (error) throw error;
      return { id: randomId, path: docPath };
    } catch (err) {
      console.error("[Supabase Server compatAddDoc] failed:", err);
      throw err;
    }
  }
  return await (0, import_firestore.addDoc)(colRef, docData);
}
async function compatDeleteDoc(docRef) {
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
  return await (0, import_firestore.deleteDoc)(docRef);
}
async function compatSetDoc(docRef, data) {
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
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }, { onConflict: "path" });
    if (error) throw error;
    return;
  }
  await (0, import_firestore.setDoc)(docRef, data, { merge: true });
}
async function getAllPushSubscriptions() {
  const subs = [];
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from("documents").select("data").like("path", "push_subscriptions/%");
    if (error) throw error;
    (data || []).forEach((row) => {
      const list = Array.isArray(row?.data?.subscriptions) ? row.data.subscriptions : [];
      list.forEach((s) => {
        if (s?.endpoint && s?.keys) subs.push(s);
      });
    });
    return subs;
  }
  const snap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(db, "push_subscriptions"));
  snap.forEach((d) => {
    const list = Array.isArray(d.data()?.subscriptions) ? d.data().subscriptions : [];
    list.forEach((s) => {
      if (s?.endpoint && s?.keys) subs.push(s);
    });
  });
  return subs;
}
var DAILY_REMINDER_HOUR = Number(process.env.DAILY_REMINDER_HOUR || 15);
var dailyReminderPath = "system/daily_reminder";
async function sendDailyReminder() {
  if (!vapidPublicKey || !vapidPrivateKey) return { sent: 0, skipped: true };
  const now = /* @__PURE__ */ new Date();
  const today = now.toISOString().split("T")[0];
  if (now.getUTCHours() < DAILY_REMINDER_HOUR) return { sent: 0, skipped: true };
  const snap = await compatGetDoc(dailyReminderPath);
  if (snap?.data?.()?.lastSentDate === today) return { sent: 0, skipped: true };
  const subscriptions = await getAllPushSubscriptions();
  const payload = JSON.stringify({
    title: "\u{1F680} OrbitX \u2014 \u0648\u0642\u062A \u0627\u0644\u0631\u062D\u0644\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629!",
    body: "\u0632\u0645\u0644\u0627\u0624\u0643 \u0639\u0645 \u064A\u0628\u062F\u0624\u0648\u0627 \u062C\u0644\u0633\u0627\u062A \u062A\u0631\u0643\u064A\u0632. \u0627\u0641\u062A\u062D \u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u0644\u0627 \u062A\u062E\u0633\u0631 \u0633\u0644\u0633\u0644\u062A\u0643 \u{1F525}",
    url: "/"
  });
  const results = await Promise.allSettled(
    subscriptions.map((sub) => import_web_push.default.sendNotification(sub, payload))
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;
  await compatSetDoc(dailyReminderPath, {
    lastSentDate: today,
    sentAt: (/* @__PURE__ */ new Date()).toISOString(),
    sent
  });
  return { sent, skipped: false };
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express.default.json());
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
          "frame-ancestors 'none'"
        ].join("; ")
      );
    }
    next();
  });
  async function verifyUserToken(req) {
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
            name: user.user_metadata?.full_name || user.user_metadata?.name || "\u0631\u0627\u0626\u062F \u0641\u0636\u0627\u0621",
            picture: user.user_metadata?.avatar_url || ""
          };
        }
      } catch (err) {
      }
    }
    try {
      const decodedToken = await (0, import_auth.getAuth)().verifyIdToken(token);
      return decodedToken;
    } catch (e) {
      console.error("[Auth] Error verifying user token:", e);
    }
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
      if (header.alg !== "HS256") return null;
      const secret = process.env.VITE_SUPABASE_ANON_KEY || "";
      if (!secret) return null;
      const expected = import_crypto.default.createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest("base64url");
      if (expected !== parts[2]) return null;
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      if (payload.exp && Date.now() / 1e3 > payload.exp) return null;
      if (!payload.sub) return null;
      return {
        uid: payload.sub,
        email: payload.email || null,
        name: payload.user_metadata?.full_name || payload.user_metadata?.name || "\u0631\u0627\u0626\u062F \u0641\u0636\u0627\u0621",
        picture: payload.user_metadata?.avatar_url || ""
      };
    } catch (e) {
      return null;
    }
  }
  const DAILY_API_KEY = process.env.DAILY_API_KEY;
  app.post("/api/leave-room", async (req, res) => {
    const { userId, roomId, userName, token } = req.body;
    if (!userId || !roomId) {
      return res.status(400).json({ error: "Missing userId or roomId" });
    }
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
        const roomRef = (0, import_firestore.doc)(db, "rooms", roomId);
        const roomSnap = await compatGetDoc(roomRef);
        if (roomSnap.exists()) {
          const rData = roomSnap.data();
          const participants = rData.participants || [];
          const rem = participants.filter((p) => p !== userId);
          const updates = {
            participants: (0, import_firestore.arrayRemove)(userId),
            emptyAt: rem.length === 0 ? /* @__PURE__ */ new Date() : (0, import_firestore.deleteField)()
          };
          const currentHostId = rData.hostId || rData.creatorId;
          if (currentHostId === userId && rem.length > 0) {
            updates.hostId = rem[0];
          }
          if (rem.length === 0) {
            updates.timerStatus = "idle";
          }
          await compatUpdateDoc(roomRef, updates);
          if (rem.length > 0) {
            const msgCol = (0, import_firestore.collection)(db, "rooms", roomId, "messages");
            await compatAddDoc(msgCol, {
              text: `\u{1F680} \u063A\u0627\u062F\u0631 \u0627\u0644\u0645\u062D\u0631\u0643 (${userName || userId}) \u0627\u0644\u0645\u062D\u0637\u0629 (\u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062A\u0628\u0648\u064A\u0628/\u0627\u0644\u0645\u062A\u0635\u0641\u062D).`,
              userId: "system",
              userName: "\u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0646\u0628\u064A\u0647",
              userPhoto: "",
              timestamp: /* @__PURE__ */ new Date(),
              type: "text"
            });
          }
          if (rem.length === 0) {
            setTimeout(async () => {
              try {
                const checkSnap = await compatGetDoc(roomRef);
                if (checkSnap.exists() && (!checkSnap.data().participants || checkSnap.data().participants.length === 0)) {
                  await compatDeleteDoc(roomRef);
                }
              } catch (e) {
              }
            }, 3e5);
          }
        }
        const userRef = (0, import_firestore.doc)(db, "users", userId);
        await compatUpdateDoc(userRef, {
          currentActivity: "\u0641\u064A \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645"
        });
        try {
          const typingRef = (0, import_firestore.doc)(db, "rooms", roomId, "typing", userId);
          await compatDeleteDoc(typingRef);
        } catch (e) {
        }
      };
      await Promise.race([
        doLeaveRoom(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5e3))
      ]);
      res.json({ success: true });
    } catch (error) {
      console.error("[Server API] Error or Timeout leaving room:", error.message || error);
      res.status(500).json({ error: "Failed to process leave room" });
    }
  });
  app.post("/api/create-daily-room", async (req, res) => {
    if (!DAILY_API_KEY) {
      console.error("DAILY_API_KEY is not set in environment variables.");
      return res.status(500).json({ error: "Daily.co API key is missing" });
    }
    try {
      const verified = await verifyUserToken(req);
      if (!verified) return res.status(401).json({ error: "Unauthorized" });
      if (!rateLimitKey(`daily:${verified.uid}`, 10, 60 * 60 * 1e3)) {
        return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
      }
      const response = await import_axios.default.post(
        "https://api.daily.co/v1/rooms",
        {
          properties: {
            enable_chat: true,
            start_video_off: true,
            start_audio_off: false
          }
        },
        {
          headers: {
            Authorization: `Bearer ${DAILY_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
      res.json({ url: response.data.url });
    } catch (error) {
      console.error("Error creating Daily.co room:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to create voice room" });
    }
  });
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
      const snap = await compatGetDoc(docPath);
      const existing = snap?.data?.()?.subscriptions || [];
      const filtered = existing.filter((s) => s.endpoint !== subscription.endpoint);
      filtered.push(subscription);
      await compatUpdateDoc(docPath, { subscriptions: filtered });
      res.json({ success: true });
    } catch (error) {
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
      const snap = await compatGetDoc(docPath);
      const existing = snap?.data?.()?.subscriptions || [];
      await compatUpdateDoc(docPath, {
        subscriptions: existing.filter((s) => s.endpoint !== endpoint)
      });
      res.json({ success: true });
    } catch (error) {
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
      if (uid !== verified.uid && !await hasChallengeRelation(verified.uid, uid)) {
        return res.status(403).json({ error: "Can only notify yourself or a challenge opponent" });
      }
      if (!rateLimitKey(`push:${verified.uid}`, 20, 60 * 1e3)) {
        return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
      }
      const docPath = `push_subscriptions/${uid}`;
      const snap = await compatGetDoc(docPath);
      const subscriptions = snap?.data?.()?.subscriptions || [];
      if (subscriptions.length === 0) return res.json({ success: true, sent: 0 });
      const payload = JSON.stringify({ title, body: body || "", url: url || "/OrbitX../" });
      const results = await Promise.allSettled(
        subscriptions.map(
          (sub) => import_web_push.default.sendNotification(sub, payload).catch(async (err) => {
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              await compatUpdateDoc(docPath, {
                subscriptions: subscriptions.filter((s) => s.endpoint !== sub.endpoint)
              });
            }
            throw err;
          })
        )
      );
      const sent = results.filter((r) => r.status === "fulfilled").length;
      res.json({ success: true, sent });
    } catch (error) {
      console.error("[Push] send failed:", error.message || error);
      res.status(500).json({ error: "Failed to send push" });
    }
  });
  app.post("/api/push/daily-reminder", async (req, res) => {
    try {
      const secret = process.env.DAILY_REMINDER_SECRET;
      const provided = req.query?.secret || req.headers["x-cron-secret"] || req.body?.secret;
      if (secret && provided !== secret) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (!rateLimitKey("daily-reminder", 10, 60 * 60 * 1e3)) {
        return res.status(429).json({ error: "Too many requests" });
      }
      const result = await sendDailyReminder();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[Push] daily reminder failed:", error?.message || error);
      res.status(500).json({ error: "Failed to run daily reminder" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (!req.path.startsWith("/assets/")) return next();
      const accept = req.headers["accept-encoding"];
      if (!accept) return next();
      const filePath = import_path.default.join(distPath, req.path);
      let encodedPath = null;
      let encoding = null;
      if (accept.includes("br")) {
        const candidate = filePath + ".br";
        if (import_fs.default.existsSync(candidate)) {
          encodedPath = candidate;
          encoding = "br";
        }
      }
      if (!encodedPath && accept.includes("gzip")) {
        const candidate = filePath + ".gz";
        if (import_fs.default.existsSync(candidate)) {
          encodedPath = candidate;
          encoding = "gzip";
        }
      }
      if (!encodedPath) return next();
      res.setHeader("Content-Encoding", encoding);
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.type(import_path.default.extname(req.path));
      if (req.method === "HEAD") {
        return res.end();
      }
      import_fs.default.createReadStream(encodedPath).pipe(res);
    });
    app.use(
      import_express.default.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.includes(import_path.default.sep + "assets" + import_path.default.sep)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        }
      })
    );
    app.get(/\.[a-z0-9]{1,10}$/i, (req, res) => {
      res.status(404).type("text/plain").send("Not found");
    });
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  setTimeout(() => sendDailyReminder().catch(() => {
  }), 60 * 1e3);
  setInterval(() => sendDailyReminder().catch(() => {
  }), 30 * 60 * 1e3);
}
startServer();
//# sourceMappingURL=server.cjs.map
