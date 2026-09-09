import React, { useEffect, useState } from "react";
import { Trophy, Award, Target, Zap, Swords, Medal, Loader2, User } from "lucide-react";
import { UserData } from "../../shared";
import { db } from "../../firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

interface ChallengeLeaderboardProps {
  onSelectUser: (userId: string) => void;
}

export const ChallengeLeaderboard: React.FC<ChallengeLeaderboardProps> = ({
  onSelectUser,
}) => {
  const [leaders, setLeaders] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        // Query of top 10 profiles ordered by XP as a high impact indicator
        const q = query(collection(db, "profiles"), orderBy("xp", "desc"), limit(10));
        const snap = await getDocs(q);
        if (isMounted) {
          setLeaders(
            snap.docs
              .map((doc) => doc.data() as UserData)
              .filter((u) => u && u.displayName),
          );
        }
      } catch (err) {
        console.warn("Failed fetching challenge leaderboard:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchLeaderboard();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 size={32} className="text-indigo-400 animate-spin mb-4" />
        <span className="text-xs text-gray-400">تحميل تصنيفات أبطال الفضاء...</span>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-3xl border border-white/5 bg-space-dark/30">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-amber-400" />
          <h3 className="text-sm font-bold text-white">قائمة أساطين التركيز والأبطال</h3>
        </div>
        <span className="text-[10px] text-gray-500 font-mono">تحديث مستمر</span>
      </div>

      <div className="space-y-3">
        {leaders.length === 0 ? (
          <div className="text-center py-12 max-w-sm mx-auto">
            <div className="text-3xl mb-3">🌌</div>
            <h4 className="text-sm font-bold text-white mb-1.5">لا يوجد متنافسون بعد</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              كن أول رائد فضاء يصعد إلى لوحة الصدارة.
            </p>
          </div>
        ) : (
          leaders.map((leader, index) => {
            const rank = index + 1;
            let rankColor = "text-gray-400 bg-white/5 border-white/5";
            let prizeIcon = null;

            if (rank === 1) {
              rankColor = "text-amber-400 bg-amber-500/10 border-amber-500/30";
              prizeIcon = "🥇";
            } else if (rank === 2) {
              rankColor = "text-slate-300 bg-slate-400/10 border-slate-400/20";
              prizeIcon = "🥈";
            } else if (rank === 3) {
              rankColor = "text-amber-700 bg-amber-800/10 border-amber-800/20";
              prizeIcon = "🥉";
            }

            return (
              <div
                key={leader.uid}
                onClick={() => onSelectUser(leader.uid)}
                className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center justify-between hover:bg-white/[0.03] hover:border-indigo-500/20 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center font-mono font-black text-sm shrink-0 ${rankColor}`}>
                    {prizeIcon ? prizeIcon : rank}
                  </div>

                  {/* Profile Pic/Icon */}
                  <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    {leader.photoURL ? (
                      <img src={leader.photoURL} alt={leader.displayName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User size={15} />
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-bold text-white block truncate max-w-[120px] md:max-w-[200px]">
                      {leader.displayName}
                    </span>
                    <span className="text-[10px] text-gray-500 font-semibold">
                      المستوى: {leader.level}
                    </span>
                  </div>
                </div>

                {/* Stats side */}
                <div className="flex items-center gap-6">
                  <div className="text-left font-mono">
                    <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-fuchsia-400">
                      {(leader.xp ?? 0).toLocaleString()} XP
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
