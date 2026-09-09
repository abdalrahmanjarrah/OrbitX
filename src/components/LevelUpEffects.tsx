import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { playSound } from "../lib/sound";
import {
  getLevelFromXp,
  getXpForLevel,
  getXpToNextLevel,
  getLevelUpReward,
  getLevelColor,
  MILESTONE_LEVELS,
} from "../lib/levelConfig";
import { Award, Zap, Sparkles, Star, Trophy, Crown } from "lucide-react";

interface LevelUpEffectsProps {
  xp: number;
  previousXp: number;
  userId: string;
}

// Confetti particle generator
function createConfetti(count: number) {
  const colors = [
    "#6366f1", "#a855f7", "#ec4899", "#f59e0b",
    "#10b981", "#06b6d4", "#f43f5e", "#eab308",
    "#8b5cf6", "#14b8a6",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.6,
    size: 4 + Math.random() * 8,
    rotation: Math.random() * 360,
    velocity: 0.5 + Math.random() * 1.5,
    shape: Math.random() > 0.5 ? "square" : "circle",
  }));
}

// Star burst particles
function createStarBurst(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (i / count) * 360,
    distance: 60 + Math.random() * 80,
    size: 6 + Math.random() * 10,
    delay: Math.random() * 0.3,
  }));
}

export default function LevelUpEffects({ xp, previousXp, userId }: LevelUpEffectsProps) {
  const [showModal, setShowModal] = useState(false);
  const [levelInfo, setLevelInfo] = useState<{
    level: number;
    isMilestone: boolean;
    reward: number;
    colors: ReturnType<typeof getLevelColor>;
  } | null>(null);

  const checkLevelUp = useCallback(() => {
    const prevLevel = getLevelFromXp(previousXp);
    const currLevel = getLevelFromXp(xp);

    if (currLevel > prevLevel) {
      const isMilestone = MILESTONE_LEVELS.has(currLevel);
      const reward = getLevelUpReward(currLevel);
      const colors = getLevelColor(currLevel);

      setLevelInfo({ level: currLevel, isMilestone, reward, colors });
      setShowModal(true);

      // Play sound
      if (isMilestone) {
        playSound("levelup");
        // Extra celebration sound for milestones
        setTimeout(() => playSound("levelup"), 300);
      } else {
        playSound("levelup");
      }

      // Auto-dismiss after 5 seconds
      setTimeout(() => setShowModal(false), 5000);
    }
  }, [xp, previousXp]);

  useEffect(() => {
    if (previousXp !== 0 || xp > 0) {
      checkLevelUp();
    }
  }, [xp]);

  if (!showModal || !levelInfo) return null;

  const confetti = createConfetti(levelInfo.isMilestone ? 60 : 30);
  const starBurst = levelInfo.isMilestone ? createStarBurst(16) : [];

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none"
        >
          {/* Confetti Layer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {confetti.map((c) => (
              <motion.div
                key={c.id}
                initial={{ y: -20, x: `${c.x}vw`, opacity: 1, rotate: 0 }}
                animate={{
                  y: "110vh",
                  opacity: [1, 1, 0],
                  rotate: c.rotation + 720,
                }}
                transition={{
                  duration: 2.5 + c.velocity,
                  delay: c.delay,
                  ease: "easeIn",
                }}
                className="absolute"
                style={{
                  width: c.size,
                  height: c.shape === "square" ? c.size : c.size * 0.6,
                  backgroundColor: c.color,
                  borderRadius: c.shape === "circle" ? "50%" : "2px",
                }}
              />
            ))}
          </div>

          {/* Star Burst (milestones only) */}
          {levelInfo.isMilestone && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {starBurst.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{
                    scale: [0, 1.5, 0],
                    opacity: [1, 0.8, 0],
                    x: Math.cos((s.angle * Math.PI) / 180) * s.distance,
                    y: Math.sin((s.angle * Math.PI) / 180) * s.distance,
                  }}
                  transition={{
                    duration: 1.2,
                    delay: 0.2 + s.delay,
                    ease: "easeOut",
                  }}
                  className="absolute"
                >
                  <Star
                    size={s.size}
                    className="text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* Main Level Up Modal */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="pointer-events-auto"
          >
            <div
              className={`relative ${levelInfo.colors.glow} rounded-3xl overflow-hidden ${
                levelInfo.isMilestone ? "w-[380px]" : "w-[320px]"
              }`}
            >
              {/* Gradient border */}
              <div className={`absolute inset-0 ${levelInfo.colors.bg} rounded-3xl`} />

              {/* Inner content */}
              <div className="relative m-[2px] bg-[#0a0f25] rounded-[calc(1.5rem-2px)] p-6 md:p-8 text-center overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] animate-pulse" />
                </div>

                {/* Icon */}
                <motion.div
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", damping: 10, stiffness: 150, delay: 0.1 }}
                  className="relative z-10 mx-auto mb-4"
                >
                  <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center ${levelInfo.colors.bg} ${levelInfo.colors.glow}`}>
                    {levelInfo.isMilestone ? (
                      <Crown size={36} className="text-white drop-shadow-lg" />
                    ) : (
                      <Award size={36} className="text-white drop-shadow-lg" />
                    )}
                  </div>
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative z-10"
                >
                  <h2 className="text-2xl md:text-3xl font-black font-display text-white mb-1 flex items-center justify-center gap-2">
                    <Sparkles className="text-amber-400" size={24} />
                    ترقية جديدة!
                    <Sparkles className="text-amber-400" size={24} />
                  </h2>
                  <p className="text-gray-400 text-sm mb-3">
                    {levelInfo.isMilestone
                      ? "إنجاز استثنائي! أنت في طريقك لتصبح أسطورة"
                      : "استمر في التركيز، الطريق لا يزال طويلاً"}
                  </p>
                </motion.div>

                {/* Level Number */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.3, 1] }}
                  transition={{ delay: 0.35, duration: 0.6, type: "spring" }}
                  className="relative z-10 my-4"
                >
                  <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl ${levelInfo.colors.bg}`}>
                    <span className="text-white text-4xl md:text-5xl font-black font-display drop-shadow-lg">
                      {levelInfo.level}
                    </span>
                    <span className="text-white/80 text-sm font-bold">LVL</span>
                  </div>
                </motion.div>

                {/* Reward */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="relative z-10 flex items-center justify-center gap-2 text-sm"
                >
                  <Zap size={16} className="text-amber-400" />
                  <span className="text-amber-400 font-bold font-mono">
                    +{levelInfo.reward} XP
                  </span>
                  <span className="text-gray-500">مكافأة الترقية</span>
                </motion.div>

                {/* Milestone badge */}
                {levelInfo.isMilestone && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7, type: "spring" }}
                    className="relative z-10 mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full"
                  >
                    <Trophy size={14} className="text-amber-400" />
                    <span className="text-amber-300 text-xs font-bold">
                      لفل milestone! 🎉
                    </span>
                  </motion.div>
                )}

                {/* Auto dismiss hint */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="relative z-10 text-[10px] text-gray-600 mt-4 font-mono"
                >
                  يُغلق تلقائياً...
                </motion.p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
