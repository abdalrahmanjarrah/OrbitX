import { playSound } from "../lib/sound";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component, useMemo } from "react";
import {
  Leaf,
  Swords,
  ChevronLeft,
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
  Bird,
  ChevronDown,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  Info,
  Keyboard,
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
  Search,
  LayoutGrid,
  List,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import StarBackground from "../components/StarBackground";
import { showToast } from "../lib/cosmicUI";

import { cn } from "../lib/utils";
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
import { UserSearchView } from "../components/UserSearchView";
import { restoreLegacyRoomsIfNeeded } from "../lib/roomsLegacyRestore";

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


import { SURAHS, BADGES, MeteorEffect, RECITERS, UserData, Fleet, Discussion, Reply, ScheduleItem, Room, Challenge, AwarenessSignal, Message } from '../shared';
import { getLevelFromXp } from '../lib/levelConfig';
import NotificationsDropdown from './NotificationsDropdown';
import Dashboard from './Dashboard';
import NavPill from './NavPill';
import MobileNavPill from './MobileNavPill';
import DockButton from './DockButton';
import ChallengeModal from './ChallengeModal';
import ArticleModal from './ArticleModal';
import StationCard from './StationCard';
import { getGreetingForTime } from '../lib/dashboardGreetings';
import { DailyHabitCard } from '../components/DailyHabitCard';
import { TimeChests } from '../components/TimeChests';
import { ReferralCard } from '../components/ReferralCard';
import ExhibitionGallery from './ExhibitionGallery';
import SuggestionsSection from './SuggestionsSection';
import QuranPlayer from './QuranPlayer';
import PersonalTasks from './PersonalTasks';
import StudyRoomView from './StudyRoomView';
import LeaderboardView from './LeaderboardView';
import FocusHeatmap from './FocusHeatmap';
import ProfileView from './ProfileView';
import DiscussionsView from './DiscussionsView';
import ScheduleView from './ScheduleView';
import BadgeCard from './BadgeCard';
import CosmicDiary from './CosmicDiary';
import UserModal from './UserModal';
import NavLink from './NavLink';
import BlackHolesView from './BlackHolesView';
import FleetsView from './FleetsView';
import { useLanguage } from "../context/LanguageContext";

const bentoContainer: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const bentoItem: any = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  },
};

export default function HomeView({
  user,
  onEnterStation,
  onSelectUser,
}: {
  user: UserData;
  onEnterStation: (id: string) => void;
  onSelectUser: (id: string) => void;
}) {
  const { isAr, t, lang } = useLanguage();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [advice, setAdvice] = useState<string>("");
  const [activeUsers, setActiveUsers] = useState<UserData[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomTask, setNewRoomTask] = useState("");
  const [newRoomImageUrl, setNewRoomImageUrl] = useState("");
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stationFilter, setStationFilter] = useState<"all" | "mine" | "private" | "public">("all");
  const [stationView, setStationView] = useState<"grid" | "list">("grid");
  const [greeting, setGreeting] = useState<{ text: string; subtext: string }>({
    text: "أهلاً بك في فضاء الإنجاز",
    subtext: "محطتك الفضائية بانتظارك للبدء."
  });

  useEffect(() => {
    setGreeting(getGreetingForTime(undefined, lang));
  }, [lang]);

  useEffect(() => {
    let unsubscribeUsers: () => void;
    let isMounted = true;

    const fetchData = async () => {
      try {
        try {
          await restoreLegacyRoomsIfNeeded(user.uid);
        } catch (e) {
          // non-fatal: restore is best-effort, never block the home view
        }
        const roomsQuery = query(
          collection(db, "rooms"),
          orderBy("createdAt", "desc"),
          limit(50),
        );
        const roomsSnap = await getDocs(roomsQuery);
        const fetchedRooms: Room[] = [];
        const now = Date.now();
        
        roomsSnap.docs.forEach((docSnap) => {
          if (!docSnap.exists()) return;
          const data = docSnap.data() as Room;
          // Filter out challenges completely from the stations view
          if (data && data.isChallenge) {
             return;
          }
          // Hide private stations the user isn't a member of (the owner always
          // sees their own station even while it's still empty).
          if (
            data &&
            data.isPrivate &&
            data.creatorId !== user.uid &&
            !data.participants?.includes(user.uid)
          ) {
            return;
          }
          if (data && data.participants?.length === 0 && data.emptyAt) {
            // emptyAt can be a Firestore Timestamp ({seconds}), a legacy ISO
            // string, or — now that rooms live in the relational table — a raw
            // epoch-milliseconds number coming through the table bridge.
            const emptyMs =
              typeof data.emptyAt === "number"
                ? data.emptyAt
                : (data.emptyAt as any).toMillis
                ? (data.emptyAt as any).toMillis()
                : (data.emptyAt as any).seconds
                ? (data.emptyAt as any).seconds * 1000
                : Date.parse(String(data.emptyAt));
            if (now - emptyMs > 300000) {
              deleteDoc(docSnap.ref).catch(() => {});
              return;
            }
          }
          if (data) fetchedRooms.push({ id: docSnap.id, ...data });
        });
        if (isMounted) setRooms(fetchedRooms);

        const adviceQuery = query(
          collection(db, "advices"),
          orderBy("timestamp", "desc"),
          limit(1),
        );
        const adviceSnap = await getDocs(adviceQuery);
        if (!adviceSnap.empty && isMounted) {
          setAdvice(adviceSnap.docs[0].data().text);
        }

        const usersQuery = query(collection(db, "profiles"), orderBy("lastActiveTime", "desc"), limit(15));
        const fetchActiveUsers = async () => {
          try {
            const snapshot = await getDocs(usersQuery);
            if (isMounted) {
              setActiveUsers(
                snapshot.docs
                  .map((doc) => doc.data() as UserData)
                  .filter((u) => u.uid !== user.uid),
              );
            }
          } catch (err) {
            console.warn("Soft fail loading online profiles: ", err);
          }
        };

        await fetchActiveUsers();
        const intervalId = setInterval(fetchActiveUsers, 180000); // 3-minute interval to optimize Firestore read consumption
        unsubscribeUsers = () => clearInterval(intervalId);

      } catch (e) {
        console.error("Error fetching home data:", e);
      }
    };
    
    fetchData();

    return () => {
      isMounted = false;
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, [user.uid]);

  const PREDEFINED_IMAGES = [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop",
  ];

  const generateJoinCode = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const handleJoinByCode = async () => {
    if (user.isGuest) {
      showToast(isAr ? "الانضمام بالرمز يتطلب حساباً مسجلاً." : "Joining by code requires a registered account.", "warning");
      return;
    }
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return;
    setJoiningByCode(true);
    try {
      const q = query(
        collection(db, "rooms"),
        where("joinCode", "==", code),
        limit(1),
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        showToast(isAr ? "رمز غير صحيح! تأكد من الرمز وجرب مجدداً." : "Invalid code!", "error");
        return;
      }
      const room = snap.docs[0];
      const roomId = room.id;
      await updateDoc(doc(db, "rooms", roomId), {
        participants: arrayUnion(user.uid),
        emptyAt: null,
      });
      onEnterStation(roomId);
    } catch (e) {
      showToast(isAr ? "تعذر الانضمام. حاول مجدداً." : "Failed to join.", "error");
    } finally {
      setJoiningByCode(false);
    }
  };

  const handleCreateRoom = async () => {
    if (user.isGuest) {
      showToast(isAr ? "إنشاء المحطات يتطلب حساباً مسجلاً." : "Creating stations requires a registered account.", "warning");
      return;
    }
    if (!newRoomName) return;
    setIsCreating(true);

    try {
      const joinCode = isPrivateRoom ? generateJoinCode() : null;
      const roomData = {
        name: newRoomName,
        task: "محطة مشتركة",
        imageUrl: newRoomImageUrl || null,
        creatorId: user.uid,
        creatorName: user.displayName,
        participants: [user.uid],
        maxParticipants: 5,
        timerStatus: "idle",
        timerDuration: 25,
        breakDuration: 5,
        isPrivate: isPrivateRoom || null,
        joinCode: joinCode,
        createdAt: serverTimestamp(),
      };

      const roomRef = await addDoc(collection(db, "rooms"), roomData);
      setShowCreateModal(false);
      setNewRoomName("");
      setNewRoomTask("");
      setNewRoomImageUrl("");
      setIsPrivateRoom(false);
      if (isPrivateRoom && joinCode) {
        showToast(
          isAr
            ? `🔒 محطتك الخاصة جاهزة! رمز الانضمام: ${joinCode} — أرسله لأصدقائك ليدخلوا إلى محطتك.`
            : `🔒 Your private station is ready! Join code: ${joinCode} — share it with friends to let them in.`,
          "success",
          6000,
        );
      }
      onEnterStation(roomRef.id);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "rooms");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredRooms = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = rooms.filter((room) => {
      if (stationFilter === "mine" && !room.participants?.includes(user.uid)) return false;
      if (stationFilter === "private" && !room.isPrivate) return false;
      if (stationFilter === "public" && room.isPrivate) return false;
      if (term && !room.name.toLowerCase().includes(term)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const aActive = a.timerStatus === "focus" ? 1 : 0;
      const bActive = b.timerStatus === "focus" ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return (b.participants?.length || 0) - (a.participants?.length || 0);
    });
  }, [rooms, searchTerm, stationFilter, user.uid]);

  return (
    <div className="w-full relative min-h-screen pb-32">
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none z-0 mix-blend-screen" />
      <div className="fixed bottom-0 right-1/4 w-[30rem] h-[30rem] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none z-0 mix-blend-screen" />
      
      <motion.div
        variants={bentoContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-10 max-w-7xl mx-auto w-full z-10 relative"
      >
        {/* Welcome Section / Deep Focus Overview */}
        <motion.div variants={bentoItem} className="flex flex-col md:flex-row items-center justify-between gap-8 pt-6">
          <div className="flex-1 space-y-4">
            <h1 className="text-4xl md:text-5xl font-black font-display text-transparent bg-clip-text bg-gradient-to-l from-white via-indigo-100 to-indigo-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {greeting.text}{isAr ? " يا " : ", "}{user.displayName}
            </h1>
            <p className="text-lg text-indigo-200/80 max-w-lg shadow-sm">
              {greeting.subtext}
            </p>
            
            <div className="flex flex-wrap gap-4 pt-2">
              {!user.isGuest && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="group relative px-6 py-3 rounded-2xl bg-[#1a1b32]/80 backdrop-blur-xl border border-indigo-500/30 overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] transition-all duration-500"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/50 to-cyan-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-center justify-center gap-3 text-white font-bold">
                    <Plus size={18} className="text-cyan-400 group-hover:rotate-90 transition-transform duration-500" />
                    <span>{t("home.create_station", "برمجة محطة جديدة")}</span>
                  </div>
                </button>
              )}

              {user.isGuest ? (
                <div className="flex items-center gap-2 rounded-2xl bg-[#1a1b32]/80 backdrop-blur-xl border border-indigo-500/20 px-4 py-3 flex-1 min-w-0">
                  <Eye size={16} className="text-indigo-400 shrink-0" />
                  <span className="text-xs text-indigo-200/80 font-medium">
                    {isAr ? "وضع المشاهدة — انضم بحسابك لإنشاء محطات أو دخول غرف خاصة" : "Guest mode — sign in to create stations or join private rooms"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-2xl bg-[#1a1b32]/80 backdrop-blur-xl border border-white/10 px-2 overflow-hidden flex-1 min-w-0">
                  <input
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
                    placeholder={isAr ? "رمز المحطة" : "Station code"}
                    className="w-24 sm:w-28 bg-transparent outline-none text-white text-sm font-mono placeholder-gray-600 p-3"
                    dir="ltr"
                    maxLength={6}
                  />
                  <button
                    onClick={handleJoinByCode}
                    disabled={joiningByCode || !joinCodeInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-colors disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Lock size={14} />
                    {joiningByCode ? "..." : isAr ? "انضم" : "Join"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4 shrink-0">
             <div className="flex flex-col justify-center px-6 py-4 rounded-3xl bg-space-dark/60 backdrop-blur-md border border-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Timer size={12} className="text-cyan-400" /> {t("home.focus_hours", "ساعات التركيز")}
                </span>
                <div className="text-3xl font-black text-white">{Math.round((user.xp / 60) * 10) / 10} <span className="text-xs font-semibold text-gray-500">{isAr ? "ساعة" : "hrs"}</span></div>
             </div>
             
             <div className="flex flex-col justify-center px-6 py-4 rounded-3xl bg-space-dark/60 backdrop-blur-md border border-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Star size={12} className="text-fuchsia-400" /> {t("home.space_rank", "المستوى")}
                </span>
                <div className="text-3xl font-black text-white">Lvl {user.level || 1} <span className="text-xs font-semibold text-gray-500"></span></div>
             </div>

             <DailyHabitCard user={user} />
          </div>
        </motion.div>

        {/* Primary Content: Active Stations */}
        <div className="flex flex-col gap-5">
           <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl md:text-2xl font-black font-display text-white flex items-center gap-3">
                 <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                 </div>
                 {t("home.active_stations", "المحطات المدارية النشطة")}
                 <span className="text-sm font-bold text-cyan-400/70 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-0.5">
                    {filteredRooms.length}
                 </span>
              </h2>
           </div>

           {/* Station Controls: Search + Filters + View Toggle */}
           <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1 min-w-0">
                 <Search size={16} className="absolute top-1/2 -translate-y-1/2 text-gray-500 ltr:left-4 rtl:right-4" />
                 <input
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   placeholder={isAr ? "ابحث عن محطة بالاسم..." : "Search stations by name..."}
                   className="w-full py-3 ltr:pl-11 ltr:pr-4 rtl:pr-11 rtl:pl-4 rounded-2xl bg-[#1a1b32]/80 backdrop-blur-xl border border-white/10 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none transition-all text-white text-sm placeholder-gray-600"
                 />
              </div>

              <div className="flex items-center gap-1.5 rounded-2xl bg-[#1a1b32]/80 backdrop-blur-xl border border-white/10 p-1 overflow-x-auto">
                 {([
                    { key: "public", label: isAr ? "عامة" : "Public", icon: Users },
                    { key: "private", label: isAr ? "خاصة" : "Private", icon: Lock },
                 ] as const).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setStationFilter(f.key)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                        stationFilter === f.key
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "text-gray-400 hover:text-white border border-transparent",
                      )}
                    >
                       <f.icon size={13} />
                       {f.label}
                    </button>
                 ))}
              </div>

              <div className="flex items-center gap-1 rounded-2xl bg-[#1a1b32]/80 backdrop-blur-xl border border-white/10 p-1">
                 <button
                   onClick={() => setStationView("grid")}
                   title={isAr ? "عرض شبكة" : "Grid view"}
                   className={cn("p-2 rounded-xl transition-all", stationView === "grid" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white")}
                 >
                    <LayoutGrid size={15} />
                 </button>
                 <button
                   onClick={() => setStationView("list")}
                   title={isAr ? "عرض قائمة" : "List view"}
                   className={cn("p-2 rounded-xl transition-all", stationView === "list" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white")}
                 >
                    <List size={15} />
                 </button>
              </div>
           </div>

           {filteredRooms.length === 0 ? (
              <motion.div variants={bentoItem} className="w-full flex flex-col items-center justify-center p-12 md:p-24 rounded-3xl bg-gradient-to-br from-[#0c0d1e]/50 to-[#050510]/50 backdrop-blur-xl border border-white/5 text-center">
                  <div className="w-24 h-24 mb-6 relative">
                      <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin opacity-50" style={{ animationDuration: '3s' }} />
                      <div className="absolute inset-2 rounded-full border-r-2 border-cyan-400 animate-spin opacity-30" style={{ animationDuration: '4s', animationDirection: 'reverse' }} />
                      <Rocket size={40} className="absolute inset-0 m-auto text-indigo-400 opacity-40" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                     {searchTerm || stationFilter !== "all"
                        ? (isAr ? "لا توجد محطات مطابقة" : "No matching stations")
                        : t("home.silent_orbit", "المدار هادئ تماماً")}
                  </h3>
                  <p className="text-indigo-200/50 max-w-sm">
                     {searchTerm || stationFilter !== "all"
                        ? (isAr ? "جرب تعديل البحث أو الفلاتر للعثور على محطات أخرى." : "Try adjusting your search or filters.")
                        : t("home.silent_orbit_desc", "لا يوجد أحد في المدار حالياً. لتكن أنت أول من يطلق محطته ويبدأ جلسة تركيز عميقة.")}
                  </p>
              </motion.div>
            ) : stationView === "list" ? (
              <div className="flex flex-col gap-3">
                 {filteredRooms.map((room) => (
                    <StationCard
                      key={room.id}
                      room={room}
                      activeUsers={activeUsers}
                      onEnter={() => onEnterStation(room.id)}
                      isAdmin={user.role === 'admin'}
                      listMode
                    />
                 ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredRooms.map((room) => (
                   <StationCard
                     key={room.id}
                     room={room}
                     activeUsers={activeUsers}
                     onEnter={() => onEnterStation(room.id)}
                     isAdmin={user.role === 'admin'}
                   />
                 ))}
              </div>
            )}
         </div>
       </motion.div>

       {/* Modals placed identically as before */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-[#000108]/90 backdrop-blur-xl" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={cn("w-full max-w-md p-8 rounded-[2rem] bg-space-dark border border-indigo-500/30 shadow-[0_0_80px_rgba(99,102,241,0.2)] relative z-10", isAr ? "text-right" : "text-left")}
              dir={isAr ? "rtl" : "ltr"}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-l from-white to-gray-400">
                  {isAr ? "تأسيس محطة تركيز جديدة" : "Deploy New Focus Station"}
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400 px-1">
                    {isAr ? "اسم المحطة الخاصة بك" : "Station Identifier Name"}
                  </label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder={isAr ? "مثال: مدار التركيز العميق..." : "e.g. Deep Coding Chambers, Science Lab..."}
                    className="w-full p-4 rounded-2xl bg-space-dark border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all text-white text-lg placeholder-gray-700"
                  />
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsPrivateRoom(!isPrivateRoom)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 p-4 rounded-2xl border transition-all",
                      isPrivateRoom
                        ? "bg-cyan-500/10 border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                        : "bg-space-dark border-white/10 hover:border-white/25",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Lock size={20} className={isPrivateRoom ? "text-cyan-400" : "text-gray-500"} />
                      <div className="text-right">
                        <p className={cn("font-bold text-sm", isPrivateRoom ? "text-cyan-300" : "text-gray-300")}>
                          {isAr ? "محطة خاصة (فقط برمز)" : "Private Station (Invite Only)"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {isAr
                            ? "أصدقاؤك يدخلون برمز سري تصنعه أنت"
                            : "Friends join with a secret code you generate"}
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "w-11 h-6 rounded-full p-0.5 transition-colors shrink-0",
                        isPrivateRoom ? "bg-cyan-500" : "bg-white/10",
                      )}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full bg-white shadow transition-transform",
                          isPrivateRoom && "translate-x-5",
                        )}
                      />
                    </div>
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-400 px-1">
                    {isAr ? "خلفية المحطة المدارية (اختياري)" : "Station Background Wall (Optional)"}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {PREDEFINED_IMAGES.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNewRoomImageUrl(url)}
                        className={cn(
                          "relative rounded-2xl overflow-hidden aspect-[4/3] border-2 transition-all object-cover hover:scale-105",
                          newRoomImageUrl === url
                            ? "border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)] opacity-100"
                            : "border-transparent opacity-40 hover:opacity-80",
                        )}
                        style={{
                          backgroundImage: `url(${url})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        {newRoomImageUrl === url && (
                          <div className="absolute inset-0 bg-indigo-500/30 flex items-center justify-center backdrop-blur-[2px]">
                            <CheckCircle size={24} className="text-white drop-shadow-md" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {newRoomImageUrl && (
                    <button
                      onClick={() => setNewRoomImageUrl("")}
                      className="text-xs font-bold text-gray-500 hover:text-red-400 transition-colors w-full text-center mt-2"
                    >
                      {isAr ? "بدون خلفية مخصصة" : "No Custom Image Background"}
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={isCreating || !newRoomName}
                className="w-full mt-8 p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:from-[#131526] disabled:to-[#131526] disabled:text-gray-500 disabled:border disabled:border-white/5 transition-all font-bold text-lg shadow-[0_0_20px_rgba(99,102,241,0.2)] disabled:shadow-none text-white flex justify-center items-center gap-2 group"
              >
                {isCreating ? (isAr ? "جاري الإطلاق الكوني..." : "Launching Cockpit Space...") : (
                  <> {isAr ? "إطلاق المحطة الفضائية" : "Deploy Cosmic Station"} <Rocket size={20} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" /> </> 
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Time Chests + Referral — at the bottom */}
      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <TimeChests user={user} />
        {!user.isGuest && <ReferralCard user={user} />}
      </div>
    </div>
  );
}
