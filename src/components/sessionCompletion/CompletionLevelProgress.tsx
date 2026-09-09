import React from "react";
import { motion } from "motion/react";
import { UserData } from "../../shared";
import { getLevelFromXp, getLevelProgress, getXpToNextLevel, MAX_LEVEL } from "../../lib/levelConfig";

interface CompletionLevelProgressProps {
  user: UserData;
}

export const CompletionLevelProgress: React.FC<CompletionLevelProgressProps> = ({ user }) => {
  const currentXp = user.xp || 0;

  const level = getLevelFromXp(currentXp);
  const progressPercent = getLevelProgress(currentXp, level);
  const xpNeededForNextLevel = getXpToNextLevel(level);

  return (
    <div className="w-full max-w-sm mx-auto my-4 text-right" id="completion-level-progress-container">
      {/* Top Details Header */}
      <div className="flex items-center justify-between mb-1.5 font-sans">
        {level < MAX_LEVEL ? (
          <span className="text-[11px] text-gray-500 font-medium font-sans">
            متبقي <strong className="text-cyan-400 font-mono font-bold">{xpNeededForNextLevel} XP</strong> للوصول للمستوى الأعلى
          </span>
        ) : (
          <span className="text-[11px] text-amber-400 font-bold font-sans">وصلت لأعلى مستوى! 🏆</span>
        )}
        <div className="flex items-baseline gap-1">
          <span className="text-xs text-indigo-400 font-sans font-bold">المستوى الحالي</span>
          <span className="text-sm font-black text-white font-mono">{level}</span>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="relative w-full h-2.5 rounded-full bg-white/[0.04] border border-white/5 overflow-hidden">
        {/* Animated fill indicator */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-indigo-600 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
          style={{ float: "right" }} // Ensure Arabic alignment filling from right-to-left
        />
      </div>

      {/* Footer Indicators */}
      <div className="flex items-center justify-between mt-1 text-[11px] text-gray-600 font-mono">
        <span>{level + 1}</span>
        <span>{currentXp.toLocaleString()} XP الحالي</span>
        <span>{level}</span>
      </div>
    </div>
  );
};