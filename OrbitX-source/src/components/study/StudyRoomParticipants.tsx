import React from "react";
import { useRenderLog } from "../../firebaseDebug";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { UserData } from "../../shared";

export interface StudyRoomParticipantsProps {
  participantsData: UserData[];
  user: UserData;
  onSelectUser: (id: string) => void;
}

function StudyRoomParticipantsComponent({
  participantsData,
  user,
  onSelectUser,
}: StudyRoomParticipantsProps) {
  useRenderLog("StudyRoomParticipants", { participantsCount: participantsData.length });

  const [isPageVisible, setIsPageVisible] = React.useState(true);

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const sortedParticipants = React.useMemo(() => {
    return participantsData
      .filter((p) => p && p.uid)
      .map((p) => ({ ...p, displayName: p.displayName || "رائد فضاء" }))
      .sort((a, b) => a.uid.localeCompare(b.uid))
      .slice(0, 5);
  }, [participantsData]);

  return (
    <>
      {/* Solar System Background Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
            style={{
              width: `${380 + i * 90}px`,
              height: `${380 + i * 90}px`,
            }}
          />
        ))}
      </div>

      {/* Orbiting Planets (Users) */}
      {sortedParticipants.map((p, index) => {
        const baseRadius = 190; // Increased distance from center
        const orbitSpacing = 45;
        const radius = baseRadius + index * orbitSpacing;

        // Seeded derivation for visual variety
        const seed = p.uid
          .split("")
          .reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const duration = 60 + (seed % 40) + index * 25;
        const initialAngle = (seed * 137.5) % 360;

        return (
          <div key={p.uid} className="absolute inset-0 pointer-events-none">
            {/* Subtle Orbit Path Highlight */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5 pointer-events-none"
              style={{ width: radius * 2, height: radius * 2 }}
            />

            {/* The Orbiting Container */}
            <motion.div
              animate={isPageVisible ? { rotate: [initialAngle, initialAngle + 360] } : { rotate: initialAngle }}
              transition={{
                duration,
                repeat: isPageVisible ? Infinity : 0,
                ease: "linear",
              }}
              className="absolute inset-0"
            >
              {/* The Planet itself */}
              <div
                className="absolute top-1/2 left-1/2 flex flex-col items-center gap-1"
                style={{ transform: `translate(-50%, -50%) translateY(-${radius}px)` }}
              >
                {/* Counter-rotate content */}
                <motion.div
                  animate={isPageVisible ? { rotate: [-initialAngle, -(initialAngle + 360)] } : { rotate: -initialAngle }}
                  transition={{
                    duration,
                    repeat: isPageVisible ? Infinity : 0,
                    ease: "linear",
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="relative pointer-events-auto">
                    <button
                      onClick={() => onSelectUser(p.uid)}
                      className={cn(
                        "w-10 h-10 md:w-12 md:h-12 rounded-full border-2 p-0.5 overflow-hidden shadow-xl transition-all",
                        p.uid === user.uid
                          ? "border-amber-400 shadow-amber-400/40"
                          : "border-indigo-400 shadow-indigo-400/20",
                      )}
                    >
                      <img
                        src={
                          p.photoURL ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.uid}`
                        }
                        alt={p.displayName}
                        className="w-full h-full rounded-full object-cover bg-slate-900"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  </div>
                  <span className="text-[10px] md:text-[11px] font-bold bg-space-dark/90 backdrop-blur-xl px-2 py-0.5 rounded-full border border-white/10 text-white whitespace-nowrap shadow-lg">
                    {p.displayName.split(" ")[0]}
                  </span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        );
      })}
    </>
  );
}

export default React.memo(StudyRoomParticipantsComponent);
