import React, { useState, useEffect } from "react";
import { Trophy, Flame, Medal, Crown, RefreshCw, Loader2, Target, Bell, BellRing, BellOff } from "lucide-react";
import { UserData } from "../shared";
import { db } from "../firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { motion } from "motion/react";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../lib/utils";
import { getWeekStartISO } from "../lib/utils";
import { ensurePushSubscription, isPushSupported } from "../lib/pushManager";

interface WeeklyDuelPanelProps {
  user: UserData;
}

// Weekly goal scales gently with level: level 1 → 125 min, level 10 → 250 min
const weeklyGoal = (level: number) => Math.max(125, (level || 1) * 25);

const getWeekEnd = (): { date: Date; daysLeft: number } => {
  const now = new Date();
  const start = new Date(getWeekStartISO());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
  return { date: end, daysLeft };
};

export const WeeklyDuelPanel: React.FC<WeeklyDuelPanelProps> = ({ user }) => {
  const { isAr } = useLanguage();
  const [leaders, setLeaders] = useState<UserData[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(typeof Notification !== "undefined" && Notification.permission === "granted");
  const [enablingPush, setEnablingPush] = useState(false);

  const weekKey = getWeekStartISO();
  const goal = weeklyGoal(user.level || 1);
  const earned = user.weekFocusMinutes || 0;
  const sessions = user.weekSessions || 0;
  const percent = Math.min(100, Math.round((earned / goal) * 100));
  const completed = earned >= goal;
  const { daysLeft } = getWeekEnd();
  const startLabel = new Date(weekKey).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });

  const fetchLeaders = async () => {
    setLoadingLeaders(true);
    try {
      const q = query(
        collection(db, "users"),
        where("weekStart", "==", weekKey),
        orderBy("weekFocusMinutes", "desc"),
        limit(12),
      );
      const snap = await getDocs(q);
      setLeaders(snap.docs.map((d) => d.data() as UserData));
    } catch (err) {
      console.warn("Failed loading weekly leaders:", err);
    } finally {
      setLoadingLeaders(false);
    }
  };

  useEffect(() => {
    fetchLeaders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid, weekKey]);

  const handleEnablePush = async () => {
    if (!isPushSupported()) return;
    setEnablingPush(true);
    const ok = await ensurePushSubscription(user.uid);
    setPushEnabled(ok);
    setEnablingPush(false);
  };

  if (user.isGuest) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-amber-500/15 bg-gradient-to-br from-[#151222] via-[#110f1e] to-[#0b0a14] shadow-[0_18px_55px_rgba(245,158,11,0.08)] p-6"
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500" />
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row gap-8">
        {/* هدفك هذا الأسبوع */}
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-2xl bg-amber-500/12 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Trophy size={18} />
              </span>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">{isAr ? "نزال الأسبوع" : "Weekly Duel"}</h3>
                <p className="text-[10px] text-gray-500 font-mono">
                  {isAr ? `أسبوع يبدأ ${startLabel} · يتبقى ${daysLeft} يوم` : `Week of ${startLabel} · ${daysLeft} days left`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {isPushSupported() && (
                <button
                  onClick={handleEnablePush}
                  disabled={enablingPush}
                  className={cn(
                    "p-2 rounded-full border transition-colors active:scale-90 flex items-center gap-1.5",
                    pushEnabled
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-white/[0.03] border-white/5 text-gray-400 hover:text-amber-300",
                  )}
                  title={pushEnabled ? (isAr ? "التذكير مفعّل" : "Reminders on") : (isAr ? "فعّل تذكير نزال الأسبوع" : "Enable weekly reminders")}
                >
                  {enablingPush ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : pushEnabled ? (
                    <BellRing size={13} />
                  ) : (
                    <Bell size={13} />
                  )}
                </button>
              )}
              <button
                onClick={fetchLeaders}
                disabled={loadingLeaders}
                className="p-2 rounded-full bg-white/[0.03] border border-white/5 text-gray-400 hover:text-amber-300 transition-colors active:scale-90"
                title={isAr ? "تحديث اللوحة" : "Refresh board"}
              >
                <RefreshCw size={13} className={cn(loadingLeaders && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-5">
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className={cn("text-3xl font-black font-mono tracking-tight", completed ? "text-emerald-400" : "text-white")}>
                  {Math.round(earned)} <span className="text-sm text-gray-500 font-bold">/ {goal} {isAr ? "دقيقة" : "min"}</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                  {completed ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Crown size={12} />
                      {isAr ? "أنجزت هدف الأسبوع — اسحق المتصدرين! 🏆" : "Weekly goal crushed — chase the crown! 🏆"}
                    </span>
                  ) : (
                    <span>{isAr ? `${sessions} جلسة تركيز هذا الأسبوع` : `${sessions} focus sessions this week`}</span>
                  )}
                </div>
              </div>
              <span className={cn("text-2xl font-black font-mono", completed ? "text-emerald-400" : "text-amber-400")}>
                {percent}%
              </span>
            </div>

            <div className="h-3 rounded-full bg-white/[0.04] border border-white/6 overflow-hidden flex">
              <div
                style={{ width: `${percent}%` }}
                className={cn(
                  "h-full transition-all duration-700 ease-out rounded-full",
                  completed
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.5)]"
                    : "bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_18px_rgba(245,158,11,0.4)]",
                )}
              />
            </div>

            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-gray-400">
              <Target size={13} className="text-amber-400 shrink-0" />
              <span>
                {isAr
                  ? `كل دقيقة تركيز بأي محطة تزيد رصيدك في نزال الأسبوع — أول 3 متفرغين يحصدون شارة "بطل الأسبوع" ومجداً مجرياً.`
                  : "Every focus minute anywhere feeds your weekly duel — top 3 earn the 'Weekly Champion' badge."}
              </span>
            </div>
          </div>
        </div>

        {/* لوحة متصدري الأسبوع */}
        <div className="lg:w-80 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={14} className="text-orange-400 animate-pulse" />
            <h4 className="text-xs font-black text-gray-200 tracking-wide uppercase">{isAr ? "متصدرو هذا الأسبوع" : "This Week's Leaders"}</h4>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {loadingLeaders && leaders.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 size={18} className="text-amber-400 animate-spin" />
              </div>
            ) : leaders.length === 0 ? (
              <div className="text-center py-8 text-[11px] text-gray-500">
                {isAr ? "لا نتائج بعد — كن أول من يفتح النزال! 🚀" : "No results yet — be the first!"}
              </div>
            ) : (
              leaders.slice(0, 10).map((l, idx) => {
                const isMe = l.uid === user.uid;
                const lEarned = l.weekFocusMinutes || 0;
                const rankMedal = idx === 0 ? "text-amber-400" : idx === 1 ? "text-gray-300" : idx === 2 ? "text-orange-500" : "text-gray-600";
                return (
                  <div
                    key={l.uid}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-colors",
                      isMe
                        ? "bg-amber-500/10 border-amber-500/40"
                        : "bg-white/[0.02] border-white/5 hover:border-white/10",
                    )}
                  >
                    <span className={cn("w-6 text-center font-black font-mono text-xs", rankMedal)}>
                      {idx < 3 ? <Medal size={14} className="mx-auto" /> : idx + 1}
                    </span>
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-indigo-500/15 border border-white/10 shrink-0">
                      {l.photoURL ? (
                        <img src={l.photoURL} alt={l.displayName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-indigo-300">
                          {(l.displayName || "؟").charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {l.displayName}
                        {isMe && <span className="text-amber-400 text-[10px] font-black mr-1">({isAr ? "أنت" : "you"})</span>}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">{Math.round(lEarned)} {isAr ? "دقيقة" : "min"}</div>
                    </div>
                    {l.uid === user.uid && completed && (
                      <Crown size={14} className="text-amber-400" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
