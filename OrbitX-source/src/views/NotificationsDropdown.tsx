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
import { showToast } from "../lib/cosmicUI";
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

export default function NotificationsDropdown({
  userId,
  userName,
  userPhoto,
  onOpenChallenges,
}: {
  userId: string;
  userName?: string;
  userPhoto?: string;
  onOpenChallenges?: () => void;
}) {
  const { isAr, t } = useLanguage();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [globalNotifs, setGlobalNotifs] = useState<any[]>([]);
  const [readGlobal, setReadGlobal] = useState<string[]>(
    JSON.parse(localStorage.getItem("readGlobalNotifs") || "[]"),
  );
  const [isOpen, setIsOpen] = useState(false);
  const prevUnreadCountRef = useRef(0);

  useEffect(() => {
    const q = query(
      collection(db, "users", userId, "notifications"),
      orderBy("timestamp", "desc"),
      limit(20),
    );
    const unsub = onSnapshot(q, (snap) => {
      const notifs: any[] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const unreadCount = notifs.filter((n) => !n.read).length;
      prevUnreadCountRef.current = unreadCount;
      setNotifications(notifs);
    });

    const qGlobal = query(
      collection(db, "global_notifications"),
      orderBy("timestamp", "desc"),
      limit(10),
    );
    const unsubGlobal = onSnapshot(qGlobal, (snap) => {
      setGlobalNotifs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsub();
      unsubGlobal();
    };
  }, [userId]);

  const unreadCount =
    notifications.filter((n) => !n.read).length +
    globalNotifs.filter((n) => !readGlobal.includes(n.id)).length;

  const markAllRead = () => {
    notifications.forEach((n) => {
      if (!n.read)
        updateDoc(doc(db, "users", userId, "notifications", n.id), {
          read: true,
        });
    });

    const newReadGlobal = Array.from(
      new Set([...readGlobal, ...globalNotifs.map((n) => n.id)]),
    );
    setReadGlobal(newReadGlobal);
    localStorage.setItem("readGlobalNotifs", JSON.stringify(newReadGlobal));
  };

  const handleAcceptFriendRequest = async (notif: any) => {
    try {
      const batch = writeBatch(db);
      const myFriendRef = doc(db, "users", userId, "friends", notif.senderId);
      const otherFriendRef = doc(
        db,
        "users",
        notif.senderId,
        "friends",
        userId,
      );

      batch.set(myFriendRef, { timestamp: serverTimestamp() });
      batch.set(otherFriendRef, { timestamp: serverTimestamp() });
      batch.update(doc(db, "users", userId), { friendsCount: increment(1) });
      batch.update(doc(db, "users", notif.senderId), {
        friendsCount: increment(1),
      });
      batch.delete(doc(db, "users", userId, "notifications", notif.id));

      await batch.commit();

      // Notify the requester that their request was accepted
      if (notif.senderId && notif.senderId !== userId) {
        addDoc(collection(db, "users", notif.senderId, "notifications"), {
          type: "friend_request_accepted",
          content: `قبل ${userName || "شخص"} طلب صداقتك! أنتم الآن رفقاء في الفضاء. 🚀`,
          senderId: userId,
          senderName: userName || "",
          senderPhoto: userPhoto || "",
          read: false,
          timestamp: serverTimestamp(),
        }).catch(() => {});
      }

      showToast("تم قبول طلب الصداقة! أنتم الآن رفقاء فضاء.", "success");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeclineFriendRequest = async (notifId: string) => {
    try {
      await deleteDoc(doc(db, "users", userId, "notifications", notifId));
    } catch (e) {}
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) markAllRead();
        }}
        className="tour-step-notifications relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5 border border-transparent hover:border-white/10"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-0 mt-2 w-72 bg-space-dark border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden"
            dir={isAr ? "rtl" : "ltr"}
          >
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <span className="font-bold text-sm">{isAr ? "الإشعارات" : "Notifications"}</span>
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {globalNotifs.map((n) => (
                <div
                  key={n.id}
                  className="p-3 border-b border-indigo-500/30 text-sm bg-indigo-900/20"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert size={14} className="text-fuchsia-400" />
                    <span className="font-bold text-fuchsia-400">
                      إعلان إداري
                    </span>
                  </div>
                  <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">
                    {n.text}
                  </p>
                </div>
              ))}
              {notifications.length === 0 && globalNotifs.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  لا توجد إشعارات
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 border-b border-white/5 text-sm ${n.read ? "opacity-70" : "bg-white/5"}`}
                  >
                    {n.type === "friend_request" ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              n.senderPhoto ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${n.senderName || n.id}`
                            }
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="font-bold text-indigo-400">
                            {n.senderName}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300">{n.content}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptFriendRequest(n);
                            }}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-1 rounded-lg transition-colors"
                          >
                            قبول
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeclineFriendRequest(n.id);
                            }}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] font-bold py-1 rounded-lg transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : n.type === "challenge" ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {n.senderPhoto ? (
                            <img
                              src={n.senderPhoto}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <Swords size={14} className="text-amber-400" />
                          )}
                          <span className="font-bold text-amber-400">
                            {isAr ? "تحدي دراسي" : "Study Challenge"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300">{n.content}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onOpenChallenges?.();
                          }}
                          className="w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-[10px] font-bold py-1.5 rounded-lg transition-colors"
                        >
                          عرض التحدي
                        </button>
                      </div>
                    ) : n.type === "support_reply" ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Shield size={14} className="text-emerald-400" />
                          <span className="font-bold text-emerald-400">
                            {isAr ? "رد الإدارة" : "Admin Reply"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300">{n.content}</p>
                      </div>
                    ) : (
                      n.content
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
