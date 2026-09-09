import { playSound } from "../lib/sound";
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
  Search, Globe2, UserCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import StarBackground from "../components/StarBackground";

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
import { getLevelFromXp, getLevelColor } from '../lib/levelConfig';
import NotificationsDropdown from './NotificationsDropdown';
import Dashboard from './Dashboard';
import NavPill from './NavPill';
import MobileNavPill from './MobileNavPill';
import DockButton from './DockButton';
import ChallengeModal from './ChallengeModal';
import ArticleModal from './ArticleModal';
import HomeView from './HomeView';
import StationCard from './StationCard';
import ExhibitionGallery from './ExhibitionGallery';
import SuggestionsSection from './SuggestionsSection';
import QuranPlayer from './QuranPlayer';
import PersonalTasks from './PersonalTasks';
import StudyRoomView from './StudyRoomView';
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

export default function LeaderboardView({
  user,
  onSelectUser,
}: {
  user: UserData;
  onSelectUser: (id: string) => void;
}) {
  const { isAr, lang } = useLanguage();
  const [leaders, setLeaders] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchLeaders = async () => {
      try {
        setLoading(true);
        setError(null);
        const q = query(
          collection(db, "profiles"),
          orderBy("xp", "desc"),
          limit(50),
        );
        const snapshot = await getDocs(q);
        if (isMounted) {
          setLeaders(
            snapshot.docs
              .map((doc) => doc.data() as UserData)
              .filter((u) => u && u.displayName),
          );
          setLoading(false);
        }
      } catch (e: any) {
        handleFirestoreError(e, OperationType.GET, "profiles_leaderboard");
        if (isMounted) {
          setError(isAr ? "تعذر تحميل قائمة المتصدرين. تحقق من اتصالك بالإنترنت." : "Failed to load leaderboard. Check your internet connection.");
          setLoading(false);
        }
      }
    };
    fetchLeaders();
    return () => { isMounted = false; };
  }, [isAr]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("max-w-4xl mx-auto", isAr ? "text-right" : "text-left")}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className={cn("flex items-center justify-between mb-8", isAr ? "flex-row" : "flex-row-reverse")}>
        <h2 className="text-3xl font-black flex items-center gap-3">
          <Trophy className="text-yellow-400" size={32} />
          {isAr ? "لوحة الصدارة" : "Cosmic Leaderboard"}
        </h2>
        <div className="px-4 py-2 bg-space-dark shadow-lg shadow-indigo-900/10 rounded-xl border border-white/10 text-sm text-gray-400">
          {isAr ? "أفضل 50 رائد فضاء" : "Top 50 Astronauts"}
        </div>
      </div>

      <div className="bg-space-dark shadow-lg shadow-indigo-900/10 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-lg bg-space-dark/60">
        <div className={cn("grid grid-cols-12 gap-2 md:gap-4 p-4 border-b border-white/10 text-sm font-bold text-gray-400", isAr ? "text-right" : "text-left")}>
          <div className="col-span-2 md:col-span-1 text-center">{isAr ? "المركز" : "Rank"}</div>
          <div className="col-span-5 md:col-span-6">{isAr ? "الرائد" : "Astronaut"}</div>
          <div className="col-span-2 text-center">{isAr ? "المستوى" : "Lvl"}</div>
          <div className="col-span-3 text-center">{isAr ? "نقاط الخبرة (XP)" : "XP"}</div>
        </div>

        <div className="divide-y divide-white/5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">{isAr ? "جارٍ تحميل المتصدرين..." : "Loading leaderboard..."}</span>
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <Zap size={20} className="text-red-400" />
              </div>
              <span className="text-sm text-red-400 font-semibold">{error}</span>
            </div>
          )}
          {!loading && !error && leaders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-4xl">🌌</span>
              <span className="text-sm text-gray-400">{isAr ? "لا يوجد رائد فضاء في القائمة بعد" : "No astronauts on the leaderboard yet"}</span>
            </div>
          )}
          {!loading && !error && leaders.map((leader, index) => {
            const rankStyle =
              index === 0
                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                : index === 1
                  ? "bg-gray-300/20 text-gray-300 border-gray-300/30"
                  : index === 2
                    ? "bg-amber-700/20 text-amber-600 border-amber-700/30"
                    : "bg-space-dark shadow-lg shadow-indigo-900/10 text-gray-400 border-white/10";

            const medalTier =
              index === 0
                ? {
                    icon: "🏆",
                    ring: "border-yellow-400/70 shadow-[0_0_16px_rgba(251,191,36,0.45)]",
                    bar: "bg-gradient-to-r from-yellow-400/80 via-amber-300/60 to-yellow-500/40",
                  }
                : index === 1
                  ? {
                      icon: "🥈",
                      ring: "border-gray-200/70 shadow-[0_0_14px_rgba(203,213,225,0.4)]",
                      bar: "bg-gradient-to-r from-slate-300/80 via-gray-300/60 to-slate-400/40",
                    }
                  : index === 2
                    ? {
                        icon: "🥉",
                        ring: "border-orange-600/60 shadow-[0_0_12px_rgba(217,119,6,0.35)]",
                        bar: "bg-gradient-to-r from-amber-700/80 via-orange-800/60 to-amber-900/40",
                      }
                    : null;

            return (
              <motion.div
                key={leader.uid}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "grid grid-cols-12 gap-2 md:gap-4 p-4 items-center transition-colors hover:bg-space-dark shadow-lg shadow-indigo-900/10 relative",
                  leader.uid === user.uid && "bg-indigo-500/10",
                )}
              >
                {medalTier && (
                  <div className={cn("absolute right-0 top-0 h-full w-1", medalTier.bar)} />
                )}

                <div className="col-span-2 md:col-span-1 flex justify-center">
                  {medalTier ? (
                    <div
                      className={cn(
                        "w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center bg-black/50 border-2 text-lg md:text-xl",
                        medalTier.ring,
                      )}
                    >
                      <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]">{medalTier.icon}</span>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold border",
                        rankStyle,
                      )}
                    >
                      {index + 1}
                    </div>
                  )}
                </div>

                <div className={cn("col-span-5 md:col-span-6 flex items-center gap-3", isAr ? "flex-row" : "flex-row-reverse justify-end")}>
                  <button
                    onClick={() => onSelectUser(leader.uid)}
                    className="relative group shrink-0"
                  >
                    <img
                      src={leader.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${leader.uid}`}
                      className="w-10 h-10 rounded-full border border-white/10 group-hover:border-indigo-400 transition-colors"
                      referrerPolicy="no-referrer"
                    />
                    {leader.uid === user.uid && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-[#0a0a1a] flex items-center justify-center">
                        <Star size={8} className="text-white" />
                      </div>
                    )}
                  </button>
                  <div className={cn("flex flex-col overflow-hidden", isAr ? "text-right" : "text-left")}>
                    <button
                      onClick={() => onSelectUser(leader.uid)}
                      className={cn("font-bold hover:text-indigo-500 transition-colors truncate", isAr ? "text-right" : "text-left")}
                    >
                      {leader.displayName}
                    </button>
                    <span
                      className={cn(
                        "text-[10px] font-bold truncate",
                        getLevelColor(getLevelFromXp(leader.xp)).text,
                      )}
                    >
                      {'Level ' + getLevelFromXp(leader.xp)}
                    </span>
                  </div>
                </div>

                <div className="col-span-2 flex justify-center">
                  <div className="px-2 md:px-3 py-1 bg-space-dark/80 shadow-lg shadow-indigo-900/10 rounded-lg font-mono font-bold text-indigo-500 text-[10px] md:text-sm">
                    {leader.level}
                  </div>
                </div>

                <div className="col-span-3 flex justify-center">
                  <div className="flex items-center gap-1 font-mono font-bold text-yellow-400 whitespace-nowrap">
                    <Zap size={14} className="hidden sm:block" />
                    {(leader.xp ?? 0).toLocaleString()}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
