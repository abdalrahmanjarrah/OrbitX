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
import { confirmDialog } from "../lib/cosmicUI";

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
import NotificationsDropdown from './NotificationsDropdown';
import Dashboard from './Dashboard';
import NavPill from './NavPill';
import MobileNavPill from './MobileNavPill';
import DockButton from './DockButton';
import ChallengeModal from './ChallengeModal';
import ArticleModal from './ArticleModal';
import HomeView from './HomeView';
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

const bentoItem: any = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  },
};

export default function StationCard({
  room,
  activeUsers,
  onEnter,
  isAdmin,
  listMode,
}: {
  room: Room;
  activeUsers?: UserData[];
  onEnter: () => void;
  isAdmin?: boolean;
  listMode?: boolean;
}) {
  const { isAr, t } = useLanguage();
  const [uptime, setUptime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      let accumulatedFocusSeconds = room.accumulatedFocusSeconds || 0;
      if (room.timerStatus === "focus" && room.startTime) {
        const rawStart: any = room.startTime;
        const start = typeof rawStart === "string"
          ? new Date(rawStart).getTime()
          : typeof rawStart === "number"
            ? rawStart
            : rawStart.toMillis
              ? rawStart.toMillis()
              : rawStart.seconds ? rawStart.seconds * 1000 : Date.now();
        accumulatedFocusSeconds += Math.max(0, Math.floor((Date.now() - start) / 1000));
      }
      if (accumulatedFocusSeconds < 60) {
        setUptime(isAr ? "نشط الآن" : "Active Now");
      } else if (accumulatedFocusSeconds < 3600) {
        setUptime(
          isAr
            ? `${Math.floor(accumulatedFocusSeconds / 60)} د`
            : `${Math.floor(accumulatedFocusSeconds / 60)}m`
        );
      } else {
        setUptime(
          isAr
            ? `${Math.floor(accumulatedFocusSeconds / 3600)} س`
            : `${Math.floor(accumulatedFocusSeconds / 3600)}h`
        );
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [room.accumulatedFocusSeconds, room.timerStatus, room.startTime, isAr]);

  const isFocusing = room.timerStatus === "focus";

  if (listMode) {
    return (
      <motion.div
        variants={bentoItem}
        onClick={onEnter}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onEnter(); }}
        className={cn(
          "relative rounded-2xl px-4 py-3 md:px-5 md:py-4 flex items-center gap-3 md:gap-4 overflow-hidden group cursor-pointer border transition-all duration-500 hover:-translate-y-0.5 hover:border-cyan-500/30 hover:bg-[#0e0f22]",
          isAr ? "text-right" : "text-left",
          isFocusing
            ? "bg-space-dark border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.12)]"
            : "bg-[#0a0b18] border-white/5"
        )}
        style={room.imageUrl ? { backgroundImage: `linear-gradient(120deg, rgba(8,9,20,0.94), rgba(15,17,35,0.7)), url(${room.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        <div className={cn("shrink-0 px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 text-[10px] md:text-xs font-bold border", isFocusing ? "bg-indigo-500/20 text-indigo-200 border-indigo-400/30" : "bg-white/5 text-gray-400 border-white/10")}>
          <div className={cn("w-1.5 h-1.5 rounded-full", isFocusing ? "bg-cyan-400 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" : "bg-gray-500")} />
          {isFocusing ? (isAr ? "تدفق" : "Focus") : (isAr ? "مدار" : "Orbit")}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {room.isPrivate && (
              <span className="inline-flex items-center gap-1 bg-cyan-600/90 font-bold text-white px-1.5 py-0.5 rounded-md text-[11px]">
                <Lock size={9} /> {isAr ? "خاص" : "Private"}
              </span>
            )}
            <h4 className="font-black font-display text-white text-sm md:text-base truncate">
              {room.name}
            </h4>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] md:text-xs font-bold text-indigo-300/80 mt-0.5">
            <Timer size={12} className={isFocusing ? "text-cyan-400/80 animate-pulse" : "text-gray-500"} />
            <span>{uptime}</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center shrink-0">
          {room.participants.slice(0, 4).map((p, i) => {
            const userMatch = activeUsers?.find((u) => u.uid === p);
            return (
              <div
                key={i}
                className={cn("w-6 h-6 md:w-7 md:h-7 rounded-full border-2 border-[#090a16] bg-gray-800 overflow-hidden relative z-10", isAr ? "-ml-1.5 first:ml-0" : "-mr-1.5 first:mr-0")}
                title={userMatch?.displayName || (isAr ? "رائد" : "Pilot")}
              >
                <img src={userMatch?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p}`} alt="user" className="w-full h-full object-cover" />
              </div>
            );
          })}
          {room.participants.length > 4 && (
            <div className={cn("w-6 h-6 md:w-7 md:h-7 rounded-full border-2 border-[#090a16] bg-indigo-600/80 flex items-center justify-center text-[11px] font-black text-white", isAr ? "-ml-1.5" : "-mr-1.5")}>
              +{room.participants.length - 4}
            </div>
          )}
        </div>

        <div className={cn("flex items-center gap-1 text-[11px] font-black tracking-wide text-indigo-400/80 group-hover:text-cyan-300 transition-colors uppercase shrink-0", isAr ? "flex-row" : "flex-row-reverse")}>
          <span className="hidden md:inline">{isAr ? "استكشاف" : "Explore"}</span>
          <ChevronLeft size={13} className={cn("transition-transform duration-300", isAr ? "group-hover:-translate-x-1" : "group-hover:translate-x-1 rotate-180")} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={bentoItem}
      onClick={onEnter}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onEnter(); }}
      className={cn(
        "relative rounded-[1.75rem] p-5 flex flex-col justify-between aspect-[1.12/1] sm:aspect-square md:aspect-[1.08/1] overflow-hidden group cursor-pointer border transition-all duration-700 hover:-translate-y-2",
        isAr ? "text-right" : "text-left",
        room.imageUrl ? "border-transparent" : (isFocusing ? "bg-space-dark border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.15)]" : "bg-space-dark border-white/5 hover:border-white/10")
      )}
      style={
        room.imageUrl
          ? { backgroundImage: `linear-gradient(135deg, rgba(8, 9, 20, 0.9) 0%, rgba(15, 17, 35, 0.6) 100%), url(${room.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : {}
      }
    >
      {/* Orbital/Planetary Effects */}
      {!room.imageUrl && isFocusing && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
           {/* Center Planet Glow */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-500/20 blur-[40px] rounded-full mix-blend-screen group-hover:scale-110 transition-transform duration-1000" />
           {/* Orbit Rings */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-indigo-500/10 rounded-full border-dashed animate-[spin_10s_linear_infinite]" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-cyan-500/10 rounded-full border-dotted animate-[spin_15s_linear_infinite_reverse]" />
           {/* Corner Nebulas */}
           <div className="absolute -top-20 -right-20 w-64 h-64 bg-fuchsia-500/10 blur-[60px] rounded-full group-hover:bg-fuchsia-500/20 transition-colors duration-700" />
           <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/5 blur-[50px] rounded-full group-hover:bg-cyan-500/10 transition-colors duration-700" />
        </div>
      )}

      {/* Header logic */}
      <div className={cn("relative z-10 flex items-start justify-between", isAr ? "flex-row" : "flex-row-reverse")}>
         <div className={cn("px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 text-[11px] md:text-xs font-bold border shadow-sm", isFocusing ? "bg-indigo-500/20 text-indigo-200 border-indigo-400/30" : "bg-white/5 text-gray-400 border-white/10")}>
            <div className={cn("w-1.5 h-1.5 rounded-full", isFocusing ? "bg-cyan-400 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" : "bg-gray-500")} />
            {isFocusing 
              ? (isAr ? "حالة التدفق" : "Flow State") 
              : (isAr ? "في المدار" : "In Orbit")}
         </div>
         {isAdmin && (
            <button
               onClick={async (e) => { e.stopPropagation(); if(await confirmDialog(isAr ? 'حذف المحطة؟' : 'Delete station?', { title: isAr ? 'حذف المحطة' : 'Delete station', danger: true })) await deleteDoc(doc(db, "rooms", room.id)).catch(()=>{}); }}
               className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-full transition-colors backdrop-blur-md"
            >
               <Trash2 size={13} />
            </button>
         )}
      </div>

      {/* Main Content */}
      <div className="relative z-10 mt-auto pb-3 md:pb-4">
         {room.isChallenge && (
            <div className="inline-flex items-center gap-1 bg-fuchsia-600 font-bold text-white px-2 py-0.5 rounded-md text-[11px] mb-1.5 shadow-sm shadow-fuchsia-600/30">
               <Swords size={10} /> {isAr ? "تحدي خاص" : "Private Duel"}
            </div>
         )}
         {room.isPrivate && (
            <div className="inline-flex items-center gap-1 bg-cyan-600/90 font-bold text-white px-2 py-0.5 rounded-md text-[11px] mb-1.5 shadow-sm shadow-cyan-600/30">
               <Lock size={10} /> {isAr ? "خاص برمز" : "Invite Only"}
            </div>
         )}
         <h4 className="text-xl sm:text-2xl font-black font-display text-white mb-1.5 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-l group-hover:from-white group-hover:to-cyan-300 transition-all duration-500 leading-tight">
            {room.name}
         </h4>
         <div className={cn("flex items-center gap-1.5 text-xs sm:text-sm font-bold text-indigo-300/80", isAr ? "flex-row" : "flex-row-reverse")}>
            <Timer size={13} className={isFocusing ? "text-cyan-400/80 animate-pulse" : "text-gray-500"} /> <span>{uptime}</span>
         </div>
      </div>

      {/* Footer / Participants */}
      <div className={cn("relative z-10 pt-3 border-t border-white/5 flex justify-between items-center bg-gradient-to-t from-[#000]/40 to-transparent -mx-5 px-5 -mb-5 h-14 md:h-[3.75rem] backdrop-blur-[2px]", isAr ? "flex-row" : "flex-row-reverse")}>
         <div className={cn("flex items-center w-1/2 justify-end", isAr ? "flex-row-reverse -space-x-2.5" : "flex-row space-x-1")}>
            {room.participants.slice(0, 4).map((p, i) => {
              const userMatch = activeUsers?.find((u) => u.uid === p);
              return (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-[#090a16] bg-gray-800 overflow-hidden relative z-10 hover:z-20 transform transition-all duration-300 hover:scale-125 shadow-lg"
                  title={userMatch?.displayName || (isAr ? "رائد" : "Pilot")}
                >
                  <img src={userMatch?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p}`} alt="user" className="w-full h-full object-cover" />
                </div>
              );
            })}
            {room.participants.length > 4 && (
              <div className="w-7 h-7 rounded-full border-2 border-[#090a16] bg-indigo-600/80 backdrop-blur-sm flex items-center justify-center text-[11px] font-black text-white relative z-10 shadow-lg">
                +{room.participants.length - 4}
              </div>
            )}
         </div>
         <div className={cn("flex items-center gap-1 text-[11px] font-black tracking-wide text-indigo-400/80 group-hover:text-cyan-300 transition-colors uppercase", isAr ? "flex-row" : "flex-row-reverse")}>
            <span>{isAr ? "استكشاف" : "Explore"}</span> 
            <ChevronLeft size={13} className={cn("transition-transform duration-300", isAr ? "group-hover:-translate-x-1" : "group-hover:translate-x-1 rotate-180")} />
         </div>
      </div>
    </motion.div>
  );
}
