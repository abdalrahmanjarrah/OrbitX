import { playSound } from "./lib/sound";
import { reportError } from "./lib/errorReporter";
import { enqueueError } from "./lib/errorQueue";
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
import StarBackground from "./components/StarBackground";

import { cn } from "./lib/utils";
import {
  auth,
  db,
  signInWithGoogle,
  logout,
  handleFirestoreError,
  OperationType,
} from "./firebase";
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
import { UserSearchView } from "./components/UserSearchView";

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


// --- Constants ---
export const SURAHS = [
  "الفاتحة",
  "البقرة",
  "آل عمران",
  "النساء",
  "المائدة",
  "الأنعام",
  "الأعراف",
  "الأنفال",
  "التوبة",
  "يونس",
  "هود",
  "يوسف",
  "الرعد",
  "إبراهيم",
  "الحجر",
  "النحل",
  "الإسراء",
  "الكهف",
  "مريم",
  "طه",
  "الأنبياء",
  "الحج",
  "المؤمنون",
  "النور",
  "الفرقان",
  "الشعراء",
  "النمل",
  "القصص",
  "العنكبوت",
  "الروم",
  "لقمان",
  "السجدة",
  "الأحزاب",
  "سبأ",
  "فاطر",
  "يس",
  "الصافات",
  "ص",
  "الزمر",
  "غافر",
  "فصلت",
  "الشورى",
  "الزخرف",
  "الدخان",
  "الجاثية",
  "الأحقاف",
  "محمد",
  "الفتح",
  "الحجرات",
  "ق",
  "الذاريات",
  "الطور",
  "النجم",
  "القمر",
  "الرحمن",
  "الواقعة",
  "الحديد",
  "المجادلة",
  "الحشر",
  "الممتحنة",
  "الصف",
  "الجمعة",
  "المنافقون",
  "التغابن",
  "الطلاق",
  "التحريم",
  "الملك",
  "القلم",
  "الحاقة",
  "المعارج",
  "نوح",
  "الجن",
  "المزمل",
  "المدثر",
  "القيامة",
  "الإنسان",
  "المرسلات",
  "النبأ",
  "النازعات",
  "عبس",
  "التكوير",
  "الانفطار",
  "المطففين",
  "الانشقاق",
  "البروج",
  "الطارق",
  "الأعلى",
  "الغاشية",
  "الفجر",
  "البلد",
  "الشمس",
  "الليل",
  "الضحى",
  "الشرح",
  "التين",
  "العلق",
  "القدر",
  "البينة",
  "الزلزلة",
  "العاديات",
  "القارعة",
  "التكاثر",
  "العصر",
  "الهمزة",
  "الفيل",
  "قريش",
  "الماعون",
  "الكوثر",
  "الكافرون",
  "النصر",
  "المسد",
  "الإخلاص",
  "الفلق",
  "الناس",
];

export const BADGES = [
  {
    id: "starter",
    title: "أول خطوة",
    icon: "👣",
    description: "أكملت أول جلسة تركيز",
    minXp: 100,
  },
  {
    id: "focus_10",
    title: "عاشق النجوم",
    icon: "⭐",
    description: "أكملت 10 جلسات تركيز",
    minXp: 1000,
  },
  {
    id: "streak_7",
    title: "ملتزم مداري",
    icon: "🔮",
    description: "جمعت طاقة كافية تتجاوز 5,000 XP",
    minXp: 5000,
  },
  {
    id: "focus_master",
    title: "سيد التركيز",
    icon: "🎯",
    description: "تجاوزت حاجز الـ 10,000 نجمة",
    minXp: 10000,
  },
  {
    id: "galaxy_knight",
    title: "فارس المجرة",
    icon: "⚔️",
    description: "تجاوزت حاجز الـ 20,000 نجمة",
    minXp: 20000,
  },
  {
    id: "level_30",
    title: "خبير المجرة",
    icon: "🌌",
    description: "وصلت للمستوى 30",
    minXp: 30000,
  },
  {
    id: "legend",
    title: "أسطورة",
    icon: "👑",
    description: "وصلت للمستوى 50",
    minXp: 50000,
  },
  {
    id: "challenge_champ",
    title: "بطل المعركة 🏆",
    icon: "👑",
    description: "شارة التحديات الفاخرة - حصل عليها لانتصاره في سباق التركيز!",
    minXp: 999999,
  },
];

export const MeteorEffect = ({ trigger }: { trigger: any }) => {
  const [meteors, setMeteors] = useState<
    { id: number; left: number; top: number; size: number; duration: number }[]
  >([]);

  useEffect(() => {
    if (trigger) {
      const id = Date.now();
      const size = 1.1 + Math.random() * 0.9; // beautiful dynamic trail scale
      const duration = 2.0 + Math.random() * 1.0; // slower, majestic flight duration (2.0s to 3.0s)
      setMeteors((prev) => [
        ...prev,
        { id, left: Math.random() * 100, top: Math.random() * 30, size, duration },
      ]);
      setTimeout(() => {
        setMeteors((prev) => prev.filter((m) => m.id !== id));
      }, 4000);
    }
  }, [trigger]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {meteors.map((m) => (
          <React.Fragment key={m.id}>
            {/* Highly realistic atmospheric sky flash */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.14, 0.14, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: m.duration, ease: "easeInOut" }}
              className="absolute inset-0 bg-white"
            />

            {/* The Meteor Streak */}
            <motion.div
              initial={{ x: "115vw", y: `${m.top}vh`, opacity: 0 }}
              animate={{ x: "-45vw", y: `${m.top + 32}vh`, opacity: [0, 1, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: m.duration, ease: "easeOut" }} // smoother slowdown motion
              className="absolute flex flex-row items-center select-none [direction:ltr]"
              style={{
                transform: "rotate(-22deg)",
                transformOrigin: "center left",
                direction: "ltr",
              }}
            >
              {/* Diffused local white aura glow trailing right behind */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 w-[320px] h-24 bg-white/12 blur-3xl rounded-full animate-pulse"
                style={{ transform: "scaleY(0.12)" }}
              />

              {/* Brilliant shining nucleus/head of the meteor leading the charge - now larger & thicker */}
              <div className="w-[6px] h-[6px] bg-white rounded-full shadow-[0_0_22px_10px_rgba(255,255,255,1),0_0_44px_22px_rgba(199,210,254,0.8),0_0_75px_35px_rgba(147,197,253,0.5)] relative z-10" />

              {/* Thicker, elegant trail going from maximum brightness to transparent to the back */}
              <div 
                className="bg-gradient-to-r from-white via-white/50 to-transparent -ml-[2px]"
                style={{ 
                  width: `${200 * m.size}px`,
                  height: "2.8px" // slightly thicker for realistic presence
                }}
              />
            </motion.div>
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  );
};

export const RECITERS = [
  { name: "مشاري العفاسي", server: "https://server8.mp3quran.net/afs/" },
  { name: "محمد اللحيدان", server: "https://server8.mp3quran.net/lhdan/" },
  {
    name: "عبد الباسط عبد الصمد",
    server: "https://server7.mp3quran.net/basit/",
  },
  { name: "ماهر المعيقلي", server: "https://server12.mp3quran.net/maher/" },
  { name: "سعد الغامدي", server: "https://server7.mp3quran.net/s_gmd/" },
  { name: "ياسر الدوسري", server: "https://server11.mp3quran.net/yasser/" },
  { name: "ناصر القطامي", server: "https://server6.mp3quran.net/qtm/" },
  { name: "إدريس أبكر", server: "https://server6.mp3quran.net/abkr/" },
];

// --- Types ---
export interface UserData {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio?: string;
  level: number;
  xp: number;
  missionRole?: string;
  completedWizard?: boolean;
  dailyFocusTarget?: number;
  role: "admin" | "user";
  inventory?: string[];
  items?: string[];
  lastActiveTime?: number;
  equippedItems?: Record<string, string>;
  badges?: string[];
  friendsCount?: number;
  banned?: boolean;
  currentActivity?: string;
  streak?: number;
  lastActiveDate?: string;
  lastDailyReward?: string;
  lastStudyDate?: string;
  totalFocusTime?: number;
  totalFocusMinutes?: number;
  focusSessions?: number;
  hearts?: number;
  totalFocusSessions?: number;
  fleetId?: string;
  fleetInvites?: string[];
  challengeWins?: number;
  challengeChampExpiry?: number;
  isGuest?: boolean;
  weekStart?: string;
  weekFocusMinutes?: number;
  weekSessions?: number;
  blackHoleClaimedWeek?: string;
  invitedBy?: string;
  referralsRewarded?: string[];
  timeChests?: {
    cycleStart: number;
    claimedChests: number[];
    lastCycleDate: string;
  };
}

export interface Fleet {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: string[];
  coAdmins?: string[];
  invites?: string[];
  logo?: string;
  totalFocusHours: number;
  xp: number;
  createdAt: any;
}

export interface Discussion {
  id: string;
  title: string;
  content: string;
  userId: string;
  userName: string;
  userPhoto: string;
  timestamp: any;
  repliesCount: number;
}

export interface Reply {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto: string;
  timestamp: any;
}

export interface ScheduleItem {
  id: string;
  day: string;
  time: string;
  task: string;
  userId: string;
  completed?: boolean;
  priority?: "low" | "medium" | "high";
  category?: string;
  duration?: number; // minutes
  color?: string; // hex accent picked from the task color palette
}

export interface Room {
  id: string;
  name: string;
  task: string;
  imageUrl?: string;
  creatorId: string;
  hostId?: string;
  creatorName: string;
  participants: string[];
  maxParticipants: number;
  timerStatus: "idle" | "focus" | "break";
  timerDuration: number;
  breakDuration: number;
  startTime: any;
  createdAt: any;
  emptyAt?: any;
  sharedNotes?: string;
  accumulatedFocusSeconds?: number;
  isChatLocked?: boolean;
  isPrivate?: boolean;
  joinCode?: string;
  isChallenge?: boolean;
  challengeId?: string;
  challengeDurationMinutes?: number;
  updatedAt?: any;
}

export interface Challenge {
  id: string;
  challengerId: string;
  challengerName: string;
  challengedId: string;
  challengedName: string;
  challengerPhoto?: string | null;
  challengedPhoto?: string | null;
  status: "pending" | "accepted" | "active" | "completed" | "cancelled" | "expired" | "declined";
  createdAt: number;
  startTime?: number;
  durationMinutes: number;
  progressPlayer1: number;
  progressPlayer2: number;
  winnerId?: string;
  rewardsClaimed?: string[];
  completedAt?: number;
}

export interface AwarenessSignal {
  id: string;
  title: string;
  content: string;
  category: string;
  authorId: string;
  timestamp: any;
  views: number;
  likes: number;
}
export interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto: string;
  userRankTitle?: string;
  userRankColor?: string;
  userRankIcon?: string;
  timestamp: any;
  type: "text" | "image" | "video" | "file";
  fileUrl?: string;
  replyTo?: { id: string; text: string; userName: string };
  mentions?: string[];
}

// --- Main App Component ---
export class ErrorBoundary extends Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    void reportError("react-boundary", error, {
      componentStack: errorInfo?.componentStack,
    });
    // أدخل الخطأ في الفلتر المركزي أيضاً حتى يظهر بلوحة الأدمن
    try {
      enqueueError("react-boundary", error, {
        componentStack: errorInfo?.componentStack,
      });
    } catch {
      /* تتجاهل ولا تكسر */
    }
  }

  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || String(this.state.error || "");
      return (
        <div className="min-h-screen bg-space-dark flex flex-col items-center justify-center p-6 text-center">
          <ShieldAlert className="w-20 h-20 text-red-500 mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">
            عذراً، حدث خطأ غير متوقع
          </h1>
          <p className="text-gray-400 max-w-md mb-8">
            لقد واجهنا مشكلة تقنية. يرجى محاولة إعادة تحميل الصفحة.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-indigo-500 rounded-xl font-bold hover:bg-indigo-700 transition-all"
          >
            إعادة تحميل الصفحة
          </button>
          <pre className="mt-8 p-4 bg-white/5 shadow-inner rounded-xl text-left text-[10px] text-red-400 overflow-auto max-w-full" dir="ltr">
            {errMsg}
          </pre>
          <button
            onClick={() => navigator.clipboard?.writeText(errMsg).catch(() => {})}
            className="mt-4 px-5 py-2 bg-white/5 rounded-xl text-xs font-bold text-gray-300 hover:bg-white/10 transition-all border border-white/5"
          >
            📋 نسخ تفاصيل الخطأ
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

export const getTourSteps = (isMobile: boolean): any[] => {
  const commonSteps = [
    {
      target: ".tour-step-stats",
      content:
        "هذا ملفك الشخصي ودرعك المداري: من هنا تتابع مستوى الحماس (القلوب) التي تكسبها بالتركيز، وتصل لملفك الكامل. حافظ على القلوب بالاستمرار وعدم الهروب من المهام!",
    },
    {
      target: ".tour-step-notifications",
      content:
        "تابع كل الإشعارات المهمة من أصدقائك، سواء كانت طلبات صداقة، تحديات، أو رسائل.",
    },
  ];

  if (isMobile) {
    return [
      {
        target: "body",
        content:
          'مرحباً بك في أوربت! هذه الجولة ستشرح لك أقسام التطبيق بحسب طلبك. تذكر أنه يمكنك إيقاف الجولة أو تخطيها في أي وقت من زر "تخطي".',
        placement: "center",
        disableBeacon: true,
      },
      {
        target: ".tour-step-menu-mobile",
        content:
          "من هذه القائمة الجانبية يمكنك التنقل بين كل الأقسام بكل سهولة (بحيث يمكنك الوصول للغرف الدراسية، الشات العام، المتصدرين، والنقاشات...).",
        disableBeacon: true,
      },
      ...commonSteps,
    ];
  }

  return [
    {
      target: "body",
      content:
        'مرحباً بك في أوربت! هذه الجولة ستشرح لك أقسام التطبيق بالكامل. تذكر أنه يمكنك إيقاف الجولة في أي وقت بالضغط على زر "تخطي".',
      placement: "center",
      disableBeacon: true,
    },
    {
      target: ".tour-step-home",
      content:
        "لوحة التحكم والمحطة الفضائية الخاصة بك. من هنا يمكنك استكشاف الغرف الدراسية المختلفة وبدء رحلة التركيز.",
      disableBeacon: true,
    },
    {
      target: ".tour-step-discussions",
      content:
        "ساحة النقاش: اطرح أسئلتك الأكاديمية وشارك في نقاشات هادفة للتبادل العلمي.",
    },
    {
      target: ".tour-step-schedule",
      content:
        "جدول المهام: نظم وقتك وموادك الدراسية هنا لتتمكن من إدارتها بفاعلية.",
    },
    {
      target: ".tour-step-leaderboard",
      content:
        "لوحة المتصدرين: هنا يظهر أمهر الرواد وأكثرهم إنجازاً! اجتهد لتصل إلى المركز الأول.",
    },
    ...commonSteps,
  ];
};
