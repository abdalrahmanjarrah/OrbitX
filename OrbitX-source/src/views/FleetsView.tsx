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
  documentId,
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
import { useLanguage } from "../context/LanguageContext";

export default function FleetsView({ user }: { user: UserData }) {
  const { isAr, t } = useLanguage();
  const [isConfirmingDisband, setIsConfirmingDisband] = useState(false);
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);

  const [activeFleet, setActiveFleet] = useState<Fleet | null>(null);
  const [allFleets, setAllFleets] = useState<Fleet[]>([]);
  const [fleetMembers, setFleetMembers] = useState<UserData[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newFleetName, setNewFleetName] = useState("");
  const [newFleetDesc, setNewFleetDesc] = useState("");
  const [fleetChat, setFleetChat] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [invitedFleets, setInvitedFleets] = useState<Fleet[]>([]);
  const [kickingMemberId, setKickingMemberId] = useState<string | null>(null);
  const [fleetToJoin, setFleetToJoin] = useState<Fleet | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchInvites = async () => {
      if (user.fleetInvites && user.fleetInvites.length > 0 && !user.fleetId) {
        try {
          const q = query(
            collection(db, "fleets"),
            where(documentId(), "in", user.fleetInvites.slice(0, 10)),
          );
          const snap = await getDocs(q);
          if (isMounted) {
            setInvitedFleets(
              snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Fleet),
            );
          }
        } catch (e) {}
      } else if (isMounted) {
        setInvitedFleets([]);
      }
    };
    fetchInvites();
    return () => {
      isMounted = false;
    };
  }, [user.fleetInvites, user.fleetId]);

  const handleAcceptInvite = async (fleetId: string) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "fleets", fleetId), {
        members: arrayUnion(user.uid),
      });
      batch.update(doc(db, "users", user.uid), {
        fleetId,
        fleetInvites: arrayRemove(fleetId),
      });
      await batch.commit();
    } catch (e) {}
  };

  const handleRejectInvite = async (fleetId: string) => {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        fleetInvites: arrayRemove(fleetId),
      });
    } catch (e) {}
  };

  useEffect(() => {
    let isMounted = true;
    let unsub = () => {};
    if (user.fleetId) {
      unsub = onSnapshot(doc(db, "fleets", user.fleetId), (snap) => {
        if (isMounted) {
          if (snap.exists()) {
            const data = snap.data() as Fleet;
            if (!data.members.includes(user.uid)) {
              setActiveFleet(null);
              updateDoc(doc(db, "users", user.uid), {
                fleetId: deleteField(),
              }).catch(() => {});
            } else {
              setActiveFleet({ id: snap.id, ...data });
            }
          } else {
            setActiveFleet(null);
            updateDoc(doc(db, "users", user.uid), {
              fleetId: deleteField(),
            }).catch(() => {});
          }
        }
      });
    } else if (isMounted) {
      setActiveFleet(null);
    }
    return () => {
      isMounted = false;
      unsub();
    };
  }, [user.fleetId]);

  useEffect(() => {
    let isMounted = true;
    const fetchAllFleets = async () => {
      if (!user.fleetId) {
        try {
          const q = query(
            collection(db, "fleets"),
            orderBy("xp", "desc"),
            limit(20),
          );
          const snap = await getDocs(q);
          if (isMounted) {
            setAllFleets(
              snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Fleet),
            );
          }
        } catch (e) {}
      }
    };
    fetchAllFleets();
    return () => {
      isMounted = false;
    };
  }, [user.fleetId]);

  useEffect(() => {
    if (activeFleet?.members?.length) {
      const loadMembers = async () => {
        try {
          const chunks = [];
          for (let i = 0; i < activeFleet.members.length; i += 10)
            chunks.push(activeFleet.members.slice(i, i + 10));
          let allMems: UserData[] = [];
          for (const chunk of chunks) {
            const q = query(
              collection(db, "profiles"),
              where("uid", "in", chunk),
            );
            const snap = await getDocs(q);
            allMems = [
              ...allMems,
              ...snap.docs.map((d) => d.data() as UserData),
            ];
          }
          setFleetMembers(allMems);
        } catch (e) {}
      };
      loadMembers();
    }
  }, [activeFleet?.members]);

  useEffect(() => {
    if (activeFleet) {
      const q = query(
        collection(db, "fleets", activeFleet.id, "messages"),
        orderBy("timestamp", "desc"),
        limit(50),
      );
      const unsub = onSnapshot(q, (snap) => {
        setFleetChat(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Message)
            .reverse(),
        );
      });
      return () => unsub();
    }
  }, [activeFleet?.id]);

  const handleCreateFleet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFleetName.trim() || !newFleetDesc.trim()) return;
    try {
      const docRef = await addDoc(collection(db, "fleets"), {
        name: newFleetName,
        description: newFleetDesc,
        ownerId: user.uid,
        members: [user.uid],
        totalFocusHours: 0,
        xp: 0,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", user.uid), { fleetId: docRef.id });
      setIsCreating(false);
    } catch (e) {}
  };

  const handleDisbandFleet = async () => {
    if (!activeFleet) return;
    try {
      await deleteDoc(doc(db, "fleets", activeFleet.id));
      await updateDoc(doc(db, "users", user.uid), { fleetId: deleteField() });
      setActiveFleet(null);
      setIsConfirmingDisband(false);
    } catch (e) {
      showToast("حدث خطأ أثناء تفكيك الأسطول.", "error");
    }
  };

  const handlePromoteMember = async (memberId: string) => {
    if (!activeFleet) return;
    try {
      await updateDoc(doc(db, "fleets", activeFleet.id), {
        coAdmins: arrayUnion(memberId),
      });
    } catch (e) {}
  };

  const handleDemoteMember = async (memberId: string) => {
    if (!activeFleet) return;
    try {
      await updateDoc(doc(db, "fleets", activeFleet.id), {
        coAdmins: arrayRemove(memberId),
      });
    } catch (e) {}
  };

  const handleKickMember = async (memberId: string) => {
    if (!activeFleet || activeFleet.ownerId !== user.uid) return;
    try {
      const updates: any = { members: arrayRemove(memberId) };
      if (activeFleet.coAdmins?.includes(memberId)) {
        updates.coAdmins = arrayRemove(memberId);
      }
      await updateDoc(doc(db, "fleets", activeFleet.id), updates);
      setKickingMemberId(null);
    } catch (e) {}
  };

  const handleJoinFleet = async (fleetId: string) => {
    if (fleetToJoin) return;
    const target = allFleets.find((f) => f.id === fleetId);
    setFleetToJoin(target || null);
  };

  const confirmJoinFleet = async (fleetId: string) => {
    setFleetToJoin(null);
    const currentFleetId = user.fleetId;
    try {
      const batch = writeBatch(db);
      // If joining from an existing fleet, remove the user from the old fleet
      // (both members and co-admins) so they don't stay in two fleets at once.
      if (currentFleetId && currentFleetId !== fleetId) {
        const oldRef = doc(db, "fleets", currentFleetId);
        batch.update(oldRef, {
          members: arrayRemove(user.uid),
          coAdmins: arrayRemove(user.uid),
        });
      }
      batch.update(doc(db, "fleets", fleetId), {
        members: arrayUnion(user.uid),
      });
      batch.update(doc(db, "users", user.uid), { fleetId });
      await batch.commit();
      showToast(
        isAr
          ? "انضممت إلى الأسطول بنجاح! 🚀"
          : "You joined the fleet successfully! 🚀",
        "success",
      );
    } catch (e) {}
  };

  const handleLeaveFleet = async () => {
    if (!activeFleet) return;
    try {
      const updates: any = { members: arrayRemove(user.uid) };
      const isCoAdmin = activeFleet.coAdmins?.includes(user.uid);
      if (isCoAdmin) {
        updates.coAdmins = arrayRemove(user.uid);
      }

      // Owner handover: if the fleet owner leaves, hand leadership to a deputy
      // (first co-admin) if one exists, otherwise to the oldest remaining
      // member (members[] keeps join order, so the first entry is the oldest).
      if (activeFleet.ownerId === user.uid) {
        const remaining = (activeFleet.members || []).filter(
          (m) => m !== user.uid,
        );
        const deputies = (activeFleet.coAdmins || []).filter(
          (m) => m !== user.uid && remaining.includes(m),
        );
        const heir = deputies[0] || remaining[0];
        if (heir) {
          updates.ownerId = heir;
        }
      }

      await updateDoc(doc(db, "fleets", activeFleet.id), updates);
      await updateDoc(doc(db, "users", user.uid), { fleetId: deleteField() });
      setActiveFleet(null);
      setIsConfirmingLeave(false);
    } catch (e) {
      showToast("حدث خطأ أثناء المغادرة.", "error");
    }
  };

  const handleSendFleetMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !activeFleet) return;
    try {
      await addDoc(collection(db, "fleets", activeFleet.id, "messages"), {
        text: newMsg,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        timestamp: serverTimestamp(),
        type: "text",
      });
      setNewMsg("");
    } catch (e) {}
  };

  if (!user.fleetId || !activeFleet) {
    return (
      <div
        className="max-w-6xl mx-auto space-y-6 fade-in pb-20 mt-8 px-4"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Style block for lightweight GPU-friendly CSS animations */}
        <style>{`
          @keyframes radar-sweep {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes glow-pulse {
            0%, 100% { opacity: 0.15; transform: scale(1); }
            50% { opacity: 0.35; transform: scale(1.08); }
          }
          @keyframes particle-drift-1 {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.1; }
            50% { transform: translate(-20px, 15px) scale(1.3); opacity: 0.25; }
          }
          @keyframes particle-drift-2 {
            0%, 100% { transform: translate(0, 0) scale(1.1); opacity: 0.2; }
            50% { transform: translate(25px, -20px) scale(0.95); opacity: 0.35; }
          }
        `}</style>

        {/* Ambient Space Alliance Header Card */}
        <div className="relative bg-space-dark/85 rounded-3xl p-8 md:p-10 border border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col lg:flex-row items-center justify-between gap-8 mb-10 z-10 select-none bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px]">
          {/* Nebula Glow Backdrops */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none animate-[glow-pulse_8s_infinite_ease-in-out]" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-[140px] pointer-events-none animate-[glow-pulse_12s_infinite_ease-in-out]" />

          {/* Radar Sweep Layer */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] border border-white/[0.015] rounded-full pointer-events-none flex items-center justify-center">
            <div className="absolute w-[360px] h-[360px] border border-white/[0.025] rounded-full" />
            <div className="absolute w-[240px] h-[240px] border border-white/[0.035] rounded-full" />
            {/* Sweeper needle */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ animation: "radar-sweep 22s linear infinite" }}
            >
              <div className="absolute left-1/2 top-0 w-[1px] h-1/2 bg-gradient-to-b from-indigo-500/8 via-transparent to-transparent origin-bottom" />
            </div>
          </div>

          {/* Floating Drift Particles */}
          <div
            className="absolute w-2 h-2 bg-indigo-400 rounded-full blur-[1px] opacity-10 animate-[particle-drift-1_15s_infinite_ease-in-out]"
            style={{ top: "25%", left: "15%" }}
          />
          <div
            className="absolute w-1.5 h-1.5 bg-fuchsia-400 rounded-full blur-[1px] opacity-15 animate-[particle-drift-2_22s_infinite_ease-in-out]"
            style={{ bottom: "30%", left: "40%" }}
          />
          <div
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse opacity-30"
            style={{ top: "15%", left: "75%", animationDuration: "3s" }}
          />
          <div
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse opacity-20"
            style={{ bottom: "15%", left: "20%", animationDuration: "5s" }}
          />

          {/* Left Textual Info Module */}
          <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10 text-center lg:text-right w-full lg:w-auto">
            {/* Immersive Pulsing Rocket Orbiter */}
            <div className="relative w-32 h-32 flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 via-slate-800/20 to-fuchsia-500/10 border border-white/10 shadow-[0_0_40px_rgba(99,102,241,0.18)] shrink-0 select-none">
              {/* Outer orbit dots */}
              <div className="absolute inset-1.5 border border-dashed border-indigo-500/15 rounded-full animate-[spin_55s_linear_infinite]" />
              <div className="absolute inset-4 border border-dashed border-fuchsia-500/15 rounded-full animate-[spin_35s_linear_infinite_reverse]" />
              {/* Centered Rocket with gentle hover drift */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 4.5,
                  ease: "easeInOut",
                }}
                className="relative z-10"
              >
                <Rocket className="w-14 h-14 text-indigo-400/90 filter drop-shadow-[0_0_15px_rgba(99,102,241,0.55)]" />
              </motion.div>
            </div>

            <div className="flex-1 space-y-3">
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 via-fuchsia-400 to-indigo-300 flex items-center justify-center lg:justify-start gap-3">
                الأساطيل الفضائية
              </h1>
              <p className="text-gray-300/95 max-w-xl text-sm md:text-base leading-relaxed font-sans">
                لست وحدك في رحلتك المعرفية. انضم إلى أسطولٍ من رواد الفضاء
                للتعاون في جلسات التركيز، أو أسّس أسطولك الخاص، واعملوا
                معاً على التحديات الجماعية لتحقيق نقاط الخبرة كقوةٍ واحدة.
              </p>
              {/* Features inline bento specifiers */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-5 text-xs text-gray-400 font-medium">
                <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                  <Users size={13} className="text-indigo-400" /> تحالف حتى 10
                  أعضاء
                </span>
                <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                  <MessageCircle size={13} className="text-fuchsia-400" /> غرف
                  تواصل مدمجة
                </span>
                <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                  <Star size={13} className="text-yellow-400" /> منافسة XP
                  جماعية
                </span>
              </div>
            </div>
          </div>

          {/* Right Action CTA Module */}
          <div className="flex flex-col items-center gap-3 shrink-0 relative z-20 w-full lg:w-auto">
            <button
              onClick={() => setIsCreating(true)}
              className={cn(
                "w-full lg:w-auto font-black px-8 py-4 rounded-full transition-all duration-300 flex items-center justify-center gap-3 text-base shadow-lg cursor-pointer",
                "bg-gradient-to-l from-indigo-500 via-indigo-600 to-fuchsia-600 text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] border border-indigo-400/30",
              )}
            >
              <Plus size={22} className="animate-pulse" /> تأسيس أسطول جديد
            </button>
            <span className="text-[10px] text-indigo-400/60 font-mono tracking-wider">
              المنصة متاحة لجميع رواد الفضاء
            </span>
          </div>
        </div>

        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-space-dark/95 backdrop-blur-xl p-8 rounded-3xl border border-indigo-500/30 shadow-2xl mb-8 relative"
          >
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span>تأسيس أسطول جديد ✨</span>
            </h3>
            <form onSubmit={handleCreateFleet} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2 font-bold text-sm">
                  اسم الأسطول
                </label>
                <input
                  required
                  value={newFleetName}
                  onChange={(e) => setNewFleetName(e.target.value)}
                  maxLength={25}
                  className="w-full bg-[#05060d] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="مثال: رواد التميز..."
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2 font-bold text-sm">
                  وصف الأسطول (الأهداف والرؤية)
                </label>
                <textarea
                  required
                  value={newFleetDesc}
                  onChange={(e) => setNewFleetDesc(e.target.value)}
                  maxLength={150}
                  className="w-full bg-[#05060d] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 h-24 transition-colors resize-none"
                  placeholder="نطمح لأن نكون الأسطول الأول في المجرة..."
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-500 text-white font-bold py-3 rounded-xl hover:bg-indigo-400 transition-colors"
                >
                  تأسيس الان
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-6 bg-white/5 text-gray-400 font-bold rounded-xl hover:bg-white/10 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {invitedFleets.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xl font-bold text-fuchsia-400 mb-4 flex items-center gap-2">
              <Shield size={20} /> دعوات الانضمام
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {invitedFleets.map((fleet) => (
                <div
                  key={fleet.id}
                  className="bg-fuchsia-900/10 backdrop-blur-md rounded-3xl p-6 border border-fuchsia-500/20 shadow-lg relative overflow-hidden group hover:border-fuchsia-500/40 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_15px_rgba(217,70,239,0.3)]">
                      {fleet.name.charAt(0)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-indigo-300">
                      <Users size={14} /> {fleet.members?.length || 0}/10
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {fleet.name}
                  </h3>
                  <p className="text-gray-400 text-sm h-10 line-clamp-2 mb-4">
                    {fleet.description}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptInvite(fleet.id)}
                      disabled={fleet.members?.length >= 10}
                      className="flex-1 py-2 rounded-xl font-bold text-sm bg-fuchsia-500 hover:bg-fuchsia-600 text-white transition-colors disabled:opacity-50"
                    >
                      قبول
                    </button>
                    <button
                      onClick={() => handleRejectInvite(fleet.id)}
                      className="px-4 py-2 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
                    >
                      رفض
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allFleets.map((fleet, i) => (
            <motion.div
              key={fleet.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-space-dark/85 backdrop-blur-xl rounded-3xl p-6 border border-white/10 hover:border-indigo-500/40 hover:shadow-[0_15px_30px_rgba(99,102,241,0.15)] transition-all duration-300 relative overflow-hidden group shadow-md hover:-translate-y-1"
            >
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-indigo-500 via-fuchsia-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                  {fleet.name.charAt(0)}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-indigo-300">
                  <Users size={14} /> {fleet.members?.length || 0}/10
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 relative z-10">
                {fleet.name}
              </h3>
              <p className="text-gray-400 text-sm h-10 line-clamp-2 mb-4 relative z-10">
                {fleet.description}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <div className="flex flex-col items-center bg-white/[0.03] border border-white/5 rounded-xl py-2 px-1 hover:bg-white/[0.06] transition-colors">
                  <span className="text-yellow-400 font-black text-lg flex items-center gap-1">
                    <Star size={14} /> {fleet.xp}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">
                    نقاط الخبرة
                  </span>
                </div>
                <div className="flex flex-col items-center bg-white/[0.03] border border-white/5 rounded-xl py-2 px-1 hover:bg-white/[0.06] transition-colors">
                  <span className="text-sky-400 font-black text-lg flex items-center gap-1">
                    <Timer size={14} />{" "}
                    {Math.floor((fleet.totalFocusHours || 0) * 10) / 10}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">
                    ساعات التركيز
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleJoinFleet(fleet.id)}
                disabled={fleet.members?.length >= 10}
                className="w-full relative z-10 py-3 rounded-xl bg-space-dark hover:bg-indigo-500 hover:text-white border border-indigo-500/20 hover:border-indigo-500 transition-all font-bold duration-300 disabled:bg-space-dark/50 disabled:text-gray-500 disabled:border-transparent disabled:cursor-not-allowed"
              >
                {fleet.members?.length >= 10 ? "الأسطول ممتلئ" : "انضم للأسطول"}
              </button>
            </motion.div>
          ))}
          {allFleets.length === 0 && !isCreating && (
            <div className="col-span-full py-24 bg-space-dark/70 rounded-3xl border border-transparent flex flex-col items-center justify-center text-center relative overflow-hidden select-none">
              {/* Subtle background circles */}
              <div className="absolute w-72 h-72 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute w-[400px] h-[400px] border border-dashed border-white/[0.02] rounded-full pointer-events-none animate-[spin_60s_linear_infinite]" />

              <div className="relative z-10 flex flex-col items-center max-w-md px-6">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/5 to-slate-800/10 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                  <Rocket className="w-10 h-10 text-indigo-400/50 animate-bounce" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  المدار خالٍ بالكامل
                </h3>
                <p className="text-gray-400/90 text-sm leading-relaxed mb-8">
                  لا توجد أساطيل فضائية مسجلة في هذا القطاع حتى الآن. كن البادئ
                  بالخطوة الأولى وأرسل رسالتك التاريخية لتأسيس أول حلف برّاق!
                </p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-6 py-3 bg-space-dark hover:bg-indigo-600 hover:text-white text-indigo-400 border border-indigo-500/20 hover:border-indigo-500 font-bold rounded-xl transition-all duration-300"
                >
                  تأسيس الأسطول الأول 🚀
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="max-w-6xl mx-auto space-y-6 fade-in pb-20 mt-8 px-4"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="bg-space-dark/85 backdrop-blur-xl rounded-3xl p-8 border border-white/12 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-indigo-500 via-fuchsia-500 to-cyan-500"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-fuchsia-600 rounded-2xl flex items-center justify-center text-4xl font-black text-white shadow-[0_0_30px_rgba(99,102,241,0.5)]">
              {activeFleet.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white">
                  {activeFleet.name}
                </h1>
                <span className="text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-full border border-indigo-500/30 whitespace-nowrap">
                  أسطولك التعاوني
                </span>
              </div>
              <p className="text-gray-400 mt-2 max-w-lg font-sans">
                {activeFleet.description}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="flex items-center gap-6 bg-white/[0.03] rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors duration-300">
              <div className="text-center">
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-t from-yellow-500 to-yellow-200">
                  {activeFleet.xp}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                  مجموع XP
                </div>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center">
                <div className="text-2xl font-black text-sky-400">
                  {Math.floor((activeFleet.totalFocusHours || 0) * 10) / 10}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                  ساعات التركيز
                </div>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center">
                <div className="text-2xl font-black text-indigo-400">
                  {activeFleet.members?.length || 0}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                  أعضاء
                </div>
              </div>
            </div>
            {activeFleet.ownerId === user.uid ? (
              <div className="flex flex-col gap-2">
                {!isConfirmingDisband ? (
                  <button
                    onClick={() => setIsConfirmingDisband(true)}
                    className="text-xs bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 hover:border-red-500 transition-all font-bold flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm"
                  >
                    <Trash2 size={14} /> تفكيك الأسطول
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 bg-red-500/10 p-2 rounded-xl border border-red-500/30">
                    <div className="text-xs text-red-400 font-bold text-center">
                      هل أنت متأكد نهائياً؟
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDisbandFleet}
                        className="flex-1 text-xs bg-red-500 text-white hover:bg-red-600 transition-all font-bold py-1.5 rounded-lg"
                      >
                        نعم، فكك
                      </button>
                      <button
                        onClick={() => setIsConfirmingDisband(false)}
                        className="flex-1 text-xs bg-white/10 text-gray-300 hover:bg-white/20 transition-all font-bold py-1.5 rounded-lg"
                      >
                        تراجع
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {!isConfirmingLeave ? (
                  <button
                    onClick={() => setIsConfirmingLeave(true)}
                    className="text-xs bg-white/5 hover:bg-red-500/10 text-red-500 transition-all font-bold flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm border border-transparent hover:border-red-500/30"
                  >
                    <LogOut size={14} /> مغادرة الأسطول
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 bg-red-500/10 p-2 rounded-xl border border-red-500/30">
                    <div className="text-xs text-red-400 font-bold text-center">
                      متأكد من المغادرة؟
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleLeaveFleet}
                        className="flex-1 text-xs bg-red-500 text-white hover:bg-red-600 transition-all font-bold py-1.5 rounded-lg"
                      >
                        نعم، غادر
                      </button>
                      <button
                        onClick={() => setIsConfirmingLeave(false)}
                        className="flex-1 text-xs bg-white/10 text-gray-300 hover:bg-white/20 transition-all font-bold py-1.5 rounded-lg"
                      >
                        تراجع
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[600px] items-start">
        <div className="lg:col-span-2 bg-space-dark/90 backdrop-blur-xl rounded-3xl border border-white/10 flex flex-col min-h-[400px] lg:h-full overflow-hidden shadow-xl">
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageCircle size={20} className="text-fuchsia-400" /> غرفة
              تواصل الأسطول
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            {fleetChat.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.userId === user.uid ? "justify-start md:flex-row" : "justify-end md:flex-row"} gap-3`}
              >
                <img
                  src={
                    msg.userPhoto ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.userId}`
                  }
                  alt=""
                  className="w-10 h-10 rounded-full border-2 border-white/10 shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <div
                  className={`flex flex-col gap-1 max-w-[75%] ${msg.userId === user.uid ? "items-start" : "items-end"}`}
                >
                  <span
                    className={`text-xs opacity-70 font-bold ${msg.userId === user.uid ? "text-indigo-300" : "text-gray-400"}`}
                  >
                    {msg.userName}
                  </span>
                  <div
                    className={`rounded-2xl p-4 text-sm shadow-sm leading-relaxed ${msg.userId === user.uid ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm" : "bg-[#15162c] border border-white/5 text-gray-200 rounded-tl-sm"}`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {fleetChat.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 opacity-50">
                <MessageSquare size={48} />
                <p className="text-sm">
                  غرفة التواصل تبدو هادئة.. ابدأ المحادثة الآن!
                </p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/10 bg-[#070811]">
            <form onSubmit={handleSendFleetMsg} className="flex gap-3">
              <input
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="أرسل رسالة لطاقم الأسطول..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all text-sm"
              />
              <button
                type="submit"
                disabled={!newMsg.trim()}
                className="bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 disabled:from-white/10 disabled:to-white/10 disabled:text-gray-500 text-white px-5 rounded-2xl transition-all shrink-0 flex items-center justify-center shadow-lg"
              >
                <Send size={20} className="-translate-x-0.5" />
              </button>
            </form>
          </div>
        </div>

        <div className="bg-space-dark/90 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-xl flex flex-col min-h-[300px] lg:h-full">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield size={20} className="text-indigo-400" /> طاقم الأسطول
            </h3>
            <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full text-gray-300 font-mono tracking-widest">
              {activeFleet.members?.length}/10
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar pr-2">
            {fleetMembers.map((m) => (
              <div
                key={m.uid}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group"
              >
                <img
                  src={
                    m.photoURL ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${m.uid}`
                  }
                  alt=""
                  className="w-11 h-11 rounded-full border-2 border-white/10 group-hover:border-indigo-400 transition-colors shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm truncate">
                      {m.displayName}
                    </span>
                    {activeFleet.ownerId === m.uid ? (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/30 font-bold">
                        مؤسس الأسطول 👑
                      </span>
                    ) : activeFleet.coAdmins?.includes(m.uid) ? (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">
                        نائب مسؤول
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="text-[11px] text-indigo-300 font-medium">
                      مستوى {m.level}
                    </div>
                    <div className="text-[11px] text-yellow-500/80 font-medium flex items-center gap-1">
                      <Star size={10} /> {m.xp}
                    </div>
                  </div>
                </div>
                {activeFleet.ownerId === user.uid && m.uid !== user.uid && (
                  <div className="flex flex-col gap-2 shrink-0">
                    {activeFleet.coAdmins?.includes(m.uid) ? (
                      <button
                        onClick={() => handleDemoteMember(m.uid)}
                        className="text-[10px] px-2 py-1 bg-fuchsia-500/10 text-fuchsia-400 hover:bg-fuchsia-500/20 rounded-md transition-colors whitespace-nowrap"
                      >
                        سحب نائب مسؤول
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePromoteMember(m.uid)}
                        className="text-[10px] px-2 py-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-md transition-colors whitespace-nowrap"
                      >
                        ترقية لنائب مسؤول
                      </button>
                    )}
                    {kickingMemberId === m.uid ? (
                      <div className="flex items-center gap-1.5 bg-red-500/10 px-1 py-1 rounded-md border border-red-500/30">
                        <span className="text-[11px] text-red-500">طرد؟</span>
                        <button
                          onClick={() => handleKickMember(m.uid)}
                          className="text-[11px] text-white bg-red-500 px-1.5 py-0.5 rounded"
                        >
                          نعم
                        </button>
                        <button
                          onClick={() => setKickingMemberId(null)}
                          className="text-[11px] text-gray-400 px-1.5 py-0.5"
                        >
                          لا
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setKickingMemberId(m.uid)}
                        className="text-[10px] px-2 py-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-md transition-colors whitespace-nowrap"
                      >
                        طرد
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Join confirmation — switching fleets is destructive */}
      <AnimatePresence>
        {fleetToJoin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setFleetToJoin(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0f1123]/95 border border-fuchsia-500/30 rounded-3xl p-6 max-w-md w-full shadow-[0_0_60px_rgba(168,85,247,0.25)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/30">
                  <Rocket size={22} className="text-fuchsia-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {isAr ? "تأكيد الانضمام؟" : "Confirm joining?"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {fleetToJoin.name}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                {isAr
                  ? user.fleetId && user.fleetId !== fleetToJoin.id
                    ? `ستخرج من أسطولك الحالي وتنتقل إلى "${fleetToJoin.name}". هل أنت متأكد؟`
                    : "سيتم إضافتك إلى الأسطول. هل أنت متأكد؟"
                  : user.fleetId && user.fleetId !== fleetToJoin.id
                    ? `You will leave your current fleet and move to "${fleetToJoin.name}". Are you sure?`
                    : "You will be added to the fleet. Are you sure?"}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => confirmJoinFleet(fleetToJoin.id)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-l from-fuchsia-500 to-indigo-600 text-white font-bold hover:brightness-110 transition-all cursor-pointer"
                >
                  {isAr ? "نعم، انضم" : "Yes, join"}
                </button>
                <button
                  onClick={() => setFleetToJoin(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-gray-300 font-bold hover:bg-white/20 transition-all cursor-pointer"
                >
                  {isAr ? "تراجع" : "Cancel"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
