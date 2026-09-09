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
import LeaderboardView from './LeaderboardView';
import ProfileView from './ProfileView';
import DiscussionsView from './DiscussionsView';
import ScheduleView from './ScheduleView';
import BadgeCard from './BadgeCard';
import CosmicDiary from './CosmicDiary';
import UserModal from './UserModal';
import NavLink from './NavLink';
import BlackHolesView from './BlackHolesView';
import FleetsView from './FleetsView';

export default function FocusHeatmap() {
  const history: Record<string, number> = React.useMemo(() => {
    const hist: Record<string, number> = {};
    const today = new Date();
    for (let i = 59; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const isRecent = i < 15;
      if (Math.random() > (isRecent ? 0.3 : 0.6)) {
        hist[dateStr] = Math.floor(Math.random() * 150);
      }
    }
    return hist;
  }, []);

  const today = new Date();
  const days = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }

  const getDayColor = (minutes: number) => {
    if (minutes === 0) return "bg-space-dark border-white/5";
    if (minutes < 30) return "bg-fuchsia-900/60 border-fuchsia-500/20";
    if (minutes < 60) return "bg-fuchsia-600/80 border-fuchsia-400/40";
    if (minutes < 120)
      return "bg-purple-500 border-purple-400/60 shadow-[0_0_8px_rgba(168,85,247,0.5)]";
    return "bg-purple-300 border-purple-200 shadow-[0_0_12px_rgba(216,180,254,0.8)] animate-pulse";
  };

  return (
    <div className="p-6 rounded-3xl glass border border-fuchsia-500/10 space-y-4">
      <h4 className="text-sm font-bold text-white flex items-center justify-end gap-2">
        <span>نشاط المجرة (التركيز)</span>
        <Activity size={16} className="text-fuchsia-400" />
      </h4>
      <div className="flex flex-wrap gap-1.5 justify-end" dir="ltr">
        {days.map((d, i) => {
          const dateStr = d.toISOString().split("T")[0];
          const minutes = history[dateStr] || 0;
          return (
            <div
              key={i}
              className={cn(
                "w-3 h-3 md:w-3.5 md:h-3.5 rounded-sm border transition-all hover:scale-150 cursor-help",
                getDayColor(minutes),
              )}
              title={`${dateStr}: ${minutes} دقيقة`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2 text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-widest">
        <span>أكثر</span>
        <div className="w-2.5 h-2.5 rounded-sm bg-purple-300 border border-purple-200"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-purple-500 border border-purple-400/60"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-fuchsia-600/80 border border-fuchsia-400/40"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-fuchsia-900/60 border border-fuchsia-500/20"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-space-dark border border-white/5"></div>
        <span>أقل</span>
      </div>
    </div>
  );
}
