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
import QuranPlayer from "./QuranPlayer";
import PersonalTasks from "./PersonalTasks";
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

export default function SuggestionsSection({ user }: { user: UserData }) {
  const { isAr, t } = useLanguage();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [newSuggestion, setNewSuggestion] = useState("");
  const [deletingSuggestionId, setDeletingSuggestionId] = useState<
    string | null
  >(null);
  const [replyingSuggestionId, setReplyingSuggestionId] = useState<
    string | null
  >(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchSuggestions = async () => {
      try {
        const q = query(
          collection(db, "suggestions"),
          orderBy("timestamp", "desc"),
          limit(20),
        );
        const snapshot = await getDocs(q);
        if (isMounted) {
          setSuggestions(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
          );
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, "suggestions");
      }
    };
    fetchSuggestions();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async () => {
    if (!newSuggestion.trim()) return;
    try {
      await addDoc(collection(db, "suggestions"), {
        text: newSuggestion,
        userId: user.uid,
        userName: user.displayName,
        timestamp: serverTimestamp(),
      });
      setNewSuggestion("");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "suggestions");
    }
  };

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    try {
      await updateDoc(doc(db, "suggestions", id), { reply: replyText });
      setReplyingSuggestionId(null);
      setReplyText("");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `suggestions/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "suggestions", id));
      setDeletingSuggestionId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `suggestions/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <textarea
          value={newSuggestion}
          onChange={(e) => setNewSuggestion(e.target.value)}
          placeholder={isAr ? "لديك فكرة؟ شاركنا بها..." : "Have an idea? Share it with us..."}
          className={cn("w-full bg-white/5 shadow-inner border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-h-[100px]", isAr ? "text-right" : "text-left")}
          dir={isAr ? "rtl" : "ltr"}
        />
        <button
          onClick={handleSubmit}
          className={cn("absolute bottom-4 px-6 py-2 bg-blue-600 rounded-xl font-bold hover:bg-blue-700 transition-colors", isAr ? "left-4" : "right-4")}
        >
          {isAr ? "إرسال الاقتراح" : "Send Suggestion"}
        </button>
      </div>

      <div className="space-y-4">
        {suggestions.map((s) => (
          <div
            key={s.id}
            className={cn("p-4 rounded-2xl bg-space-dark shadow-lg shadow-indigo-900/10 border border-white/10", isAr ? "text-right" : "text-left")}
          >
            <div className="flex flex-col mb-2 gap-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-2 items-center">
                  {user.role === "admin" && (
                    <button
                      onClick={() => {
                        setReplyingSuggestionId(s.id);
                        setReplyText(s.reply || "");
                      }}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      رد
                    </button>
                  )}
                  {(user.role === "admin" || s.userId === user.uid) &&
                    (deletingSuggestionId === s.id ? (
                      <div className="flex items-center gap-1.5 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30">
                        <span className="text-[10px] text-red-500">حذف؟</span>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-[10px] text-red-500 font-bold"
                        >
                          نعم
                        </button>
                        <button
                          onClick={() => setDeletingSuggestionId(null)}
                          className="text-[10px] text-gray-400"
                        >
                          لا
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingSuggestionId(s.id)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        حذف
                      </button>
                    ))}
                </div>
                <span className="text-xs font-bold text-gray-400">
                  {s.userName}
                </span>
              </div>
              {replyingSuggestionId === s.id && (
                <div className="flex items-center gap-2 mt-2 bg-blue-900/20 p-2 rounded-xl border border-blue-500/30">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={isAr ? "اكتب ردك هنا..." : "Write your reply here..."}
                    className={cn("flex-1 bg-transparent text-xs text-blue-100 placeholder-blue-300/50 outline-none", isAr ? "text-right" : "text-left")}
                    dir={isAr ? "rtl" : "ltr"}
                  />
                  <button
                    onClick={() => handleReply(s.id)}
                    className="text-[10px] bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold"
                  >
                    {isAr ? "حفظ" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setReplyingSuggestionId(null);
                      setReplyText("");
                    }}
                    className="text-[10px] bg-white/10 hover:bg-white/20 text-gray-300 px-3 py-1.5 rounded-lg"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-200">{s.text}</p>
            {s.reply && (
              <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border-r-2 border-blue-500 text-xs text-blue-300">
                <span className="font-bold block mb-1">رد الإدارة:</span>
                {s.reply}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
