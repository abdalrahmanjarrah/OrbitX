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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
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
import CosmicDiary from './CosmicDiary';
import UserModal from './UserModal';
import NavLink from './NavLink';
import BlackHolesView from './BlackHolesView';
import FleetsView from './FleetsView';

export default function AnalyticsView({
  user,
  friends,
}: {
  user: UserData;
  friends: UserData[];
}) {
  // Generate some realistic-looking data based on the user's level and XP
  const studyData = React.useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);

      const baseHours = Math.max(1, (user.xp % 10) / 2);
      const hours = Math.max(0, baseHours + (Math.random() * 2 - 1));

      data.push({
        name: d.toLocaleDateString("ar-SA", { weekday: "short" }),
        "ساعات التركيز": parseFloat(hours.toFixed(1)),
      });
    }
    return data;
  }, [user.xp]);

  const friendsComparison = React.useMemo(() => {
    const list = [...friends, user]
      .sort((a, b) => b.level * 100 + b.xp - (a.level * 100 + a.xp))
      .slice(0, 5)
      .map((u) => ({
        name: u.uid === user.uid ? "أنت" : u.displayName.split(" ")[0],
        xp: u.xp + u.level * 100,
      }));
    return list;
  }, [friends, user]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 fade-in pb-20">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black font-display text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-fuchsia-400">
          لوحة الإحصائيات (Analytics)
        </h2>
        <div className="px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-xl font-bold border border-indigo-500/30">
          مجموع جلسات التركيز: {user.totalFocusSessions || 0}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-space-dark rounded-3xl p-6 border border-white/10 shadow-xl shadow-indigo-900/10 text-right">
          <h3 className="text-xl font-bold mb-6 text-white flex items-center justify-end gap-2">
            ساعات التركيز <BarChart3 className="text-indigo-400" />
          </h3>
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={studyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="name"
                  stroke="#a1a1aa"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#a1a1aa"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0b16",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  itemStyle={{
                    color: "#818cf8",
                    display: "flex",
                    flexDirection: "row-reverse",
                    gap: "4px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ساعات التركيز"
                  stroke="#818cf8"
                  strokeWidth={3}
                  dot={{ fill: "#818cf8", strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-space-dark rounded-3xl p-6 border border-white/10 shadow-xl shadow-fuchsia-900/10 text-right">
          <h3 className="text-xl font-bold mb-6 text-white flex items-center justify-end gap-2">
            تصنيفك بين الأصدقاء <Users className="text-fuchsia-400" />
          </h3>
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={friendsComparison} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#ffffff10"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  type="number"
                  stroke="#a1a1aa"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  hide
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#a1a1aa"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip
                  cursor={{ fill: "#ffffff05" }}
                  contentStyle={{
                    backgroundColor: "#0a0b16",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  itemStyle={{
                    color: "#e879f9",
                    display: "flex",
                    flexDirection: "row-reverse",
                    gap: "4px",
                  }}
                />
                <Bar
                  dataKey="xp"
                  fill="#e879f9"
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                  name="نقاط الخبرة (XP)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
