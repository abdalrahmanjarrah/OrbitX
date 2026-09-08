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
import { getLevelFromXp, getLevelProgress, getLevelColor, getXpToNextLevel } from '../lib/levelConfig';
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
import NavLink from './NavLink';
import BlackHolesView from './BlackHolesView';
import FleetsView from './FleetsView';

export default function UserModal({
  userId,
  currentUserId,
  currentUser,
  onClose,
}: {
  userId: string;
  currentUserId: string;
  currentUser?: UserData;
  onClose: () => void;
}) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [exhibitions, setExhibitions] = useState<any[]>([]);
  const [friends, setFriends] = useState<UserData[]>([]);
  const [myFleet, setMyFleet] = useState<Fleet | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeDuration, setChallengeDuration] = useState(25);

  useEffect(() => {
    let isMounted = true;
    if (currentUser?.fleetId) {
      getDoc(doc(db, "fleets", currentUser.fleetId)).then((snap) => {
        if (isMounted && snap.exists()) {
          setMyFleet({ id: snap.id, ...snap.data() } as Fleet);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser?.fleetId]);

  const handleInviteToFleet = async () => {
    if (!myFleet || !currentUser?.fleetId) return;
    if (currentUser.isGuest) {
      showToast("وضع المشاهدة — الدعوات تتطلب حساباً مسجلاً.", "warning");
      return;
    }
    try {
      await updateDoc(doc(db, "users", userId), {
        fleetInvites: arrayUnion(myFleet.id),
      });
      showToast("تم إرسال دعوة الانضمام للأسطول!", "success");
    } catch (e) {}
  };

  useEffect(() => {
    let isMounted = true;
    getDoc(doc(db, "profiles", userId)).then((snap) => {
      if (isMounted && snap.exists()) setUserData(snap.data() as UserData);
    });
    getDoc(doc(db, "users", currentUserId, "friends", userId)).then((snap) => {
      if (isMounted) setIsFriend(snap.exists());
    });
    return () => {
      isMounted = false;
    };
  }, [userId, currentUserId]);

  useEffect(() => {
    let isMounted = true;
    const fetchExhibitions = async () => {
      try {
        const q = query(
          collection(db, "exhibitions"),
          where("userId", "==", userId),
          orderBy("timestamp", "desc"),
          limit(10)
        );
        const snapshot = await getDocs(q);
        if (isMounted) {
          setExhibitions(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
          );
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, "exhibitions_user_" + userId);
      }
    };
    fetchExhibitions();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    let isMounted = true;
    const fetchFriends = async () => {
      try {
        const q = query(collection(db, "users", userId, "friends"), limit(20));
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
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, "users/" + userId + "/friends");
      }
    };
    fetchFriends();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const sendChallengeFromProfile = async () => {
    if (!userData || !currentUser) return;
    if (currentUser.isGuest) {
      showToast("وضع المشاهدة — التحديات تتطلب حساباً مسجلاً.", "warning");
      return;
    }
    try {
      await addDoc(collection(db, "challenges"), {
        challengerId: currentUserId,
        challengerName: currentUser.displayName,
        challengerPhoto: currentUser.photoURL || null,
        challengedId: userId,
        challengedName: userData.displayName,
        challengedPhoto: userData.photoURL || null,
        status: "pending",
        durationMinutes: challengeDuration,
        createdAt: Date.now(),
      });
      await addDoc(collection(db, "users", userId, "notifications"), {
        type: "challenge_invite",
        senderId: currentUserId,
        senderName: currentUser.displayName,
        senderPhoto: currentUser.photoURL,
        challengeDuration: challengeDuration,
        content: `⚡ ${currentUser.displayName} رمى عليك صفخة تحدي: ${challengeDuration} دقيقة تركيز! رد عليه قبل انتهاء الصلاحية.`,
        read: false,
        timestamp: serverTimestamp(),
      }).catch(console.error);
      setShowChallengeModal(false);
      showToast(`صفخة التحدي مرسلة! ${userData.displayName} سيتلقى إشعاراً بدعوتك.`, "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "challenges");
    }
  };

  const handleSendFriendRequest = async () => {
    if (!userData || !currentUser) return;
    if (currentUser.isGuest) {
      showToast("وضع المشاهدة — هذه الإجراءات تتطلب حساباً مسجلاً.", "warning");
      return;
    }

    try {
      if (isFriend) {
        const batch = writeBatch(db);
        batch.delete(doc(db, "users", currentUserId, "friends", userId));
        batch.delete(doc(db, "users", userId, "friends", currentUserId));
        batch.update(doc(db, "users", currentUserId), {
          friendsCount: increment(-1),
        });
        batch.update(doc(db, "users", userId), { friendsCount: increment(-1) });
        await batch.commit();
        showToast("تم إلغاء الصداقة", "info");
      } else {
        await addDoc(collection(db, "users", userId, "notifications"), {
          type: "friend_request",
          senderId: currentUserId,
          senderName: currentUser.displayName,
          senderPhoto: currentUser.photoURL,
          content: `يريد ${currentUser.displayName} أن يكون صديقك في الفضاء!`,
          read: false,
          timestamp: serverTimestamp(),
        });
        showToast("تم إرسال طلب الصداقة بنجاح!", "success");
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "friend_request");
    }
  };

  if (!userData) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#000108]/90 overflow-y-auto backdrop-blur-xl">
      <div className="w-full min-h-screen p-4 md:p-8 relative">
        <button
          onClick={onClose}
          className="fixed top-6 left-6 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors z-[110] shadow-xl backdrop-blur-md"
        >
          <X size={24} className="text-gray-300" />
        </button>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-4xl mx-auto space-y-8 pt-16 md:pt-4 pb-20"
        >
          {/* Profile Header */}
          <div className="p-8 rounded-[2.5rem] glass border-indigo-400/20 relative overflow-hidden group flex flex-col justify-center transition-colors mt-8">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
              <UserIcon size={200} className="text-indigo-500" />
            </div>
            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
              <div className="flex items-center justify-center">
                <div className="relative group">
                  <div
                    className={cn(
                      "absolute inset-0 rounded-full blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500",
                      getLevelColor(getLevelFromXp(userData.xp)).bg,
                    )}
                  ></div>

                  <div className="w-32 h-32 rounded-full border-4 border-indigo-400 p-1 relative overflow-hidden z-10 bg-space-dark">
                    <img
                      src={userData.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${userData.uid}`}
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div
                    className={cn(
                      "absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold border-2 border-[#0a0b16] z-20 whitespace-nowrap shadow-xl",
                      getLevelColor(getLevelFromXp(userData.xp)).bg,
                      getLevelColor(getLevelFromXp(userData.xp)).text === "text-white"
                        ? "text-black"
                        : "text-white",
                    )}
                  >
                    LVL {userData.level}
                  </div>
                </div>
              </div>

              <div className="flex-1 text-center md:text-right space-y-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex gap-4 flex-wrap">
                    {userId !== currentUserId && !currentUser?.isGuest && (
                      <button
                        onClick={handleSendFriendRequest}
                        className={cn(
                          "px-6 py-2 rounded-xl font-bold transition-all text-sm flex items-center gap-2",
                          isFriend
                            ? "bg-white/5 border border-white/10 hover:bg-white/10"
                            : "bg-indigo-500 hover:bg-indigo-700",
                        )}
                      >
                        {isFriend ? <Users size={16} /> : <Plus size={16} />}
                        {isFriend ? "إلغاء الصداقة" : "إرسال طلب صداقة"}
                      </button>
                    )}
                    {userId !== currentUserId && !currentUser?.isGuest && (
                      <button
                        onClick={() => setShowChallengeModal(true)}
                        className="px-6 py-2 rounded-xl font-bold transition-all text-sm flex items-center gap-2 bg-gradient-to-l from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 border border-amber-300/30"
                      >
                        <Swords size={16} /> صفخة تحدي
                      </button>
                    )}
                    {userId !== currentUserId &&
                      !currentUser?.isGuest &&
                      myFleet &&
                      (myFleet.ownerId === currentUser?.uid ||
                        myFleet.coAdmins?.includes(currentUser?.uid || "")) &&
                      !userData.fleetId && (
                        <button
                          onClick={handleInviteToFleet}
                          className="px-6 py-2 rounded-xl font-bold transition-all text-sm flex items-center gap-2 bg-fuchsia-500 hover:bg-fuchsia-600 border border-fuchsia-400/30"
                        >
                          <Shield size={16} /> دعوة للأسطول
                        </button>
                      )}
                  </div>
                  <h2 className="text-3xl font-bold flex items-center gap-3">
                    {userData.displayName}
                    <span
                      className={cn(
                        "text-sm px-3 py-1 rounded-full border border-current",
                        getLevelColor(getLevelFromXp(userData.xp)).bg,
                      )}
                    >
                      {'Level ' + getLevelFromXp(userData.xp)}
                    </span>
                  </h2>
                </div>

                <div className="flex flex-wrap justify-center md:justify-end gap-3 text-xs">
                  <div className="text-center px-6 py-3 bg-space-dark rounded-2xl border border-white/5 backdrop-blur-md shadow-inner shadow-black/20">
                    <span className="block font-black text-2xl text-indigo-400">
                      {exhibitions.length}
                    </span>
                    <span className="text-gray-400 text-[11px] uppercase font-bold tracking-wider">
                      منشور
                    </span>
                  </div>
                  <div className="text-center px-6 py-3 bg-space-dark rounded-2xl border border-white/5 backdrop-blur-md shadow-inner shadow-black/20">
                    <span className="block font-black text-2xl text-blue-400">
                      {userData.xp}
                    </span>
                    <span className="text-gray-400 text-[11px] uppercase font-bold tracking-wider">
                      XP
                    </span>
                  </div>
                  <div className="text-center px-6 py-3 bg-space-dark rounded-2xl border border-white/5 backdrop-blur-md shadow-inner shadow-black/20">
                    <span className="block font-black text-2xl text-fuchsia-400">
                      {friends.length}
                    </span>
                    <span className="text-gray-400 text-[11px] uppercase font-bold tracking-wider">
                      صديق
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 text-right">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-gray-300">
                      <Rocket size={12} className="text-indigo-400" />
                      {userData.missionRole || "لم يتم تحديد التخصص"}
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {userData.bio || "لا يوجد وصف حالياً..."}
                    </p>
                  </div>
                </div>

                {/* Badges Display */}
                <div className="pt-4 border-t border-white/5">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 text-right">
                    الأوسمة المستحقة
                  </h4>
                  <div className="flex flex-wrap justify-end gap-3">
                    {userData.badges && userData.badges.length > 0 ? (
                      userData.badges.map((badgeId) => {
                        const badge = BADGES.find((b) => b.id === badgeId);
                        return badge ? (
                          <div key={badgeId} className="group relative">
                            <div className="w-10 h-10 rounded-xl bg-space-dark shadow-lg shadow-indigo-900/10 border border-white/10 flex items-center justify-center text-xl hover:bg-white/5 transition-all cursor-help">
                              {badge.icon}
                            </div>
                            <div className="absolute bottom-full right-0 mb-2 w-32 p-2 bg-space-dark border border-white/10 rounded-lg text-[11px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              <p className="font-bold text-indigo-500">
                                {badge.title}
                              </p>
                              <p className="text-gray-400">
                                {badge.description}
                              </p>
                            </div>
                          </div>
                        ) : null;
                      })
                    ) : (
                      <p className="text-[10px] text-gray-600 italic">
                        لا توجد أوسمة بعد.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="mt-8 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                <span className={getLevelColor(getLevelFromXp(userData.xp)).text}>
                  {'Level ' + getLevelFromXp(userData.xp)}
                </span>
                <span>التقدم للمستوى التالي</span>
                <span>{'Level ' + (getLevelFromXp(userData.xp) + 1)}</span>
              </div>
              <div className="h-6 bg-space-dark shadow-inner shadow-black/80 rounded-full overflow-hidden border border-white/10 relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${getLevelProgress(userData.xp, getLevelFromXp(userData.xp))}%`,
                  }}
                  className="h-full bg-gradient-to-l from-indigo-500 to-blue-400"
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  {Math.round(getLevelProgress(userData.xp, getLevelFromXp(userData.xp)))}
                  %
                </div>
              </div>
            </div>
          </div>

          {/* Friends List */}
          {friends.length > 0 && (
            <div className="p-6 rounded-3xl glass border border-blue-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">الأصدقاء</h3>
                  <p className="text-xs text-gray-400">
                    {friends.length} زملاء في المجرة
                  </p>
                </div>
              </div>
              <div className="flex -space-x-3 space-x-reverse justify-end">
                {friends.slice(0, 8).map((friend, i) => (
                  <div
                    key={friend.uid}
                    className="group relative"
                    style={{ zIndex: 10 - i }}
                  >
                    <img
                      src={friend.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.uid}`}
                      className="w-10 h-10 rounded-full border-2 border-[#0a0b16] object-cover hover:scale-110 transition-transform cursor-help"
                      referrerPolicy="no-referrer"
                    />
                    {friend.lastActiveTime &&
                      Date.now() - friend.lastActiveTime < 300000 && (
                        <div
                          className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0b16]"
                          title="متصل الآن"
                        />
                      )}
                    <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 px-2 py-1 bg-space-dark border border-white/10 rounded-lg text-[11px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                      {friend.displayName}
                    </div>
                  </div>
                ))}
                {friends.length > 8 && (
                  <div className="w-10 h-10 rounded-full border-2 border-[#0a0b16] bg-space-dark text-blue-400 flex items-center justify-center text-xs font-bold relative z-0 shadow-inner">
                    +{friends.length - 8}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {BADGES.map((badge, i) => (
              <BadgeCard
                key={i}
                icon={badge.icon}
                title={badge.title}
                xp={badge.minXp + " XP"}
                active={userData.xp >= badge.minXp || (userData.badges && userData.badges.includes(badge.id))}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
            {/* Left Column - Exhibitions */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-end p-6 rounded-3xl glass border border-white/5">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-pink-400" />
                  معرض المحطات
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {exhibitions.map((ex, i) => (
                  <div
                    key={ex.id}
                    className="aspect-square rounded-3xl overflow-hidden border border-white/10 bg-space-dark shadow-lg shadow-indigo-900/10 group relative"
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
                    <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs font-bold">
                        {ex.timestamp
                          ? new Date(
                              typeof (ex.timestamp as any).toDate ===
                                "function"
                                ? (ex.timestamp as any).toDate()
                                : (ex.timestamp as any),
                            ).toLocaleDateString(
                              "ar-EG",
                            )
                          : ""}
                      </span>
                    </div>
                  </div>
                ))}
                {exhibitions.length === 0 && (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
                    <p className="text-gray-500 italic">
                      لا توجد صور في المعرض بعد
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Stats or other bento items */}
            <div className="lg:col-span-1 space-y-6 flex flex-col">
              <div className="p-6 rounded-3xl glass border border-cyan-500/20 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors"></div>
                <Timer
                  size={48}
                  className="text-cyan-400 mb-4 animate-pulse drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                />
                <h4 className="text-xl font-black text-white mb-1">
                  ساعات التركيز
                </h4>
                <p className="text-4xl font-black text-cyan-400 drop-shadow-md">
                  {Math.round((userData.xp || 0) / 60)}
                </p>
                <span className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">
                  ساعة مقضية
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {showChallengeModal && userData && (
        <div className="fixed inset-0 z-[120] bg-[#000108]/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowChallengeModal(false)}>
          <div
            className="w-full max-w-sm rounded-3xl glass border border-amber-500/30 p-6 text-center space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-900/40">
              <Swords size={30} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">صفخة تحدي لـ {userData.displayName}</h3>
              <p className="text-sm text-gray-400 mt-1">
                اختر مدة السباق — خلالها مين منكم بجمع أكتر دقائق تركيز (بأي محطة) هو الفائز.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { mins: 25, label: "25 دقيقة" },
                { mins: 50, label: "50 دقيقة" },
                { mins: 90, label: "90 دقيقة" },
                { mins: 360, label: "6 ساعات" },
                { mins: 1440, label: "يوم كامل" },
                { mins: 4320, label: "3 أيام" },
              ].map((opt) => (
                <button
                  key={opt.mins}
                  onClick={() => setChallengeDuration(opt.mins)}
                  className={`py-3 rounded-xl font-black text-sm border transition-colors ${
                    challengeDuration === opt.mins
                      ? "bg-amber-500 text-black border-amber-300"
                      : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={sendChallengeFromProfile}
              className="w-full py-3 rounded-xl font-black text-sm bg-gradient-to-l from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white flex items-center justify-center gap-2 transition-colors"
            >
              <Swords size={16} /> إرسال الصفخة
            </button>
            <button
              onClick={() => setShowChallengeModal(false)}
              className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-300 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
