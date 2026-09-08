import React, { useState, useEffect } from "react";
import { Flame, Swords, Trophy, RefreshCw, Loader2 } from "lucide-react";
import { UserData, Challenge } from "../shared";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { ChallengesHero } from "../components/challenges/ChallengesHero";
import { ActiveChallengesList } from "../components/challenges/ActiveChallengesList";
import { ChallengeInvites } from "../components/challenges/ChallengeInvites";
import { HowChallengesWork } from "../components/challenges/HowChallengesWork";
import { ChallengeHistory } from "../components/challenges/ChallengeHistory";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../lib/utils";
import { showToast } from "../lib/cosmicUI";

interface ChallengesHubViewProps {
  user: UserData;
  onSelectUser: (userId: string) => void;
}

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  count?: number;
  accent?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, count, accent = "text-rose-400" }) => (
  <div className="flex items-center justify-between gap-4 mb-5">
    <div className="flex items-center gap-2.5">
      <span className={cn("w-8 h-8 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center", accent)}>
        {icon}
      </span>
      <h2 className="text-lg font-black text-white tracking-tight">{title}</h2>
      {typeof count === "number" && count > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-[11px] font-bold text-rose-300 font-mono">
          {count}
        </span>
      )}
    </div>
  </div>
);

export default function ChallengesHubView({
  user,
  onSelectUser,
}: ChallengesHubViewProps) {
  const { isAr, t } = useLanguage();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAllChallenges = async () => {
    setLoading(true);
    try {
      const challengesRef = collection(db, "challenges");

      // 1. Fetch challenger challenges
      const q1 = query(challengesRef, where("challengerId", "==", user.uid));
      const snap1 = await getDocs(q1);
      const list1 = snap1.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Challenge);

      // 2. Fetch challenged challenges
      const q2 = query(challengesRef, where("challengedId", "==", user.uid));
      const snap2 = await getDocs(q2);
      const list2 = snap2.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Challenge);

      // 3. Merge & deduplicate
      const mergedMap = new Map<string, Challenge>();
      list1.forEach(c => mergedMap.set(c.id, c));
      list2.forEach(c => mergedMap.set(c.id, c));

      // 4. Sort by creation date descending
      const sorted = Array.from(mergedMap.values()).sort((a, b) => b.createdAt - a.createdAt);
      setChallenges(sorted);
    } catch (err) {
      console.error("Failed loading Hub challenges data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllChallenges();
  }, [user.uid]);

  // Derive categories
  const incomingInvites = challenges.filter(c => c.status === "pending" && c.challengedId === user.uid);
  const outgoingInvites = challenges.filter(c => c.status === "pending" && c.challengerId === user.uid);
  const activeChallenges = challenges.filter(c => c.status === "active");
  const completedChallenges = challenges.filter(c => c.status === "completed");
  const winsCount = completedChallenges.filter(c => c.winnerId === user.uid).length;

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleInviteFriendClick = () => {
    const element = document.getElementById("mobile-search-tab-trigger");
    if (element) {
      element.click();
    } else {
      showToast(
        isAr
          ? "يمكنك استدعاء مقاتلين جدد للمجرة عبر التوجه لقسم 'البحث' والبحث عنهم!"
          : "You can invite new fighters to the galaxy by heading to the Radar & Explore section and searching for them!",
        "info",
      );
    }
  };

  return (
    <div className={cn("space-y-12 pb-32", isAr ? "text-right" : "text-left")} dir={isAr ? "rtl" : "ltr"}>
      {/* 1. حلبة النزالات — HERO */}
      <ChallengesHero
        activeCount={activeChallenges.length}
        invitesCount={incomingInvites.length + outgoingInvites.length}
        winsCount={winsCount}
        onStartChallengeClick={() => scrollTo("challenges-command-center")}
        onInviteFriendClick={handleInviteFriendClick}
        friendsCount={user.friendsCount || 0}
        isAdmin={user.role === "admin"}
      />

      {/* 2. النزالات المشتعلة */}
      <section id="active-duels" className="scroll-mt-24">
        <SectionHeader
          icon={<Flame size={15} />}
          title={isAr ? "نزالات مشتعلة" : "Burning Duels"}
          count={activeChallenges.length}
        />
        {loading && challenges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-3xl border border-white/5 bg-space-dark/20">
            <Loader2 size={32} className="text-rose-500 animate-spin mb-4" />
            <span className="text-xs text-gray-500 font-mono">
              {isAr ? "تحديث رادار الفضاء..." : "Scanning deep space radar..."}
            </span>
          </div>
        ) : (
          <ActiveChallengesList
            challenges={challenges}
            currentUser={user}
            onRefresh={fetchAllChallenges}
            onStartChallengeClick={() => scrollTo("challenges-command-center")}
            onInviteFriendClick={handleInviteFriendClick}
          />
        )}
      </section>

      {/* 3. مركز القيادة — فتح نزال + الطلبات */}
      <section id="challenges-command-center" className="scroll-mt-24">
        <SectionHeader
          icon={<Swords size={15} />}
          title={isAr ? "مركز القيادة" : "Command Center"}
          count={incomingInvites.length + outgoingInvites.length}
          accent="text-amber-400"
        />
        <ChallengeInvites
          incomingInvites={incomingInvites}
          outgoingInvites={outgoingInvites}
          currentUser={user}
          onRefresh={fetchAllChallenges}
        />
      </section>

      {/* 4. سجل النزالات */}
      <section id="challenge-history" className="scroll-mt-24">
        <SectionHeader
          icon={<Trophy size={15} />}
          title={isAr ? "سجل النزالات" : "Duel History"}
          count={completedChallenges.length}
          accent="text-amber-400"
        />
        <ChallengeHistory challenges={challenges} currentUser={user} />
      </section>

      {/* 5. كيف تعمل النزالات */}
      <HowChallengesWork />
    </div>
  );
}
