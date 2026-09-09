import React, { useEffect, useState } from "react";
import { Flame, Gift } from "lucide-react";
import { cn } from "../lib/utils";
import { showToast } from "../lib/cosmicUI";
import {
  applyDailyStreak,
  claimDailyReward,
  todayDateString,
} from "../lib/streak";
import type { UserData } from "../shared";

export function DailyHabitCard({ user }: { user: UserData }) {
  const [info, setInfo] = useState<{
    streak: number;
    rewardDue: boolean;
  } | null>(null);
  const [claiming, setClaiming] = useState(false);

  const streak = info?.streak ?? user.streak ?? 0;
  const rewardDue =
    info?.rewardDue ?? user.lastDailyReward !== todayDateString();

  useEffect(() => {
    let mounted = true;
    applyDailyStreak(user).then((r) => {
      if (!mounted) return;
      setInfo({ streak: r.streak, rewardDue: r.rewardDue });
    });
    return () => {
      mounted = false;
    };
  }, [user.uid, user.lastActiveDate, user.lastDailyReward, user.streak]);

  const handleClaim = async () => {
    if (claiming || !user.uid) return;
    setClaiming(true);
    const ok = await claimDailyReward(user);
    setClaiming(false);
    if (ok) {
      setInfo((s) => (s ? { ...s, rewardDue: false } : s));
      showToast("🎁 مكافأة اليوم: +15 XP وصلت لحسابك!", "success");
    } else {
      showToast("ما انصرفت المكافأة — جرب بعد شوية", "error");
    }
  };

  return (
    <div className="flex flex-col justify-center px-6 py-4 rounded-3xl bg-space-dark/60 backdrop-blur-md border border-white/5 relative overflow-hidden group min-w-[12.5rem]">
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
        <Flame size={12} className="text-orange-400" /> سلسلة الأيام
      </span>
      <div className="text-3xl font-black text-white">
        {streak}
        <span className="text-xs font-semibold text-gray-500 mr-1">
          {streak === 1 ? "يوم" : "أيام متتالية"}
        </span>
      </div>
      <p className="text-[10px] text-gray-500 font-mono leading-relaxed mt-1">
        كل يوم تركّز = +1 في السلسلة. فاتك يوم؟ ترجع من الأول.
      </p>
      {rewardDue ? (
        <button
          onClick={handleClaim}
          disabled={claiming}
          className={cn(
            "mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all",
            "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-[#101223]",
            "shadow-[0_0_20px_rgba(245,158,11,0.35)] disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          <Gift size={14} />
          {claiming ? "..." : "استلم مكافأة اليوم +15 XP"}
        </button>
      ) : (
        <div className="mt-3 text-[11px] font-bold text-emerald-400/90 flex items-center gap-1.5">
          <Gift size={12} /> استلمت مكافأة اليوم ✓
        </div>
      )}
    </div>
  );
}
