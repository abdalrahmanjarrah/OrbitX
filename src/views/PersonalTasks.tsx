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
  Search,
  Globe2,
  UserCircle,
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

import { FirestoreError } from "firebase/firestore";

function onSnapshot(...args: any[]) {
  // We try to catch uncaught snapshot errors
  if (args.length === 2 && typeof args[1] === "function") {
    return originalOnSnapshot(args[0], args[1], (e: any) => {
      console.error("Intercepted onSnapshot error", e, args[0]);
      handleFirestoreError(e, OperationType.GET, "snapshot_unknown");
    });
  }
  if (
    args.length === 3 &&
    typeof args[1] === "function" &&
    typeof args[2] === "function"
  ) {
    const originalError = args[2];
    args[2] = (e: any) => {
      console.error("Intercepted onSnapshot error", e, args[0]);
      originalError(e);
    };
    return originalOnSnapshot(args[0], args[1], args[2]);
  }
  return (originalOnSnapshot as any)(...args);
}

import {
  SURAHS,
  BADGES,
  MeteorEffect,
  RECITERS,
  UserData,
  Fleet,
  Discussion,
  Reply,
  ScheduleItem,
  Room,
  Challenge,
  AwarenessSignal,
  Message,
} from "../shared";
import NotificationsDropdown from "./NotificationsDropdown";
import Dashboard from "./Dashboard";
import NavPill from "./NavPill";
import MobileNavPill from "./MobileNavPill";
import DockButton from "./DockButton";
import ChallengeModal from "./ChallengeModal";
import ArticleModal from "./ArticleModal";
import HomeView from "./HomeView";
import StationCard from "./StationCard";
import ExhibitionGallery from "./ExhibitionGallery";
import SuggestionsSection from "./SuggestionsSection";
import QuranPlayer from "./QuranPlayer";
import StudyRoomView from "./StudyRoomView";
import LeaderboardView from "./LeaderboardView";
import FocusHeatmap from "./FocusHeatmap";
import ProfileView from "./ProfileView";
import DiscussionsView from "./DiscussionsView";
import ScheduleView from "./ScheduleView";
import BadgeCard from "./BadgeCard";
import CosmicDiary from "./CosmicDiary";

import UserModal from "./UserModal";
import NavLink from "./NavLink";
import BlackHolesView from "./BlackHolesView";
import FleetsView from "./FleetsView";
import { useLanguage } from "../context/LanguageContext";

export default function PersonalTasks() {
  const { isAr, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<
    { id: string; text: string; done: boolean }[]
  >(
    (() => {
      try {
        const stored = localStorage.getItem("personalFocusTasks");
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    })(),
  );
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    localStorage.setItem("personalFocusTasks", JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks([
      ...tasks,
      { id: Date.now().toString(), text: newTask.trim(), done: false },
    ]);
    setNewTask("");
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 ltr:left-6 rtl:right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-xl",
          isOpen
            ? "bg-green-600 text-white shadow-green-900/50"
            : "bg-space-dark border border-white/10 hover:bg-white/5 shadow-black/50",
        )}
        title={isAr ? "المهام الجانبية" : "Side Quests"}
      >
        <CheckSquare
          size={20}
          className={cn(
            !isOpen &&
              "text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]",
          )}
        />
        {tasks.filter((t) => !t.done).length > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0a0b16]">
            {tasks.filter((t) => !t.done).length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -20 }}
            className="fixed bottom-[88px] ltr:left-6 rtl:right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-gradient-to-br from-[#0c0c16]/95 to-[#050510]/95 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl shadow-green-900/20 max-h-[500px] flex flex-col"
            dir={isAr ? "rtl" : "ltr"}
          >
            {/* Header */}
            <div className={cn("p-4 border-b border-white/5 flex items-center justify-between bg-space-dark/80 shrink-0", isAr ? "" : "flex-row-reverse")}>
              <div className={cn("flex items-center gap-2", isAr ? "flex-row" : "flex-row-reverse")}>
                <CheckSquare
                  size={18}
                  className="text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                />
                <h3 className="font-bold text-sm tracking-wide text-white">
                  {isAr ? "المهام الجانبية" : "Side Quests"}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 pt-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              <div className="space-y-2 mb-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn("flex items-center gap-3 group p-3 shadow-sm hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/5 bg-white/[0.01]", isAr ? "flex-row" : "flex-row-reverse")}
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={
                        task.done
                          ? "text-green-400 hover:text-green-500"
                          : "text-gray-500 hover:text-green-400 transition-colors"
                      }
                    >
                      {task.done ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                    <span
                      className={cn(
                        "flex-1 break-words cursor-pointer transition-colors text-sm",
                        task.done ? "line-through text-gray-500" : "text-gray-300 hover:text-white",
                        isAr ? "text-right" : "text-left"
                      )}
                      onClick={() => toggleTask(task.id)}
                    >
                      {task.text}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity p-1.5 bg-red-500/10 rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border border-white/5 border-dashed rounded-xl mx-1 bg-white/[0.02]">
                    <CheckSquare
                      size={32}
                      className="mx-auto mb-3 opacity-30 text-green-400"
                    />
                    <p className="text-sm font-medium">
                      {isAr ? "لا توجد مهام حالياً..." : "No active quests..."}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {isAr ? "أضف مهمتك الأولى وباشر العمل" : "Add your first task and start the countdown"}
                    </p>
                  </div>
                )}
              </div>

              <div className={cn("flex gap-2 mt-auto shrink-0", isAr ? "flex-row" : "flex-row-reverse")}>
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  placeholder={isAr ? "مهمة جديدة لغزوها..." : "New quest to conquer..."}
                  className={cn("flex-1 bg-space-dark shadow-inner border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500/50 focus:bg-space-dark text-white transition-colors placeholder:text-gray-600", isAr ? "text-right" : "text-left")}
                  dir={isAr ? "rtl" : "ltr"}
                />
                <button
                  onClick={addTask}
                  disabled={!newTask.trim()}
                  className="px-4 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white disabled:opacity-50 disabled:bg-white/5 disabled:text-gray-600 rounded-xl transition-all flex items-center justify-center border border-green-500/20 disabled:border-transparent"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
