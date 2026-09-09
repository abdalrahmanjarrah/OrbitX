import React from "react";
import { motion } from "motion/react";

export const CompletionVisualEffects: React.FC = React.memo(() => {
  // Generate a list of static sparkles/stars in deep space
  const stars = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    top: `${Math.floor(((i * 7 + 13) % 80) + 10)}%`,
    left: `${Math.floor(((i * 13 + 7) % 80) + 10)}%`,
    size: (i % 3) + 2,
    delay: i * 0.25,
    duration: (i % 4) + 3
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Stars and cosmic background depth */}
      <div className="absolute inset-0 bg-radial-gradient from-indigo-950/20 via-[#030614]/80 to-[#020308] opacity-90" />
      
      {/* Twinkling Cosmic Stars */}
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
          style={{
            top: star.top,
            left: star.left,
            width: `${star.size}px`,
            height: `${star.size}px`,
          }}
          animate={{
            opacity: [0.2, 1, 0.2],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Elegant Infinite Orbital Vectors */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-25">
        {/* Outer Orbit Line */}
        <motion.svg
          className="w-full h-full"
          viewBox="0 0 100 100"
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="url(#orbitGradient)"
            strokeWidth="0.5"
            strokeDasharray="6 12 4 8"
          />
          {/* Orbital satellite node */}
          <circle cx="50" cy="6" r="1.5" fill="#22d3ee" className="shadow-[0_0_12px_rgba(34,211,238,1)]" />
          
          <defs>
            <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#fdba74" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </motion.svg>
      </div>

      {/* Inner Orbit Line */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] opacity-20">
        <motion.svg
          className="w-full h-full"
          viewBox="0 0 100 100"
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="url(#innerOrbitGradient)"
            strokeWidth="0.5"
            strokeDasharray="12 6"
          />
          {/* Inner satellite node */}
          <circle cx="10" cy="50" r="1" fill="#4f46e5" />
          
          <defs>
            <linearGradient id="innerOrbitGradient" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </motion.svg>
      </div>

      {/* Dynamic ambient pulse */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] rounded-full bg-cyan-500/5 blur-3xl pointer-events-none"
        animate={{
          scale: [0.9, 1.25, 0.9],
          opacity: [0.4, 0.8, 0.4]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
});

CompletionVisualEffects.displayName = "CompletionVisualEffects";
