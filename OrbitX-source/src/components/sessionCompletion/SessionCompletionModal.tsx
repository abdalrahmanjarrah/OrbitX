import React, { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserData } from "../../shared";
import { SessionCompletionData } from "../../hooks/useSessionCompletion";
import { CompletionVisualEffects } from "./CompletionVisualEffects";
import { CompletionMessage } from "./CompletionMessage";
import { CompletionXpPanel } from "./CompletionXpPanel";
import { CompletionStats } from "./CompletionStats";
import { CompletionLevelProgress } from "./CompletionLevelProgress";
import { CompletionActions } from "./CompletionActions";
import { getRandomCosmicMessage } from "../../lib/completionMessages";

interface SessionCompletionModalProps {
  isOpen: boolean;
  completionData: SessionCompletionData | null;
  user: UserData | null;
  onClose: () => void;
  onContinue: () => void;
  onExitToStations: () => void;
}

export const SessionCompletionModal: React.FC<SessionCompletionModalProps> = ({
  isOpen,
  completionData,
  user,
  onClose,
  onContinue,
  onExitToStations
}) => {
  // Memoize the cosmic message to prevent it from cycling/shuffling on re-renders
  const cosmicMessage = useMemo(() => {
    if (!completionData) return null;
    return getRandomCosmicMessage(completionData.durationMinutes);
  }, [completionData?.durationMinutes, completionData?.completedAt]);

  if (!isOpen || !completionData || !user) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" id="session-completion-overlay-container">
        {/* Backdrop overlay filter blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#020309]/80 backdrop-blur-md cursor-default z-10"
        />

        {/* Cinematic Modal Main Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -16 }}
          transition={{ type: "spring", damping: 25, stiffness: 180 }}
          className="relative max-w-lg w-full p-6 rounded-2xl border border-white/10 bg-[#030616]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8),_inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden text-right z-20 flex flex-col"
          id="completion-modal-card"
        >
          {/* Cosmic visual ambient orbiting shapes in background */}
          <CompletionVisualEffects />

          {/* Modal Content container wrapper */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Celebration Title and quotes */}
            {cosmicMessage && <CompletionMessage message={cosmicMessage} />}

            {/* Glowing Gained XP display */}
            <CompletionXpPanel xpGained={completionData.xpGained} />

            {/* General Grid Stats card lists */}
            <CompletionStats
              durationMinutes={completionData.durationMinutes}
              stationName={completionData.stationName}
            />

            {/* User level progression tracker line bar */}
            <CompletionLevelProgress user={user} />

            {/* Call to actions interactive buttons */}
            <CompletionActions
              displayName={user.displayName || "رائد فضاء"}
              uid={user.uid}
              durationMinutes={completionData.durationMinutes}
              xpGained={completionData.xpGained}
              stationName={completionData.stationName}
              onContinue={onContinue}
              onExitToStations={onExitToStations}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
