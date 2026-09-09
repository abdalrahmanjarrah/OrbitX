import React from "react";
import { Swords, Timer, Trophy, Zap, Flame, Skull, Star } from "lucide-react";
import { Challenge, UserData } from "../../shared";
import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { motion } from "motion/react";
import { showToast } from "../../lib/cosmicUI";
import { sendPushToUser } from "../../lib/pushManager";

interface ActiveChallengesListProps {
  challenges: Challenge[];
  currentUser: UserData;
  onRefresh: () => void;
  onStartChallengeClick: () => void;
  onInviteFriendClick: () => void;
}

const formatDuration = (mins: number) => {
  if (mins >= 1440) {
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    return h > 0 ? `${d}ي ${h}س` : `${d}ي`;
  }
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}س ${m}د` : `${h}س`;
  }
  return `${mins} د`;
};

interface DuelView {
  challenge: Challenge;
  currentUser: UserData;
}

const deriveDuel = ({ challenge, currentUser }: DuelView) => {
  const isChallenger = challenge.challengerId === currentUser.uid;
  const myXp = isChallenger ? (challenge.progressPlayer1 || 0) : (challenge.progressPlayer2 || 0);
  const oppXp = isChallenger ? (challenge.progressPlayer2 || 0) : (challenge.progressPlayer1 || 0);
  const myName = isChallenger ? challenge.challengerName : challenge.challengedName;
  const opponentName = isChallenger ? challenge.challengedName : challenge.challengerName;
  const myPhoto = isChallenger ? challenge.challengerPhoto : challenge.challengedPhoto;
  const oppPhoto = isChallenger ? challenge.challengedPhoto : challenge.challengerPhoto;
  const myInitial = (myName || "؟").charAt(0);
  const oppInitial = (opponentName || "؟").charAt(0);

  const totalXp = (myXp + oppXp) || 1;
  const myPercent = Math.round((myXp / totalXp) * 100);
  const oppPercent = 100 - myPercent;

  const start = challenge.startTime || challenge.createdAt || Date.now();
  const elapsedMinutes = Math.floor((Date.now() - start) / 60000);
  const minutesLeft = Math.max(0, (challenge.durationMinutes || 60) - elapsedMinutes);
  const isExpired = minutesLeft <= 0;

  const isBehind = oppXp > myXp;
  const behindDiff = oppXp - myXp;
  const myLead = myXp > oppXp;
  const oppLead = oppXp > myXp;

  return {
    isChallenger,
    myXp, oppXp, myName, opponentName, myPhoto, oppPhoto,
    myInitial, oppInitial, myPercent, oppPercent, minutesLeft, isExpired,
    isBehind, behindDiff, myLead, oppLead,
  };
};

export const ActiveChallengesList: React.FC<ActiveChallengesListProps> = ({
  challenges,
  currentUser,
  onRefresh,
  onStartChallengeClick,
  onInviteFriendClick,
}) => {
  const handleFinishChallengeEarly = async (challenge: Challenge) => {
    // Prevent double-claim: only an active battle can be settled
    if (challenge.status !== "active") {
      showToast("هذا النزال لم يبدأ بعد أو تم احتسابه سابقاً.", "warning");
      return;
    }

    // Determine winner based on current score
    const score1 = challenge.progressPlayer1 || 0;
    const score2 = challenge.progressPlayer2 || 0;
    let winnerId = "";
    if (score1 > score2) {
      winnerId = challenge.challengerId;
    } else if (score2 > score1) {
      winnerId = challenge.challengedId;
    } else if (score1 > 0 || score2 > 0) {
      winnerId = "draw"; // It's a draw
    } else {
      winnerId = "tie";
    }

    // Real duel: winner is whoever collected the most focus minutes
    try {
      await updateDoc(doc(db, "challenges", challenge.id), {
        status: "completed",
        winnerId,
        completedAt: Date.now()
      });

      // Award the winner — full rewards for the most focused astronaut
      if (winnerId !== "draw" && winnerId !== "tie" && winnerId !== "") {
        const { grantChallengeReward } = await import("../../lib/xpSystem");
        await grantChallengeReward(challenge.id, winnerId);

        // Push notifications
        await addDoc(collection(db, "users", winnerId, "notifications"), {
          type: "challenge_win",
          content: `🏆 مبروك! لقد فزت بتحدي التركيز ضد ${winnerId === challenge.challengerId ? challenge.challengedName : challenge.challengerName}! تم إضافة شارة "بطل المعركة" الأسبوعية، 50 عملة، و 100 XP!`,
          read: false,
          timestamp: serverTimestamp(),
        });

        const loserId = winnerId === challenge.challengerId ? challenge.challengedId : challenge.challengerId;
        await addDoc(collection(db, "users", loserId, "notifications"), {
          type: "challenge_completed",
          content: `⚔️ انتهى السباق! فاز ${winnerId === challenge.challengerId ? challenge.challengerName : challenge.challengedName} بـ ${Math.max(score1, score2)} دقيقة مقابل ${Math.min(score1, score2)} دقيقة لك. حظاً أوفر المرة القادمة!`,
          read: false,
          timestamp: serverTimestamp(),
        });
        sendPushToUser(
          loserId,
          "انتهى النزال! ⚔️",
          `فاز ${winnerId === challenge.challengerId ? challenge.challengerName : challenge.challengedName} بـ ${Math.max(score1, score2)} دقيقة مقابل ${Math.min(score1, score2)}. عدّل النتيجة قريباً!`,
          "/OrbitX../#/duels"
        );
      } else {
        // Tie
        const msg = `🤝 انتهى السباق بالتعادل بين ${challenge.challengerName} و ${challenge.challengedName} بـ ${score1} دقيقة تركيز لكل منهما!`;
        await addDoc(collection(db, "users", challenge.challengerId, "notifications"), {
          type: "challenge_completed",
          content: msg,
          read: false,
          timestamp: serverTimestamp(),
        });
        await addDoc(collection(db, "users", challenge.challengedId, "notifications"), {
          type: "challenge_completed",
          content: msg,
          read: false,
          timestamp: serverTimestamp(),
        });
      }

      onRefresh();
    } catch (err) {
      console.error("Failed to finish challenge", err);
    }
  };

  const activeOnly = challenges.filter(c => c.status === "active");

  if (activeOnly.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-space-dark/30 backdrop-blur-md p-12 text-center max-w-2xl mx-auto">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mb-6 shadow-[0_0_30px_rgba(244,63,94,0.15)]">
          <Swords size={26} className="animate-pulse" />
        </div>
        <h3 className="text-xl font-black text-white mb-3">الساحة خالية — لا توجد نزالات نشطة</h3>
        <p className="text-gray-400 text-sm max-w-md mx-auto mb-8 leading-relaxed">
          استدعِ رفيقك وافتح نزال تركيز: كل دقيقة دراسة عادية تتحول لنقطة، وأكثرهم
          تركيزاً عند نهاية المدة يرفع راية الفوز.
        </p>
        <div className="flex flex-wrap lg:flex-nowrap justify-center gap-3">
          <button
            onClick={onStartChallengeClick}
            className="px-5 py-2.5 bg-gradient-to-l from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 transform active:scale-95"
          >
            <Swords size={13} />
            <span>إطلاق نزال تركيز</span>
          </button>
          <button
            onClick={onInviteFriendClick}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/5 rounded-xl font-bold text-xs transition-all transform active:scale-95"
          >
            استدعاء رائد فضاء جديد
          </button>
        </div>
      </div>
    );
  }

  const [mainDuel, ...restDuels] = activeOnly;

  return (
    <div className="space-y-6">
      {/* المواجهة الكبرى */}
      <MainEventDuel
        challenge={mainDuel}
        currentUser={currentUser}
        onFinish={handleFinishChallengeEarly}
      />

      {/* بقية النزالات */}
      {restDuels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {restDuels.map((challenge) => (
            <CompactDuelCard
              key={challenge.id}
              challenge={challenge}
              currentUser={currentUser}
              onFinish={handleFinishChallengeEarly}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ================= المواجهة الكبرى ================= */
const MainEventDuel: React.FC<{
  challenge: Challenge;
  currentUser: UserData;
  onFinish: (c: Challenge) => void;
}> = ({ challenge, currentUser, onFinish }) => {
  const d = deriveDuel({ challenge, currentUser });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-3xl border border-rose-500/15 bg-gradient-to-br from-[#121021] via-[#100d1a] to-[#0a0912] shadow-[0_20px_60px_rgba(244,63,94,0.12)] p-6 md:p-8"
    >
      {/* خط طاقة علوي */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${
        d.isExpired ? "from-amber-500 via-orange-400 to-amber-500" : "from-rose-500 via-fuchsia-400 to-amber-500"
      }`} />

      {/* توهجات خلفية */}
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-rose-600/12 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-fuchsia-600/8 blur-3xl pointer-events-none" />

      {/* الترويسة */}
      <div className="relative z-10 flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/12 border border-rose-500/30 text-rose-300 text-[11px] font-bold">
            <Star size={11} className="animate-pulse" />
            المواجهة الكبرى
          </span>
          <span className={`text-[11px] font-bold ${d.isExpired ? "text-amber-400" : "text-emerald-400"} tracking-wide px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5 flex items-center gap-1`}>
            {d.isExpired ? (
              <>
                <Skull size={11} />
                بانتظار التحكيم
              </>
            ) : (
              <>
                <Flame size={11} className="animate-pulse" />
                نزال مشتعل
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/5 text-gray-200 text-sm font-mono font-bold">
          <Timer size={14} className="text-amber-400" />
          <span>{d.isExpired ? "انتهى الوقت" : formatDuration(d.minutesLeft)}</span>
        </div>
      </div>

      {/* المقاتلان */}
      <div className="relative z-10 grid grid-cols-7 gap-2 items-center text-center mb-6">
        <div className="col-span-3 flex flex-col items-center">
          {d.myPhoto ? (
            <img
              src={d.myPhoto}
              alt={d.myName}
              referrerPolicy="no-referrer"
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border-2 border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.3)] group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-rose-500/20 border-2 border-rose-500/60 flex items-center justify-center text-rose-300 font-black text-2xl shadow-[0_0_30px_rgba(244,63,94,0.25)]">
              {d.myInitial}
            </div>
          )}
          <div className="text-xs text-rose-300 font-bold mt-2 truncate max-w-full">
            أنت {d.myLead && <span className="text-emerald-400">· متقدم ↑</span>}
          </div>
          <div className="text-4xl md:text-5xl font-black text-white mt-1 font-mono tracking-tight drop-shadow-[0_0_20px_rgba(244,63,94,0.4)]">
            {d.myXp} <span className="text-lg font-bold text-rose-400/80">د</span>
          </div>
        </div>

        <div className="col-span-1 flex flex-col items-center justify-center gap-1">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.35)] group-hover:scale-110 group-hover:rotate-12 transition-transform">
            <Swords size={22} />
          </div>
          <span className="text-[10px] font-black text-gray-500 tracking-widest">VS</span>
        </div>

        <div className="col-span-3 flex flex-col items-center">
          {d.oppPhoto ? (
            <img
              src={d.oppPhoto}
              alt={d.opponentName}
              referrerPolicy="no-referrer"
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border-2 border-fuchsia-500/60 shadow-[0_0_30px_rgba(217,70,239,0.3)] group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-fuchsia-500/20 border-2 border-fuchsia-500/60 flex items-center justify-center text-fuchsia-300 font-black text-2xl shadow-[0_0_30px_rgba(217,70,239,0.25)]">
              {d.oppInitial}
            </div>
          )}
          <div className="text-xs text-fuchsia-300 font-bold mt-2 truncate max-w-full">
            {d.opponentName} {d.oppLead && <span className="text-emerald-400">· متقدم ↑</span>}
          </div>
          <div className="text-4xl md:text-5xl font-black text-white mt-1 font-mono tracking-tight drop-shadow-[0_0_20px_rgba(217,70,239,0.4)]">
            {d.oppXp} <span className="text-lg font-bold text-fuchsia-400/80">د</span>
          </div>
        </div>
      </div>

      {/* شريط القوة */}
      <div className="relative z-10 mb-5">
        <div className="h-3 rounded-full bg-white/[0.04] flex overflow-hidden border border-white/6">
          <div
            style={{ width: `${d.myPercent}%` }}
            className="bg-gradient-to-r from-rose-500 to-rose-400 h-full transition-all duration-700 ease-out"
          />
          <div
            style={{ width: `${d.oppPercent}%` }}
            className="bg-gradient-to-r from-fuchsia-400 to-fuchsia-300 h-full transition-all duration-700 ease-out"
          />
        </div>
        <div className="flex justify-between text-[11px] font-mono font-bold text-gray-500 mt-1.5">
          <span className="text-rose-300/80">أنت: {d.myXp} د</span>
          <span className="text-fuchsia-300/80">الخصم: {d.oppXp} د</span>
        </div>
      </div>

      {/* تنبيه التخلف */}
      {d.isBehind && (
        <div className="relative z-10 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-400 text-xs mb-5 animate-pulse">
          <Zap size={14} className="animate-pulse shrink-0" />
          <span>خصمك يتقدم عليك بـ <strong className="font-bold font-mono">{d.behindDiff}</strong> دقيقة! شدة تزيد، البطولة ما بتتنازل 🚀</span>
        </div>
      )}

      {/* الإجراء */}
      <div className="relative z-10 flex items-center gap-3">
        {!d.isExpired && (
          <p className="flex-1 text-center py-[13px] text-[11px] font-bold text-rose-300/80 bg-rose-500/5 border border-rose-500/20 rounded-xl">
            ⚡ كل جلسات تركيزك العادية تتحول تلقائياً لنقاط بهذا النزال
          </p>
        )}
        <button
          onClick={() => onFinish(challenge)}
          className={`py-[13px] px-6 font-bold text-sm transition-all border rounded-xl cursor-pointer ${
            d.isExpired
              ? "flex-1 bg-gradient-to-l from-amber-500 to-orange-600 border-amber-500/30 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-[pulse_2s_infinite] hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
              : "bg-white/5 hover:bg-white/10 border-white/5 text-gray-300 active:scale-95 flex items-center justify-center gap-2"
          }`}
        >
          {d.isExpired ? (
            <>
              <Trophy size={14} />
              احتساب النتائج وحصد الجوائز
            </>
          ) : (
            <>
              <Skull size={14} className="text-rose-400" />
              إنهاء النزال الآن
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

/* ================= بطاقة نزال مدمجة ================= */
const CompactDuelCard: React.FC<{
  challenge: Challenge;
  currentUser: UserData;
  onFinish: (c: Challenge) => void;
}> = ({ challenge, currentUser, onFinish }) => {
  const d = deriveDuel({ challenge, currentUser });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-white/6 bg-gradient-to-br from-[#0f0e1d] to-[#0a0912] p-4 shadow-xl transition-all duration-300 hover:border-rose-500/30 hover:shadow-[0_10px_35px_rgba(244,63,94,0.15)]"
    >
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${
        d.isExpired ? "from-amber-500 via-orange-400 to-amber-500" : "from-rose-500 via-fuchsia-400 to-rose-500"
      }`} />

      <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
        <span className={`text-[10px] font-bold ${d.isExpired ? "text-amber-400" : "text-rose-400"} tracking-wide px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/5 flex items-center gap-1`}>
          {d.isExpired ? (
            <>
              <Skull size={10} />
              بانتظار التحكيم
            </>
          ) : (
            <>
              <Flame size={10} className="animate-pulse" />
              نزال مشتعل
            </>
          )}
        </span>
        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.03] border border-white/5 text-gray-300 text-[11px] font-mono font-bold">
          <Timer size={11} className="text-amber-400" />
          <span>{d.isExpired ? "انتهى" : formatDuration(d.minutesLeft)}</span>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-3">
        {/* أنا */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {d.myPhoto ? (
            <img src={d.myPhoto} alt={d.myName} referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover border-2 border-rose-500/50 shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-rose-300 font-black text-sm shrink-0">
              {d.myInitial}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[10px] text-rose-300 font-bold truncate">أنت {d.myLead && "↑"}</div>
            <div className="text-xl font-black text-white font-mono">{d.myXp} <span className="text-[10px] text-rose-400/80">د</span></div>
          </div>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500/15 to-amber-500/15 border border-rose-500/35 flex items-center justify-center text-rose-400">
            <Swords size={13} />
          </div>
          <span className="text-[8px] font-black text-gray-600 tracking-widest mt-0.5">VS</span>
        </div>

        {/* الخصم */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
          <div className="min-w-0 text-right">
            <div className="text-[10px] text-fuchsia-300 font-bold truncate">{d.opponentName} {d.oppLead && "↑"}</div>
            <div className="text-xl font-black text-white font-mono">{d.oppXp} <span className="text-[10px] text-fuchsia-400/80">د</span></div>
          </div>
          {d.oppPhoto ? (
            <img src={d.oppPhoto} alt={d.opponentName} referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover border-2 border-fuchsia-500/50 shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border-2 border-fuchsia-500/50 flex items-center justify-center text-fuchsia-300 font-black text-sm shrink-0">
              {d.oppInitial}
            </div>
          )}
        </div>
      </div>

      {/* شريط قوة صغير */}
      <div className="relative z-10 mt-3">
        <div className="h-1.5 rounded-full bg-white/[0.04] flex overflow-hidden border border-white/5">
          <div style={{ width: `${d.myPercent}%` }} className="bg-gradient-to-r from-rose-500 to-rose-400 h-full transition-all duration-700" />
          <div style={{ width: `${d.oppPercent}%` }} className="bg-gradient-to-r from-fuchsia-400 to-fuchsia-300 h-full transition-all duration-700" />
        </div>
      </div>

      {/* زر */}
      <div className="relative z-10 mt-3 flex items-center gap-2">
        {d.isBehind && !d.isExpired && (
          <span className="flex-1 text-[10px] font-bold text-amber-400 flex items-center gap-1">
            <Zap size={10} className="animate-pulse shrink-0" />
            الخصم +{d.behindDiff}
          </span>
        )}
        <button
          onClick={() => onFinish(challenge)}
          className={`py-2 px-4 font-bold text-[11px] transition-all border rounded-lg cursor-pointer flex items-center justify-center gap-1.5 ${
            d.isExpired
              ? "flex-1 bg-gradient-to-l from-amber-500 to-orange-600 border-amber-500/30 text-white shadow-[0_0_14px_rgba(245,158,11,0.25)] animate-[pulse_2s_infinite] hover:brightness-110 active:scale-95"
              : "bg-white/5 hover:bg-white/10 border-white/5 text-gray-300 active:scale-95"
          }`}
        >
          {d.isExpired ? (
            <>
              <Trophy size={11} />
              احتساب
            </>
          ) : (
            <>
              <Skull size={11} className="text-rose-400" />
              إنهاء
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};
