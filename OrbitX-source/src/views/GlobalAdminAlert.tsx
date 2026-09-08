import React, { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { playSound } from "../lib/sound";
import { useLanguage } from "../context/LanguageContext";

const SEEN_KEY = "orbitx_admin_alerts_seen_v2";

const hashText = (s: string): string => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return "h" + Math.abs(h);
};

type AlertIdentity = string;

const getSeen = (): Set<AlertIdentity> => {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
};

const markSeen = (id: AlertIdentity) => {
  try {
    const seen = getSeen();
    seen.add(id);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)));
  } catch {}
};

export default function GlobalAdminAlert() {
  const { isAr, t } = useLanguage();
  const [alert, setAlert] = useState<any | null>(null);
  const shownAlertsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Show each admin message ONCE per browser — remember across reloads in localStorage,
    // and dedupe within the current session too.
    const q = query(collection(db, "admin_alerts"), orderBy("createdAt", "desc"), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        const id = snap.docs[0].id;
        const contentKey = hashText(String(data.message || data.text || "").replace(/\s+/g, " ").trim() || id);
        const seenKey: AlertIdentity = contentKey;

        if (!shownAlertsRef.current.has(seenKey) && !getSeen().has(seenKey)) {
          shownAlertsRef.current.add(seenKey);
          markSeen(seenKey);
          setAlert({ id, ...data });
          try {
            playSound("notification"); // Fallback to whatever sound is available in sound.ts
          } catch(e) {}
          
          setTimeout(() => {
            setAlert((prev: any) => prev?.id === id ? null : prev);
          }, 15000); // Auto hide after 15 seconds
        }
      }
    }, (error) => {
      console.warn("Global alert error:", error.message);
    });

    return () => unsub();
  }, []);

  if (!alert) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-10 left-1/2 -translate-x-1/2 w-full max-w-lg z-[950] px-4"
        dir={isAr ? "rtl" : "ltr"}
      >
        <div className="bg-red-600/95 backdrop-blur-xl border-2 border-red-400 p-4 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.5)] flex items-start gap-4">
          <div className="p-3 bg-red-900/50 rounded-xl text-red-200 shrink-0 mt-1">
            <AlertTriangle size={24} className="animate-pulse" />
          </div>
          <div className="flex-1 text-right ltr:text-left">
            <h3 className="text-white font-black text-xl mb-1 flex items-center justify-between">
              {isAr ? "رسالة إدارية هامة" : "Important Admin Message"}
              <button 
                onClick={() => setAlert(null)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                title={isAr ? "إغلاق التنبيه" : "Close Alert"}
              >
                <X size={20} className="text-red-200" />
              </button>
            </h3>
            <p className="text-red-50 text-sm font-medium leading-relaxed">
              {alert.message}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
