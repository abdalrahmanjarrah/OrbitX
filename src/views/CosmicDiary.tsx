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
import FocusHeatmap from './FocusHeatmap';
import ProfileView from './ProfileView';
import DiscussionsView from './DiscussionsView';
import ScheduleView from './ScheduleView';
import BadgeCard from './BadgeCard';
import UserModal from './UserModal';
import NavLink from './NavLink';
import BlackHolesView from './BlackHolesView';
import FleetsView from './FleetsView';

export default function CosmicDiary({
  user,
  exhibitions,
  isOwner,
}: {
  user: UserData;
  exhibitions: any[];
  isOwner?: boolean;
}) {
  const milestones = [];

  milestones.push({
    title: "يوم الانطلاق",
    description: isOwner
      ? "بداية الرحلة الكونية في المنصة 🚀"
      : "بداية رحلته الكونية في المنصة 🚀",
    color: "bg-indigo-500",
    icon: <Rocket size={18} />,
  });

  if (user.totalFocusSessions && user.totalFocusSessions > 0) {
    milestones.push({
      title: "أول إرساء فضائي",
      description: isOwner
        ? "إتمام أول جلسة تركيز بنجاح! ⏱️"
        : "أتم أول جلسة تركيز بنجاح! ⏱️",
      color: "bg-fuchsia-500",
      icon: <Timer size={18} />,
    });
  }

  if (user.xp >= 100) {
    milestones.push({
      title: "كسر حاجز الغلاف الجوي",
      description: "تم الوصول إلى 100 نجمة ضوئية (XP) 🌟",
      color: "bg-blue-500",
      icon: <Target size={18} />,
    });
  }

  if (exhibitions && exhibitions.length > 0) {
    milestones.push({
      title: "الإشارة الأولى",
      description: isOwner
        ? `تم مشاركة أول اكتشاف في محطة المعرض 📸`
        : `شارك أول اكتشاف في محطة المعرض 📸`,
      color: "bg-pink-500",
      icon: <ImageIcon size={18} />,
    });
  }

  if (user.level > 1) {
    milestones.push({
      title: `ترقية المستوى !`,
      description: isOwner
        ? `تم الوصول إلى المستوى ${user.level} في التسلسل القيادي للأسطول الفضائي! 🎖️`
        : `وصل إلى المستوى ${user.level} في التسلسل القيادي! 🎖️`,
      color: "bg-orange-500",
      icon: <Award size={18} />,
    });
  }

  if (user.badges && user.badges.length > 0) {
    milestones.push({
      title: "وسام كوني جديد!",
      description: isOwner
        ? "تم استحقاق وسام جدارة لتسجيل نقطة مهمة في الرحلة 🏅"
        : "استحق وسام جدارة لتسجيل نقطة مهمة 🏅",
      color: "bg-violet-500",
      icon: <Activity size={18} />,
    });
  }

  if (user.xp && user.xp >= 1000) {
    const focusHours = Math.round(user.xp / 60);
    milestones.push({
      title: "ريادة الفضاء",
      description: isOwner
        ? `إتمام أكثر من ${focusHours} ساعة تركيز كرواد فضاء معتمدين 🚀`
        : `إكمال أكثر من ${focusHours} ساعة تركيز 🚀`,
      color: "bg-cyan-600",
      icon: <Rocket size={18} />,
    });
  }

  const sortedMilestones = [...milestones].reverse();

  return (
    <div className="p-6 rounded-3xl bg-space-dark/80 backdrop-blur-xl border border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-transparent"></div>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
          <BookOpen size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">
            مذكرات الرحلة الكونية
          </h3>
          <p className="text-sm text-gray-400">
            {isOwner
              ? "سجل الإنجازات والمحطات المهمة في مسيرتك الفضائية"
              : "سجل الإنجازات والمحطات المهمة في مسيرته الفضائية"}
          </p>
        </div>
      </div>

      <div className="relative border-r-2 border-indigo-500/20 pr-8 space-y-8 mt-6 mr-2">
        {sortedMilestones.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative"
            viewport={{ once: true }}
          >
            <div
              className={`absolute -right-[43px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-4 border-[#0a0b16] flex items-center justify-center ${m.color} text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10`}
            >
              {m.icon}
            </div>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-default relative overflow-hidden group ml-4">
              <div className="absolute top-0 right-0 w-1 h-full bg-white/10 group-hover:bg-white/20 transition-colors" />
              <h4 className="text-white font-bold mb-1 text-sm">{m.title}</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                {m.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
