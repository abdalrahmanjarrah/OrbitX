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

import { useLanguage } from '../context/LanguageContext';

export default function ExhibitionGallery() {
  const [exhibitions, setExhibitions] = useState<any[]>([]);
  const { isAr } = useLanguage();

  useEffect(() => {
    let isMounted = true;
    const fetchExhibitions = async () => {
      try {
        const q = query(
          collection(db, "exhibitions"),
          orderBy("timestamp", "desc"),
          limit(8),
        );
        const snapshot = await getDocs(q);
        if (isMounted) {
          setExhibitions(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
          );
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, "exhibitions_global");
      }
    };
    fetchExhibitions();
    return () => { isMounted = false; };
  }, []);

  return (
    <>
      {exhibitions.map((ex) => (
        <motion.div
          key={ex.id}
          whileHover={{ scale: 1.05 }}
          className="aspect-square rounded-3xl overflow-hidden border border-white/10 bg-space-dark shadow-lg shadow-indigo-900/10 relative group"
        >
          {ex.url ? (
            <img
              src={ex.url}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-space-dark flex items-center justify-center text-[10px] text-gray-500 font-mono">LOADING</div>
          )}
          <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
            <span className="text-[10px] font-bold text-indigo-500">
              {ex.userName}
            </span>
          </div>
        </motion.div>
      ))}
      {exhibitions.length === 0 && (
        <p className="col-span-full text-gray-500 text-sm italic py-10 text-center">
          {isAr ? "المعرض فارغ حالياً" : "The exhibition is currently empty"}
        </p>
      )}
    </>
  );
}
