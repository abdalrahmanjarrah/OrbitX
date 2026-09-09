import React, { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Sparkles, Terminal, Rocket, Check, X, Bell } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { playSound } from "../lib/sound";
import { cn } from "../lib/utils";

export default function GlobalAppUpdates() {
  const [update, setUpdate] = useState<any | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const shownUpdatesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Perform a highly optimized, one-time fetch of the latest update to save Firestore reads
    const fetchLatestUpdate = async () => {
      try {
        const q = query(collection(db, "app_updates"), orderBy("timestamp", "desc"), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const data = docSnap.data();
          const id = docSnap.id;
          
          // Ensure the user hasn't already dismissed this specific update in localStorage
          const dismissedKey = `dismissed_update_${id}`;
          const isDismissed = localStorage.getItem(dismissedKey) === "true";

          if (!isDismissed) {
            setUpdate({ id, ...data });
            setIsOpen(true);
            
            // Play update system alert sound
            try {
              playSound("notification");
            } catch (e) {}
          }
        }
      } catch (error: any) {
        console.warn("Global app updates fetch error:", error.message);
      }
    };

    fetchLatestUpdate();
  }, []);

  const handleDismiss = () => {
    if (update?.id) {
      const dismissedKey = `dismissed_update_${update.id}`;
      localStorage.setItem(dismissedKey, "true");
    }
    setIsOpen(false);
    setTimeout(() => {
      setUpdate(null);
    }, 400); // Allow exit animations to complete
  };

  if (!isOpen || !update) return null;

  // Format description text block to split lines beautifully for list item style elements
  const lines = update.description
    ? update.description.split("\n").filter((l: string) => l.trim().length > 0)
    : [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[900] flex items-center justify-center p-4" id="updates-modal-overlay">
        {/* Deep space backdrop overlay with backdrop-blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="fixed inset-0 bg-[#020309]/90 backdrop-blur-md cursor-default"
        />

        {/* Cinematic Update Modal Body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -30 }}
          transition={{ type: "spring", damping: 25, stiffness: 180 }}
          className="relative max-w-lg w-full p-6 rounded-2xl border border-fuchsia-500/40 bg-[#040615]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(236,72,153,0.25),_inset_0_1px_2px_rgba(255,255,255,0.1)] overflow-hidden text-right flex flex-col z-[900]"
          id="updates-modal-card"
        >
          {/* Animated cosmic ring grid glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] opacity-10">
              <div className="w-full h-full rounded-full border border-fuchsia-500 animate-spin" style={{ animationDuration: '24s' }} />
            </div>
            <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-gradient-to-r from-fuchsia-500/10 to-transparent blur-3xl" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-500/10 to-transparent blur-3xl" />
          </div>

          {/* Close button at the top corner */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 left-4 p-2 rounded-lg border border-white/5 bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/15 transition-all cursor-pointer z-50 shadow-md"
            aria-label="Close"
            id="btn-updates-close"
          >
            <X size={16} />
          </button>

          {/* Core Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Pulsing Space Rocket Icon with attractive background */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative p-3.5 bg-gradient-to-br from-fuchsia-600 to-indigo-600 rounded-2xl text-white mb-4 shadow-[0_0_24px_rgba(236,72,153,0.4)]"
            >
              <Rocket size={28} className="rotate-45" />
              <motion.span
                animate={{ scale: [1, 1.25, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-indigo-900"
              />
            </motion.div>

            {/* Release Version Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-pink-500/35 bg-pink-950/40 text-pink-400 text-xs font-mono font-bold uppercase tracking-widest mb-3 shadow-[0_0_12px_rgba(236,72,153,0.15)]">
              <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
              <span>{update.version || "تحديث جديد"}</span>
            </div>

            {/* Custom Interactive Title */}
            <h2 className="text-xl sm:text-2xl font-sans font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-100 to-cyan-200 mb-2 drop-shadow-[0_2px_10px_rgba(236,72,153,0.3)]">
              {update.title || "تحديث جديد للمنصة الكونية منصهر بالتحسينات 🚀"}
            </h2>

            {/* Dynamic update status details subtitle */}
            <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest mb-4">
              {update.timestamp ? new Date(update.timestamp).toLocaleDateString('ar-EG', { dateStyle: 'full' }) : "تاريخ المدار الحالي"}
            </p>

            {/* Horizontal spacer */}
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent mb-4" />

            {/* Description lines listing with checks */}
            <div className="w-full text-right space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar px-1 mb-6 text-sm">
              {lines.map((line: string, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="flex items-start gap-2.5 text-gray-300 leading-relaxed font-sans"
                >
                  <div className="p-0.5 rounded-md bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 shrink-0 mt-1">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                  <span className="flex-1">{line}</span>
                </motion.div>
              ))}
              {lines.length === 0 && (
                <p className="text-gray-400 text-center py-4 font-sans leading-relaxed">
                  {update.description || "لا يوجد وصف للتحديث الحالي."}
                </p>
              )}
            </div>

            {/* Actions button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDismiss}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-indigo-700 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_5px_24px_rgba(236,72,153,0.3)] border border-fuchsia-400/20 cursor-pointer transition-all"
              id="updates-ack-btn"
            >
              <span>مفهوم، العودة لمواصلة الإنجاز</span>
              <Check className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
