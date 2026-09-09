import React from "react";
import { motion } from "motion/react";
import { CompletionMessageDetail } from "../../lib/completionMessages";
import { Award } from "lucide-react";

interface CompletionMessageProps {
  message: CompletionMessageDetail;
}

export const CompletionMessage: React.FC<CompletionMessageProps> = ({ message }) => {
  return (
    <div className="text-center max-w-xl mx-auto flex flex-col items-center">
      {/* Small Badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/40 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider mb-4 shadow-[0_0_12px_rgba(34,211,238,0.1)]"
        id="completion-pilot-badge"
      >
        <Award className="w-3.5 h-3.5" />
        <span>{message.badge}</span>
      </motion.div>

      {/* Main Arabic Title */}
      <motion.h2
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
        className="text-2xl sm:text-3xl font-sans font-black text-white mb-3 tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
        id="completion-header-title"
      >
        {message.title}
      </motion.h2>

      {/* Cosmic Quote */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-[13px] sm:text-[14px] leading-relaxed text-gray-400 font-medium max-w-md"
        id="completion-cosmic-quote"
      >
        {message.quote}
      </motion.p>
    </div>
  );
};
