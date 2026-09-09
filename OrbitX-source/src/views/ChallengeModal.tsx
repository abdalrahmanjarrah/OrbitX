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
import { ChallengeDebugger } from "../challengeDebug";

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

export default function ChallengeModal({
  user,
  onClose,
}: {
  user: UserData;
  onClose: () => void;
}) {
  const [friends, setFriends] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [customDuration, setCustomDuration] = useState<string>("");

  const DURATION_OPTIONS = [
    { label: "ساعة واحدة", value: 60 },
    { label: "ساعتان", value: 120 },
    { label: "3 ساعات", value: 180 },
    { label: "5 ساعات", value: 300 },
    { label: "مخصص", value: -1 },
  ];

  useEffect(() => {
    let isMounted = true;
    const fetchFriends = async () => {
      try {
        const q = query(collection(db, "users", user.uid, "friends"), limit(20));
        const snapshot = await getDocs(q);
        const friendIds = snapshot.docs.map((doc) => doc.id);
        if (friendIds.length > 0 && isMounted) {
          const friendsQuery = query(
            collection(db, "profiles"),
            where("uid", "in", friendIds),
          );
          const friendsSnap = await getDocs(friendsQuery);
          if (isMounted) setFriends(friendsSnap.docs.map((doc) => doc.data() as UserData));
        } else if (isMounted) {
          setFriends([]);
        }
        if (isMounted) setLoading(false);
      } catch (e) {
        console.error("Error fetching friends details:", e);
        if (isMounted) setLoading(false);
      }
    };
    fetchFriends();
    return () => { isMounted = false; };
  }, [user.uid]);

  const sendChallenge = async (friend: UserData) => {
    let duration = selectedDuration;
    if (duration === -1) {
      duration = parseInt(customDuration, 10);
      if (isNaN(duration) || duration < 10) {
        showToast("الرجاء إدخال مدة صحيحة (أقل شيء 10 دقائق).", "warning");
        return;
      }
    }

    try {
      const docRef = await addDoc(collection(db, "challenges"), {
        challengerId: user.uid,
        challengerName: user.displayName,
        challengedId: friend.uid,
        challengedName: friend.displayName || "صديق",
        status: "pending",
        createdAt: Date.now(),
        durationMinutes: duration,
        progressPlayer1: 0,
        progressPlayer2: 0,
        rewardsClaimed: []
      });
      
      ChallengeDebugger.logCreation(docRef.id, duration);

      addDoc(collection(db, "users", friend.uid, "notifications"), {
        type: "challenge",
        content: `دعاك ${user.displayName} لتحدي دراسي لمدة ${duration} دقيقة!`,
        challengeId: docRef.id,
        senderId: user.uid,
        senderName: user.displayName,
        senderPhoto: user.photoURL,
        read: false,
        timestamp: serverTimestamp(),
      }).catch(console.error);
      
      showToast("تم إرسال طلب التحدي بنجاح!", "success");
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "challenges");
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-space-dark rounded-3xl p-6 md:p-8 w-full max-w-md border border-white/10 shadow-2xl shadow-indigo-900/20 relative max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-gray-500 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-black mb-6 text-center text-indigo-400">
          اختر صديق للتحدي 🎯
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-300 mb-2">
            مدة التحدي (مين يخلصها أول بيفوز)
          </label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedDuration(opt.value)}
                className={cn(
                  "px-3 py-2 text-sm font-bold rounded-xl border transition-all",
                  selectedDuration === opt.value
                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {selectedDuration === -1 && (
            <input
              type="number"
              placeholder="المدة بالدقائق (مثال: 45)"
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
              min="10"
            />
          )}
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">
            جاري تحميل الأصدقاء...
          </div>
        ) : friends.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            لا يوجد أصدقاء. ابحث عن رواد لتضيفهم!
          </div>
        ) : (
          <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
            {friends.map((friend) => (
              <div
                key={friend.uid}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 flex-wrap gap-2"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={friend.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.uid}`}
                      alt={friend.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                    {friend.lastActiveTime &&
                      Date.now() - friend.lastActiveTime < 300000 && (
                        <div
                          className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0b16]"
                          title="متصل الآن"
                        />
                      )}
                  </div>
                  <div>
                    <div className="font-bold text-sm">
                      {friend.displayName}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      المستوى {friend.level}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => sendChallenge(friend)}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-500/20 text-white"
                >
                  إرسال تحدي
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
