const Joyride = React.lazy(() =>
  import("react-joyride").then((m) => ({ default: m.Joyride })),
);
import { playSound } from "../lib/sound";
import { useRenderLog } from "../firebaseDebug";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component } from "react";
import {
  Leaf,
  Swords,
  Rocket,
  Timer,
  Users,
  Zap,
  Star,
  LogOut,
  LayoutDashboard,
  MessageSquare,
  User as UserIcon,
  Heart,
  ShieldAlert,
  AlertTriangle,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Lock,
  Send,
  Image as ImageIcon,
  Plus,
  X,
  MessageCircle,
  Calendar,
  Shield,
  Trash2,
  Music,
  CloudRain,
  Flame,
  Wind,
  ChevronDown,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  Info,
  Waves,
  TrainFront,
  Mic,
  MicOff,
  Headphones,
  Settings,
  Radio,
  Trophy,
  Menu,
  Square,
  Store,
  BookOpen,
  Target,
  Telescope,
  Award,
  Activity,
  Eye,
  Terminal as TerminalIcon,
  Cpu,
  CheckSquare,
  Bell,
  BarChart3,
  Search, Globe2, UserCircle, UserPlus, Map as MapIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import StarBackground from "../components/StarBackground";

import { cn } from "../lib/utils";
import { showToast } from "../lib/cosmicUI";
import { buildInviteLink } from "../lib/share";
import FeatureBoundary from "../components/FeatureBoundary";
import {
  auth,
  db,
  signInWithGoogle,
  logout,
  handleFirestoreError,
  OperationType,
} from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot as originalOnSnapshot,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  where,
  deleteDoc,
  deleteField,
  writeBatch,
} from "firebase/firestore";
import { FirestoreError } from 'firebase/firestore';

function onSnapshot(...args: any[]) {
    // We try to catch uncaught snapshot errors
    if (args.length === 2 && typeof args[1] === 'function') {
        return originalOnSnapshot(args[0], args[1], (e: any) => {
            console.error('Intercepted onSnapshot error', e, args[0]);
            handleFirestoreError(e, OperationType.GET, 'snapshot_unknown');
        });
    }
    if (args.length === 3 && typeof args[1] === 'function' && typeof args[2] === 'function') {
        const originalError = args[2];
        args[2] = (e: any) => {
            console.error('Intercepted onSnapshot error', e, args[0]);
            originalError(e);
        };
        return originalOnSnapshot(args[0], args[1], args[2]);
    }
    return (originalOnSnapshot as any)(...args);
}


import { SURAHS, BADGES, MeteorEffect, RECITERS, UserData, Fleet, Discussion, Reply, ScheduleItem, Room, Challenge, AwarenessSignal, Message, getTourSteps } from '../shared';
import { getLevelFromXp, getLevelProgress, getLevelColor } from '../lib/levelConfig';
import NotificationsDropdown from './NotificationsDropdown';
import NavPill from './NavPill';
import MobileNavPill from './MobileNavPill';
import DockButton from './DockButton';
import ChallengeModal from './ChallengeModal';
import ArticleModal from './ArticleModal';
import StationCard from './StationCard';
import UserModal from './UserModal';
import NavLink from './NavLink';
import { useLanguage } from "../context/LanguageContext";

// Lazy-Loaded Cinematic Sector Components (Code-Splitting)
const HomeView = React.lazy(() => import('./HomeView'));
const StudyRoomView = React.lazy(() => import('./StudyRoomView'));
const LeaderboardView = React.lazy(() => import('./LeaderboardView'));
const ProfileView = React.lazy(() => import('./ProfileView'));
const DiscussionsView = React.lazy(() => import('./DiscussionsView'));
const ScheduleView = React.lazy(() => import('./ScheduleView'));
const AdminView = React.lazy(() => import('./AdminView'));
const SupportView = React.lazy(() => import('./SupportView'));
const BlackHolesView = React.lazy(() => import('./BlackHolesView'));
const AwarenessView = React.lazy(() => import('./AwarenessView'));
const ChallengesHubView = React.lazy(() => import('./ChallengesHubView'));
const FleetsView = React.lazy(() => import('./FleetsView'));
const UserSearchView = React.lazy(() => import('../components/UserSearchView').then((m) => ({ default: m.UserSearchView })));
const SystemMapView = React.lazy(() => import('./SystemMapView'));

export default function Dashboard({
  user,
  onLogout,
  onLogin,
}: {
  user: UserData | null;
  onLogout: () => void;
  onLogin?: () => void;
}) {
  const { lang, isAr, t, toggleLanguage } = useLanguage();
  useRenderLog("Dashboard", { userEmail: user?.email });
  const isGuest = !!user?.isGuest;
  const guestAllowedTabs = ["home", "discussions", "leaderboard", "blackholes"] as const;
  const isMapOwner = user?.email === "abdalrahmanjarrah94@gmail.com";
  const [activeTab, setActiveTab] = useState<
    | "home"
    | "chat"
    | "search"
    | "profile"
    | "discussions"
    | "schedule"
    | "admin"
    | "leaderboard"
    | "awareness"
    | "blackholes"
    | "fleets"
    | "support"
    | "challenges"
    | "systemmap"
  >("home");
  const [activeStation, setActiveStation] = useState<string | null>(null);

  // Automatically pull the user back into their active station if they are already in one (e.g., opened in a new tab or recovered session)
  useEffect(() => {
    if (!user?.uid) return;

    try {
      const q = query(
        collection(db, "rooms"),
        where("participants", "array-contains", user.uid)
      );

      getDocs(q).then((snap) => {
        if (!snap.empty) {
          const activeRoom = snap.docs[0];
          console.log("[Dashboard] Auto-loaded active station:", activeRoom.id);
          setActiveStation(activeRoom.id);
        }
      }).catch((err) => {
        console.warn("[Dashboard] Error looking up active user stations on mount:", err);
      });
    } catch (e) {
      console.warn("[Dashboard] Error in active station lookup effect:", e);
    }
  }, [user?.uid]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [runTour, setRunTour] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const activityTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Removed automatically forced onboarding tutorial round/flow.
  // Optional button in top bar triggers tour manually.

  const handleJoyrideCallback = (data: any) => {
    const { status, index } = data;
    if (["finished", "skipped"].includes(status)) {
      setRunTour(false);
      localStorage.setItem("hasSeenTour_v3", "true");
      return;
    }
    // Sub-nav pills are grouped by category, so switch the active tab to the
    // category that contains the upcoming step's target element.
    if (typeof index === "number") {
      const tabForStep: Record<number, string> = {
        2: "discussions",
        3: "schedule",
        4: "leaderboard",
      };
      const tab = tabForStep[index];
      if (tab && tab !== activeTab) handleTabChange(tab as typeof activeTab);
    }
  };

  if (!user) return null;

  if (activeStation) {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-space-dark flex flex-col items-center justify-center relative">
          <Rocket className="w-12 h-12 text-indigo-400 animate-bounce" />
          <p className="text-xs text-indigo-300 font-mono tracking-widest mt-4 animate-pulse">
            {isAr ? "بروتوكول تهيئة المحطة..." : "INITIALIZING SECTOR PORTAL..."}
          </p>
        </div>
      }>
        <FeatureBoundary name="station">
          <StudyRoomView
            user={user}
            stationId={activeStation}
            onExit={() => setActiveStation(null)}
            onSelectUser={setSelectedUserId}
          />
        </FeatureBoundary>
      </React.Suspense>
    );
  }

  const focusTabs = isGuest
    ? ["home", "blackholes"]
    : ["home", "schedule", "challenges", "blackholes"];
  const communityTabs = isGuest
    ? ["discussions", "leaderboard"]
    : ["search", "discussions", "fleets", "leaderboard", "awareness"];
  const profileTabs = isGuest ? [] : ["profile", "admin", "support"];

  let currentCategory = "focus";
  if (communityTabs.includes(activeTab as string)) currentCategory = "community";
  else if (profileTabs.includes(activeTab as string)) currentCategory = "profile";

  const setCategory = (cat: string) => {
    if (cat === "focus") handleTabChange("home");
    if (cat === "community") handleTabChange(isGuest ? "leaderboard" : "search");
    if (cat === "profile") handleTabChange(isGuest ? "home" : "profile");
  };

  const handleInviteCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildInviteLink(user.uid));
      showToast(
        isAr
          ? "تم نسخ رابط دعوتك — لما يسجل صديقك تكسب 100 XP! 🚀"
          : "Invite link copied — once your friend joins you earn 100 XP! 🚀",
        "success",
      );
    } catch (err) {
      console.warn("Failed copying invite link:", err);
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    if (isGuest && !(guestAllowedTabs as readonly string[]).includes(tab as string)) {
      setActiveTab("home");
      return;
    }
    if (tab === "systemmap" && !isMapOwner) {
      setActiveTab("home");
      return;
    }
    setActiveTab(tab);
    let activity = "في لوحة القيادة المركزية";
    if (tab === "profile") activity = "يعاين الهوية الفضائية";
    if (tab === "discussions") activity = "في مجلس الحكماء الفضائي";
    if (tab === "schedule") activity = "يبرمج مسار الرحلة";
    if (tab === "leaderboard") activity = "يراقب التصنيف المجري 🏆";
    if (tab === "admin") activity = "في غرفة القيادة العليا 🛡️";
    if (tab === "awareness") activity = "يستقبل إشارات الوعي 📡";
    if (tab === "challenges") activity = "يستعد لسباقات التركيز";
    if (tab === "blackholes") activity = "يتفادى الثقوب السوداء 🌌";
    if (tab === "fleets") activity = "يدير الأسطول المجري 🌌";
    if (tab === "support") activity = "يرفع اقتراحات للدعم الفني 📡";
    if (tab === "search") activity = "يستكشف رواد الفضاء الجدد 📡";
    if (tab === "systemmap") activity = "يفحص خريطة النظام 🗺️";

    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    activityTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, "users", user.uid), { currentActivity: activity }).catch(() => {});
    }, 4000);
  };

  return (
    <div className="min-h-screen relative flex flex-col font-sans overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200" dir={isAr ? "rtl" : "ltr"}>
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-space-dark z-[-2]" />
      <StarBackground />
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay z-[-1]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat' }} />
      
      {/* Cosmic Gradient Overlays */}
      <div className="fixed top-[-10%] -left-64 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen z-[-1]" />
      <div className="fixed top-1/2 -right-64 w-[800px] h-[800px] bg-fuchsia-600/5 rounded-full blur-[150px] pointer-events-none mix-blend-screen z-[-1]" />

      <React.Suspense fallback={null}>
        <Joyride
        steps={getTourSteps(window.innerWidth < 1024)}
        run={runTour}
        continuous
        showSkipButton
        showProgress
        callback={handleJoyrideCallback}
        styles={{
           // @ts-ignore
          options: {
            primaryColor: "#6366f1", backgroundColor: "#0b0c16", textColor: "#fff", arrowColor: "#0b0c16", zIndex: 1000,
          },
        }}
        locale={{ back: "السابق", close: "إغلاق", last: "إنهاء", next: "التالي", skip: "تخطي" }}
      />
      </React.Suspense>

      <AnimatePresence>
        {selectedUserId && (
          <UserModal
            userId={selectedUserId}
            currentUserId={user.uid}
            currentUser={user}
            onClose={() => setSelectedUserId(null)}
          />
        )}
      </AnimatePresence>

      {/* Modern Floating Top Nav */}
      <nav 
        className={cn(
           "fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl rounded-full transition-all duration-500 px-2 py-2 flex items-center justify-between border",
           scrolled 
             ? "bg-space-dark/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border-white/10"
             : "bg-space-dark/40 backdrop-blur-md border-transparent shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        )}
      >
        <div className="flex items-center">
            {/* Desktop Animated Logo */}
            <div className="hidden md:flex items-center gap-2 pr-2 pl-6 cursor-pointer group" onClick={() => handleTabChange("home")}>
              <div className="relative flex items-center justify-center w-8 h-8">
                <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-transparent border-t-indigo-400 border-l-fuchsia-400 rounded-full animate-[spin_4s_linear_infinite]"></div>
                <div className="absolute inset-1 border-2 border-transparent border-b-cyan-400 border-r-indigo-400 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
                <div className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10 group-hover:scale-125 transition-transform" />
              </div>
              <span className="font-display font-black text-white text-xl tracking-wider uppercase drop-shadow-md">
                Orbit<span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-fuchsia-400">X</span>
              </span>
            </div>

            {/* Contextual Sub-Nav Categories */}
            <div className="hidden md:flex items-center bg-black/40 p-1 rounded-full border border-white/5">
              {currentCategory === "focus" && (
                <>
                  <NavPill icon={<LayoutDashboard size={14} />} label={t("nav.home", "المحطات")} active={activeTab === "home"} onClick={() => handleTabChange("home")} className="tour-step-home" />
                  {!isGuest && <NavPill icon={<Calendar size={14} />} label={t("nav.schedule", "الجدول")} active={activeTab === "schedule"} onClick={() => handleTabChange("schedule")} className="tour-step-schedule" />}
                  {!isGuest && <NavPill icon={<Swords size={14} />} label={t("nav.challenges", "النزالات")} active={activeTab === "challenges"} onClick={() => handleTabChange("challenges")} />}
                  <NavPill icon={<Target size={14} />} label={t("nav.blackholes", "الثقوب السوداء")} active={activeTab === "blackholes"} onClick={() => handleTabChange("blackholes")} />
                  {isMapOwner && <NavPill icon={<MapIcon size={14} />} label={t("nav.systemmap", "خريطة النظام")} active={activeTab === "systemmap"} onClick={() => handleTabChange("systemmap")} />}
                </>
              )}
              {currentCategory === "community" && (
                <>
                  {!isGuest && <NavPill icon={<Search size={14} />} label={t("nav.search", "بحث")} active={activeTab === "search"} onClick={() => handleTabChange("search")} />}
                  <NavPill icon={<MessageCircle size={14} />} label={t("nav.discussions", "النقاشات")} active={activeTab === "discussions"} onClick={() => handleTabChange("discussions")} className="tour-step-discussions" />
                  {!isGuest && <NavPill icon={<Users size={14} />} label={t("nav.fleets", "الأساطيل")} active={activeTab === "fleets"} onClick={() => handleTabChange("fleets")} />}
                  <NavPill icon={<Trophy size={14} />} label={t("nav.leaderboard", "لوحة الصدارة")} active={activeTab === "leaderboard"} onClick={() => handleTabChange("leaderboard")} className="tour-step-leaderboard" />
                  {/* قسم الوعي (Awareness) مخفي مؤقتاً — يمكن إرجاعه بإزالة التعليق:
                  <NavPill icon={<Radio size={14} />} label={t("nav.awareness", "الوعي")} active={activeTab === "awareness"} onClick={() => handleTabChange("awareness")} className="tour-step-awareness" />
                  */}
                </>
              )}
              {currentCategory === "profile" && (
                <>
                  {!isGuest && <NavPill icon={<UserIcon size={14} />} label={t("nav.profile", "الملف")} active={activeTab === "profile"} onClick={() => handleTabChange("profile")} />}
                  {!isGuest && <NavPill icon={<Info size={14} />} label={t("nav.support", "الدعم والاقتراحات")} active={activeTab === "support"} onClick={() => handleTabChange("support")} />}
                  {!isGuest && user.role === "admin" && (
                    <NavPill icon={<Shield size={14} />} label={t("nav.admin", "الإدارة")} active={activeTab === "admin"} onClick={() => handleTabChange("admin")} />
                  )}
                </>
              )}
            </div>

            {/* Mobile Title View */}
            <div className="md:hidden flex items-center gap-2 pr-3">
              <div className="relative flex items-center justify-center w-6 h-6">
                <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-transparent border-t-indigo-400 border-l-fuchsia-400 rounded-full animate-[spin_4s_linear_infinite]"></div>
                <div className="absolute inset-0.5 border-2 border-transparent border-b-cyan-400 border-r-indigo-400 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
                <div className="absolute w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10" />
              </div>
              <span className="font-display font-black text-white text-[16px] drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] tracking-wide uppercase">
                {currentCategory === 'focus' ? <>Orbit<span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-fuchsia-400">X</span> Focus</> : (currentCategory === 'community' ? <>Orbit<span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-fuchsia-400">X</span> Social</> : <>Orbit<span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-fuchsia-400">X</span> Profile</>)}
              </span>
            </div>
        </div>

        <div className="flex items-center justify-end gap-3 pl-1">
          {/* Language Toggle */}
          <button
            onClick={() => {
              toggleLanguage();
              playSound("timer");
            }}
            className="p-2 hover:bg-white/10 text-gray-400 hover:text-indigo-400 rounded-full transition-colors flex items-center justify-center relative group"
            title={lang === "ar" ? "Switch to English" : "العربية"}
          >
            <Globe2 size={18} className={cn(lang === "en" ? "text-indigo-400 animate-pulse" : "text-gray-400")} />
            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800/50 px-2 py-0.5 rounded whitespace-nowrap shadow-xl">
              {lang === "ar" ? "English" : "العربية"}
            </span>
          </button>

          {/* Manual Tour Trigger (Lightweight guidance) */}
          <button
            onClick={() => {
              setRunTour(true);
              playSound("timer");
            }}
            className="p-2 hover:bg-white/10 text-gray-400 hover:text-indigo-400 rounded-full transition-colors flex items-center justify-center relative group"
            title={t("top.tour", "بدء الجولة الإرشادية")}
          >
            <Info size={18} />
            <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800/50 px-2 py-0.5 rounded whitespace-nowrap">{t("top.tour_sub", "🧭 جولة سريعة")}</span>
          </button>

          {!isGuest && (
            <div className="md:border-l md:border-white/10 md:pl-2">
              <NotificationsDropdown
                userId={user.uid}
                userName={user.displayName}
                userPhoto={user.photoURL}
                onOpenChallenges={() => handleTabChange("challenges")}
              />
            </div>
          )}

          {!isGuest && (
            <button
              onClick={handleInviteCopy}
              className="p-2 hover:bg-white/10 text-gray-400 hover:text-fuchsia-400 rounded-full transition-colors flex items-center justify-center relative group"
              title={isAr ? "ادعُ صديقاً إلى المجرة" : "Invite a friend to the galaxy"}
            >
              <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all text-[10px] bg-indigo-950 text-fuchsia-300 border border-fuchsia-800/50 px-2 py-0.5 rounded whitespace-nowrap shadow-xl">
                {isAr ? "ادعُ صديقاً 🚀" : "Invite a friend 🚀"}
              </span>
              <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-fuchsia-500 text-white rounded-full px-1.5 py-0.5 shadow-[0_0_10px_rgba(217,70,239,0.6)]">
                +100
              </span>
            </button>
          )}

          <div
            className="tour-step-stats flex items-center gap-2.5 bg-gradient-to-r from-indigo-500/10 to-transparent hover:bg-indigo-500/20 transition-all border border-indigo-500/20 rounded-full p-1 pl-3 cursor-pointer backdrop-blur-xl group"
            onClick={() => handleTabChange("profile")}
          >
            <div className="hidden md:flex flex-col gap-0.5">
              <div className="text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                LVL {user.level || 1}
              </div>
              <div className="w-20 h-1.5 bg-indigo-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-full transition-all"
                  style={{ width: `${getLevelProgress(user.xp, user.level || 1)}%` }}
                />
              </div>
            </div>

            <div className="relative">
              <div className="w-9 h-9 rounded-full border-2 border-indigo-500/40 overflow-hidden bg-space-dark shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                  alt="avatar"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-[7px] font-black text-white rounded-full w-4 h-4 flex items-center justify-center border border-indigo-400 shadow-md">
                {user.level || 1}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Guest Mode Banner */}
      {isGuest && (
        <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-5xl">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border border-indigo-500/20 bg-indigo-950/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2.5 text-indigo-200 text-xs md:text-sm font-bold">
              <Eye size={16} className="text-indigo-400 shrink-0" />
              <span className="hidden sm:inline">
                {isAr ? "أنت في وضع المشاهدة — شاهد المحطات والنقاشات والتصنيف دون حفظ أي تقدم." : "You're in guest mode — watch stations, discussions, and the leaderboard without saving any progress."}
              </span>
              <span className="sm:hidden">
                {isAr ? "وضع المشاهدة — لا يُحفظ أي تقدم" : "Guest mode — progress isn't saved"}
              </span>
            </div>
            {onLogin && (
              <button
                onClick={onLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:scale-105 active:scale-95 transition-all text-white text-xs font-black whitespace-nowrap"
              >
                <Rocket size={14} />
                {isAr ? "سجّل وأطلق مجرتك" : "Sign in & launch"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-4 lg:px-8 pt-28 pb-32 z-10 transition-all duration-300">
        <AnimatePresence mode="wait">
          <motion.div
             key={activeTab}
             initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
             animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
             exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
             transition={{ duration: 0.3 }}
             className="h-full"
          >
            <React.Suspense fallback={
              <div className="flex flex-col items-center justify-center min-h-[400px] w-full relative">
                <Rocket className="w-10 h-10 text-indigo-400 animate-bounce" />
                <p className="text-[10px] text-indigo-300 font-mono tracking-widest mt-4 animate-pulse uppercase">
                  {isAr ? "تحميل قطاع المدار الفضائي..." : "CONNECTING TO SECTOR PROTOCOL..."}
                </p>
              </div>
            }>
              {activeTab === "home" && (
                <FeatureBoundary name="home">
                  <HomeView user={user} onEnterStation={(id) => setActiveStation(id)} onSelectUser={setSelectedUserId} />
                </FeatureBoundary>
              )}
              {activeTab === "search" && (
                <FeatureBoundary name="search">
                  <UserSearchView user={user} onSelectUser={setSelectedUserId} />
                </FeatureBoundary>
              )}
              {activeTab === "profile" && (
                <FeatureBoundary name="profile">
                  <ProfileView user={user} />
                </FeatureBoundary>
              )}
              {activeTab === "discussions" && (
                <FeatureBoundary name="discussions">
                  <DiscussionsView user={user} />
                </FeatureBoundary>
              )}
              {activeTab === "schedule" && (
                <FeatureBoundary name="schedule">
                  <ScheduleView user={user} />
                </FeatureBoundary>
              )}
              {activeTab === "challenges" && (
                <FeatureBoundary name="challenges">
                  <ChallengesHubView user={user} onSelectUser={setSelectedUserId} />
                </FeatureBoundary>
              )}
              {activeTab === "leaderboard" && (
                <FeatureBoundary name="leaderboard">
                  <LeaderboardView user={user} onSelectUser={setSelectedUserId} />
                </FeatureBoundary>
              )}
              {activeTab === "admin" && (
                <FeatureBoundary name="admin">
                  <AdminView user={user} />
                </FeatureBoundary>
              )}
              {activeTab === "support" && (
                <FeatureBoundary name="support">
                  <SupportView user={user} />
                </FeatureBoundary>
              )}
              {activeTab === "awareness" && (
                <FeatureBoundary name="awareness">
                  <AwarenessView user={user} />
                </FeatureBoundary>
              )}
              {activeTab === "blackholes" && (
                <FeatureBoundary name="blackholes">
                  <BlackHolesView user={user} />
                </FeatureBoundary>
              )}
              {activeTab === "fleets" && (
                <FeatureBoundary name="fleets">
                  <FleetsView user={user} />
                </FeatureBoundary>
              )}
              {activeTab === "systemmap" && isMapOwner && (
                <FeatureBoundary name="systemmap">
                  <SystemMapView />
                </FeatureBoundary>
              )}
            </React.Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Contextual Nav Helper */}
      <div className="tour-step-menu-mobile md:hidden fixed bottom-[90px] left-1/2 -translate-x-1/2 z-40 w-max pointer-events-none">
          <div className="pointer-events-auto flex gap-2 overflow-x-auto px-4 no-scrollbar">
            {currentCategory === "focus" && (
                <>
                  <MobileNavPill icon={<LayoutDashboard size={14} />} label={t("nav.home", "المحطات")} active={activeTab === "home"} onClick={() => handleTabChange("home")} />
                  {!isGuest && <MobileNavPill icon={<Calendar size={14} />} label={t("nav.schedule", "الجدول")} active={activeTab === "schedule"} onClick={() => handleTabChange("schedule")} />}
                  {!isGuest && <MobileNavPill icon={<Swords size={14} />} label={t("nav.challenges", "النزالات")} active={activeTab === "challenges"} onClick={() => handleTabChange("challenges")} className="tour-step-challenges-mobile" />}
                  <MobileNavPill icon={<Target size={14} />} label={t("nav.blackholes", "الثقوب السوداء")} active={activeTab === "blackholes"} onClick={() => handleTabChange("blackholes")} />
                  {isMapOwner && <MobileNavPill icon={<MapIcon size={14} />} label={t("nav.systemmap", "خريطة النظام")} active={activeTab === "systemmap"} onClick={() => handleTabChange("systemmap")} />}
                </>
            )}
            {/* ... Mobile Sub-nav for others ... */}
            {currentCategory === "community" && (
                <>
                  {!isGuest && <MobileNavPill icon={<Search size={14} />} label={t("nav.search", "بحث")} active={activeTab === "search"} onClick={() => handleTabChange("search")} />}
                  <MobileNavPill icon={<MessageCircle size={14} />} label={t("nav.discussions", "مجلس الحكماء")} active={activeTab === "discussions"} onClick={() => handleTabChange("discussions")} />
                  {!isGuest && <MobileNavPill icon={<Users size={14} />} label={t("nav.fleets", "الأساطيل")} active={activeTab === "fleets"} onClick={() => handleTabChange("fleets")} />}
                  <MobileNavPill icon={<Trophy size={14} />} label={t("nav.leaderboard", "لوحة الصدارة")} active={activeTab === "leaderboard"} onClick={() => handleTabChange("leaderboard")} />
                </>
            )}
            {currentCategory === "profile" && (
                <>
                  {!isGuest && <MobileNavPill icon={<UserIcon size={14} />} label={t("nav.profile", "الملف")} active={activeTab === "profile"} onClick={() => handleTabChange("profile")} />}
                  {!isGuest && <MobileNavPill icon={<Info size={14} />} label={t("nav.support", "الدعم والاقتراحات")} active={activeTab === "support"} onClick={() => handleTabChange("support")} />}
                  {!isGuest && user.role === "admin" && (
                    <MobileNavPill icon={<Shield size={14} />} label={t("nav.admin", "الإدارة")} active={activeTab === "admin"} onClick={() => handleTabChange("admin")} />
                  )}
                </>
            )}
          </div>
      </div>

      {/* Floating Bottom Dock */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 bg-space-dark/80 backdrop-blur-xl p-2 rounded-full border border-white/12 shadow-[0_25px_65px_rgba(0,0,0,0.9),0_0_30px_rgba(99,102,241,0.06)] hover:border-white/20 transition-all duration-300 relative isolate before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-gradient-to-t before:from-white/[0.04] before:to-transparent before:shadow-[inset_y_1px_rgba(255,255,255,0.15)]">
          <DockButton
            icon={<Rocket size={20} />}
            label={t("cat.focus", "التركيز")}
            active={currentCategory === "focus"}
            onClick={() => setCategory("focus")}
            colorClass="from-indigo-600 to-indigo-400"
            glowClass="bg-indigo-500/30"
          />
          <DockButton
            icon={<Globe2 size={20} />}
            label={t("cat.community", "المجرة")}
            active={currentCategory === "community"}
            onClick={() => setCategory("community")}
            colorClass="from-fuchsia-600 to-pink-500"
            glowClass="bg-fuchsia-500/30"
          />
          {!isGuest && (
            <DockButton
              icon={<UserCircle size={20} />}
              label={t("cat.profile", "الهوية")}
              active={currentCategory === "profile"}
              onClick={() => setCategory("profile")}
              colorClass="from-cyan-600 to-emerald-400"
              glowClass="bg-cyan-500/30"
            />
          )}
        </div>
      </div>
    </div>
  );
}
