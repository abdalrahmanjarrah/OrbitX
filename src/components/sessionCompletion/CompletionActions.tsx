import React, { useState } from "react";
import { motion } from "motion/react";
import { Rocket, LogOut, Share2, Check } from "lucide-react";
import { showToast } from "../../lib/cosmicUI";
import { shareResult } from "../../lib/share";

interface CompletionActionsProps {
  displayName: string;
  uid: string;
  durationMinutes: number;
  xpGained: number;
  stationName: string;
  onContinue: () => void;
  onExitToStations: () => void;
}

export const CompletionActions: React.FC<CompletionActionsProps> = ({
  displayName,
  uid,
  durationMinutes,
  xpGained,
  stationName,
  onContinue,
  onExitToStations
}) => {
  const [sharing, setSharing] = useState<"idle" | "shared" | "copied">("idle");

  const handleShare = async () => {
    const result = await shareResult({ displayName, uid, durationMinutes, xpGained, stationName });
    if (result === "shared") {
      setSharing("shared");
      window.setTimeout(() => setSharing("idle"), 2500);
    } else if (result === "copied") {
      setSharing("copied");
      showToast("تم نسخ إنجازك مع رابط الدعوة — شاركه مع أصدقائك!", "success");
      window.setTimeout(() => setSharing("idle"), 2500);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto mt-4 font-sans" id="completion-actions-group">
      {/* Share achievement + invite friends */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleShare}
        disabled={sharing !== "idle"}
        className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-fuchsia-500 to-rose-500 hover:from-fuchsia-400 hover:to-rose-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_18px_rgba(217,70,239,0.3)] border border-fuchsia-400/30 cursor-pointer transition-all disabled:opacity-80"
        id="btn-complete-share"
      >
        {sharing === "shared" ? (
          <Check className="w-3.5 h-3.5" />
        ) : sharing === "copied" ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <Share2 className="w-3.5 h-3.5" />
        )}
        <span>
          {sharing === "shared"
            ? "تمت المشاركة! 🎉"
            : sharing === "copied"
              ? "تم النسخ!"
              : "شارك إنجازك + ادعُ صديقاً"}
        </span>
      </motion.button>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
        {/* Continue the same round (stay in the session) */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onContinue}
          className="w-full sm:flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(6,182,212,0.25)] border border-cyan-400/20 cursor-pointer transition-all"
          id="btn-complete-continue"
        >
          <Rocket className="w-3.5 h-3.5" />
          <span>كمّل مع الجولة</span>
        </motion.button>

        {/* Exit to stations grid list */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onExitToStations}
          className="w-full sm:w-auto py-2.5 px-4 rounded-lg bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 font-bold text-xs flex items-center justify-center gap-2 border border-red-500/10 cursor-pointer transition-all"
          id="btn-complete-exit"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="sm:hidden">العودة للمحطات</span>
        </motion.button>
      </div>
    </div>
  );
};
