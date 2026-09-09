import { playSound } from "../lib/sound";
import Markdown from "react-markdown";
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

import { DEFAULT_SIGNALS } from "../data/AwarenessDefaults";
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
import FleetsView from "./FleetsView";
import { useLanguage } from "../context/LanguageContext";

// Lightweight static fallback for low-end devices — pure CSS, no WebGL, no animation.
function StaticGlobeFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative w-[420px] h-[420px] max-w-[80vw] max-h-[80vh] rounded-full bg-[radial-gradient(circle_at_35%_30%,#0a1a3a_0%,#04081c_45%,#010207_100%)] shadow-[inset_0_0_80px_rgba(6,182,212,0.12),0_0_60px_rgba(6,182,212,0.08)] border border-cyan-900/30 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08)_0%,transparent_50%)]" />
        <div className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(6,182,212,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.10)_1px,transparent_1px)] bg-[size:34px_34px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,#000108_100%)]" />
        {[...Array(14)].map((_, i) => (
          <span
            key={i}
            className="absolute w-1 h-1 rounded-full bg-cyan-300/70"
            style={{
              left: `${18 + ((i * 61) % 64)}%`,
              top: `${14 + ((i * 47) % 72)}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function AwarenessView({ user }: { user: UserData }) {
  const { isAr, t } = useLanguage();
  const [signals, setSignals] = useState<AwarenessSignal[]>([]);
  const [showHudTitle, setShowHudTitle] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<AwarenessSignal | null>(
    null,
  );
  const [isAdmin] = useState(user.role === "admin");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("الإعلام الموجه");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingSignalId, setDeletingSignalId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSignals = async () => {
      const q = query(
        collection(db, "awareness_signals"),
        orderBy("timestamp", "desc"),
        limit(20),
      );
      try {
        const snapshot = await getDocs(q);
        if (isMounted) {
          const fetched = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as AwarenessSignal,
          );
          setSignals([...fetched, ...DEFAULT_SIGNALS]);
        }
      } catch (e: any) {
        handleFirestoreError(e, OperationType.GET, "awareness_signals");
      }
    };
    fetchSignals();
    return () => {
      isMounted = false;
    };
  }, []);

  // force resize for globe on laptop
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleCreate = async () => {
    if (!newTitle || !newContent || !isAdmin) return;
    setIsCreating(true);
    try {
      await addDoc(collection(db, "awareness_signals"), {
        title: newTitle,
        content: newContent,
        category: newCategory,
        authorId: user.uid,
        timestamp: serverTimestamp(),
        views: 0,
        likes: 0,
      });
      setNewTitle("");
      setNewContent("");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "awareness_signals");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "awareness_signals", id));
      if (selectedSignal?.id === id) setSelectedSignal(null);
      setDeletingSignalId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `awareness_signals/${id}`);
    }
  };

  const handleReadSignal = async (sig: AwarenessSignal) => {
    setSelectedSignal(sig);
    try {
      if (!sig.id.startsWith("default-"))
        await updateDoc(doc(db, "awareness_signals", sig.id), {
          views: increment(1),
        });
    } catch (e) {
      handleFirestoreError(
        e,
        OperationType.UPDATE,
        `awareness_signals/${sig.id}`,
      );
    }
  };

  return (
    <div className="relative w-full h-[80vh] md:h-[calc(100vh-120px)] rounded-[2rem] overflow-hidden bg-[#000108] border border-cyan-900/30 block shadow-2xl">
      {/* 3D Globe Container */}
      <div className="absolute inset-0 cursor-crosshair">
        <StaticGlobeFallback />
        {/* Transparent overlay for gradient edges */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_40%,_#000108_100%)]"></div>
      </div>

      {/* Floating HUD Panel */}
      <div className="relative z-10 p-4 md:p-8 flex flex-col h-full pointer-events-none w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-start">
          <AnimatePresence>
            {showHudTitle && (
              <motion.div
                initial={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                transition={{ duration: 0.3 }}
                onClick={() => setShowHudTitle(false)}
                className="bg-space-dark/80 backdrop-blur-md border border-cyan-500/30 p-4 md:p-6 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] pointer-events-auto cursor-pointer hover:border-cyan-400/50 transition-all group"
                title="اضغط للإӡف�ء"
              >
                <h2 className="text-xl md:text-2xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-l from-cyan-400 to-emerald-400 flex items-center gap-3">
                  <TerminalIcon
                    size={24}
                    className="text-cyan-400 group-hover:scale-110 transition-transform"
                  />{" "}
                  شبكة الوعي العالمي
                </h2>
                <p className="text-cyan-500/80 font-mono text-xs hidden md:block">
                  STATUS: ONLINE | TRACKING {signals.length} ACTIVE SIGNALS...
                  <br />
                  &gt; اضغط على النقاط المضيئة لاكتشاف الحقائق المخفية.
                </p>
                <p className="text-cyan-500/50 font-mono text-[11px] mt-2 block opacity-0 group-hover:opacity-100 transition-opacity">
                  انقر للإخفاء ✕
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {isAdmin && !selectedSignal && (
            <div className="pointer-events-auto">
              <button
                onClick={() =>
                  document
                    .getElementById("admin-signal-form")
                    ?.classList.toggle("hidden")
                }
                className="px-4 py-2 bg-cyan-900/40 text-cyan-400 border border-cyan-500/50 rounded-xl hover:bg-cyan-800/60 transition font-mono text-xs md:text-sm"
              >
                &gt; ADMIN_OVERRIDE
              </button>
            </div>
          )}
        </div>

        {/* Admin Form */}
        {isAdmin && (
          <div
            id="admin-signal-form"
            className="hidden mt-4 bg-[#05050a]/90 backdrop-blur-xl border border-cyan-500/50 p-6 rounded-2xl w-full max-w-md pointer-events-auto shadow-2xl ml-auto self-end"
          >
            <h3 className={cn("text-cyan-400 font-bold mb-4 flex items-center gap-2", isAr ? "flex-row" : "flex-row-reverse")}>
              <ShieldAlert size={18} /> {isAr ? "بث إشارة جديدة" : "Broadcast New Signal"}
            </h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={isAr ? "عنوان الإشارة..." : "Signal Title..."}
              className={cn("w-full bg-[#000108] border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 focus:outline-none focus:border-cyan-400 text-sm mb-3", isAr ? "text-right" : "text-left")}
              dir={isAr ? "rtl" : "ltr"}
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className={cn("w-full bg-[#000108] border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 focus:outline-none focus:border-cyan-400 text-sm mb-3", isAr ? "text-right" : "text-left")}
              dir={isAr ? "rtl" : "ltr"}
            >
              <option value="الإعلام الموجه">{isAr ? "الإعلام الموجه" : "Targeted Media"}</option>
              <option value="النظام الاقتصادي">{isAr ? "النظام الاقتصادي" : "Economic System"}</option>
              <option value="الدين العالمي الجديد">{isAr ? "الدين العالمي الجديد" : "New World Religion"}</option>
              <option value="الحرب النفسية">{isAr ? "الحرب النفسية" : "Psychological Warfare"}</option>
              <option value="تصنيف شديد السرية">{isAr ? "تصنيف شديد السرية" : "Classified Secret"}</option>
            </select>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={isAr ? "محتوى الإشارة..." : "Signal Content..."}
              className={cn("w-full bg-[#000108] border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 focus:outline-none focus:border-cyan-400 text-sm min-h-[100px] mb-3", isAr ? "text-right" : "text-left")}
              dir={isAr ? "rtl" : "ltr"}
            />
            <button
              onClick={handleCreate}
              disabled={!newTitle || !newContent || isCreating}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all"
            >
              {isCreating ? (isAr ? "جاري البث..." : "Broadcasting...") : (isAr ? "إطلاق الإشارة" : "Launch Signal")}
            </button>
          </div>
        )}

        {/* Article Overlay */}
        <AnimatePresence>
          {selectedSignal && (
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute right-0 top-0 md:top-24 bottom-0 md:bottom-6 w-full md:w-[450px] max-w-full pointer-events-auto bg-space-dark/90 backdrop-blur-xl border-l md:border border-cyan-500/40 rounded-none md:rounded-l-3xl p-6 md:p-8 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Radio size={200} className="text-cyan-500" />
              </div>

              <div className="flex justify-between items-center mb-6 relative z-10">
                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-full border border-cyan-500/30 uppercase tracking-widest font-mono shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                  {selectedSignal.category}
                </span>
                <div className="flex items-center gap-3">
                  {isAdmin &&
                    (deletingSignalId === selectedSignal.id ? (
                      <div className="flex items-center gap-1.5 bg-red-500/10 px-1 py-0.5 rounded border border-red-500/30">
                        <span className="text-[11px] text-red-500">حذف؟</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(selectedSignal.id);
                          }}
                          className="text-[11px] text-red-500 font-bold"
                        >
                          نعم
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingSignalId(null);
                          }}
                          className="text-[11px] text-gray-400"
                        >
                          لا
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingSignalId(selectedSignal.id);
                        }}
                        className="text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    ))}
                  <button
                    onClick={() => {
                      setSelectedSignal(null);
                    }}
                    className="text-cyan-500 hover:text-cyan-300 font-mono text-sm"
                  >
                    [ CLOSE ]
                  </button>
                </div>
              </div>

              <h2 className="text-2xl font-black text-white mb-6 leading-tight relative z-10 text-right">
                {selectedSignal.title}
              </h2>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                <div className="prose prose-invert prose-cyan max-w-none text-gray-300 leading-relaxed text-right text-sm">
                  <Markdown>{selectedSignal.content}</Markdown>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-cyan-500/20 flex justify-between items-center relative z-10">
                <span className="text-cyan-500/60 font-mono text-xs flex items-center gap-2">
                  <Eye size={14} /> DECRYPTED {selectedSignal.views} TIMES
                </span>
                <span className="text-emerald-500 font-mono text-xs animate-pulse font-bold">
                  SIGNAL VERIFIED ✓
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
