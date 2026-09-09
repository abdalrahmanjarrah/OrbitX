import { useState, useEffect, useCallback, useRef } from "react";
import { Timer, Lock, CheckCircle, Gift } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getChestState, claimChest, CHEST_CONFIG } from "../lib/timeChests";
import { useLanguage } from "../context/LanguageContext";
import type { UserData } from "../shared";
import { cn } from "../lib/utils";
import { showToast } from "../lib/cosmicUI";

function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface TimeChestsProps {
  user: UserData;
}

// Visual flavour per chest: gradient, glow & frame colour.
const CHEST_STYLE = [
  {
    readyBg: "from-emerald-500/30 to-teal-500/10",
    border: "border-emerald-400/60",
    glow: "rgba(16,185,129,0.45)",
    label: "5 د",
  },
  {
    readyBg: "from-sky-500/30 to-indigo-500/10",
    border: "border-sky-400/60",
    glow: "rgba(56,189,248,0.45)",
    label: "15 د",
  },
  {
    readyBg: "from-amber-500/30 to-yellow-500/10",
    border: "border-amber-400/60",
    glow: "rgba(245,158,11,0.5)",
    label: "30 د",
  },
  {
    readyBg: "from-orange-500/30 to-red-500/10",
    border: "border-orange-400/60",
    glow: "rgba(249,115,22,0.5)",
    label: "60 د",
  },
  {
    readyBg: "from-fuchsia-500/30 to-purple-500/10",
    border: "border-fuchsia-400/60",
    glow: "rgba(217,70,239,0.5)",
    label: "2 س",
  },
];

export function TimeChests({ user }: TimeChestsProps) {
  const { isAr } = useLanguage();
  const [state, setState] = useState(() => getChestState(user));
  const [claiming, setClaiming] = useState<number | null>(null);
  const [showReward, setShowReward] = useState<{ xp: number; icon: string } | null>(null);
  // When the server-side force-grant throttle rejects a chest that is locally
  // ready (anti-farm keeps grants 60s apart), we schedule an automatic retry.
  const [retryQueue, setRetryQueue] = useState<number[]>([]);
  const [retryIn, setRetryIn] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setState(getChestState(user)), 1000);
    return () => clearInterval(interval);
  }, [user]);

  const tryClaim = useCallback(async (i: number) => {
    const granted = await claimChest(i, user);
    if (granted > 0) {
      setShowReward({ xp: CHEST_CONFIG[i].xp, icon: CHEST_CONFIG[i].icon });
      setState(getChestState(user));
      setTimeout(() => setShowReward(null), 2500);
      return true;
    }
    return false;
  }, [user]);

  const handleClaim = useCallback(async (i: number) => {
    if (claiming !== null) return;
    setClaiming(i);
    const ok = await tryClaim(i);
    if (!ok) {
      // The chest is locally "ready" but the server throttled the grant.
      // Queue it and let the countdown below retry it automatically.
      setRetryQueue((q) => (q.includes(i) ? q : [...q, i]));
      setRetryIn(61);
      showToast(
        isAr
          ? "تم تأجيل الصندوق لحظة — سيفتح تلقائياً خلال دقيقة."
          : "Chest deferred — it will open automatically in about a minute.",
        "info",
      );
    }
    setClaiming(null);
  }, [claiming, tryClaim, isAr]);

  // Auto-retry countdown for throttled chests.
  useEffect(() => {
    if (retryQueue.length === 0) return;
    if (retryIn <= 0) {
      const current = retryQueue[0];
      setRetryIn(0);
      tryClaim(current).then((ok) => {
        if (ok) {
          setRetryQueue((q) => q.slice(1));
          setState(getChestState(user));
        } else {
          setRetryIn(61);
        }
      });
      return;
    }
    const timeout = setTimeout(() => setRetryIn((v) => v - 1), 1000);
    return () => clearTimeout(timeout);
  }, [retryQueue, retryIn, tryClaim]);

  const nextLockedIdx = state.statuses.findIndex((s) => s === "locked");
  const retrying = retryQueue.length > 0;

  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-[#0e1025]/90 to-[#141833]/80 backdrop-blur-xl border border-white/5 p-5 overflow-hidden group hover:border-amber-500/30 transition-all">
      <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30">
            <Timer size={14} className="text-amber-400" />
          </div>
          <h3 className="text-sm font-black text-white">
            {isAr ? "صناديق الوقت" : "Time Chests"}
          </h3>
        </div>
        <span className="text-[10px] text-amber-400/70 font-mono tracking-wider">
          {isAr ? `أرباح: +${CHEST_CONFIG.reduce((a, c) => a + c.xp, 0)} XP` : `Total: +${CHEST_CONFIG.reduce((a, c) => a + c.xp, 0)} XP`}
        </span>
      </div>

      {/* Chests row — each is a mini vault that unlocks over time. */}
      <div className="relative grid grid-cols-5 gap-2 mb-4">
        {CHEST_CONFIG.map((chest, i) => {
          const status = state.statuses[i];
          const st = CHEST_STYLE[i];
          const isReady = status === "ready";
          const isClaimed = status === "claimed";
          return (
            <motion.button
              key={i}
              disabled={!isReady || claiming !== null}
              onClick={() => handleClaim(i)}
              whileHover={isReady ? { scale: 1.08, y: -3 } : undefined}
              whileTap={isReady ? { scale: 0.94 } : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 rounded-2xl border py-3 transition-all cursor-pointer",
                isClaimed
                  ? "bg-emerald-500/10 border-emerald-500/25 opacity-50"
                  : isReady
                    ? cn("bg-gradient-to-b", st.readyBg, st.border, "animate-pulse")
                    : "bg-white/[0.03] border-white/5"
              )}
              style={isReady ? { boxShadow: `0 0 18px ${st.glow}` } : undefined}
            >
              <span className={cn("text-xl leading-none", isClaimed ? "grayscale" : "")}>
                {isClaimed ? <CheckCircle size={18} className="text-emerald-400" /> : isReady ? <Gift size={18} className="text-amber-300" /> : <Lock size={13} className="text-gray-600" />}
              </span>
              <span className={cn("text-[9px] font-black", isReady ? "text-white" : "text-gray-500")}>
                +{chest.xp}
              </span>
              <span className={cn("text-[8px] font-mono", isReady ? "text-white/70" : "text-gray-600")}>
                {st.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="relative flex items-center justify-between text-[11px]">
        {retrying ? (
          <span className="font-bold text-amber-400/90 flex items-center gap-1.5">
            <Gift size={13} className="animate-pulse" />
            {isAr
              ? `يفتح الصندوق المعلّق خلال ${retryIn} ث`
              : `Opening queued chest in ${retryIn}s`}
          </span>
        ) : state.allClaimed ? (
          <span className="font-bold text-emerald-400/80 flex items-center gap-1.5">
            <CheckCircle size={13} />
            {isAr ? "أكملت الدورة! تتجدد بعد 24 ساعة" : "Cycle complete! Resets in 24h"}
          </span>
        ) : nextLockedIdx >= 0 ? (
          <span className="font-bold text-gray-500 flex items-center gap-1.5">
            <Timer size={13} className="text-amber-400/70" />
            {isAr ? "الصندوق الجاي يفتح بعد" : "Next chest in"}{" "}
            <span className="text-amber-400 font-black font-mono">{formatTime(state.timeUntilNext)}</span>
          </span>
        ) : (
          <span className="font-bold text-amber-400/80 flex items-center gap-1.5">
            <Gift size={13} />
            {isAr ? "صندوق جاهز! اضغط لفتحه" : "Chest ready! Tap to open"}
          </span>
        )}
        <span className="text-gray-600">{isAr ? "كل صندوق زيادة بوقته" : "Higher chests need more time"}</span>
      </div>

      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: -10, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.8 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
          >
            <div className="bg-amber-500/20 border border-amber-500/40 rounded-2xl px-5 py-3 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.3)]">
              <div className="text-2xl mb-1">{showReward.icon}</div>
              <div className="text-sm font-black text-amber-300">+{showReward.xp} XP</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}