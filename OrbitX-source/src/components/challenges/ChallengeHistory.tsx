import React from "react";
import { Award, Trophy, Timer, Swords, Percent, TrendingUp, Crosshair } from "lucide-react";
import { Challenge, UserData } from "../../shared";
import { db } from "../../firebase";

interface ChallengeHistoryProps {
  challenges: Challenge[];
  currentUser: UserData;
}

export const ChallengeHistory: React.FC<ChallengeHistoryProps> = ({
  challenges,
  currentUser,
}) => {
  // Filter for completed challenges involving currentUser
  const completedList = challenges.filter(
    (c) => c.status === "completed"
  );

  // Deriving Stats
  const wins = completedList.filter((c) => c.winnerId === currentUser.uid).length;
  const losses = completedList.filter((c) => c.winnerId && c.winnerId !== currentUser.uid && c.winnerId !== "draw").length;
  const draws = completedList.filter((c) => c.winnerId === "draw").length;
  const totalCompleted = completedList.length;

  const winRate = totalCompleted > 0 ? Math.round((wins / totalCompleted) * 100) : 0;

  // Largest XP victory
  let maxVictoriousXp = 0;
  completedList.forEach((c) => {
    if (c.winnerId === currentUser.uid) {
      const isChallenger = c.challengerId === currentUser.uid;
      const myXp = isChallenger ? (c.progressPlayer1 || 0) : (c.progressPlayer2 || 0);
      if (myXp > maxVictoriousXp) maxVictoriousXp = myXp;
    }
  });

  const stats = [
    {
      icon: <Percent size={15} />,
      label: "معدل الفوز",
      value: `${winRate}%`,
      sub: `${wins} فوز / ${totalCompleted} نزالات`,
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      valueColor: "text-emerald-400",
    },
    {
      icon: <TrendingUp size={15} />,
      label: "أعلى نتيجة فوز",
      value: `+${maxVictoriousXp} XP`,
      sub: "في نزال واحد",
      accent: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      valueColor: "text-amber-400",
    },
    {
      icon: <Crosshair size={15} />,
      label: "إجمالي الهزائم",
      value: `${losses}`,
      sub: "فرصة للتعويض",
      accent: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      valueColor: "text-rose-400",
    },
    {
      icon: <Award size={15} />,
      label: "التعادلات",
      value: `${draws}`,
      sub: "توازن الطاقات",
      accent: "text-gray-300 bg-white/5 border-white/10",
      valueColor: "text-gray-300",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Derived Statistics Header widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="p-4 rounded-2xl bg-space-dark/50 border border-white/5 flex flex-col justify-between gap-3 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">{s.label}</span>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.accent}`}>
                {s.icon}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono ${s.valueColor}`}>{s.value}</span>
              <span className="text-[10px] text-gray-500 font-mono">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ledger history listing */}
      <div className="p-6 rounded-3xl border border-white/5 bg-space-dark/30">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <Trophy size={15} className="text-amber-400" />
          <span>سجل النزالات السابقة</span>
        </h3>

        {completedList.length === 0 ? (
          <div className="text-center py-12 max-w-sm mx-auto">
            <div className="text-3xl mb-3">⚔️</div>
            <h4 className="text-sm font-bold text-white mb-1.5">لم تخض أي نزالات بعد</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              بعد إنهاء أول نزال ستظهر نتائجك وإحصائياتك هنا.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {completedList.map((challenge) => {
              const isChallenger = challenge.challengerId === currentUser.uid;
              const myXp = isChallenger ? (challenge.progressPlayer1 || 0) : (challenge.progressPlayer2 || 0);
              const oppXp = isChallenger ? (challenge.progressPlayer2 || 0) : (challenge.progressPlayer1 || 0);
              const opponentName = isChallenger ? challenge.challengedName : challenge.challengerName;

              const isWinner = challenge.winnerId === currentUser.uid;
              const isDraw = challenge.winnerId === "draw";

              let resultLabel = "خسارة";
              let resultClass = "text-rose-400 bg-rose-500/10 border-rose-500/20";
              if (isWinner) {
                resultLabel = "انتصار 🏆";
                resultClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
              } else if (isDraw) {
                resultLabel = "تعادل 🤝";
                resultClass = "text-gray-300 bg-white/5 border-white/10";
              }

              const challengeDate = challenge.completedAt
                ? new Date(challenge.completedAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })
                : "غير مؤرخ";

              return (
                <div
                  key={challenge.id}
                  className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-hover hover:bg-white/[0.02] hover:border-white/10"
                >
                  <div className="flex items-center gap-4">
                    {/* Status graphic circle */}
                    <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 ${resultClass}`}>
                      {resultLabel}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span className="truncate">ضد {opponentName}</span>
                        <span className="text-[10px] text-gray-500 font-mono shrink-0">({challengeDate})</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] font-mono">
                          <Swords size={11} className="text-amber-400" />
                          <span>نتيجتك: {myXp} XP</span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-mono border-r border-white/10 pr-3">
                          <span>الخصم: {oppXp} XP</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 md:text-left self-stretch md:self-auto border-t md:border-0 border-white/5 pt-3 md:pt-0">
                    <span className="md:hidden text-xs text-gray-500">مدة النزال</span>
                    <div className="flex items-center gap-1 text-xs text-gray-400 font-mono shrink-0">
                      <Timer size={13} className="text-amber-400" />
                      <span>{challenge.durationMinutes} دقيقة تركيز</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
