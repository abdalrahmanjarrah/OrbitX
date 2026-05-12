import { Joyride } from 'react-joyride';
import { playSound } from './lib/sound';
import Markdown from 'react-markdown';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Globe from 'react-globe.gl';
import React, { useState, useEffect, useRef, Component } from 'react';
import { Leaf, Swords, ChevronLeft, Rocket, Timer, Users, Zap, Star, LogOut, LayoutDashboard, MessageSquare, User as UserIcon, Heart, ShieldAlert, Volume2, VolumeX, Play, Pause, SkipBack, SkipForward, Lock, Send, Image as ImageIcon, Plus, X, MessageCircle, Calendar, Shield, Trash2, Music, CloudRain, Flame, Wind, Bird, ChevronDown, PlayCircle, PauseCircle, CheckCircle, Info, Keyboard, Waves, TrainFront, Mic, MicOff, Headphones, Settings, Radio, Trophy, Menu, Square, Store, BookOpen, Target, Telescope, Award, Activity, Eye, Terminal as TerminalIcon, Cpu , CheckSquare, Bell, BarChart3, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import StarBackground from './components/StarBackground';

import { cn } from './lib/utils';
import { 
  auth, db, signInWithGoogle, logout, handleFirestoreError, OperationType 
} from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, 
  orderBy, limit, addDoc, serverTimestamp, updateDoc,
  arrayUnion, arrayRemove, increment, where, deleteDoc, deleteField, writeBatch
} from 'firebase/firestore';
import { useWebRTCVoice } from './hooks/useWebRTCVoice';
import { UserSearchView } from './components/UserSearchView';

// --- Constants ---
const SURAHS = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه", "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم", "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر", "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق", "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة", "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج", "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس", "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد", "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات", "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر", "المسد", "الإخلاص", "الفلق", "الناس"
];

export const getAstronautRank = (xp: number, missionRole?: string) => {
  const roleName = missionRole ? ` ${missionRole}` : "";
  const ranks = [
    { title: `مبتدئ${roleName}`, color: "text-gray-400", icon: "👨‍🚀", planet: "bg-gray-500 shadow-gray-500/50", minXp: 0 },
    { title: `مستكشف${roleName}`, color: "text-green-400", icon: "🛰️", planet: "bg-green-500 shadow-green-500/50", minXp: 5000 },
    { title: `طيار${roleName}`, color: "text-blue-400", icon: "🚀", planet: "bg-blue-500 shadow-blue-500/50", minXp: 15000 },
    { title: `قائد وحدة${roleName}`, color: "text-red-400", icon: "👨‍🚀", planet: "bg-red-500 shadow-red-500/50", minXp: 30000 },
    { title: `أسطورة${roleName}`, color: "text-indigo-500", icon: "👑", planet: "bg-indigo-500/20 shadow-indigo-400/50", minXp: 50000 },
  ];

  let currentRankIndex = 0;
  for (let i = ranks.length - 1; i >= 0; i--) {
    if (xp >= ranks[i].minXp) {
      currentRankIndex = i;
      break;
    }
  }

  const currentRank = ranks[currentRankIndex];
  const nextRank = currentRankIndex < ranks.length - 1 ? ranks[currentRankIndex + 1] : null;

  let progressPercentage = 100;
  if (nextRank) {
    const xpIntoCurrentRank = xp - currentRank.minXp;
    const xpNeededForNextRank = nextRank.minXp - currentRank.minXp;
    progressPercentage = Math.min(100, Math.max(0, (xpIntoCurrentRank / xpNeededForNextRank) * 100));
  }

  return {
    ...currentRank,
    progressPercentage,
    nextRankTitle: nextRank ? nextRank.title : "أقصى رتبة",
    nextRankMinXp: nextRank ? nextRank.minXp : currentRank.minXp
  };
};

const BADGES = [
  { id: 'starter', title: 'أول خطوة', icon: '👣', description: 'أكملت أول جلسة تركيز', minXp: 100 },
  { id: 'focus_10', title: 'عاشق النجوم', icon: '⭐', description: 'أكملت 10 جلسات تركيز', minXp: 1000 },
  { id: 'streak_7', title: 'منضبط كوني', icon: '🔥', description: 'حافظت على التزامك لمدة 7 أيام', minXp: 5000 },
  { id: 'level_30', title: 'خبير المجرة', icon: '🌌', description: 'وصلت للمستوى 30', minXp: 30000 },
  { id: 'legend', title: 'أسطورة', icon: '👑', description: 'وصلت للمستوى 50', minXp: 50000 },
];



const MeteorEffect = ({ trigger }: { trigger: any }) => {
  const [meteors, setMeteors] = useState<{ id: number, left: number, top: number }[]>([]);

  useEffect(() => {
    if (trigger) {
      const id = Date.now();
      setMeteors(prev => [...prev, { id, left: Math.random() * 100, top: Math.random() * 50 }]);
      setTimeout(() => {
        setMeteors(prev => prev.filter(m => m.id !== id));
      }, 1000);
    }
  }, [trigger]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {meteors.map(m => (
          <motion.div
            key={m.id}
            initial={{ x: '100vw', y: `${m.top}vh`, opacity: 0 }}
            animate={{ x: '-100vw', y: `${m.top + 20}vh`, opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "linear" }}
            className="absolute w-32 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent rotate-[-20deg]"
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const RECITERS = [
  { name: "مشاري العفاسي", server: "https://server8.mp3quran.net/afs/" },
  { name: "محمد اللحيدان", server: "https://server8.mp3quran.net/lhdan/" },
  { name: "عبد الباسط عبد الصمد", server: "https://server7.mp3quran.net/basit/" },
  { name: "ماهر المعيقلي", server: "https://server12.mp3quran.net/maher/" },
  { name: "سعد الغامدي", server: "https://server7.mp3quran.net/s_gmd/" },
  { name: "ياسر الدوسري", server: "https://server11.mp3quran.net/yasser/" },
  { name: "ناصر القطامي", server: "https://server6.mp3quran.net/qtm/" },
  { name: "إدريس أبكر", server: "https://server6.mp3quran.net/abkr/" },
];

import { Farm3D } from './components/Farm3D';

// --- Types ---
interface UserData {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio?: string;
  level: number;
  xp: number;
  missionRole?: string;
  role: 'admin' | 'user';
  hearts: number;
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
  lastStudyDate?: string;
  totalFocusSessions?: number;
  seeds?: number;
  plants?: {
    id: string;
    plantedAt: number;
    lastWateredAt: number;
  }[];
  fleetId?: string;
  fleetInvites?: string[];
}

interface Fleet {
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

interface Discussion {
  id: string;
  title: string;
  content: string;
  userId: string;
  userName: string;
  userPhoto: string;
  timestamp: any;
  repliesCount: number;
}

interface Reply {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto: string;
  timestamp: any;
}

interface ScheduleItem {
  id: string;
  day: string;
  time: string;
  task: string;
  userId: string;
}

interface Room {
  id: string;
  name: string;
  task: string;
  imageUrl?: string;
  creatorId: string;
  creatorName: string;
  participants: string[];
  maxParticipants: number;
  timerStatus: 'idle' | 'focus' | 'break';
  timerDuration: number;
  breakDuration: number;
  startTime: any;
  createdAt: any;
  emptyAt?: any;
  sharedNotes?: string;
}

interface Challenge {
  id: string;
  challengerId: string;
  challengerName: string;
  challengedId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
}


interface AwarenessSignal {
  id: string;
  title: string;
  content: string;
  category: string;
  authorId: string;
  timestamp: any;
  views: number;
  likes: number;
}
interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto: string;
  timestamp: any;
  type: 'text' | 'image' | 'video' | 'file';
  fileUrl?: string;
}

// --- Main App Component ---
class ErrorBoundary extends Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-space-dark flex flex-col items-center justify-center p-6 text-center">
          <ShieldAlert className="w-20 h-20 text-red-500 mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">عذراً، حدث خطأ غير متوقع</h1>
          <p className="text-gray-400 max-w-md mb-8">لقد واجهنا مشكلة تقنية. يرجى محاولة إعادة تحميل الصفحة.</p>
          <button
            onClick={() => window.location.reload()} 
            className="px-8 py-3 bg-indigo-500 rounded-xl font-bold hover:bg-indigo-700 transition-all"
          >
            إعادة تحميل الصفحة
          </button>
          {process.env.NODE_ENV !== 'production' && (
            <pre className="mt-8 p-4 bg-white/5/80 shadow-inner rounded-xl text-left text-[10px] text-red-400 overflow-auto max-w-full">
              {this.state.error?.message}
            </pre>
          )}
        </div>
      );
    }
    return (this as any).props.children;
  }
}


const getTourSteps = (isMobile: boolean): any[] => {
  const commonSteps = [
    {
      target: '.tour-step-profile',
      content: 'هذا ملفك الشخصي. يمكنك تعديل معلوماتك ومتابعة تقدمك وإظهار الأوسمة التي حصلت عليها.',
    },
    {
      target: '.tour-step-stats',
      content: 'هنا يمكنك متابعة مستوى الحماس (القلوب) التي تكسبها بالتركيز. حافظ عليها من خلال الاستمرار وعدم الهروب من المهام!',
    },
    {
      target: '.tour-step-notifications',
      content: 'تابع كل الإشعارات المهمة من أصدقائك، سواء كانت طلبات صداقة، تحديات، أو رسائل.',
    }
  ];

  if (isMobile) {
    return [
      {
        target: 'body',
        content: 'مرحباً بك في أوربت! هذه الجولة ستشرح لك أقسام التطبيق بحسب طلبك. تذكر أنه يمكنك إيقاف الجولة أو تخطيها في أي وقت من زر "تخطي".',
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '.tour-step-menu',
        content: 'من هذه القائمة الجانبية يمكنك التنقل بين كل الأقسام بكل سهولة (بحيث يمكنك الوصول للغرف الدراسية، الشات العام، المتصدرين، والنقاشات...).',
        disableBeacon: true,
      },
      ...commonSteps
    ];
  }

  return [
    {
      target: 'body',
      content: 'مرحباً بك في أوربت! هذه الجولة ستشرح لك أقسام التطبيق بالكامل. تذكر أنه يمكنك إيقاف الجولة في أي وقت بالضغط على زر "تخطي".',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-step-home',
      content: 'لوحة التحكم والمحطة الفضائية الخاصة بك. من هنا يمكنك استكشاف الغرف الدراسية المختلفة وبدء رحلة التركيز.',
      disableBeacon: true,
    },
    {
      target: '.tour-step-chat',
      content: 'الشات العام: تواصل مع جميع رواد الفضاء المتواجدين حالياً وشارك أفكارك وتحدياتك مع المجتمع.',
    },
    {
      target: '.tour-step-discussions',
      content: 'ساحة النقاش: اطرح أسئلتك الأكاديمية وشارك في نقاشات هادفة للتبادل العلمي.',
    },
    {
      target: '.tour-step-schedule',
      content: 'جدول المهام: نظم وقتك وموادك الدراسية هنا لتتمكن من إدارتها بفاعلية.',
    },
    {
      target: '.tour-step-leaderboard',
      content: 'لوحة المتصدرين: هنا يظهر أمهر الرواد وأكثرهم إنجازاً! اجتهد لتصل إلى المركز الأول.',
    },
    {
      target: '.tour-step-awareness',
      content: 'الوعي الكوني: قسم خاص لحل الألغاز وفك الشيفرات وكسب نقاط خبرة إضافية.',
    },
    ...commonSteps
  ];
};

function App() {
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');

  useEffect(() => {
    if (user) {
      // Activity tracking
      let lastActivityUpdate = 0;
      const updateActivity = () => {
        const now = Date.now();
        if (now - lastActivityUpdate > 60000) { // Throttle to 1 min
          lastActivityUpdate = now;
          updateDoc(doc(db, 'profiles', user.uid), { lastActiveTime: now }).catch(() => {});
        }
      };
      
      const activityEvents = ['mousedown', 'keydown', 'touchstart'];
      activityEvents.forEach(e => window.addEventListener(e, updateActivity, {passive: true}));
      updateActivity(); // Initial track

      const userRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          // Auto-upgrade to admin if email matches
          const isAdminEmail = user.email === 'lumafashionhq@gmail.com' || user.email === 'abdalrahmanjarrah94@gmail.com';
          if (isAdminEmail && data.role !== 'admin') {
            updateDoc(userRef, { role: 'admin' }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`));
            data.role = 'admin';
          }
          setUserData(data);
          setView('dashboard');
        } else {
          // Initialize new user
          const newUserData: UserData = {
            uid: user.uid,
            displayName: user.displayName || 'رائد فضاء',
            email: user.email || '',
            photoURL: user.photoURL || '',
            level: 1,
            xp: 0,
            role: (user.email === 'lumafashionhq@gmail.com' || user.email === 'abdalrahmanjarrah94@gmail.com') ? 'admin' : 'user',
            hearts: 3,
            friendsCount: 0,
            banned: false,
            currentActivity: 'في لوحة التحكم',
            streak: 1,
            lastActiveDate: new Date().toISOString().split('T')[0]
          };
          setDoc(userRef, newUserData).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`));
        }
      }, (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}`));
      
      return () => {
        unsubscribe();
        activityEvents.forEach(e => window.removeEventListener(e, updateActivity));
      };
    } else {
      setUserData(null);
      setView('landing');
    }
  }, [user]);

  useEffect(() => {
    if (userData && userData.hearts < 3) {
      const interval = setInterval(() => {
        const userRef = doc(db, 'users', userData.uid);
        updateDoc(userRef, {
          hearts: increment(1)
        }).catch(e => console.error("Heart recovery failed", e));
      }, 3600000); // Recover 1 heart every hour
      return () => clearInterval(interval);
    }
  }, [userData?.hearts, userData?.uid]);

  useEffect(() => {
    if (userData && userData.uid) {
      const today = new Date().toISOString().split('T')[0];
      const lastActive = userData.lastActiveDate;

      if (lastActive !== today) {
        const userRef = doc(db, 'users', userData.uid);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = userData.streak || 0;
        if (lastActive === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }

        updateDoc(userRef, {
          streak: newStreak,
          lastActiveDate: today
        }).catch(e => console.error("Streak update failed", e));
      }
    }
  }, [userData?.uid, userData?.lastActiveDate]);

  useEffect(() => {
    if (userData) {
      const newBadges: string[] = [...(userData.badges || [])];
      let changed = false;

      if (userData.totalFocusSessions && userData.totalFocusSessions >= 1 && !newBadges.includes('starter')) {
        newBadges.push('starter');
        changed = true;
      }
      if (userData.totalFocusSessions && userData.totalFocusSessions >= 10 && !newBadges.includes('focus_10')) {
        newBadges.push('focus_10');
        changed = true;
      }
      if (userData.streak && userData.streak >= 7 && !newBadges.includes('streak_7')) {
        newBadges.push('streak_7');
        changed = true;
      }
      if (userData.level >= 30 && !newBadges.includes('level_30')) {
        newBadges.push('level_30');
        changed = true;
      }

      if (changed) {
        updateDoc(doc(db, 'users', userData.uid), {
          badges: newBadges
        }).catch(e => console.error("Badge update failed", e));
      }
    }
  }, [userData?.totalFocusSessions, userData?.streak, userData?.level, userData?.uid]);

  useEffect(() => {
    if (userData) {
      const calculatedLevel = Math.floor(userData.xp / 1000) + 1;
      if (calculatedLevel !== userData.level) {
        if (calculatedLevel > userData.level) {
          setShowLevelUp(true);
          playSound('levelup');
          setTimeout(() => setShowLevelUp(false), 5000);
        }
        updateDoc(doc(db, 'users', userData.uid), {
          level: calculatedLevel
        }).catch(e => console.error("Level up update failed", e));
      }
    }
  }, [userData?.xp, userData?.level, userData?.uid]);

  useEffect(() => {
    if (userData) {
      const profileRef = doc(db, 'profiles', userData.uid);
      const publicData = {
        uid: userData.uid,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        bio: userData.bio || '',
        level: userData.level,
        xp: userData.xp,
        friendsCount: userData.friendsCount || 0,
        hearts: userData.hearts || 0,
        role: userData.role,
        banned: userData.banned || false,
        currentActivity: userData.currentActivity || 'في المدار',
                              };
      setDoc(profileRef, publicData, { merge: true }).catch(e => console.error("Profile sync failed", e));
    }
  }, [userData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-space-dark flex items-center justify-center">
        <Rocket className="w-12 h-12 text-indigo-400 animate-bounce" />
      </div>
    );
  }

  if (view === 'landing' && !user) {
    return <LandingPage onLogin={signInWithGoogle} />;
  }

  if (userData?.banned) {
    return (
      <div className="min-h-screen bg-space-dark flex flex-col items-center justify-center p-4 text-center">
        <ShieldAlert className="w-24 h-24 text-red-500 mb-6" />
        <h1 className="text-4xl font-bold text-white mb-4">تم حظر حسابك</h1>
        <p className="text-gray-400 max-w-md">لقد تم حظر وصولك إلى المنصة بسبب مخالفة القوانين. إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الإدارة.</p>
        <button onClick={logout} className="mt-8 px-8 py-3 bg-white/5 rounded-xl hover:bg-[#0a0b16]/20 transition-all">تسجيل الخروج</button>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showLevelUp && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-gradient-to-r from-yellow-400 to-orange-500 p-1 rounded-2xl shadow-2xl shadow-indigo-900/20 shadow-orange-500/40"
          >
            <div className="bg-[#0a0b16] px-8 py-4 rounded-[calc(1rem-1px)] flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center text-2xl">
                🎊
              </div>
              <div className="text-right">
                <h3 className="text-lg font-black text-white">ترقية جديدة!</h3>
                <p className="text-gray-400 text-xs">لقد وصلت للمستوى {userData?.level}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Dashboard user={userData} onLogout={logout} />
    </>
  );
}

export default function WrappedApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function LandingPage({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen relative overflow-x-hidden selection:bg-indigo-500/200/30">
      
      <StarBackground />
      <div className="atmosphere-bg" />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-xl bg-[#0a0b16]/80 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Rocket className="w-6 h-6 text-indigo-400" />
          <span className="text-xl font-bold font-display tracking-tight">OrbitX</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">المميزات</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">كيف يعمل</a>
          <a href="#community" className="hover:text-white transition-colors">المجتمع</a>
        </div>
        <button 
          onClick={onLogin}
          className="px-5 py-2 bg-white/5 hover:bg-[#0a0b16]/20 rounded-full text-sm font-bold transition-all border border-white/10"
        >
          دخول الرواد
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-40 px-6 flex flex-col items-center text-center overflow-hidden">
        {/* Animated Orbits & Planets */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           <motion.div 
             animate={{ rotate: 360 }} 
             transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
             className="absolute top-1/2 left-1/2 -mt-[300px] -ml-[300px] w-[600px] h-[600px] rounded-full border border-indigo-500/10 border-dashed"
           />
           <motion.div 
             animate={{ rotate: -360 }} 
             transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
             className="absolute top-1/2 left-1/2 -mt-[450px] -ml-[450px] w-[900px] h-[900px] rounded-full border border-fuchsia-500/10 border-dotted"
           />
           {/* Planet 1 */}
           <motion.div 
             animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
             transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
             className="absolute top-[20%] left-[15%] w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-400 blur-[2px] opacity-20 shadow-[0_0_50px_rgba(79,70,229,0.5)]"
           />
           {/* Planet 2 */}
           <motion.div 
             animate={{ y: [0, 30, 0], rotate: [0, -15, 15, 0] }}
             transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
             className="absolute top-[40%] right-[10%] w-32 h-32 rounded-full bg-gradient-to-bl from-fuchsia-600 to-pink-400 blur-[3px] opacity-20 shadow-[0_0_60px_rgba(217,70,239,0.5)]"
           />
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
          className="relative z-10 text-6xl md:text-9xl font-black font-display mb-6 tracking-tighter leading-[1.1] filter drop-shadow-2xl"
        >
          <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent inline-block animate-gradient-x">
            OrbitX
          </span>
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative z-10 text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed font-medium"
        >
          منصة الدراسة الجماعية الأولى من نوعها، حيث تتحول جلسات المذاكرة المملة إلى رحلات فضائية ملهمة وممتعة مع أصدقائك.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <button
            onClick={onLogin}
            className="px-10 py-5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-2xl font-bold text-xl flex items-center gap-3 shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:shadow-[0_0_60px_rgba(99,102,241,0.6)] hover:scale-105 transition-all duration-300"
          >
            ابدأ رحلتك الآن مجاناً
            <Rocket className="w-6 h-6 animate-pulse" />
          </button>
        </motion.div>
        
        {/* Mock UI Preview */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 50 }}
          className="relative z-10 mt-20 w-full max-w-5xl mx-auto rounded-xl sm:rounded-3xl border border-white/10 bg-[#060714]/90 backdrop-blur-xl shadow-2xl overflow-hidden shadow-indigo-900/40"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0a0b16]">
            <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
            <div className="mx-auto text-xs font-mono text-gray-500">app.orbitx.study</div>
          </div>
          <div className="relative aspect-video max-h-[600px] w-full bg-[#05050a] flex overflow-hidden">
             {/* Fake App Content */}
             <div className="absolute inset-0 flex items-center justify-center opacity-40">
                <StarBackground />
             </div>
             
             <div className="relative z-10 flex w-full h-full p-4 gap-4" dir="rtl">
               
               {/* Left Sidebar (Widgets) */}
               <div className="hidden md:flex flex-col gap-4 w-64 shrink-0">
                  {/* Quran Widget */}
                  <div className="bg-[#0a0b16]/90 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-400"><Music size={16}/></span>
                      <h4 className="text-sm font-bold text-white flex gap-2"><BookOpen size={16}/> القرآن الكريم</h4>
                    </div>
                    <div className="bg-black/30 rounded-lg p-2 text-xs text-center border border-white/5">مشاري العفاسي</div>
                    <div className="bg-black/30 rounded-lg p-2 text-xs text-center border border-white/5">الفاتحة 1</div>
                    <div className="flex justify-center items-center gap-4 mt-2">
                       <SkipForward size={16} className="text-gray-500"/>
                       <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center"><Play size={14} className="text-white fill-current"/></div>
                       <SkipBack size={16} className="text-gray-500"/>
                    </div>
                  </div>
                  
                  {/* Tasks Widget */}
                  <div className="bg-[#0a0b16]/90 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-green-400"><CheckSquare size={16}/></span>
                      <h4 className="text-sm font-bold text-white">مهامي الجانبية</h4>
                    </div>
                    <div className="text-center text-xs text-gray-500 py-4 border-b border-white/5 font-medium"> لا توجد مهام حالياً...</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="bg-indigo-500/20 text-indigo-400 p-2 rounded-lg"><Plus size={16}/></div>
                      <div className="bg-black/30 rounded-lg px-3 py-2 text-xs text-gray-400 border border-white/5 flex-1">مهمة جديدة...</div>
                    </div>
                  </div>
                  
                  {/* Chat Widget */}
                  <div className="bg-[#0a0b16]/90 border border-white/5 rounded-2xl p-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400"><MessageCircle size={16}/></span>
                      <h4 className="text-sm font-bold text-white">دردشة المحطة</h4>
                    </div>
                    <div className="flex-1"></div>
                  </div>
               </div>

               {/* Center Main Area (Timer & Orbits) */}
               <div className="flex-1 flex flex-col items-center justify-center relative">
                 {/* Orbit Rings */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full border border-white/5"></div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full border border-white/5 border-dashed"></div>

                 {/* Timer Center */}
                 <div className="relative z-10 w-64 h-64 rounded-full bg-[#0a0b16]/80 flex flex-col items-center justify-center border-4 border-[#ffb800] glowing-ring">
                   <div className="absolute inset-0 rounded-full border-[12px] border-[#ffb800]/20 pointer-events-none"></div>
                   <div className="text-6xl font-black text-white font-mono mb-2 track-tight drop-shadow-md">24:54</div>
                   <div className="text-sm text-gray-300 font-bold bg-[#ffb800]/10 px-3 py-1 rounded-full text-[#ffb800]">مرحلة التركيز</div>
                 </div>

                 {/* Orbiting Avatar */}
                 <div className="absolute top-1/2 left-[calc(50%+175px)] -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 border-indigo-400 bg-[#0a0b16] flex items-center justify-center">
                    <UserIcon size={20} className="text-indigo-400"/>
                 </div>
               </div>
             </div>
             
             {/* Bottom Controls Bar */}
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#0a0b16]/90 border border-white/10 rounded-full py-3 px-6 flex items-center justify-between gap-6 z-20 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-green-400">متصل صوتياً</span>
                    <span className="text-[10px] text-gray-500">مكتوم space = تحدث</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white cursor-pointer"><Headphones size={18}/></div>
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/30 text-red-500 cursor-pointer border border-red-500/20"><MicOff size={18}/></div>
                </div>
                <div className="w-[1px] h-8 bg-white/10"></div>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full border-2 border-green-500 bg-[#151525] flex items-center justify-center overflow-hidden">
                    <UserIcon size={20} className="text-gray-400"/>
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0a0b16] rounded-full"></div>
                </div>
             </div>
          </div>
        </motion.div>

        {/* Global Analytics Preview */}
        <motion.div
           initial={{ opacity: 0, y: 40 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.7 }}
           className="relative z-10 w-full max-w-5xl mx-auto mt-16 scale-95 opacity-80 pointer-events-none hover:opacity-100 transition-opacity"
        >
           <AnalyticsView 
             user={{ xp: 1450, totalFocusSessions: 1420, level: 14 } as any} 
             friends={[
               { uid: '1', displayName: 'أحمد', xp: 450, level: 12 },
               { uid: '2', displayName: 'سارة', xp: 820, level: 15 },
               { uid: '3', displayName: 'خالد', xp: 120, level: 10 },
             ] as any[]}
           />
        </motion.div>

        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-10 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-[100px] pointer-events-none" />
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">لماذا OrbitX؟</h2>
            <p className="text-gray-400">كل ما تحتاجه للتركيز والإبداع في مكان واحد</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Timer className="w-8 h-8 text-blue-400" />}
              title="مؤقت الشمس الذكي"
              description="نظام بومودورو متطور يتفاعل مع تركيزك، مع تنبيهات ذكية عند التشتت."
            />
            <FeatureCard 
              icon={<Users className="w-8 h-8 text-indigo-500" />}
              title="مدارات جماعية"
              description="انضم إلى محطات دراسية مع أصدقائك، وراقب تقدمهم ككواكب تدور حول الشمس."
            />
            <FeatureCard 
              icon={<Music className="w-8 h-8 text-pink-400" />}
              title="أجواء فضائية"
              description="مكتبة صوتية متكاملة تشمل القرآن الكريم وأصوات الطبيعة الهادئة."
            />
            <FeatureCard 
              icon={<Zap className="w-8 h-8 text-yellow-400" />}
              title="نظام التطور"
              description="اكسب XP، ارتقِ في المستويات، وافتح شارات نادرة تعكس إنجازاتك."
            />
            <FeatureCard 
              icon={<MessageCircle className="w-8 h-8 text-green-400" />}
              title="ساحة النقاش"
              description="اطرح أسئلتك، شارك ملخصاتك، وتفاعل مع مجتمع من الرواد الطموحين."
            />
            <FeatureCard 
              icon={<Shield className="w-8 h-8 text-red-400" />}
              title="بيئة آمنة"
              description="نظام إشراف متطور يضمن بيئة دراسية محفزة وخالية من المشتتات."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-6 bg-[#0a0b16]/2">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">كيف تبدأ رحلتك؟</h2>
            <p className="text-gray-400">ثلاث خطوات بسيطة لتغيير طريقة دراستك</p>
          </div>
          <div className="space-y-12">
            <StepItem 
              number="01"
              title="أنشئ محطتك الخاصة"
              description="اختر اسماً لمحطتك وحدد المهمة التي تريد إنجازها اليوم."
            />
            <StepItem 
              number="02"
              title="ادعُ طاقمك"
              description="شارك رابط المحطة مع أصدقائك أو اتركها عامة لينضم إليك رواد آخرون."
            />
            <StepItem 
              number="03"
              title="انطلق نحو النجاح"
              description="ابدأ مؤقت التركيز، استمتع بالأجواء، واكسب النقاط مع كل دقيقة تنجز فيها."
            />
          </div>
        </div>
      </section>

      {/* Community Preview */}
      <section id="community" className="py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-12">من قلب المجتمع</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <img src="https://picsum.photos/seed/space1/400/400" className="rounded-2xl grayscale hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
            <img src="https://picsum.photos/seed/space2/400/400" className="rounded-2xl grayscale hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
            <img src="https://picsum.photos/seed/space3/400/400" className="rounded-2xl grayscale hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
            <img src="https://picsum.photos/seed/space4/400/400" className="rounded-2xl grayscale hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
          </div>
          <button 
            onClick={onLogin}
            className="text-indigo-500 font-bold hover:underline flex items-center gap-2 mx-auto"
          >
            انضم للمجتمع وشاهد المزيد
            <SkipBack className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Rocket className="w-6 h-6 text-indigo-400" />
          <span className="text-xl font-bold font-display">OrbitX</span>
        </div>
        <p className="text-gray-500 text-sm">
          جميع الحقوق محفوظة © {new Date().getFullYear()} OrbitX - منصة الدراسة الفضائية
        </p>
      </footer>
    </div>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-5xl font-black font-display text-white mb-2">{value}</div>
      <div className="text-sm text-gray-500 font-bold uppercase tracking-widest">{label}</div>
    </div>
  );
}

function StepItem({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="flex gap-8 items-start group">
      <div className="text-5xl font-black font-display text-white/10 group-hover:text-indigo-400/20 transition-colors leading-none">
        {number}
      </div>
      <div className="text-right" dir="rtl">
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="p-8 rounded-3xl glass glass-hover flex flex-col items-center text-center group transition-all"
    >
      <div className="mb-6 p-4 rounded-2xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 group-hover:bg-indigo-500/200/10 group-hover:scale-110 transition-all">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </motion.div>
  );
}



function NotificationsDropdown({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const prevUnreadCountRef = useRef(0);

  useEffect(() => {
    const q = query(collection(db, 'users', userId, 'notifications'), orderBy('timestamp', 'desc'), limit(20));
    const unsub = onSnapshot(q, snap => {
      const notifs: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const unreadCount = notifs.filter(n => !n.read).length;
      if (unreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current > 0) {
         playSound('notification');
      }
      prevUnreadCountRef.current = unreadCount;
      setNotifications(notifs);
    });
    return () => unsub();
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    notifications.forEach(n => {
      if (!n.read) updateDoc(doc(db, 'users', userId, 'notifications', n.id), { read: true });
    });
  };

  return (
    <div className="relative">
      <button 
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) markAllRead(); }} 
        className="tour-step-notifications relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5 border border-transparent hover:border-white/10"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">{unreadCount}</span>
        )}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-0 mt-2 w-72 bg-[#0b0c16] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden"
            dir="rtl"
          >
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <span className="font-bold text-sm">الإشعارات</span>
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">لا توجد إشعارات</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`p-3 border-b border-white/5 text-sm ${n.read ? 'opacity-70' : 'bg-white/5'}`}>
                    {n.content}
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

function Dashboard({ user, onLogout }: { user: UserData | null, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'search' | 'profile' | 'discussions' | 'schedule' | 'admin' | 'leaderboard' | 'awareness' | 'blackholes' | 'fleets' | 'farm'>('home');
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(!user?.missionRole && !localStorage.getItem('hasSkippedRoleModal'));
  const [customRole, setCustomRole] = useState('');
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    if (user && user.level === 1 && user.xp <= 10 && !localStorage.getItem('hasSeenTour_v3')) {
      // Delay slightly for render
      setTimeout(() => setRunTour(true), 1500);
    }
  }, [user]);

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    if (['finished', 'skipped'].includes(status)) {
      setRunTour(false);
      localStorage.setItem('hasSeenTour_v3', 'true');
    }
  };

  if (!user) return null;

  const handleSelectRole = async (roleObjOrString: string) => {
    let roleTitle = roleObjOrString;
    if (!roleTitle.trim()) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), { missionRole: roleTitle.trim() });
      setShowRoleModal(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleSkipRole = () => {
    localStorage.setItem('hasSkippedRoleModal', 'true');
    setShowRoleModal(false);
  };

  if (activeStation) {
    return <StudyRoomView user={user} stationId={activeStation} onExit={() => setActiveStation(null)} onSelectUser={setSelectedUserId} />;
  }

  
  const focusTabs = ['home', 'schedule', 'farm', 'blackholes'];
  const communityTabs = ['chat', 'search', 'discussions', 'fleets', 'leaderboard', 'awareness'];
  const profileTabs = ['profile', 'admin'];

  let currentCategory = 'focus';
  if (communityTabs.includes(activeTab as string)) currentCategory = 'community';
  else if (profileTabs.includes(activeTab as string)) currentCategory = 'profile';

  const setCategory = (cat) => {
    if (cat === 'focus') handleTabChange('home');
    if (cat === 'community') handleTabChange('chat');
    if (cat === 'profile') handleTabChange('profile');
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    let activity = 'في لوحة التحكم';
    if (tab === 'chat') activity = 'في الشات العام';
    if (tab === 'profile') activity = 'يشاهد ملفه الشخصي';
    if (tab === 'discussions') activity = 'في ساحة النقاش';
    if (tab === 'schedule') activity = 'ينظم جدوله';
    if (tab === 'leaderboard') activity = 'يتفقد المتصدرين 🏆';
    if (tab === 'admin') activity = 'في لوحة الإدارة 🛡️';
    if (tab === 'awareness') activity = 'يقوم بفك التشفير 📡';
    
    updateDoc(doc(db, 'users', user.uid), { currentActivity: activity });
  };

  return (
    <div className="min-h-screen relative flex flex-col" dir="rtl">
      
      <StarBackground />
      <div className="atmosphere-bg" />
      
      <Joyride
        steps={getTourSteps(window.innerWidth < 1024)}
        run={runTour}
        continuous
        showSkipButton
        showProgress
        callback={handleJoyrideCallback}
        styles={{
          // @ts-ignore
          options: {
            primaryColor: '#6366f1',
            backgroundColor: '#0b0c16',
            textColor: '#fff',
            arrowColor: '#0b0c16',
            zIndex: 1000
          }
        }}
        locale={{
          back: 'السابق',
          close: 'إغلاق',
          last: 'إنهاء',
          next: 'التالي',
          skip: 'تخطي'
        }}
      />
      
      <AnimatePresence>
        {showRoleModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-[#0b0c16] border border-white/10 rounded-[2rem] p-6 lg:p-8 w-full max-w-xl shadow-[0_0_80px_rgba(79,70,229,0.15)] text-center relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Rocket size={160} />
              </div>
              
              <div className="relative z-10">
                <h2 className="text-2xl lg:text-3xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-cyan-400">
                  اختر تخصصك الفضائي 🚀
                </h2>
                <p className="text-gray-400 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                  اختر هويتك التي سترافقك في مسيرتك العلمية.. من أنت في هذا الكون؟
                </p>

                <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-4">
                  <div className="flex w-full max-w-sm gap-2">
                    <input
                      type="text"
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      placeholder="أدخل تخصصك الفضائي..."
                      className="flex-1 bg-[#131526] border border-white/10 rounded-xl px-4 py-3 text-right focus:outline-none focus:border-indigo-500 text-white text-sm transition-colors"
                    />
                    <button
                      onClick={() => handleSelectRole(customRole)}
                      disabled={!customRole.trim()}
                      className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 transition-colors rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20"
                    >
                      تأكيد
                    </button>
                  </div>
                  <button onClick={handleSkipRole} className="text-xs font-medium text-gray-500 hover:text-indigo-400 transition-colors mt-2">
                    سأختار لاحقاً
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectedUserId && (
        <UserModal 
          userId={selectedUserId} 
          currentUserId={user.uid} 
          currentUser={user}
          onClose={() => setSelectedUserId(null)} 
        />
      )}

       
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-xl bg-[#0a0b16]/80 border-b border-white/5">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleTabChange('home')}>
          <Rocket className="w-6 h-6 text-indigo-400" />
          <span className="text-xl font-bold font-display tracking-tight text-white">OrbitX</span>
        </div>
        
        
        <div className="hidden lg:flex items-center gap-6 flex-1 pr-12">
          

          {/* Contextual Sub-Nav */}
          <div className="flex items-center gap-1">
            {currentCategory === 'focus' && (
              <>
                <NavLink className="tour-step-home" icon={<LayoutDashboard size={16} />} label="الغرف" active={activeTab === 'home'} onClick={() => handleTabChange('home')} />
                <NavLink className="tour-step-schedule" icon={<Calendar size={16} />} label="الجدول" active={activeTab === 'schedule'} onClick={() => handleTabChange('schedule')} />
                <NavLink icon={<Bird size={16} />} label="المزرعة" active={activeTab === 'farm'} onClick={() => handleTabChange('farm')} />
                <NavLink icon={<Target size={16} />} label="الثقوب السوداء" active={activeTab === 'blackholes'} onClick={() => handleTabChange('blackholes')} />
              </>
            )}
            {currentCategory === 'community' && (
              <>
                <NavLink className="tour-step-chat" icon={<MessageSquare size={16} />} label="الشات" active={activeTab === 'chat'} onClick={() => handleTabChange('chat')} />
                <NavLink icon={<Search size={16} />} label="البحث" active={activeTab === 'search'} onClick={() => handleTabChange('search')} />
                <NavLink className="tour-step-discussions" icon={<MessageCircle size={16} />} label="النقاشات" active={activeTab === 'discussions'} onClick={() => handleTabChange('discussions')} />
                <NavLink icon={<Users size={16} />} label="الأساطيل" active={activeTab === 'fleets'} onClick={() => handleTabChange('fleets')} />
                <NavLink className="tour-step-leaderboard" icon={<Trophy size={16} />} label="المتصدرين" active={activeTab === 'leaderboard'} onClick={() => handleTabChange('leaderboard')} />
                <NavLink className="tour-step-awareness" icon={<Radio size={16} />} label="الوعي" active={activeTab === 'awareness'} onClick={() => handleTabChange('awareness')} />
              </>
            )}
            {currentCategory === 'profile' && (
              <>
                <NavLink icon={<UserIcon size={16} />} label="الملف" active={activeTab === 'profile'} onClick={() => handleTabChange('profile')} />
                {user.role === 'admin' && (
                  <NavLink icon={<Shield size={16} />} label="الإدارة" active={activeTab === 'admin'} onClick={() => handleTabChange('admin')} />
                )}
              </>
            )}
          </div>
        </div>
          {/* User Info & Mobile Menu Toggle - Fixed Right (Capsule) */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* The Capsule */}
            <div className="tour-step-stats flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-full p-1.5 pl-4 backdrop-blur-md">

              
              <div className="text-left hidden xl:block mr-2 cursor-pointer" onClick={() => handleTabChange('profile')}>
                <div className="text-sm font-bold text-white leading-tight">{user.displayName}</div>
                <div className="text-[10px] text-sky-400 font-bold">{getAstronautRank(user.xp).title}</div>
              </div>

              <img 
                src={user.photoURL} 
                alt="profile" 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-indigo-500 object-cover cursor-pointer hover:scale-105 transition-transform"
                onClick={() => handleTabChange('profile')}
                referrerPolicy="no-referrer"
              />
            </div>
            <NotificationsDropdown userId={user.uid} />
            <button 
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 flex-shrink-0 hidden lg:block"
              title="خروج"
            >
              <LogOut size={20} />
            </button>

          </div>
        </nav>

        {/* Mobile Contextual Sub-Nav */}
        <div className="lg:hidden fixed top-[72px] left-0 right-0 z-40 bg-[#0a0b16]/90 backdrop-blur-xl border-b border-white/5 py-3 px-4 shadow-lg overflow-x-auto no-scrollbar pointer-events-auto">
          <div className="flex items-center gap-2 w-max mx-auto">
            {currentCategory === 'focus' && (
              <>
                <NavLink className="tour-step-home" icon={<LayoutDashboard size={14} />} label="الغرف" active={activeTab === 'home'} onClick={() => handleTabChange('home')} />
                <NavLink className="tour-step-schedule" icon={<Calendar size={14} />} label="الجدول" active={activeTab === 'schedule'} onClick={() => handleTabChange('schedule')} />
                <NavLink icon={<Bird size={14} />} label="المزرعة" active={activeTab === 'farm'} onClick={() => handleTabChange('farm')} />
                <NavLink icon={<Target size={14} />} label="الثقوب السوداء" active={activeTab === 'blackholes'} onClick={() => handleTabChange('blackholes')} />
              </>
            )}
            {currentCategory === 'community' && (
              <>
                <NavLink className="tour-step-chat" icon={<MessageSquare size={14} />} label="الشات" active={activeTab === 'chat'} onClick={() => handleTabChange('chat')} />
                <NavLink icon={<Search size={14} />} label="البحث" active={activeTab === 'search'} onClick={() => handleTabChange('search')} />
                <NavLink className="tour-step-discussions" icon={<MessageCircle size={14} />} label="النقاشات" active={activeTab === 'discussions'} onClick={() => handleTabChange('discussions')} />
                <NavLink icon={<Users size={14} />} label="الأساطيل" active={activeTab === 'fleets'} onClick={() => handleTabChange('fleets')} />
                <NavLink className="tour-step-leaderboard" icon={<Trophy size={14} />} label="المتصدرين" active={activeTab === 'leaderboard'} onClick={() => handleTabChange('leaderboard')} />
                <NavLink className="tour-step-awareness" icon={<Radio size={14} />} label="الوعي" active={activeTab === 'awareness'} onClick={() => handleTabChange('awareness')} />
              </>
            )}
            {currentCategory === 'profile' && (
              <>
                <NavLink icon={<UserIcon size={14} />} label="الملف" active={activeTab === 'profile'} onClick={() => handleTabChange('profile')} />
                {user.role === 'admin' && (
                  <NavLink icon={<Shield size={14} />} label="الإدارة" active={activeTab === 'admin'} onClick={() => handleTabChange('admin')} />
                )}
              </>
            )}
          </div>
        </div>

        {/* Floating Bottom Dock (3 Capsules) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-max max-w-[90vw]">
          <div className="flex items-center gap-2 bg-[#0a0b16]/95 backdrop-blur-2xl p-2 rounded-full border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            <button 
              onClick={() => setCategory('focus')}
              className={`flex flex-col items-center justify-center w-20 h-14 rounded-full transition-all ${currentCategory === 'focus' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-gray-400 hover:text-white'}`}
            >
              <Rocket size={18} className={currentCategory === 'focus' ? '-translate-y-0.5 transition-transform' : ''} />
              <span className="text-[10px] font-bold mt-1">التركيز</span>
            </button>
            <button 
              onClick={() => setCategory('community')}
              className={`flex flex-col items-center justify-center w-20 h-14 rounded-full transition-all ${currentCategory === 'community' ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/30' : 'text-gray-400 hover:text-white'}`}
            >
              <Users size={18} className={currentCategory === 'community' ? '-translate-y-0.5 transition-transform' : ''} />
              <span className="text-[10px] font-bold mt-1">المجتمع</span>
            </button>
            <button 
              onClick={() => setCategory('profile')}
              className={`flex flex-col items-center justify-center w-20 h-14 rounded-full transition-all ${currentCategory === 'profile' ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/30' : 'text-gray-400 hover:text-white'}`}
            >
              <UserIcon size={18} className={currentCategory === 'profile' ? '-translate-y-0.5 transition-transform' : ''} />
              <span className="text-[10px] font-bold mt-1">القيادة</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col pt-[124px] lg:pt-[80px] pb-28">

      {activeTab === 'home' && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[60] group">
          {/* Subtle animated RGB glow effect */}
          <div className="absolute -inset-[1px] rounded-l-xl bg-gradient-to-b from-fuchsia-500 via-indigo-500 to-cyan-500 opacity-50 blur-[3px] group-hover:opacity-100 group-hover:blur-[6px] transition-all duration-500"></div>
          
          <motion.button
            onClick={() => setShowRoleModal(true)}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.92 }}
            className="relative flex items-center justify-center w-12 h-12 bg-[#0b0c16] hover:bg-[#131526] rounded-l-xl border-y border-l border-white/10 shadow-xl transition-all"
            title={user.missionRole ? 'تعديل التخصص' : 'التخصص الفضائي'}
          >
            <Keyboard size={22} className="text-gray-300 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] transition-all duration-300" />
          </motion.button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 z-10">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'home' && <HomeView user={user} onEnterStation={(id) => setActiveStation(id)} onSelectUser={setSelectedUserId} />}
          {activeTab === 'chat' && <ChatView user={user} onSelectUser={setSelectedUserId} />}
          {activeTab === 'search' && <UserSearchView user={user} onSelectUser={setSelectedUserId} />}
          {activeTab === 'profile' && <ProfileView user={user} />}
          {activeTab === 'discussions' && <DiscussionsView user={user} />}
          {activeTab === 'schedule' && <ScheduleView user={user} />}
          {activeTab === 'farm' && (
            <div className="max-w-4xl mx-auto animate-fade-in pb-12">
               <FarmDisplay user={user} isOwner={true} isStudying={false} />
            </div>
          )}
          {activeTab === 'leaderboard' && <LeaderboardView user={user} onSelectUser={setSelectedUserId} />}
          {activeTab === 'admin' && <AdminView user={user} />}
          {activeTab === 'awareness' && <AwarenessView user={user} />}
          {activeTab === 'blackholes' && <BlackHolesView user={user} />}
          {activeTab === 'fleets' && <FleetsView user={user} />}
        </div>
      </main>
      </div>
    </div>
  );
}

const bentoContainer: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const bentoItem: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const bentoHover: any = {
  y: -5,
  boxShadow: "0 10px 40px -10px rgba(99, 102, 241, 0.5), inset 0 0 20px rgba(168, 85, 247, 0.2)",
  borderColor: "rgba(168, 85, 247, 0.5)",
  transition: { duration: 0.3 }
};

function ChallengeModal({ user, onClose }: { user: UserData, onClose: () => void }) {
  const [friends, setFriends] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'friends'), limit(20));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const friendIds = snapshot.docs.map(doc => doc.id);
      if (friendIds.length > 0) {
        try {
          const friendsQuery = query(collection(db, 'profiles'), where('uid', 'in', friendIds));
          const friendsSnap = await getDocs(friendsQuery);
          setFriends(friendsSnap.docs.map(doc => doc.data() as UserData));
        } catch (e) {
          console.error("Error fetching friends details:", e);
        }
      } else {
        setFriends([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const sendChallenge = async (friendId: string) => {
    try {
      await addDoc(collection(db, 'challenges'), {
        challengerId: user.uid,
        challengerName: user.displayName,
        challengedId: friendId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      addDoc(collection(db, 'users', friendId, 'notifications'), {
         type: 'challenge',
         content: `دعاك ${user.displayName} لتحدي دراسي جديد!`,
         read: false,
         timestamp: serverTimestamp()
      }).catch(console.error);
      alert('تم إرسال طلب التحدي بنجاح!');
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'challenges');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0a0b16] rounded-3xl p-6 md:p-8 w-full max-w-md border border-white/10 shadow-2xl shadow-indigo-900/20 relative">
        <button onClick={onClose} className="absolute top-4 left-4 p-2 text-gray-500 hover:text-white transition-colors">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-black mb-6 text-center text-indigo-400">اختر صديق للتحدي 🎯</h2>
        
        {loading ? (
          <div className="py-8 text-center text-gray-500">جاري تحميل الأصدقاء...</div>
        ) : friends.length === 0 ? (
          <div className="py-8 text-center text-gray-500">لا يوجد أصدقاء. ابحث عن رواد لتضيفهم!</div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {friends.map(friend => (
              <div key={friend.uid} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={friend.photoURL} alt={friend.displayName} className="w-10 h-10 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" />
                    {friend.lastActiveTime && (Date.now() - friend.lastActiveTime < 300000) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0b16]" title="متصل الآن" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{friend.displayName}</div>
                    <div className="text-[10px] text-gray-400">المستوى {friend.level}</div>
                  </div>
                </div>
                <button 
                  onClick={() => sendChallenge(friend.uid)}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-500/20 text-white"
                >
                  تحدي
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function ArticleModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/20 backdrop-blur-sm">
      <div className="min-h-full flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-[#0a0b16] rounded-3xl p-6 md:p-8 w-full max-w-2xl border border-indigo-500/20 shadow-2xl shadow-indigo-900/40 relative my-8">
          <button onClick={onClose} className="absolute top-4 left-4 p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-full z-10">
            <X size={20} />
          </button>
        
        <div className="flex items-center gap-4 mb-6 pt-4">
          <div className="p-4 rounded-2xl bg-indigo-500/20 text-indigo-400 shadow-inner">
            <BookOpen size={32} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2">كيف تتغلب على التشتت في العالم الرقمي؟</h2>
            <div className="text-sm text-indigo-300 font-bold flex items-center gap-2">
              <Telescope size={16} /> <span>استراتيجيات رواد الفضاء لإدارة الوقت</span>
            </div>
          </div>
        </div>

        <div className="prose prose-invert prose-indigo max-w-none text-gray-300 space-y-6 text-sm md:text-base leading-relaxed">
          <p>
            في عصرنا الحالي المليء بالإشعارات والتنبيهات المستمرة، أصبح الحفاظ على التركيز تحدياً يشبه محاولة توجيه مركبة فضائية عبر حقل من الكويكبات. كيف يمكننا الحفاظ على هدوئنا وإنتاجيتنا وسط هذا الضجيج الرقمي؟ دعونا نتعلم من أولئك الذين يعتمد بقاؤهم على التركيز المطلق: <strong>رواد الفضاء</strong>.
          </p>
          
          <div className="p-5 rounded-2xl bg-indigo-900/20 border border-indigo-500/10">
            <h4 className="text-indigo-400 font-bold text-lg mb-3 flex items-center gap-2">
              <Target size={20} /> 1. قاعدة "الصندوق المغلق" (The Airlock Strategy)
            </h4>
            <p>
              قبل الخروج إلى الفضاء المفتوح، يقضي رواد الفضاء وقتاً في غرفة معادلة الضغط (Airlock). طبّق هذا في عملك: قبل بدء مهمة عميقة، اصنع "غرفة ضغط" رقمية. أغلق جميع الإشعارات، ضع هاتفك في وضع الطيران، أو استخدم تطبيقات حظر المشتتات لمدة محددة. لا تدخل إلى فضاء العمل العميق وأنت ما زلت متصلاً بضجيج الأرض.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-indigo-900/20 border border-indigo-500/10">
            <h4 className="text-indigo-400 font-bold text-lg mb-3 flex items-center gap-2">
              <Timer size={20} /> 2. المهام المجدولة بالدقائق (Micro-Scheduling)
            </h4>
            <p>
              على متن محطة الفضاء الدولية (ISS)، يتم جدولة وقت رواد الفضاء بزيادات مدتها 5 دقائق. هذا لا يعني أن تكون مهووساً، بل يعني أن تخصص وقتاً محدداً لكل مهمة (Timeboxing). عندما تعرف أن لديك 45 دقيقة فقط لهذه المهمة قبل الانتقال للتالية، سيقل احتمال انجرافك نحو تصفح وسائل التواصل الاجتماعي.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-indigo-900/20 border border-indigo-500/10">
            <h4 className="text-indigo-400 font-bold text-lg mb-3 flex items-center gap-2">
              <Radio size={20} /> 3. تواصل فعّال ومحدّد (Houston, We Have a Protocol)
            </h4>
            <p>
              التواصل مع الأرض يتم في أوقات محددة وبصيغ واضحة. خصص أوقاتاً محددة (مرتين أو ثلاث يومياً) للتحقق من البريد الإلكتروني والرسائل. لا تجعل بريدك الإلكتروني مفتوحاً طوال اليوم ليكون جهاز تحكم عن بعد يتيح للآخرين تشتيت انتباهك في أي وقت.
            </p>
          </div>

          <blockquote className="border-r-4 border-indigo-500 pr-4 italic text-gray-400 bg-white/5 p-4 rounded-l-xl">
            "التركيز ليس مجرد اختيار ما يجب التركيز عليه، بل هو بالأحرى اختيار ملايين الأشياء التي يجب تجاهلها."
          </blockquote>
          
          <p>
            تذكر، التركيز هو عضلة. كلما دربتها على البقاء في مهمة واحدة أطول، أصبحت أقوى. ابدأ بمهمة واحدة لمدة 25 دقيقة (تقنية بومودورو)، ثم كافئ نفسك بـ 5 دقائق من الراحة. ستفاجأ بحجم الإنجازات التي ستحققها عندما تتحكم أنت في توجيه دفة الانتباه!
          </p>
        </div>

        <div className="mt-8 flex justify-end border-t border-white/10 pt-6">
          <button onClick={onClose} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2">
            <CheckCircle size={18} />
            إتمام القراءة
          </button>
        </div>
      </motion.div>
      </div>
    </div>
  );
}

function HomeView({ user, onEnterStation, onSelectUser }: { user: UserData, onEnterStation: (id: string) => void, onSelectUser: (id: string) => void }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [advice, setAdvice] = useState<string>('');
  const [activeUsers, setActiveUsers] = useState<UserData[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomTask, setNewRoomTask] = useState('');
  const [newRoomImageUrl, setNewRoomImageUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [pendingChallenges, setPendingChallenges] = useState<Challenge[]>([]);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showObservatoryModal, setShowObservatoryModal] = useState(false);

  useEffect(() => {
    const roomsQuery = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'), limit(12));
    const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
      const fetchedRooms: Room[] = [];
      const now = Date.now();
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as Room;
        if (data.participants?.length === 0 && data.emptyAt) {
          const emptyMs = data.emptyAt.toMillis ? data.emptyAt.toMillis() : (data.emptyAt.seconds * 1000);
          if (now - emptyMs > 120000) {
            deleteDoc(docSnap.ref).catch(() => {});
            return;
          }
        }
        fetchedRooms.push({ id: docSnap.id, ...data });
      });
      setRooms(fetchedRooms);
    }, (e) => handleFirestoreError(e, OperationType.GET, 'rooms'));

    const adviceQuery = query(collection(db, 'advices'), orderBy('timestamp', 'desc'), limit(1));
    const unsubscribeAdvice = onSnapshot(adviceQuery, (snapshot) => {
      if (!snapshot.empty) {
        setAdvice(snapshot.docs[0].data().text);
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, 'advices'));

    const usersQuery = query(collection(db, 'profiles'), limit(10));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      setActiveUsers(snapshot.docs.map(doc => doc.data() as UserData).filter(u => u.uid !== user.uid));
    });

    const challengesQuery = query(collection(db, 'challenges'), where('challengedId', '==', user.uid), where('status', '==', 'pending'));
    const unsubscribeChallenges = onSnapshot(challengesQuery, (snapshot) => {
      setPendingChallenges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Challenge)));
    }, (e) => handleFirestoreError(e, OperationType.GET, 'challenges'));

    return () => {
      unsubscribeRooms();
      unsubscribeAdvice();
      unsubscribeUsers();
      unsubscribeChallenges();
    };
  }, [user.uid]);

  const PREDEFINED_IMAGES = [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop",
  ];

  const handleCreateRoom = async () => {
    if (!newRoomName) return;
    setIsCreating(true);

    try {
      const roomData = {
        name: newRoomName,
        task: 'محطة مشتركة', // fallback for old schema
        imageUrl: newRoomImageUrl || null,
        creatorId: user.uid,
        creatorName: user.displayName,
        participants: [user.uid],
        maxParticipants: 5,
        timerStatus: 'idle',
        timerDuration: 25,
        breakDuration: 5,
        createdAt: serverTimestamp()
      };

      const roomRef = await addDoc(collection(db, 'rooms'), roomData);
      setShowCreateModal(false);
      setNewRoomName('');
      setNewRoomTask('');
      setNewRoomImageUrl('');
      onEnterStation(roomRef.id);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'rooms');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <motion.div 
      variants={bentoContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto w-full pb-20"
    >
      {/* 1. Main Welcome & Daily Mission (Col Span 8) */}
      <div className="md:col-span-8 flex flex-col gap-6">
        <motion.div 
          variants={bentoItem}
          className="p-8 rounded-3xl bg-[#0a0b16]/80 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden group flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-indigo-500 via-fuchsia-500 to-transparent opacity-50" />
          <div className="absolute -left-10 -bottom-10 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
            <Rocket size={200} />
          </div>
          
          <div className="relative z-10 flex-1">
            <h1 className="text-3xl font-black font-display mb-2">أهلاً بك، {user.displayName}! 🚀</h1>
            <p className="text-gray-400 text-sm max-w-md leading-relaxed">
              مستعد لمهمة دراسية جديدة اليوم؟ {rooms.length > 0 ? `هناك ${rooms.length} محطة نشطة تنتظرك.` : 'ابدأ بإنشاء محطتك الأولى وانطلق!'}
            </p>
            
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="px-4 py-2 rounded-2xl bg-[#0a0b16] border border-white/5 text-sm font-bold flex items-center gap-2 shadow-inner">
                <Flame size={14} className="text-orange-500" />
                <span className="text-gray-200">{user.streak || 1} يوم</span>
              </div>
              <div className={cn("px-4 py-2 rounded-2xl bg-[#0a0b16] border border-white/5 text-sm font-bold flex items-center gap-2 shadow-inner", getAstronautRank(user.xp).color)}>
                {getAstronautRank(user.xp).icon} <span className="text-gray-200">{getAstronautRank(user.xp).title}</span>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-[#0a0b16] border border-white/5 text-sm font-bold flex items-center gap-2 shadow-inner">
                <Timer size={14} className="text-sky-500" />
                <span className="text-gray-200">{Math.floor((user.totalFocusSessions || 0) * 25 / 60)} ساعة</span>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 w-full md:w-auto shrink-0 flex flex-col gap-3">
             <button 
                onClick={() => setShowCreateModal(true)}
                className="w-full md:w-auto px-8 py-4 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2 text-white"
              >
                <Plus size={20} />
                تأسيس محطة
              </button>
          </div>
        </motion.div>

        {/* 2. Active Stations List */}
        <motion.div variants={bentoItem} className="flex flex-col flex-1 rounded-3xl bg-[#0a0b16]/60 backdrop-blur-xl border border-white/5 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black font-display flex items-center gap-3 text-white">
              <Radio className="text-red-500 animate-pulse" size={20} />
              المحطات النشطة بالمدار
            </h2>
            <span className="text-xs bg-white/5 px-3 py-1 rounded-full text-gray-400 font-mono">{rooms.length}</span>
          </div>
          
          {rooms.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 py-12 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
              <Rocket size={48} className="mb-4 opacity-20" />
              <p className="text-sm">لا توجد محطات نشطة حالياً. كن أول من ينطلق!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => (
                <StationCard key={room.id} room={room} activeUsers={activeUsers} onEnter={() => onEnterStation(room.id)} />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* 3. Side Widgets (Col Span 4) */}
      <div className="md:col-span-4 flex flex-col gap-6">
        
        {/* Challenge/Missions Widget */}
        <motion.div variants={bentoItem} className="p-6 rounded-3xl bg-indigo-900/20 border border-indigo-500/20 shadow-xl relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-transparent opacity-50" />
           <div className="flex items-center gap-3 mb-6">
             <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
               <Target size={18} />
             </div>
             <h3 className="font-bold text-white text-lg">مهام اليوم</h3>
           </div>
           
           <div className="space-y-4">
             <div className="p-4 rounded-2xl bg-[#0a0b16]/50 border border-white/5 shadow-inner">
               <div className="flex justify-between items-start mb-2">
                 <p className="text-sm font-bold text-white">ماراثون التركيز</p>
                 <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded flex items-center gap-1">+500<span className="hidden sm:inline">XP</span></span>
               </div>
               <p className="text-xs text-gray-400 mb-3">أكمل 3 جلسات تركيز اليوم</p>
               <div className="w-full h-1.5 bg-[#0a0b16] rounded-full overflow-hidden shadow-inner">
                 <div 
                   className="h-full bg-gradient-to-l from-indigo-400 to-indigo-600 transition-all duration-1000" 
                   style={{ width: `${Math.min(((user.totalFocusSessions || 0) % 3) * 33.3, 100)}%` }}
                 />
               </div>
             </div>

             {pendingChallenges.map(challenge => (
               <div key={challenge.id} className="p-4 rounded-2xl bg-fuchsia-900/20 border border-fuchsia-500/30 flex flex-col gap-3">
                 <div className="flex items-center gap-2">
                   <div className="p-1.5 bg-fuchsia-500/20 rounded-lg text-fuchsia-400"><Swords size={14} /></div>
                   <h4 className="font-bold text-white text-xs">تحدي من {challenge.challengerName}</h4>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={async () => {
                      await updateDoc(doc(db, 'challenges', challenge.id), { status: 'accepted' });
                      const roomData = {
                        name: `تحدي: ${challenge.challengerName} ⚔️ ${user.displayName}`,
                        task: 'تحدي التركيز العميق',
                        creatorId: challenge.challengerId,
                        creatorName: challenge.challengerName,
                        participants: [user.uid, challenge.challengerId],
                        maxParticipants: 2,
                        timerStatus: 'idle',
                        timerDuration: 25,
                        breakDuration: 5,
                        createdAt: serverTimestamp()
                      };
                      const roomRef = await addDoc(collection(db, 'rooms'), roomData);
                      onEnterStation(roomRef.id);
                   }} className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white py-2 rounded-xl text-xs font-bold transition-colors">قبول</button>
                   <button onClick={() => updateDoc(doc(db, 'challenges', challenge.id), { status: 'declined' })} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 py-2 rounded-xl text-xs font-bold transition-colors">رفض</button>
                 </div>
               </div>
             ))}

             <button onClick={() => setShowChallengeModal(true)} className="w-full py-3 bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] rounded-2xl text-xs font-bold text-gray-300 transition-all flex items-center justify-center gap-2">
               <Swords size={16} className="text-gray-400"/> تحدي زميل
             </button>
           </div>
        </motion.div>

        {/* Observatory Info Widget */}
        <motion.div variants={bentoItem} className="p-6 rounded-3xl bg-[#0a0b16]/60 backdrop-blur-xl border border-white/5 shadow-xl relative group cursor-pointer overflow-hidden" onClick={() => setShowObservatoryModal(true)}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-30" />
          <div className="absolute -bottom-6 -left-6 opacity-[0.03] group-hover:scale-110 transition-transform pointer-events-none text-emerald-500"><Telescope size={140} /></div>
          
          <div className="flex justify-between items-start mb-2 relative z-10">
            <h3 className="font-bold text-white text-base">المرصد الفلكي</h3>
            <span className="relative flex h-2 w-2 mt-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-4 font-medium leading-relaxed relative z-10">تحديثات النظام وآخر أخبار المدار الفضائي</p>
          <div className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full relative z-10">تحديث v2.0</div>
        </motion.div>

        {/* Space Academy Widget */}
        <motion.div variants={bentoItem} className="p-6 rounded-3xl bg-blue-900/10 border border-blue-500/10 shadow-xl relative group cursor-pointer overflow-hidden" onClick={() => setShowArticleModal(true)}>
          <div className="absolute -top-6 -right-6 opacity-[0.03] group-hover:scale-110 transition-transform pointer-events-none text-blue-500"><BookOpen size={120} /></div>
          <div className="flex items-center gap-3 mb-3 relative z-10">
             <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400"><BookOpen size={16} /></div>
             <h3 className="font-bold text-white text-base">مقال اليوم</h3>
          </div>
          <p className="text-xs text-gray-300 font-medium leading-relaxed mb-4 relative z-10">كيف تتغلب على التشتت؟ استراتيجيات رواد الفضاء...</p>
          <button className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 relative z-10">
            اقرأ الآن <ChevronLeft size={14} />
          </button>
        </motion.div>

      </div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showArticleModal && (
          <ArticleModal onClose={() => setShowArticleModal(false)} />
        )}
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-lg bg-[#0a0b16]/60">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-8 rounded-3xl bg-space-dark border border-white/10 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">فتح محطة جديدة</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-[#0a0b16] shadow-lg shadow-indigo-900/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 mr-2">اسم المحطة</label>
                  <input 
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="مثال: مدار التركيز"
                    className="w-full p-4 rounded-2xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 focus:border-indigo-400 outline-none transition-all text-right"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 mr-2">صورة المحطة (اختياري)</label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {PREDEFINED_IMAGES.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNewRoomImageUrl(url)}
                        className={cn(
                          "relative rounded-xl overflow-hidden aspect-video border-2 transition-all hover:opacity-80 object-cover",
                          newRoomImageUrl === url ? "border-indigo-500 shadow-lg shadow-indigo-500/20 opacity-100" : "border-transparent opacity-60"
                        )}
                        style={{ backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      >
                       {newRoomImageUrl === url && (
                          <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                            <CheckCircle size={20} className="text-white drop-shadow-md" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {newRoomImageUrl && (
                    <button onClick={() => setNewRoomImageUrl('')} className="text-xs text-red-400 mt-2 hover:text-red-300">
                      إزالة الصورة
                    </button>
                  )}
                </div>
              </div>

              <button 
                onClick={handleCreateRoom}
                disabled={isCreating || !newRoomName}
                className="w-full p-4 rounded-2xl bg-indigo-500 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold shadow-sm shadow-indigo-500/20"
              >
                {isCreating ? 'جاري الإطلاق...' : 'إطلاق المحطة'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showObservatoryModal && (
        <div key="observatory" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#000108]/80 backdrop-blur-sm" onClick={() => setShowObservatoryModal(false)}></div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg bg-[#0a0b16] rounded-[2rem] border border-fuchsia-500/20 shadow-2xl p-6 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Telescope size={100} className="text-fuchsia-500" />
            </div>
            <button onClick={() => setShowObservatoryModal(false)} className="absolute top-4 left-4 p-2 text-gray-400 hover:text-white transition-colors bg-white/5 rounded-full z-20">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-3 rounded-2xl bg-fuchsia-500/20 text-fuchsia-400">
                <Telescope size={24} />
              </div>
              <h2 className="text-2xl font-bold text-white">تفاصيل المرصد الفلكي</h2>
            </div>
            <div className="space-y-4 text-gray-300 text-sm leading-relaxed relative z-10 text-right">
              <p>مرحباً بك أيها الرائد في المرصد الفلكي! هنا نراقب النجوم ونسجل التحديثات الكونية للمنصة.</p>
              <ul className="list-disc list-inside space-y-2 text-fuchsia-200">
                <li>إضافة نظام الكواكب المدارية في المحطات لتحديد موقع الرواد.</li>
                <li>تحديث القوانين الكونية الخاصة بالشات العام وباقي الأقسام للحفاظ على الانضباط ومنع إساءة الاستخدام.</li>
                <li>تطوير محرك الصوت ليصبح معطلاً إجبارياً أثناء جولات التركيز لتجنب التشتت.</li>
                <li>إصلاح ثغرات حذف الرسائل عبر المجرة.</li>
              </ul>
              <p className="pt-4 text-xs font-bold text-gray-500">تم التحديث في الزمن الأرضي: 2026/04</p>
            </div>
          </motion.div>
        </div>
      )}
        {showChallengeModal && (
          <ChallengeModal 
            user={user} 
            onClose={() => setShowChallengeModal(false)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}


function StationCard({ room, activeUsers, onEnter }: { room: Room, activeUsers?: UserData[], onEnter: () => void, key?: string }) {
  // Calculate uptime
  const [uptime, setUptime] = useState('');
  useEffect(() => {
    if (!room.createdAt) return;
    const updateTime = () => {
      const start = room.createdAt.toMillis ? room.createdAt.toMillis() : (room.createdAt.seconds * 1000 || Date.now());
      const diff = Math.floor((Date.now() - start) / 1000);
      if (diff < 60) setUptime('منذ لحظات');
      else if (diff < 3600) setUptime(`${Math.floor(diff / 60)} دقيقة`);
      else setUptime(`${Math.floor(diff / 3600)} ساعة`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // update every minute
    return () => clearInterval(interval);
  }, [room.createdAt]);

  return (
    <motion.button
      variants={bentoItem}
      whileHover={bentoHover}
      onClick={onEnter}
      className={cn(
        "p-8 rounded-3xl glass glass-hover text-right flex flex-col gap-6 transition-colors group relative overflow-hidden bg-cover bg-center",
        room.imageUrl && "shadow-inner border-transparent"
      )}
      style={room.imageUrl ? { backgroundImage: `linear-gradient(to right, rgba(10, 11, 22, 0.95), rgba(5, 5, 16, 0.8)), url(${room.imageUrl})` } : {}}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity z-10" />
      
      <div className="flex items-center justify-between w-full relative z-10">
        <div className="flex flex-wrap items-center justify-end -space-x-2 w-1/2">
          {room.participants.slice(0, 3).map((p, i) => {
            const userMatch = activeUsers?.find(u => u.uid === p);
            return (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0a0a1a] bg-gray-800 overflow-hidden" title={userMatch?.displayName || "مستخدم"}>
                <img src={userMatch?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p}`} alt="user" referrerPolicy="no-referrer" />
              </div>
            );
          })}
          {room.participants.length > 3 && (
            <div className="w-8 h-8 rounded-full border-2 border-[#0a0a1a] bg-gray-900 flex items-center justify-center text-[10px] font-bold text-white z-0">
              +{room.participants.length - 3}
            </div>
          )}
        </div>
        <div className="py-1 px-3 flex items-center gap-2 rounded-2xl bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition-transform text-xs font-bold border border-indigo-500/20">
          <Timer size={12} />
          {uptime || 'الآن'}
        </div>
      </div>

      <div className="relative z-10">
        <h4 className={cn("text-2xl font-black font-display mb-1 transition-colors", room.imageUrl ? "text-white group-hover:text-indigo-300" : "group-hover:text-indigo-500")}>{room.name}</h4>
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10 relative z-10">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
          <Users size={14} />
          {room.participants.length} / {room.maxParticipants}
        </div>
        <div className="flex items-center gap-2 text-xs text-indigo-400 font-bold group-hover:text-indigo-300 transition-colors">
          انضم الآن
          <SkipBack size={12} className="rotate-180" />
        </div>
      </div>
    </motion.button>
  );
}

function ExhibitionGallery() {
  const [exhibitions, setExhibitions] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'exhibitions'), orderBy('timestamp', 'desc'), limit(8));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExhibitions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (e) => handleFirestoreError(e, OperationType.GET, 'exhibitions_global'));
    return () => unsubscribe();
  }, []);

  return (
    <>
      {exhibitions.map((ex) => (
        <motion.div 
          key={ex.id}
          whileHover={{ scale: 1.05 }}
          className="aspect-square rounded-3xl overflow-hidden border border-white/10 bg-[#0a0b16] shadow-lg shadow-indigo-900/10 relative group"
        >
          <img src={ex.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
            <span className="text-[10px] font-bold text-indigo-500">{ex.userName}</span>
          </div>
        </motion.div>
      ))}
      {exhibitions.length === 0 && <p className="col-span-full text-gray-500 text-sm italic py-10 text-center">المعرض فارغ حالياً</p>}
    </>
  );
}

function SuggestionsSection({ user }: { user: UserData }) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [deletingSuggestionId, setDeletingSuggestionId] = useState<string | null>(null);
  const [replyingSuggestionId, setReplyingSuggestionId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'suggestions'), orderBy('timestamp', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSuggestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (e) => handleFirestoreError(e, OperationType.GET, 'suggestions'));
    return () => unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (!newSuggestion.trim()) return;
    try {
      await addDoc(collection(db, 'suggestions'), {
        text: newSuggestion,
        userId: user.uid,
        userName: user.displayName,
        timestamp: serverTimestamp()
      });
      setNewSuggestion('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'suggestions');
    }
  };

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    try {
      await updateDoc(doc(db, 'suggestions', id), { reply: replyText });
      setReplyingSuggestionId(null);
      setReplyText('');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `suggestions/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'suggestions', id));
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
          placeholder="لديك فكرة؟ شاركنا بها..."
          className="w-full bg-white/5/80 shadow-inner border border-white/10 rounded-2xl px-6 py-4 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-h-[100px]"
          dir="rtl"
        />
        <button 
          onClick={handleSubmit}
          className="absolute left-4 bottom-4 px-6 py-2 bg-blue-600 rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          إرسال الاقتراح
        </button>
      </div>

      <div className="space-y-4">
        {suggestions.map(s => (
          <div key={s.id} className="p-4 rounded-2xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 text-right">
            <div className="flex flex-col mb-2 gap-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-2 items-center">
                  {user.role === 'admin' && (
                    <button onClick={() => { setReplyingSuggestionId(s.id); setReplyText(s.reply || ''); }} className="text-xs text-blue-400 hover:underline">رد</button>
                  )}
                  {(user.role === 'admin' || s.userId === user.uid) && (
                    deletingSuggestionId === s.id ? (
                      <div className="flex items-center gap-1.5 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30">
                        <span className="text-[10px] text-red-500">حذف؟</span>
                        <button onClick={() => handleDelete(s.id)} className="text-[10px] text-red-500 font-bold">نعم</button>
                        <button onClick={() => setDeletingSuggestionId(null)} className="text-[10px] text-gray-400">لا</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingSuggestionId(s.id)} className="text-xs text-red-400 hover:underline">حذف</button>
                    )
                  )}
                </div>
                <span className="text-xs font-bold text-gray-400">{s.userName}</span>
              </div>
              {replyingSuggestionId === s.id && (
                <div className="flex items-center gap-2 mt-2 bg-blue-900/20 p-2 rounded-xl border border-blue-500/30">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب ردك هنا..."
                    className="flex-1 bg-transparent text-xs text-blue-100 placeholder-blue-300/50 outline-none"
                    dir="rtl"
                  />
                  <button onClick={() => handleReply(s.id)} className="text-[10px] bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold">حفظ</button>
                  <button onClick={() => { setReplyingSuggestionId(null); setReplyText(''); }} className="text-[10px] bg-white/10 hover:bg-white/20 text-gray-300 px-3 py-1.5 rounded-lg">إلغاء</button>
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


function QuranPlayer() {
  const [reciterIndex, setReciterIndex] = useState(0);
  const [surahIndex, setSurahIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [isOpen, setIsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playPromiseRef = useRef<Promise<void> | null>(null);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
      }
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        playPromiseRef.current = audioRef.current.play();
        setIsPlaying(true);
        await playPromiseRef.current;
      } catch (e) {
        console.error("Audio play failed", e);
        setIsPlaying(false);
      } finally {
        playPromiseRef.current = null;
      }
    }
  };

  const handleSurahChange = async (index: number) => {
    setSurahIndex(index);
    setIsPlaying(false);
    if (audioRef.current) {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
      }
      audioRef.current.pause();
      audioRef.current.load();
    }
  };

  const handleReciterChange = async (index: number) => {
    setReciterIndex(index);
    setIsPlaying(false);
    if (audioRef.current) {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
      }
      audioRef.current.pause();
      audioRef.current.load();
    }
  };

  const getAudioUrl = () => {
    const surahNum = (surahIndex + 1).toString().padStart(3, '0');
    return `${RECITERS[reciterIndex].server}${surahNum}.mp3`;
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={cn(
          "fixed bottom-24 left-6 z-40 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-xl",
          isOpen 
            ? "bg-indigo-600 text-white shadow-indigo-900/50" 
            : "bg-[#0a0b16] border border-white/10 hover:bg-white/5 shadow-black/50"
        )}
        title="القرآن الكريم"
      >
        <Music size={20} className={cn(!isOpen && "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]")} />
        {isPlaying && !isOpen && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500 animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_8px_rgba(99,102,241,0.8)] border-2 border-[#0a0b16]" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -20 }}
            className="fixed bottom-[130px] left-6 z-50 w-80 bg-gradient-to-br from-[#0c0c16]/95 to-[#050510]/95 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl shadow-indigo-900/40"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-space-dark/80 shrink-0">
               <div className="flex items-center gap-2">
                 <Music size={18} className="text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                 <h3 className="font-bold text-right text-sm tracking-wide text-white">القرآن الكريم 🕌</h3>
               </div>
               <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={18} />
               </button>
            </div>

            <div className="p-4 space-y-4">
              <audio 
                ref={audioRef} 
                src={getAudioUrl()} 
                onEnded={() => setIsPlaying(false)}
              />
              <div className="space-y-2">
                <div className="relative">
                  <select 
                    value={reciterIndex}
                    onChange={(e) => handleReciterChange(parseInt(e.target.value))}
                    className="w-full bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 rounded-xl px-4 py-2.5 text-right text-sm appearance-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-gray-200"
                  >
                    {RECITERS.map((r, i) => (
                      <option key={i} value={i} className="bg-[#0a0b16] text-white">{r.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                
                <div className="relative">
                  <select 
                    value={surahIndex}
                    onChange={(e) => handleSurahChange(parseInt(e.target.value))}
                    className="w-full bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 rounded-xl px-4 py-2.5 text-right text-sm appearance-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-gray-200"
                  >
                    {SURAHS.map((s, i) => (
                      <option key={i} value={i} className="bg-[#0a0b16] text-white">{s} .{i + 1}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 py-4 bg-white/[0.02] rounded-2xl border border-white/5">
                <SkipBack 
                  size={20} 
                  className="text-gray-400 cursor-pointer hover:text-white transition-colors" 
                  onClick={() => handleSurahChange(Math.max(0, surahIndex - 1))}
                />
                <button 
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center cursor-pointer hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/30"
                >
                  {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" className="ml-1" />}
                </button>
                <SkipForward 
                  size={20} 
                  className="text-gray-400 cursor-pointer hover:text-white transition-colors" 
                  onClick={() => handleSurahChange(Math.min(SURAHS.length - 1, surahIndex + 1))}
                />
              </div>

              <div className="space-y-1 px-2 pt-2 pb-1">
                <div className="flex items-center gap-3">
                  <VolumeX size={16} className="text-gray-500" />
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-400 hover:accent-indigo-300 transition-colors"
                  />
                  <Volume2 size={16} className="text-gray-500" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}



function PersonalTasks() {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<{ id: string, text: string, done: boolean }[]>((() => {
    try {
      const stored = localStorage.getItem('personalFocusTasks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })());
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    localStorage.setItem('personalFocusTasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks([...tasks, { id: Date.now().toString(), text: newTask.trim(), done: false }]);
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={cn(
          "fixed bottom-6 left-6 z-40 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-xl",
          isOpen 
            ? "bg-green-600 text-white shadow-green-900/50" 
            : "bg-[#0a0b16] border border-white/10 hover:bg-white/5 shadow-black/50"
        )}
        title="المهام الجانبية"
      >
        <CheckSquare size={20} className={cn(!isOpen && "text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]")} />
        {tasks.filter(t => !t.done).length > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0a0b16]">
              {tasks.filter(t => !t.done).length}
            </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -20 }}
            className="fixed bottom-[88px] left-6 z-50 w-96 bg-gradient-to-br from-[#0c0c16]/95 to-[#050510]/95 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl shadow-green-900/20 max-h-[500px] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-space-dark/80 shrink-0">
              <div className="flex items-center gap-2">
                <CheckSquare size={18} className="text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                <h3 className="font-bold text-sm tracking-wide text-white">المهام الجانبية</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 pt-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              <div className="space-y-2 mb-2">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 group p-3 shadow-sm hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/5 bg-white/[0.01]">
                     <button onClick={() => toggleTask(task.id)} className={task.done ? 'text-green-400 hover:text-green-500' : 'text-gray-500 hover:text-green-400 transition-colors'}>
                       {task.done ? <CheckSquare size={18} /> : <Square size={18} />}
                     </button>
                     <span className={task.done ? 'line-through text-gray-500 text-sm flex-1 text-right break-words' : 'text-gray-300 text-sm flex-1 text-right break-words cursor-pointer hover:text-white transition-colors'} onClick={() => toggleTask(task.id)}>{task.text}</span>
                     <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity p-1.5 bg-red-500/10 rounded-lg">
                       <X size={16} />
                     </button>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border border-white/5 border-dashed rounded-xl mx-1 bg-white/[0.02]">
                    <CheckSquare size={32} className="mx-auto mb-3 opacity-30 text-green-400" />
                    <p className="text-sm font-medium">لا توجد مهام حالياً...</p>
                    <p className="text-xs text-gray-600 mt-1">أضف مهمتك الأولى وباشر العمل</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-auto shrink-0">
                <input 
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  placeholder="مهمة جديدة للتدمير..."
                  className="flex-1 bg-[#050510] shadow-inner border border-white/5 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:border-green-500/50 focus:bg-[#0a0b16] text-white transition-colors placeholder:text-gray-600"
                  dir="rtl"
                />
                <button onClick={addTask} disabled={!newTask.trim()} className="px-4 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white disabled:opacity-50 disabled:bg-white/5 disabled:text-gray-600 rounded-xl transition-all flex items-center justify-center border border-green-500/20 disabled:border-transparent">
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


function StudyRoomView({ user, stationId, onExit, onSelectUser }: { user: UserData, stationId: string, onExit: () => void, onSelectUser: (id: string) => void }) {
  const [room, setRoom] = useState<Room | null>(null);
  const safeUpdateRoom = async (data: any) => { try { await updateDoc(doc(db, 'rooms', stationId), data); } catch(e) {} };
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingMap, setTypingMap] = useState<Record<string, {name: string, time: number}>>({});
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);
  const lastTypingUpdate = useRef(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [participantsData, setParticipantsData] = useState<UserData[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [showFuelLeak, setShowFuelLeak] = useState(false);
  const [leakedXP, setLeakedXP] = useState(0);
  
  const [showAFKCheck, setShowAFKCheck] = useState(false);
  const [isWatchingClass, setIsWatchingClass] = useState(false);
  const [afkTimeLeft, setAfkTimeLeft] = useState(60);
  const afkCheckedForThisCycleRef = useRef<number | null>(null);
  
  const [showJoinInfo, setShowJoinInfo] = useState(false);
  const [hasJoinedStation, setHasJoinedStation] = useState(false);
  const isJoinedRef = useRef(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [sharedNotes, setSharedNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const participantsCountRef = useRef(0);

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [studyLink, setStudyLink] = useState('');
  const [showStudyLinkModal, setShowStudyLinkModal] = useState(false);
  const studyLinkRef = useRef('');

  
  // Cosmic Loss System (Bet)
  const [showBetModal, setShowBetModal] = useState(false);
  const [betError, setBetError] = useState('');
  const currentBetRef = useRef<number>(0);
  const remainingShieldRef = useRef<number>(0);
  const [shieldPercent, setShieldPercent] = useState<number>(0);
  
  // Voice Call State
  const [isJoined, setIsJoined] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  useEffect(() => {
    isJoinedRef.current = isJoined;
  }, [isJoined]);

  const isWatchingClassRef = useRef(false);
  useEffect(() => {
    isWatchingClassRef.current = isWatchingClass;
  }, [isWatchingClass]);

  useEffect(() => {
    participantsCountRef.current = participantsData.length;
  }, [participantsData.length]);

  // Next Mission state
  const [showNextMissionModal, setShowNextMissionModal] = useState(false);
    const [nextMissionInput, setNextMissionInput] = useState('');
  const [pendingMission, setPendingMission] = useState<string | null>(null);

  useEffect(() => {
    const unsubTyping = onSnapshot(collection(db, 'rooms', stationId, 'typing'), snap => {
      const newMap: Record<string, {name: string, time: number}> = {};
      snap.docs.forEach(d => {
        if (d.id !== user.uid) newMap[d.id] = d.data() as {name: string, time: number};
      });
      setTypingMap(newMap);
    }, () => {});
    
    const interval = setInterval(() => setTypingMap(m => ({...m})), 2000);
    return () => { unsubTyping(); clearInterval(interval); };
  }, [stationId, user.uid]);

  const typingNames = Object.values(typingMap).filter(t => Date.now() - t.time < 4000).map(t => t.name);

  const { isMuted, toggleMute, setIsMuted, volumeLevel, initiateCall } = useWebRTCVoice({
    roomId: stationId,
    userId: user.uid,
    isJoined: isJoined,
    isDeafened: isDeafened
  });

  const handleToggleMute = () => {
    if (roomStatusRef.current !== 'break') {
      alert("المايك متاح فقط خلال فترة الاستراحة للحفاظ على الهدوء.");
      return;
    }
    toggleMute();
  };

  const spacePressedRef = useRef(false);
  const hasShownMissionModalRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in text inputs or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      
      // Push-to-Talk: hold Space to unmute
      if (e.code === 'Space' && hasJoinedStation && isJoined) {
        e.preventDefault(); // Prevent scrolling
        if (roomStatusRef.current !== 'break') return;
        if (!spacePressedRef.current) {
          spacePressedRef.current = true;
          setIsMuted(false);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      
      if (e.code === 'Space' && hasJoinedStation && isJoined) {
        e.preventDefault();
        spacePressedRef.current = false;
        setIsMuted(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [hasJoinedStation, isJoined, setIsMuted]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const roomStatusRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    roomStatusRef.current = room?.timerStatus || null;
  }, [room?.timerStatus]);

  const autoJoinAttempted = useRef(false);
  const [showMicPrompt, setShowMicPrompt] = useState(false);

  useEffect(() => {
    const autoJoin = () => {
      if (!autoJoinAttempted.current) {
        autoJoinAttempted.current = true;
        // Show mic prompt instead of joining immediately to bypass browser auto-block
        if (!sessionStorage.getItem(`mic_approved_${stationId}`)) {
          setShowMicPrompt(true);
        } else {
          handleJoinAccepted();
        }
      }
    };
    autoJoin();
  }, [stationId]);

  const handleJoinAccepted = async () => {
    setShowMicPrompt(false);
    sessionStorage.setItem(`mic_approved_${stationId}`, 'true');
    setHasJoinedStation(true);
    setIsJoined(true);
    try {
      await safeUpdateRoom({
        participants: arrayUnion(user.uid),
        emptyAt: null
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoinDeclined = () => {
    setShowMicPrompt(false);
    // Even if declined mic, they are in the station but not in the voice channel
    setHasJoinedStation(true);
    setIsJoined(false);
  };

  const toggleCall = async () => {
    if (!hasJoinedStation) {
      setShowJoinInfo(true);
      return;
    }

    if (isJoined) {
      setIsJoined(false);
      try {
        const docSnap = await getDoc(doc(db, 'rooms', stationId));
        if (docSnap.exists()) {
          const rem = docSnap.data().participants.filter((p: string) => p !== user.uid);
          await safeUpdateRoom({
            participants: arrayRemove(user.uid),
            emptyAt: rem.length === 0 ? serverTimestamp() : null
          });
        }
      } catch (e) {}
      setHasJoinedStation(false);
    } else {
      setIsJoined(true);
      await safeUpdateRoom({
        participants: arrayUnion(user.uid),
        emptyAt: null
      });
      setHasJoinedStation(true);
    }
  };

  const confirmJoin = async () => {
    setShowJoinInfo(false);
    setHasJoinedStation(true);
    setIsJoined(true);
    sessionStorage.setItem(`joined_${stationId}`, 'true');
    
    // Unlock AudioContext for mobile browsers
    playSound('message'); // Play a quick silent or quiet sound to unlock it? Actually, just playing any sound unblocks it.
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Add to participants
    await safeUpdateRoom({
      participants: arrayUnion(user.uid),
      emptyAt: null
    });

    // Update activity
    await updateDoc(doc(db, 'users', user.uid), {
      currentActivity: `في مدار محطة: ${room?.name}`
    });
  };

  const toggleDeafen = () => {
    const newDeafen = !isDeafened;
    setIsDeafened(newDeafen);
  };
  
  const alertSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2558/2558-preview.mp3'));
  const successSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'));

  // Sound synchronization logic
  useEffect(() => {
    if (showAlert) {
      alertSound.current.play().catch(() => {});
    }
  }, [showAlert]);

  const prevStatus = useRef<string | null>(null);
  useEffect(() => {
    if (room?.timerStatus === 'idle' && prevStatus.current === 'focus') {
      successSound.current.play().catch(() => {});
    }
    prevStatus.current = room?.timerStatus || null;
  }, [room?.timerStatus]);

  useEffect(() => {
    const roomRef = doc(db, 'rooms', stationId);
    const unsubscribeRoom = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Room;
        setRoom({ id: docSnap.id, ...data });
        
        if (data.sharedNotes !== undefined && !isEditingNotes) {
          setSharedNotes(data.sharedNotes);
        }

        // Initial sync
        if (data.timerStatus !== 'idle' && data.startTime) {
          const start = data.startTime.toDate().getTime();
          const duration = (data.timerStatus === 'focus' ? data.timerDuration : data.breakDuration) * 60 * 1000;
          const elapsed = Date.now() - start;
          const remaining = Math.max(0, Math.floor((duration - elapsed) / 1000));
          setTimeLeft(remaining);
        } else {
          setTimeLeft(data.timerDuration * 60);
        }
      } else {
        // Room was deleted or doesn't exist
        setTimeout(() => onExit(), 0);
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, `rooms/${stationId}`));

    const messagesQuery = query(collection(db, 'rooms', stationId, 'messages'), orderBy('timestamp', 'asc'), limit(50));
    let initialLoadMsgs = true;
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          if (!initialLoadMsgs && msg.userId !== user.uid) {
            playSound('message');
          }
          if (msg.isExitPenalty && msg.userId !== user.uid && isJoinedRef.current && prevStatus.current === 'focus') {
            // Self-deduct XP
            updateDoc(doc(db, 'users', user.uid), {
              xp: increment(-20)
            }).catch(console.error);
            if (user.fleetId) updateDoc(doc(db, 'fleets', user.fleetId), { xp: increment(-20) }).catch(() => {});
          }
        }
      });
      initialLoadMsgs = false;
    }, (e) => handleFirestoreError(e, OperationType.GET, `rooms/${stationId}/messages`));

    // We no longer join participants automatically on mount
    // This will be handled by the "Join" button
    
    updateDoc(doc(db, 'users', user.uid), {
      hearts: 3,
      currentActivity: `يتصفح محطة: ${room?.name || '...'}`
    }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`));

    // Tab visibility detection for Fuel Leak
    let fuelLeakInterval: NodeJS.Timeout | null = null;
    let localLeaked = 0;
    
    const handleVisibilityChange = () => {
      if (document.hidden && roomStatusRef.current === 'focus') {
        if (studyLinkRef.current && studyLinkRef.current.trim() !== '') {
          // Allowed external study mode
          return;
        }

        if (isWatchingClassRef.current) {
          // Allowed class studying mode
          return;
        }

        setShowFuelLeak(true);
        localLeaked = 0;
        setLeakedXP(0);
        
        // Play alert sound for fuel leak
        try {
          alertSound.current.play().catch(() => {});
          playSound('notification');
        } catch(e) {}
        
        // Announce to the room that the engine stopped
        if (participantsCountRef.current > 1) {
          addDoc(collection(db, 'rooms', stationId, 'messages'), {
            text: `🚨 المحرك (${user.displayName}) توقف عن العمل! السفينة تتباطأ!`,
            userId: 'system',
            userName: 'نظام التنبيه',
            userPhoto: '',
            timestamp: serverTimestamp(),
            type: 'text',
            isExitPenalty: true
          }).catch(() => {});
        }
        
        if (!fuelLeakInterval) {
          fuelLeakInterval = setInterval(async () => {
            localLeaked += 5;
            setLeakedXP(localLeaked);
            
            if (currentBetRef.current > 0) {
               // Deplete Shield
               remainingShieldRef.current = Math.max(0, remainingShieldRef.current - 5);
               setShieldPercent(Math.round((remainingShieldRef.current / currentBetRef.current) * 100));
               
               // If shield hits 0 while they are still out
               if (remainingShieldRef.current === 0) {
                  // Fallback to normal XP drain, or perhaps just stop the shield logic
                  // I'll let it fallback to the else branch on next tick by leaving currentBetRef > 0 
                  // but remainingShieldRef will stay 0.
                  // Actually, let's keep it simple: no further penalty other than losing the bet.
                  // Wait, losing XP directly after shield is 0 is more brutal!
                  try {
                    const uSnap = await getDoc(doc(db, 'users', user.uid));
                    if (uSnap.exists()) {
                      const currentXP = uSnap.data().xp || 0;
                      if (currentXP > 0) {
                        await updateDoc(doc(db, 'users', user.uid), {
                          xp: increment(-5)
                        });
                        if (user.fleetId) updateDoc(doc(db, 'fleets', user.fleetId), { xp: increment(-5) }).catch(() => {});
                      }
                    }
                  } catch (err) {}
               }
            } else {
               // To prevent XP from going below 0, check user's current XP first
               try {
                 const uSnap = await getDoc(doc(db, 'users', user.uid));
                 if (uSnap.exists()) {
                   const currentXP = uSnap.data().xp || 0;
                   if (currentXP > 0) {
                     await updateDoc(doc(db, 'users', user.uid), {
                       xp: increment(-5)
                     });
                     if (user.fleetId) updateDoc(doc(db, 'fleets', user.fleetId), { xp: increment(-5) }).catch(() => {});
                   }
                 }
               } catch (err) {}
            }
          }, 1000); // 5 XP every 1 second
        }
      } else {
        if (fuelLeakInterval) {
          clearInterval(fuelLeakInterval);
          fuelLeakInterval = null;
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (fuelLeakInterval) {
        clearInterval(fuelLeakInterval);
        fuelLeakInterval = null;
      }
      unsubscribeRoom();
      unsubscribeMessages();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Use a more reliable cleanup
      const cleanup = async () => {
        try {
          const roomSnap = await getDoc(roomRef);
          if (roomSnap.exists()) {
            const data = roomSnap.data();
            const remainingParticipants = data.participants.filter((p: string) => p !== user.uid);
            
            await updateDoc(roomRef, {
              participants: arrayRemove(user.uid),
              emptyAt: remainingParticipants.length === 0 ? serverTimestamp() : null
            });

            if (remainingParticipants.length === 0) {
              setTimeout(async () => {
                try {
                  const checkSnap = await getDoc(roomRef);
                  if (checkSnap.exists() && checkSnap.data().participants?.length === 0) {
                    await deleteDoc(roomRef);
                  }
                } catch(e) {}
              }, 120000);
            }
          }
          await updateDoc(doc(db, 'users', user.uid), {
            currentActivity: 'في لوحة التحكم'
          });
        } catch (e: any) {
          if (e?.code !== 'not-found' && !e?.message?.includes('No document to update')) {
            console.error("Cleanup failed:", e);
          }
        }
      };
      cleanup();

      if (false) {
        // removed
      }
    };
  }, [stationId, user.uid]);

  // Automatic Mic Control based on Timer
  useEffect(() => {
    if (!isJoined) return;

    if (room?.timerStatus === 'focus') {
      setIsMuted(true);
    } else if (room?.timerStatus === 'break') {
      setIsMuted(false);
    }
  }, [room?.timerStatus, isJoined, setIsMuted]);
  useEffect(() => {
    if (room?.participants) {
      // Clear participants who are no longer in the room
      setParticipantsData(prev => prev.filter(p => room.participants.includes(p.uid)));

      if (isJoined) {
        room.participants.forEach(pId => {
          if (pId !== user.uid && user.uid > pId) {
            initiateCall(pId);
          }
        });
      }

      const unsubscribes = room.participants.map(uid => {
        return onSnapshot(doc(db, 'profiles', uid), (docSnap) => {
          if (docSnap.exists()) {
            setParticipantsData(prev => {
              const filtered = prev.filter(p => p.uid !== uid);
              return [...filtered, docSnap.data() as UserData];
            });
          }
        }, (e) => handleFirestoreError(e, OperationType.GET, `users/${uid}`));
      });
      return () => unsubscribes.forEach(unsub => unsub());
    } else {
      setParticipantsData([]);
    }
  }, [room?.participants, isJoined, initiateCall, user.uid]);

  useEffect(() => {
    if (user.hearts <= 0) {
      const kickOut = async () => {
        // Broadcast kick out
        await addDoc(collection(db, 'rooms', stationId, 'messages'), {
          text: `🚨 تم إخراج ${user.displayName} من المحطة بسبب نفاذ القلوب!`,
          userId: user.uid,
          userName: 'نظام التنبيه',
          userPhoto: '',
          timestamp: serverTimestamp(),
          type: 'text'
        });
        
        // Deduct XP
        await updateDoc(doc(db, 'users', user.uid), {
          xp: increment(-10)
        });
        if (user.fleetId) updateDoc(doc(db, 'fleets', user.fleetId), { xp: increment(-10) }).catch(() => {});

        onExit();
      };
      kickOut();
    }
  }, [user.hearts, stationId, user.uid, user.displayName, onExit]);
  const roomSnapshotRef = useRef(room);
  useEffect(() => {
    roomSnapshotRef.current = room;
  }, [room]);

  useEffect(() => {
    if (room && room.timerStatus !== 'idle' && room.startTime) {
      const workerCode = `
        let intervalId;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            intervalId = setInterval(() => self.postMessage('tick'), 1000);
          } else if (e.data === 'stop') {
            clearInterval(intervalId);
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      worker.onmessage = () => {
        const r = roomSnapshotRef.current;
        if (!r || !r.startTime) return;
        const start = typeof r.startTime.toDate === 'function' ? r.startTime.toDate().getTime() : (r.startTime as any).seconds * 1000;
        const duration = (r.timerStatus === 'focus' ? r.timerDuration : r.breakDuration) * 60 * 1000;
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, Math.floor((duration - elapsed) / 1000));
        setTimeLeft(remaining);
      };

      worker.postMessage('start');

      return () => {
        worker.postMessage('stop');
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
      };
    }
  }, [room?.timerStatus, room?.startTime, room?.timerDuration, room?.breakDuration]);

  // AFK Check Logic
  useEffect(() => {
    if (room?.timerStatus !== 'focus' || timeLeft <= 0 || !isJoined) {
      setShowAFKCheck(false);
      setIsWatchingClass(false);
      afkCheckedForThisCycleRef.current = null;
      return;
    }

    if (isWatchingClass) return;

    const durationSeconds = room.timerDuration * 60;
    // Check at 15m (900s), 10m (600s), 5m (300s) left, if duration is long enough
    const checkThresholds = [900, 600, 300].filter(t => t < durationSeconds - 60);

    checkThresholds.forEach(threshold => {
      if (Math.abs(timeLeft - threshold) <= 2 && afkCheckedForThisCycleRef.current !== threshold) {
        afkCheckedForThisCycleRef.current = threshold;
        if (!showAFKCheck) {
          setShowAFKCheck(true);
          setAfkTimeLeft(60);
          try {
             playSound('notification');
             // Play ping sound
             const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
             audio.play();
          } catch(e) {}
        }
      }
    });

  }, [timeLeft, room?.timerStatus, room?.timerDuration, isJoined, showAFKCheck, isWatchingClass]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showAFKCheck && afkTimeLeft > 0) {
      interval = setInterval(() => {
        setAfkTimeLeft(prev => {
          if (prev <= 1) {
            handleAFKFailure();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!showAFKCheck && afkTimeLeft <= 0) {
      // Just safeguard
    }
    return () => clearInterval(interval);
  }, [showAFKCheck, afkTimeLeft]);

  const handleAFKFailure = () => {
    setShowAFKCheck(false);
    
    // Penalize
    updateDoc(doc(db, 'users', user.uid), { xp: increment(-20) }).catch(() => {});
    if (user.fleetId) updateDoc(doc(db, 'fleets', user.fleetId), { xp: increment(-20) }).catch(() => {});
    
    // Announce to room
    addDoc(collection(db, 'rooms', stationId, 'messages'), {
      text: `💤 غادر ${user.displayName} المحطة بسبب عدم الاستجابة (AFK) وتم خصم 20 نقطة منه!`,
      userId: 'system',
      userName: 'نظام المراقبة',
      userPhoto: '',
      timestamp: serverTimestamp(),
      type: 'text',
      isExitPenalty: true
    }).catch(() => {});
    
    // Kick user out
    onExit();
  };

  const triggerRedAlert = async () => {
    setShowAlert(true);
    setComboMultiplier(1);
    
    // Deduct heart
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      hearts: increment(-1)
    });

    // Broadcast alert to chat
    await addDoc(collection(db, 'rooms', stationId, 'messages'), {
      text: `☄️ نيزك ضرب المحطة! ${user.displayName} تشتت وفقد قلباً!`,
      userId: user.uid,
      userName: 'نظام التنبيه',
      userPhoto: '',
      timestamp: serverTimestamp(),
      type: 'text'
    });

    setTimeout(() => setShowAlert(false), 4000);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    if (newMessage.length > 500) {
      alert('الرسالة طويلة جداً! الحد الأقصى هو 500 حرف.');
      return;
    }
    
    if (room?.timerStatus === 'focus') {
      const now = Date.now();
      if (now - lastMessageTime < 5 * 60 * 1000) {
        const remainingMinutes = Math.ceil((5 * 60 * 1000 - (now - lastMessageTime)) / 60000);
        alert(`أنت في وضع التركيز! يمكنك إرسال رسالة واحدة فقط كل 5 دقائق. يرجى الانتظار ${remainingMinutes} دقيقة.`);
        return;
      }
      setLastMessageTime(now);
    }
    
    try {
      await addDoc(collection(db, 'rooms', stationId, 'messages'), {
        text: newMessage,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        timestamp: serverTimestamp(),
        type: 'text'
      });
      setNewMessage('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `rooms/${stationId}/messages`);
    }
  };

  useEffect(() => {
    if (room?.timerStatus === 'focus' && timeLeft <= 60 && timeLeft > 0 && !hasShownMissionModalRef.current && room.timerDuration > 1) {
      setShowNextMissionModal(true);
      hasShownMissionModalRef.current = true;
    }
    
    if (room?.timerStatus !== 'focus') {
      hasShownMissionModalRef.current = false;
    }
  }, [timeLeft, room?.timerStatus, room?.timerDuration]);

  useEffect(() => {
    if (room?.timerStatus === 'focus') {
      const stored = localStorage.getItem('pendingMission');
      if (stored) {
        setPendingMission(stored);
        localStorage.removeItem('pendingMission');
      } else {
        setPendingMission(null);
      }
    } else {
      setPendingMission(null);
    }
  }, [room?.timerStatus]);

  const handleNextMissionSubmit = () => {
    if (nextMissionInput.trim()) {
      localStorage.setItem('pendingMission', nextMissionInput.trim());
    }
    setShowNextMissionModal(false);
    setNextMissionInput('');
  };

  const isTransitioningRef = useRef(false);

  useEffect(() => {
    if (timeLeft === 0 && room && room.timerStatus !== 'idle') {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      
      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState === 'hidden') {
         new Notification('انتهى الوقت!', { body: room.timerStatus === 'focus' ? 'انتهت جلسة التركيز، حان وقت الاستراحة' : 'انتهت الاستراحة، حان وقت التركيز' });
      }
      
      playSound('timer');
      if (room.timerStatus === 'focus') {
        // Award XP and increment sessions
        const isGroup = participantsCountRef.current > 1;
        const groupMultiplier = isGroup ? 2 : 1; // Double fuel for group commitment
        const regularXp = 100 * comboMultiplier * groupMultiplier;
        
        // Return remaining shield to user
        const refund = remainingShieldRef.current > 0 ? remainingShieldRef.current : 0;
        const xpEarned = regularXp + refund;
        
        currentBetRef.current = 0;
        remainingShieldRef.current = 0;
        setShieldPercent(0);
        const userRef = doc(db, 'users', user.uid);
        const updates: any = {
          xp: increment(xpEarned),          totalFocusSessions: increment(1),
          lastStudyDate: new Date().toISOString().split('T')[0]
        };
        
        if (((user.totalFocusSessions || 0) + 1) % 5 === 0) {
           updates.seeds = increment(1);
        }

        // Also we must water the plants if they exist
        if (user.plants && user.plants.length > 0) {
          const now = Date.now();
          // We can't easily iterate and map over an array in Firestore updates
          // without replacing the whole array.
          const updatedPlants = user.plants.map(p => ({
            ...p,
            lastWateredAt: now
          }));
          updates.plants = updatedPlants;
        }
        
        updateDoc(userRef, updates).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`));
        
        if (user.fleetId) {
          updateDoc(doc(db, 'fleets', user.fleetId), {
            xp: increment(xpEarned),
            totalFocusHours: increment(room.timerDuration / 60)
          }).catch(e => console.error(e));
        }
        
        setComboMultiplier(prev => prev + 0.5);
      }

      // Auto transition for anyone to prevent stalls if creator is AFK
      const delay = room.creatorId === user.uid ? 0 : Math.random() * 2000 + 1000;
      setTimeout(() => {
        const nextStatus = room.timerStatus === 'focus' ? 'break' : 'idle';
        safeUpdateRoom({
          timerStatus: nextStatus,
          startTime: nextStatus === 'break' ? serverTimestamp() : null
        });
      }, delay);
      
      setTimeout(() => { isTransitioningRef.current = false; }, 5000);
    }
  }, [timeLeft, room?.timerStatus, user.uid, stationId]);

  useEffect(() => {
    // Auto-toggle focus mode based on timer status so we hide non-essentials
    if (room?.timerStatus === 'focus') {
      setIsFocusMode(true);
    } else {
      setIsFocusMode(false);
    }
  }, [room?.timerStatus]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSharedNotes(e.target.value);
    setIsEditingNotes(true);
  };

  const saveNotes = async () => {
    try {
      await safeUpdateRoom({ sharedNotes });
      setIsEditingNotes(false);
    } catch (e) {
      console.error("Failed to save notes", e);
    }
  };

  if (!room) return null;

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden" dir="rtl">
      
      <StarBackground />
      <div className="atmosphere-bg" />

      {/* Join Info Modal */}
      <AnimatePresence>
        {(showJoinInfo || showMicPrompt) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xl bg-[#0a0b16]/80">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#0a0b16] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-indigo-900/20 text-center"
            >
              <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mic size={40} className="text-indigo-400" />
              </div>
              <h2 className="text-2xl font-black mb-4">الصلاحية الصوتية</h2>
              <p className="text-gray-400 mb-6 leading-relaxed">
                لكي تتمكن من التحدث والاستماع للرواد الآخرين في المحطة، نرجو الموافقة على استخدام الميكروفون.
                <br /><br />
                المايك سيكون <span className="text-red-400 font-bold">مغلقاً</span> ولن يفتح إلا وقت الاستراحة.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={showMicPrompt ? handleJoinAccepted : confirmJoin}
                  className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 rounded-2xl font-bold transition-all shadow-sm shadow-indigo-500/20 text-white"
                >
                  موافق، تشغيل الصوت
                </button>
                <button 
                  onClick={showMicPrompt ? handleJoinDeclined : () => setShowJoinInfo(false)}
                  className="w-full py-4 bg-[#0a0b16] border border-white/10 hover:bg-white/5 rounded-2xl font-bold transition-all text-gray-400"
                >
                  الاستمرار بدون صوت
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cosmic Loss Aversion Bet Modal */}
      <AnimatePresence>
        {showBetModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xl bg-[#0a0b16]/80 text-white">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0b0c16] border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-[0_0_80px_rgba(30,58,138,0.4)] text-center relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Rocket size={120} />
              </div>
              <h2 className="text-3xl font-black mb-2 text-sky-400">نظام الضياع الكوني 🌌</h2>
              <p className="text-gray-400 mb-6 font-medium text-sm leading-relaxed relative z-10">
                المبدأ النفسي: البشر يكرهون الخسارة أكثر بمرتين من حبهم للمكسب.<br/><br/>
                ضع <span className="text-orange-400 font-bold">رهاناً</span> من نقاط הـ XP لبناء (درع السفينة).
                الخوف من خسارة الرتبة سيجبرك على البقاء مركزاً! إذا تشتت أو فتحت نافذة أخرى سيبدأ الدرع بالتضرر وتخسر نقاطك للأبد!
              </p>

              {betError && (
                <div className="bg-red-500/20 text-red-400 text-sm py-2 px-4 rounded-xl mb-6 font-bold">
                  {betError}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mb-8">
                {[50, 100, 200].map(amount => (
                  <button
                    key={amount}
                    onClick={async () => {
                      if (user.xp < amount) {
                        setBetError('عذرًا، لا تملك نقاط خبرة كافية (XP) لهذا الرهان!');
                        return;
                      }
                      
                      try {
                        await updateDoc(doc(db, 'users', user.uid), { xp: increment(-amount) });
                        if (user.fleetId) updateDoc(doc(db, 'fleets', user.fleetId), { xp: increment(-amount) }).catch(() => {});
                        currentBetRef.current = amount;
                        remainingShieldRef.current = amount;
                        setShieldPercent(100);
                        setShowBetModal(false);
                        safeUpdateRoom({ timerStatus: 'focus', startTime: serverTimestamp() });
                      } catch(e) {
                         setBetError('حدث خطأ أثناء وضع الرهان!');
                      }
                    }}
                    className="relative group overflow-hidden rounded-2xl bg-[#090915] border border-sky-500/30 hover:border-sky-400 transition-all p-4 flex flex-col items-center justify-center gap-2"
                  >
                    <div className="absolute inset-0 bg-sky-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <ShieldAlert className="w-8 h-8 text-sky-400 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-lg">{amount}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">XP</span>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setShowBetModal(false)}
                className="text-gray-500 hover:text-white transition-colors text-sm font-bold"
              >
                إلغاء والعودة
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AFK Check Overlay */}
      <AnimatePresence>
        {showAFKCheck && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-[#0a0b16]/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-white"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-indigo-900/40 border-2 border-indigo-500 shadow-[0_0_80px_rgba(99,102,241,0.5)] rounded-3xl p-8 max-w-sm text-center w-full relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-transparent pointer-events-none" />
              <Eye className="w-20 h-20 mx-auto text-indigo-400 animate-pulse mb-6 relative z-10" />
              <h2 className="text-3xl font-black mb-4 text-white relative z-10">إثبات الانتباه! 👁️</h2>
              <p className="text-indigo-200 mb-6 text-sm relative z-10">
                هل لا زلت متواجداً وتركز معنا؟ يرجى تأكيد وجودك قبل انتهاء الوقت المتبقي لكي لا تخسر الجلسة التدريبية!
              </p>
              
              <div className="text-5xl font-black text-fuchsia-400 mb-8 font-mono animate-pulse relative z-10">
                {afkTimeLeft}ث
              </div>

              <div className="flex flex-col gap-3 w-full relative z-10">
                <button 
                  onClick={() => {
                    setShowAFKCheck(false);
                    updateDoc(doc(db, 'users', user.uid), { xp: increment(5) }).catch(() => {});
                    if (user.fleetId) updateDoc(doc(db, 'fleets', user.fleetId), { xp: increment(5) }).catch(() => {});
                    // Give them a small 5xp reward for being attentive
                  }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-fuchsia-500 hover:from-indigo-500 hover:to-fuchsia-400 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-lg"
                >
                  أنا هنا وأركز! 🚀
                </button>
                <button 
                  onClick={() => {
                    setShowAFKCheck(false);
                    setIsWatchingClass(true);
                  }}
                  className="w-full bg-white/5 hover:bg-white/10 text-indigo-300 font-bold py-3 px-8 rounded-xl transition-all border border-white/10 text-sm"
                >
                  أُشاهد حصة 📺 (إلغاء التحذيرات)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Red Alert Overlay */}
      <AnimatePresence>
        {showFuelLeak && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-red-900/40 backdrop-blur-md flex flex-col items-center justify-center p-4 text-white"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#0a0b16] border-2 border-red-500 shadow-[0_0_80px_rgba(239,68,68,0.3)] rounded-3xl p-8 max-w-lg text-center"
            >
              <ShieldAlert className="w-20 h-20 mx-auto text-orange-500 animate-pulse mb-6" />
              <h2 className="text-4xl font-black mb-4 text-orange-500">الإنذار الأحمر! 🚨</h2>
              <p className="text-gray-300 mb-6 text-lg">
                رائد الفضاء، لقد تضرر الدرع بسبب تشتت الانتباه! عد للمسار فوراً!
              </p>
              
              <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-6 mb-8 flex flex-col gap-4">
                {currentBetRef.current > 0 && (
                   <div className="w-full bg-[#090915] rounded-full h-4 relative overflow-hidden border border-red-500/30">
                      <div className="absolute inset-y-0 right-0 bg-red-500 transition-all" style={{ width: `${shieldPercent}%` }} />
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                        صحة الدرع: {shieldPercent}%
                      </div>
                   </div>
                )}
                <div className="flex justify-between items-center px-4">
                  <span className="text-gray-400 font-bold">الضرر المباشر (XP)</span>
                  <span className="text-4xl font-black text-red-500 font-mono tracking-tighter">
                    -{leakedXP}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setShowFuelLeak(false)}
                  className="w-full py-4 rounded-xl font-bold text-lg bg-orange-600 hover:bg-orange-700 transition"
                >
                  تفعيل الدرع والعودة للتركيز
                </button>
                <button 
                  onClick={() => {
                    setShowFuelLeak(false);
                    setIsWatchingClass(true);
                  }}
                  className="w-full bg-white/5 hover:bg-white/10 text-orange-200 font-bold py-3 px-8 rounded-xl transition-all border border-white/10 text-sm"
                >
                  أُشاهد حصة 📺 (إلغاء التحذيرات)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showAlert && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-red-900/60 backdrop-blur-xl bg-[#0a0b16]/80 flex flex-col items-center justify-center text-white overflow-hidden"
          >
            {/* Meteor Animation */}
            <motion.div
              initial={{ x: -500, y: -500, scale: 0.5, opacity: 0 }}
              animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeIn" }}
              className="relative"
            >
              <Flame className="w-32 h-32 text-orange-500 animate-pulse rotate-[135deg]" />
              <div className="absolute inset-0 blur-2xl bg-orange-600/50 rounded-full animate-ping" />
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: "spring" }}
              className="text-center mt-8"
            >
              <ShieldAlert className="w-24 h-24 mx-auto mb-4 text-red-500" />
              <h2 className="text-6xl font-black mb-2">اصطدام نيزك!</h2>
              <p className="text-2xl font-bold text-red-200">لقد خرجت عن المدار وفقدت قلباً!</p>
            </motion.div>

            {/* Screen Shake Effect */}
            <motion.div
              animate={{ 
                x: [0, -20, 20, -20, 20, 0],
                y: [0, 10, -10, 10, -10, 0]
              }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="fixed inset-0 pointer-events-none border-[20px] border-red-600/50"
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Room Header - Upgraded to Floating Pill */}
      <nav className="z-20 mx-auto mt-6 max-w-[95%] lg:max-w-7xl flex items-center justify-between px-6 py-3 bg-space-dark/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl shadow-indigo-900/20 shadow-indigo-900/40">
        {/* Right Side: Station Info */}
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-indigo-400/20 to-indigo-500/20 rounded-full border border-indigo-400/30 text-indigo-500">
            <Rocket size={20} />
          </div>
          <div className="text-right">
            <h2 className="text-lg md:text-xl font-black text-white">{room.name}</h2>
            <p className="text-[10px] text-gray-500 font-bold tracking-wider">{room.participants.length}/{room.maxParticipants} رواد فضاء</p>
          </div>
        </div>

        {/* Left Side: Actions */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* Hearts Display */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#0a0b16] shadow-lg shadow-indigo-900/10 rounded-2xl border border-white/10">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart 
                key={i} 
                className={cn(
                  "w-4 h-4 transition-all",
                  i < user.hearts ? "text-red-500 fill-red-500" : "text-gray-700"
                )} 
              />
            ))}
          </div>

          {/* Join/Leave Button */}
          <button 
            onClick={toggleCall}
            className={cn(
              "px-6 py-2.5 rounded-2xl font-bold transition-all shadow-sm flex items-center gap-2 text-sm",
              isJoined 
                ? "bg-red-600 hover:bg-red-700 shadow-red-600/20" 
                : "bg-indigo-500 hover:bg-indigo-700 shadow-indigo-500/20"
            )}
          >
            {isJoined ? <MicOff size={18} /> : <Mic size={18} />}
            <span>{isJoined ? 'مغادرة المدار' : 'انضم للمحطة'}</span>
          </button>

          {/* Mic Toggle Button (Only if joined) */}
          {isJoined && (
            <button
              onClick={handleToggleMute}
              className={cn(
                "p-2.5 rounded-2xl font-bold transition-all shadow-sm flex items-center justify-center",
                isMuted ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-green-500/20 text-green-500 hover:bg-green-500/30"
              )}
              title={isMuted ? "تشغيل المايك" : "كتم المايك"}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}

          {/* Utility Actions */}
          <div className="flex items-center gap-2 border-r border-white/10 pr-4 mr-2">
            {(room.creatorId === user.uid || user.role === 'admin') && (
              <button 
                onClick={() => setShowDeleteDialog(true)}
                className="p-2 text-gray-500 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-xl"
                title="حذف المحطة"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button 
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={cn(
                "p-2 rounded-xl transition-all flex items-center gap-2 group",
                isFocusMode ? "bg-indigo-500 text-white" : "text-gray-500 hover:text-white hover:bg-white/5"
              )}
              title={isFocusMode ? "إيقاف وضع التركيز" : "تفعيل وضع التركيز العميق"}
            >
              <span className="text-xs font-bold hidden sm:block">{isFocusMode ? "خروج من التركيز" : "تركيز عميق"}</span>
              <Zap className={cn("w-5 h-5", isFocusMode && "animate-pulse")} />
            </button>

            <button 
              onClick={() => {
                if (room.timerStatus === 'focus') {
                   setShowExitDialog(true);
                } else {
                  // Cleanup handles leaving participants list
                  onExit();
                }
              }} 
              className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-2 group"
              title="خروج"
            >
              <span className="text-xs font-bold hidden sm:block">خروج</span>
              <LogOut className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </nav>

      {/* Task Bar / Info Badge */}
      <div className="z-10 px-8 py-2 max-w-5xl mx-auto -mt-2 space-y-2">
        <div className="w-full bg-space-dark/80 backdrop-blur-xl bg-[#0a0b16]/80 border border-white/5 rounded-full px-6 py-2 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-3 text-cyan-400">
            <div className="p-1 bg-cyan-500/20 rounded-full">
              <CheckCircle size={16} />
            </div>
            <span className="text-xs font-bold tracking-wide">التركيز مستمر</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors cursor-pointer">
            <span className="text-[10px] font-medium uppercase tracking-widest hidden md:block">معلومات المحطة</span>
            <Info size={16} />
          </div>
        </div>

        <AnimatePresence>
          {room.timerStatus === 'focus' && pendingMission && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full bg-orange-500/10 backdrop-blur-xl border border-orange-500/30 rounded-full px-6 py-3 flex items-center justify-center shadow-[0_4px_30px_rgba(249,115,22,0.2)]"
            >
              <div className="flex flex-col items-center gap-1 text-orange-400">
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">مهمتك المعلقة في المدار</span>
                <span className="text-sm font-black text-white">{pendingMission}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <main className="flex-1 p-4 md:p-8 z-10 w-full max-w-5xl mx-auto overflow-hidden pb-24">
        {/* Center Column: Sun Timer & Orbit */}
        <div className={cn(
          "flex flex-col items-center justify-center relative min-h-[500px] transition-all duration-1000 py-10 lg:py-20",
          isFocusMode ? "scale-[1.15] lg:scale-[1.4]" : "scale-100 lg:scale-[1.3]"
        )}>
          <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center">
            {/* Drawn Orbit */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40 mix-blend-screen" viewBox="0 0 500 500">
              <circle cx="250" cy="250" r="140" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1" strokeDasharray="4,8" fill="none" />
            </svg>
            {/* Orbiting Planets (Users) */}
            {participantsData.map((p, index) => {
              const angle = (index / participantsData.length) * 360;
              return (
                <motion.div 
                  key={p.uid}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 40 + index * 10, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 pointer-events-none"
                >
                  <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                    style={{ transform: `rotate(${angle}deg) translateY(-140px) rotate(-${angle}deg)` }}
                  >
                    <div className="relative pointer-events-auto">
                      {p.uid === user.uid && isJoined && !isMuted && volumeLevel > 5 && (
                        <motion.div
                          initial={{ scale: 1, opacity: 0.5 }}
                          animate={{ scale: 1.5, opacity: 0 }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                          className="absolute inset-0 rounded-full bg-green-500 z-[-1]"
                        />
                      )}
                      <button 
                        onClick={() => onSelectUser(p.uid)}
                        className={cn(
                          "w-10 h-10 md:w-12 md:h-12 rounded-full border-2 p-0.5 overflow-hidden shadow-sm transition-all",
                          p.uid === user.uid ? "border-indigo-400 shadow-indigo-400/40" : "border-blue-400 shadow-blue-400/20",
                          getAstronautRank(p.xp).planet
                        )}
                      >
                        <img src={p.photoURL} alt={p.displayName} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                      {/* Status Badges */}
                      <div className="absolute -top-1 -right-1 flex gap-0.5">
                        {p.hearts < 3 && (
                          <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-red-500 flex items-center justify-center border border-black">
                            <Heart size={8} className="text-white fill-white" />
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[6px] md:text-[8px] font-bold bg-white/5/80 shadow-inner backdrop-blur-xl bg-[#0a0b16]/80 px-2 py-0.5 rounded-full border border-white/5">
                      {p.displayName.split(' ')[0]}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {/* Sun Timer */}
            <div className="relative w-40 h-40 md:w-56 md:h-56 flex items-center justify-center z-10">
              {room.timerStatus === 'focus' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] bg-yellow-400/10 mix-blend-screen rounded-full animate-bio-pulse blur-[30px] pointer-events-none -z-10" />
              )}
              {/* Fuel Gauge Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="48%"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r="48%"
                  fill="none"
                  stroke={room.timerStatus === 'focus' ? '#fde047' : '#2dd4bf'}
                  strokeWidth="8"
                  strokeDasharray="100 100"
                  animate={{
                    strokeDashoffset: 100 - (timeLeft / ((room.timerStatus === 'focus' ? room.timerDuration : room.breakDuration) * 60)) * 100
                  }}
                  transition={{ duration: 1, ease: "linear" }}
                  strokeLinecap="round"
                />
              </svg>

              {(() => {
                const isFocus = room.timerStatus === 'focus';
                const progress = isFocus && room.timerDuration ? Math.min(1, Math.max(0, timeLeft / (room.timerDuration * 60))) : 1;
                const invProgress = 1 - progress;
                
                return (
                  <motion.div 
                    animate={isFocus ? { 
                      scale: [1, 1 + (0.02 + invProgress * 0.05), 1],
                      opacity: [0.95, 1, 0.95]
                    } : room.timerStatus === 'break' ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ 
                      duration: isFocus ? Math.max(0.8, 4 * progress) : 4, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className={cn(
                      "w-[85%] h-[85%] rounded-full flex items-center justify-center transition-all duration-1000",
                      room.timerStatus === 'break'
                        ? "bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-emerald-600 shadow-[0_0_120px_rgba(45,212,191,0.5)] border-4 border-indigo-400/50"
                        : room.timerStatus === 'idle' 
                        ? "bg-[#090915] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                        : ""
                    )}
                    style={isFocus ? {
                      background: `radial-gradient(circle at center, rgb(253, 224, 71) 0%, rgb(${251 - invProgress * 50}, ${191 - invProgress * 120}, ${36 - invProgress * 36}) 100%)`,
                      boxShadow: `0 0 ${80 + invProgress * 60}px rgba(251, 146, 60, ${0.4 + invProgress * 0.4})`,
                      border: `4px solid rgba(253, 224, 71, ${0.6 - invProgress * 0.3})`
                    } : {}}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span className={cn(
                        "text-4xl md:text-6xl font-black tracking-tighter drop-shadow-sm flex items-center gap-2",
                        room.timerStatus === 'idle' ? "text-gray-600" : "text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]"
                      )}>
                        {formatTime(timeLeft)}
                      </span>
                      <span className={cn(
                        "text-[10px] md:text-sm font-bold uppercase tracking-widest text-center",
                        room.timerStatus === 'idle' ? "text-white/10" : "text-black/60"
                      )}>
                        {room.timerStatus === 'focus' ? 'مرحلة التركيز' : room.timerStatus === 'break' ? 'استراحة' : 'جاهز'}
                      </span>
                    </div>
                  </motion.div>
                );
              })()}
            </div>
            
            {/* Orbit Rings */}
            <div className="absolute w-[280px] h-[280px] md:w-[400px] md:h-[400px] border border-white/5 rounded-full" />
            <div className="absolute w-[320px] h-[320px] md:w-[450px] md:h-[450px] border border-white/10 rounded-full" />
          </div>

          {/* Timer Controls */}
          {(room.creatorId === user.uid || user.role === 'admin') && (
            <div className="mt-12 flex flex-col items-center gap-6">
              {room.timerStatus === 'idle' && (
                <div className="flex gap-4 mb-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500 font-bold">وقت التركيز</span>
                    <input 
                      type="number" 
                      value={room.timerDuration}
                      onChange={(e) => safeUpdateRoom({ timerDuration: parseInt(e.target.value) || 25 })}
                      className="w-16 p-2 rounded-xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 text-center text-sm focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500 font-bold">وقت الاستراحة</span>
                    <input 
                      type="number" 
                      value={room.breakDuration}
                      onChange={(e) => safeUpdateRoom({ breakDuration: parseInt(e.target.value) || 5 })}
                      className="w-16 p-2 rounded-xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 text-center text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                {room.timerStatus === 'idle' ? (
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => safeUpdateRoom({ timerStatus: 'focus', startTime: serverTimestamp() })}
                      className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xl font-bold text-xl flex items-center justify-center gap-3"
                    >
                      <Play size={24} fill="currentColor" />
                      بدء التركيز
                    </button>
                    <button 
                      onClick={() => setShowBetModal(true)}
                      className="px-8 py-3 outline-none border border-transparent rounded-2xl bg-[#0a0b16] hover:bg-white/5 transition-all text-orange-500 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-black/20 group"
                    >
                      <Flame size={18} className="group-hover:animate-pulse" />
                      التركيز بنظام الرهان (الضياع الكوني)
                    </button>
                    <button 
                      onClick={() => setShowStudyLinkModal(true)}
                      className="px-8 py-3 outline-none border border-white/10 rounded-2xl bg-[#0a0b16] hover:bg-white/5 transition-all text-indigo-400 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-black/20 group"
                    >
                      <Target size={18} />
                      {studyLinkRef.current && studyLinkRef.current.trim() !== '' ? 'تم ربط منصة خارجية' : 'الدراسة خارج المنصة؟ (أضف رابط)'}
                    </button>
                  </div>
                ) : (
                  <div className="px-8 py-4 rounded-2xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 flex items-center gap-3 font-bold text-xl text-gray-500 cursor-not-allowed">
                    <Lock size={24} />
                    المحطة في المدار
                  </div>
                )}
              </div>
              
              {room.timerStatus !== 'idle' && (
                <div className="flex gap-4">
                  <button 
                    onClick={async () => {
                      await safeUpdateRoom({
                        timerStatus: 'idle',
                        startTime: null
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0a0b16] border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all text-xs font-bold flex items-center gap-2"
                  >
                    <Square size={14} fill="currentColor" />
                    إيقاف العداد
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Tools */}
        <QuranPlayer />
        <PersonalTasks />
      </main>

      {/* Voice Control Island */}
      <AnimatePresence>
        {hasJoinedStation && (
          <motion.div 
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-fit"
          >
            <div className="bg-[#0a0b16]/80 backdrop-blur-xl border border-white/10 rounded-full p-2 flex items-center gap-3 shadow-2xl shadow-indigo-900/20 shadow-indigo-900/40">
              
              {/* User Avatar & Status */}
              <div className="relative ml-1">
                {/* Audio Visualizer Ring */}
                {!isMuted && volumeLevel > 5 && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-green-500"
                    initial={{ opacity: 0.8, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.5 }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                )}
                <img 
                  src={user.photoURL} 
                  alt={user.displayName} 
                  className={cn(
                    "w-9 h-9 rounded-full object-cover relative z-10 transition-all duration-300",
                    !isMuted && volumeLevel > 5 ? "border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]" : "border border-white/10"
                  )} 
                  referrerPolicy="no-referrer" 
                />
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#050510] z-20",
                  isJoined ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-500"
                )} />
              </div>

              {/* Core Controls */}
              <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
                <button 
                  onClick={handleToggleMute}
                  className={cn(
                    "p-2.5 rounded-full transition-all duration-300 shadow-sm",
                    isMuted 
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 shadow-red-500/20" 
                      : "bg-[#0a0b16] shadow-lg shadow-indigo-900/10 text-gray-300 hover:bg-white/5 hover:text-white border border-transparent hover:shadow-white/10"
                  )}
                  title={isMuted ? "إلغاء كتم الصوت" : "كتم الصوت"}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} className={volumeLevel > 5 ? "text-green-400" : ""} />}
                </button>
                
                <button 
                  onClick={toggleDeafen}
                  className={cn(
                    "p-2.5 rounded-full transition-all duration-300 shadow-sm",
                    isDeafened 
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 shadow-red-500/20" 
                      : "bg-[#0a0b16] shadow-lg shadow-indigo-900/10 text-gray-300 hover:bg-white/5 hover:text-white border border-transparent hover:shadow-white/10"
                  )}
                  title={isDeafened ? "تشغيل السماعات" : "إيقاف السماعات"}
                >
                  {isDeafened ? <VolumeX size={18} /> : <Headphones size={18} />}
                </button>
              </div>

              {/* Status Indicator & Spacebar Hint */}
              <div className="flex flex-col items-start pl-4 pr-1">
                <span className={cn(
                  "text-[10px] font-black leading-tight",
                  isJoined ? "text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "text-indigo-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                )}>
                  {isJoined ? 'متصل صوتياً' : 'متصل'}
                </span>
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  {isMuted ? 'مكتوم' : 'المايك مفعّل'}
                  {isMuted && <span className="bg-white/5 px-1 rounded border border-white/5 lowercase text-[8px]">Space = تحدث</span>}
                </span>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      
      {/* Floating Station Chat (Only during break) */}
      <AnimatePresence>
        {room?.timerStatus === 'break' && (
          <motion.div 
            className="fixed bottom-6 right-6 z-50 flex flex-col items-end"
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.9 }}
          >
            <AnimatePresence>
              {isChatDrawerOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, y: 20 }}
                  animate={{ height: '500px', opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: 20 }}
                  className="w-96 bg-gradient-to-br from-[#0c0c16]/95 to-[#050510]/95 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl shadow-indigo-900/40 mb-4 flex flex-col"
                >
                  <div className="p-4 border-b border-white/5 flex items-center justify-between bg-space-dark/80 shrink-0">
                    <div className="flex items-center gap-2">
                       <MessageCircle size={18} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                       <h3 className="font-bold text-right text-sm tracking-wide">دردشة المحطة</h3>
                    </div>
                    <button onClick={() => setIsChatDrawerOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                  
                  <div className="flex-1 p-3 overflow-y-auto space-y-3 relative custom-scrollbar">
                    {typingNames.length > 0 && (
                      <div className="sticky top-0 z-10 text-[10px] text-indigo-400 italic mb-2 animate-pulse text-right bg-[#0a0b16]/80 p-1.5 rounded-lg backdrop-blur-sm self-start inline-block" dir="rtl">
                        {typingNames.slice(0, 3).join(' و ')} {typingNames.length > 3 ? 'وآخرون يكتبون...' : (typingNames.length > 1 ? 'يكتبون الآن...' : 'يكتب الآن...')}
                      </div>
                    )}
                    {messages.map(msg => (
                      <div key={msg.id} className={cn("flex flex-col", msg.userId === user.uid ? "items-end" : "items-start")}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {(user.role === 'admin' || msg.userId === user.uid) && (
                            deletingMsgId === msg.id ? (
                              <div className="flex items-center gap-1.5 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30">
                                <button 
                                  onClick={async () => {
                                    try {
                                      await deleteDoc(doc(db, 'rooms', stationId, 'messages', msg.id));
                                      setDeletingMsgId(null);
                                    } catch(e) {
                                      handleFirestoreError(e, OperationType.DELETE, `rooms/${stationId}/messages/${msg.id}`);
                                    }
                                  }}
                                  className="text-[9px] text-red-500 hover:text-white font-bold"
                                >نعم</button>
                                <button onClick={() => setDeletingMsgId(null)} className="text-[9px] text-gray-400">لا</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeletingMsgId(msg.id)} className="text-red-500 hover:text-red-400 p-1">
                                <Trash2 size={10} />
                              </button>
                            )
                          )}
                          <button 
                            onClick={() => msg.userId !== 'system' && onSelectUser(msg.userId)}
                            className={cn("flex items-center gap-1.5", msg.userId !== 'system' && "hover:text-indigo-500 transition-colors")}
                          >
                            <span className="text-[9px] text-gray-400 font-medium">{msg.userName}</span>
                            {msg.userPhoto && <img src={msg.userPhoto} className="w-3.5 h-3.5 rounded-full" referrerPolicy="no-referrer" />}
                          </button>
                        </div>
                        <div className={cn(
                          "px-4 py-2 rounded-2xl text-sm max-w-[85%] leading-relaxed",
                          msg.userId === user.uid ? "bg-indigo-500 text-white rounded-tr-none" : "bg-white/10 text-gray-200 rounded-tl-none",
                          msg.userId === 'system' && "bg-red-500/20 text-red-400 border border-red-500/30 italic w-full max-w-full text-center"
                        )}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  <div className="p-3 bg-[#0a0b16]/80 border-t border-white/10 shrink-0">
                    <div className="relative">
                      <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          const now = Date.now();
                          if (now - lastTypingUpdate.current > 2500) {
                            lastTypingUpdate.current = now;
                            setDoc(doc(db, 'rooms', stationId, 'typing', user.uid), { name: user.displayName, time: now }).catch(() => {});
                          }
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="اكتب رسالة..."
                        className="w-full bg-[#050510] shadow-inner border border-white/5 rounded-xl px-4 py-3 text-right text-sm focus:outline-none focus:border-indigo-500/50 text-white placeholder:text-gray-600"
                        dir="rtl"
                      />
                      <button 
                        onClick={handleSendMessage}
                        className="absolute left-1.5 top-1.5 bottom-1.5 px-3 bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors flex items-center justify-center"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setIsChatDrawerOpen(!isChatDrawerOpen)}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-xl",
                isChatDrawerOpen 
                  ? "bg-indigo-600 text-white shadow-indigo-900/50" 
                  : "bg-[#0a0b16] border border-white/10 text-cyan-400 hover:bg-white/5 shadow-black/50"
              )}
            >
              <MessageCircle size={20} className={cn(!isChatDrawerOpen && "drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]")} />
              {/* Unread dot or similar could go here */}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDeleteDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 shadow-2xl shadow-indigo-900/20 backdrop-blur-lg bg-[#0a0b16]/60"
          >
            <div className="bg-[#0a0b16] border border-red-500/30 rounded-3xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl shadow-indigo-900/20 shadow-red-500/20">
              <h2 className="text-xl font-black mb-4 text-center text-red-500">حذف المحطة</h2>
              <p className="text-gray-300 text-center text-sm mb-6">هل أنت متأكد من حذف هذه المحطة نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 px-4 py-2 bg-[#0a0b16] shadow-lg shadow-indigo-900/10 hover:bg-white/5 rounded-xl text-white font-bold transition-all text-sm"
                >
                  إلغاء
                </button>
                <button
                  onClick={async () => {
                    setShowDeleteDialog(false);
                    await deleteDoc(doc(db, 'rooms', stationId));
                    onExit();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-white font-bold transition-all shadow-sm shadow-red-600/30 text-sm"
                >
                  تأكيد الحذف
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Exit Confirmation Dialog */}
      <AnimatePresence>
        {showExitDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 shadow-2xl shadow-indigo-900/20 backdrop-blur-lg bg-[#0a0b16]/60"
          >
            <div className="bg-[#0a0b16] border border-red-500/30 rounded-3xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl shadow-indigo-900/20 shadow-red-500/20">
              <h2 className="text-xl font-black mb-4 text-center text-red-500 flex items-center justify-center gap-2">
                <ShieldAlert size={24} />
                تحذير خطير!
              </h2>
              <p className="text-gray-300 text-center text-sm mb-6 leading-relaxed">
                الخروج من المحطة أثناء وضع التركيز سيؤدي إلى فقدان قلب 💔 وخسارة المضاعف التراكمي (Combo). هل أنت متأكد من الهروب؟
              </p>
              <div className="flex gap-4 flex-col sm:flex-row">
                <button
                  onClick={() => setShowExitDialog(false)}
                  className="flex-1 px-4 py-3 bg-indigo-500 hover:bg-indigo-700 rounded-xl text-white font-bold transition-all text-sm shadow-sm shadow-indigo-500/20"
                >
                  البقاء والمتابعة
                </button>
                <button
                  onClick={async () => {
                    setShowExitDialog(false);
                    await updateDoc(doc(db, 'users', user.uid), {
                      hearts: increment(-1)
                    });
                    setComboMultiplier(1);
                    
                    // Penalty message for peer accountability
                    if (participantsCountRef.current > 1) {
                      await addDoc(collection(db, 'rooms', stationId, 'messages'), {
                        text: `🚨 المحرك (${user.displayName}) توقف عن العمل! السفينة تتباطأ!`,
                        userId: 'system',
                        userName: 'نظام التنبيه',
                        userPhoto: '',
                        timestamp: serverTimestamp(),
                        type: 'text',
                        isExitPenalty: true
                      });
                    }

                    // Cleanup handles leaving participants list
                    onExit();
                  }}
                  className="px-4 py-3 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/50 rounded-xl font-bold transition-all text-sm whitespace-nowrap"
                >
                  الهروب الآن
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next Mission Modal */}
      <AnimatePresence>
        {showNextMissionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/20 shadow-2xl shadow-indigo-900/20 backdrop-blur-lg bg-[#0a0b16]/60"
          >
            <div className="bg-[#0a0b16] border border-orange-500/30 rounded-3xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl shadow-orange-900/20 text-center">
              <h2 className="text-2xl font-black mb-4 text-orange-400">مهمتك القادمة 🚀</h2>
              <p className="text-gray-300 text-sm mb-6">تبقى دقيقة واحدة! حدد مهمتك المعلقة للجلسة القادمة لتبدأ بقوة.</p>
              
              <input
                type="text"
                maxLength={60}
                placeholder="اكتب جملة واحدة عن مهمتك..."
                value={nextMissionInput}
                onChange={(e) => setNextMissionInput(e.target.value)}
                autoFocus
                className="w-full bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 rounded-2xl p-4 text-white placeholder-gray-500 mb-6 focus:outline-none focus:border-orange-500 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNextMissionSubmit();
                }}
              />

              <div className="flex gap-4">
                <button
                  onClick={handleNextMissionSubmit}
                  disabled={!nextMissionInput.trim()}
                  className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-bold transition-all text-sm shadow-sm shadow-orange-600/30"
                >
                  تعيين المهمة
                </button>
                <button
                  onClick={() => setShowNextMissionModal(false)}
                  className="px-6 py-3 bg-[#0a0b16] shadow-lg shadow-indigo-900/10 hover:bg-white/5 border border-white/5 rounded-xl text-white font-bold transition-all text-sm"
                >
                  تخطي
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStudyLinkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-[#0a0b16] border border-indigo-500/30 rounded-3xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl shadow-indigo-900/20 text-right" dir="rtl">
              <h2 className="text-2xl font-black mb-4 text-indigo-400">الدراسة خارج المنصة 🌍</h2>
              <p className="text-gray-300 text-sm mb-2">لأن المتصفحات الحديثة تحمي خصوصيتك، لا يمكننا تتبع المنصات الأخرى التي تدرس عليها.</p>
              <p className="text-gray-400 text-xs mb-6">لكن إذا أضفت رابط المنصة هنا، سنقوم بتعطيل نظام الإنذار الصارم (تسرب الوقود) لكي تتمكن من الدراسة خارج علامة التبويب براحة.</p>
              
              <input
                type="url"
                dir="ltr"
                placeholder="https://example.com"
                value={studyLink}
                onChange={(e) => setStudyLink(e.target.value)}
                className="w-full bg-[#151624] border border-white/10 rounded-2xl p-4 text-white placeholder-gray-500 mb-6 focus:outline-none focus:border-indigo-500 transition-colors text-left"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    studyLinkRef.current = studyLink;
                    setShowStudyLinkModal(false);
                  }}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-bold transition-all text-sm shadow-sm shadow-indigo-600/30"
                >
                  حفظ الرابط
                </button>
                <button
                  onClick={() => {
                    setStudyLink('');
                    studyLinkRef.current = '';
                    setShowStudyLinkModal(false);
                  }}
                  className="px-6 py-3 bg-[#0a0b16] shadow-lg shadow-indigo-900/10 hover:bg-white/5 border border-white/5 rounded-xl text-white font-bold transition-all text-sm"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function LeaderboardView({ user, onSelectUser }: { user: UserData, onSelectUser: (id: string) => void }) {
  const [leaders, setLeaders] = useState<UserData[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLeaders(snapshot.docs.map(doc => doc.data() as UserData));
    }, (e) => handleFirestoreError(e, OperationType.GET, 'users_leaderboard'));
    return () => unsubscribe();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black flex items-center gap-3">
          <Trophy className="text-yellow-400" size={32} />
          قائمة المتصدرين
        </h2>
        <div className="px-4 py-2 bg-[#0a0b16] shadow-lg shadow-indigo-900/10 rounded-xl border border-white/10 text-sm text-gray-400">
          أفضل 50 رائد فضاء
        </div>
      </div>

      <div className="bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-lg bg-[#0a0b16]/60">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 text-sm font-bold text-gray-400">
          <div className="col-span-1 text-center">المركز</div>
          <div className="col-span-6">الرائد</div>
          <div className="col-span-2 text-center">المستوى</div>
          <div className="col-span-3 text-center">نقاط الخبرة (XP)</div>
        </div>

        <div className="divide-y divide-white/5">
          {leaders.map((leader, index) => {
            const isTop3 = index < 3;
            const rankStyle = 
              index === 0 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
              index === 1 ? "bg-gray-300/20 text-gray-300 border-gray-300/30" :
              index === 2 ? "bg-amber-700/20 text-amber-600 border-amber-700/30" :
              "bg-[#0a0b16] shadow-lg shadow-indigo-900/10 text-gray-400 border-white/10";

            return (
              <motion.div 
                key={leader.uid}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "grid grid-cols-12 gap-4 p-4 items-center transition-colors hover:bg-[#0a0b16] shadow-lg shadow-indigo-900/10",
                  leader.uid === user.uid && "bg-indigo-500/200/10"
                )}
              >
                <div className="col-span-1 flex justify-center">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold border", rankStyle)}>
                    {index + 1}
                  </div>
                </div>
                
                <div className="col-span-6 flex items-center gap-3">
                  <button onClick={() => onSelectUser(leader.uid)} className="relative group">
                    <img src={leader.photoURL} className="w-10 h-10 rounded-full border border-white/10 group-hover:border-indigo-400 transition-colors" referrerPolicy="no-referrer" />
                    {leader.uid === user.uid && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-500/200 rounded-full border-2 border-[#0a0a1a] flex items-center justify-center">
                        <Star size={8} className="text-white" />
                      </div>
                    )}
                  </button>
                  <div className="flex flex-col">
                    <button onClick={() => onSelectUser(leader.uid)} className="font-bold text-right hover:text-indigo-500 transition-colors">
                      {leader.displayName}
                    </button>
                    <span className={cn("text-[10px] font-bold", getAstronautRank(leader.xp).color)}>
                      {getAstronautRank(leader.xp).title}
                    </span>
                  </div>
                </div>

                <div className="col-span-2 flex justify-center">
                  <div className="px-3 py-1 bg-[#0a0b16] shadow-lg shadow-indigo-900/10 rounded-lg font-mono font-bold text-indigo-500">
                    {leader.level}
                  </div>
                </div>

                <div className="col-span-3 flex justify-center">
                  <div className="flex items-center gap-1 font-mono font-bold text-yellow-400">
                    <Zap size={14} />
                    {leader.xp.toLocaleString()}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function ChatView({ user, onSelectUser }: { user: UserData, onSelectUser: (id: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingMap, setTypingMap] = useState<Record<string, {name: string, time: number}>>({});
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);

  const prevCount = useRef(0);
  const initialLoad = useRef(true);
  const lastMsgTime = useRef(0);
  const lastTypingUpdate = useRef(0);

  useEffect(() => {
    const q = query(collection(db, 'global_chat'), orderBy('timestamp', 'asc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      
      if (!initialLoad.current && msgs.length > prevCount.current) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.userId !== user.uid) {
          playSound('message');
        }
      }
      
      prevCount.current = msgs.length;
      initialLoad.current = false;
      setMessages(msgs);
    }, (e) => handleFirestoreError(e, OperationType.GET, 'global_chat'));
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    const unsubTyping = onSnapshot(collection(db, 'chat_typing'), snap => {
      const newMap: Record<string, {name: string, time: number}> = {};
      snap.docs.forEach(d => {
        if (d.id !== user.uid) newMap[d.id] = d.data() as {name: string, time: number};
      });
      setTypingMap(newMap);
    }, () => {});
    
    // Force re-render periodically to clear old dots
    const interval = setInterval(() => setTypingMap(m => ({...m})), 2000);
    return () => { unsubTyping(); clearInterval(interval); };
  }, [user.uid]);

  const typingNames = Object.values(typingMap).filter(t => Date.now() - t.time < 3000).map(t => t.name);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    if (newMessage.length > 500) {
      alert('الرسالة طويلة جداً! الحد الأقصى هو 500 حرف.');
      return;
    }
    const now = Date.now();
    if (now - lastMsgTime.current < 2000) {
      alert('الرجاء الانتظار قليلاً قبل إرسال رسالة أخرى (حماية من الإزعاج).');
      return;
    }
    lastMsgTime.current = now;
    try {
      await addDoc(collection(db, 'global_chat'), {
        text: newMessage,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        timestamp: serverTimestamp(),
        type: 'text'
      });
      setNewMessage('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'global_chat');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-lg bg-[#0a0b16]/60"
    >
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-400">متصل الآن</span>
        </div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          الشات العام 🚀
        </h2>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6 relative">
      {typingNames.length > 0 && (
          <div className="sticky top-0 z-10 text-xs text-indigo-400 italic mb-2 animate-pulse text-right bg-[#0a0b16]/80 p-2 rounded-lg backdrop-blur-sm self-start inline-block" dir="rtl">
            {typingNames.slice(0, 3).join(' و ')} {typingNames.length > 3 ? 'وآخرون يكتبون...' : (typingNames.length > 1 ? 'يكتبون الآن...' : 'يكتب الآن...')}
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={cn("flex gap-4", msg.userId === user.uid ? "flex-row-reverse" : "flex-row")}>
            <button onClick={() => onSelectUser(msg.userId)} className="z-10 relative">
              <img src={msg.userPhoto} className="w-10 h-10 rounded-full border border-white/10 hover:border-indigo-400 transition-colors" referrerPolicy="no-referrer" />
            </button>
            <div className={cn("flex flex-col", msg.userId === user.uid ? "items-end" : "items-start")}>
              <div className="flex items-center gap-2 mb-1">
                {(user.role === 'admin' || msg.userId === user.uid) && (
                  deletingMsgId === msg.id ? (
                    <div className="flex items-center gap-2 bg-red-500/10 px-2 py-1 rounded border border-red-500/30">
                      <span className="text-[10px] text-red-400">حذف؟</span>
                      <button 
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, 'global_chat', msg.id));
                            setDeletingMsgId(null);
                          } catch (e: any) {
                            handleFirestoreError(e, OperationType.DELETE, `global_chat/${msg.id}`);
                          }
                        }}
                        className="text-[10px] text-red-500 hover:text-white font-bold"
                      >نعم</button>
                      <button onClick={() => setDeletingMsgId(null)} className="text-[10px] text-gray-400">لا</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeletingMsgId(msg.id)} className="text-red-500 hover:text-red-400 p-1">
                      <Trash2 size={12} />
                    </button>
                  )
                )}
                <button onClick={() => onSelectUser(msg.userId)} className="text-xs text-gray-400 hover:text-indigo-500 transition-colors">{msg.userName}</button>
              </div>
              <div className={cn(
                "px-4 py-2 rounded-2xl text-sm max-w-md",
                msg.userId === user.uid ? "bg-indigo-500 text-white rounded-tr-none" : "bg-white/5 text-gray-200 rounded-tl-none"
              )}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 bg-space-dark/80 border-t border-white/10">
        <div className="relative">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              const now = Date.now();
              if (now - lastTypingUpdate.current > 2500) {
                lastTypingUpdate.current = now;
                setDoc(doc(db, 'chat_typing', user.uid), { name: user.displayName, time: now }).catch(() => {});
              }
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="اكتب رسالة للجميع..."
            className="w-full bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 rounded-2xl px-6 py-4 text-right focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition-all"
            dir="rtl"
          />
          <button 
            onClick={handleSendMessage}
            className="absolute left-2 top-2 bottom-2 px-6 bg-indigo-500 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <span>إرسال</span>
            <Send size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function FocusHeatmap() {
  const history: Record<string, number> = React.useMemo(() => {
    const hist: Record<string, number> = {};
    const today = new Date();
    for (let i = 59; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const isRecent = i < 15;
      if (Math.random() > (isRecent ? 0.3 : 0.6)) {
        hist[dateStr] = Math.floor(Math.random() * 150);
      }
    }
    return hist;
  }, []);

  const today = new Date();
  const days = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }

  const getDayColor = (minutes: number) => {
    if (minutes === 0) return 'bg-[#0a0b16] border-white/5';
    if (minutes < 30) return 'bg-fuchsia-900/60 border-fuchsia-500/20';
    if (minutes < 60) return 'bg-fuchsia-600/80 border-fuchsia-400/40';
    if (minutes < 120) return 'bg-purple-500 border-purple-400/60 shadow-[0_0_8px_rgba(168,85,247,0.5)]';
    return 'bg-purple-300 border-purple-200 shadow-[0_0_12px_rgba(216,180,254,0.8)] animate-pulse';
  };

  return (
    <div className="p-6 rounded-3xl glass border border-fuchsia-500/10 space-y-4">
      <h4 className="text-sm font-bold text-white flex items-center justify-end gap-2">
        <span>نشاط المجرة (التركيز)</span>
        <Activity size={16} className="text-fuchsia-400" />
      </h4>
      <div className="flex flex-wrap gap-1.5 justify-end" dir="ltr">
        {days.map((d, i) => {
          const dateStr = d.toISOString().split('T')[0];
          const minutes = history[dateStr] || 0;
          return (
            <div 
              key={i} 
              className={cn("w-3 h-3 md:w-3.5 md:h-3.5 rounded-sm border transition-all hover:scale-150 cursor-help", getDayColor(minutes))}
              title={`${dateStr}: ${minutes} دقيقة`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2 text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-widest">
        <span>أكثر</span>
        <div className="w-2.5 h-2.5 rounded-sm bg-purple-300 border border-purple-200"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-purple-500 border border-purple-400/60"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-fuchsia-600/80 border border-fuchsia-400/40"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-fuchsia-900/60 border border-fuchsia-500/20"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-[#0a0b16] border border-white/5"></div>
        <span>أقل</span>
      </div>
    </div>
  );
}

function ProfileView({ user, isStudying }: { user: UserData, isStudying?: boolean }) {
  const [exhibitions, setExhibitions] = useState<any[]>([]);
  const [friends, setFriends] = useState<UserData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user.bio || '');
  const [missionRoleStr, setMissionRoleStr] = useState(user.missionRole || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputExhibitionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'exhibitions'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExhibitions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (e) => handleFirestoreError(e, OperationType.GET, `exhibitions_user_${user.uid}`));
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'friends'), limit(20));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const friendIds = snapshot.docs.map(doc => doc.id);
      if (friendIds.length > 0) {
        try {
          // Use 'in' query to fetch all friends in one go
          const friendsQuery = query(collection(db, 'profiles'), where('uid', 'in', friendIds));
          const friendsSnap = await getDocs(friendsQuery);
          setFriends(friendsSnap.docs.map(doc => doc.data() as UserData));
        } catch (e) {
          console.error("Error fetching friends details:", e);
        }
      } else {
        setFriends([]);
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}/friends`));
    return () => unsubscribe();
  }, [user.uid]);

  const handleUpdateBio = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { bio, missionRole: missionRoleStr });
      setIsEditing(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleUpdateAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('الرجاء اختيار ملف صورة صالح.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.8 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        try {
          await updateDoc(doc(db, 'users', user.uid), { photoURL: dataUrl });
          
          // Update denormalized photo in other collections
          const collectionsToUpdate = ['global_chat', 'discussions', 'suggestions'];
          for (const col of collectionsToUpdate) {
            const q = query(collection(db, col), where('userId', '==', user.uid));
            const snapshot = await getDocs(q);
            snapshot.forEach(async (docSnap) => {
              await updateDoc(doc(db, col, docSnap.id), { userPhoto: dataUrl }).catch(() => {});
            });
          }

          // Update replies inside discussions
          const discussionsSnap = await getDocs(collection(db, 'discussions'));
          discussionsSnap.forEach(async (discDoc) => {
            const repliesQ = query(collection(db, 'discussions', discDoc.id, 'replies'), where('userId', '==', user.uid));
            const repliesSnap = await getDocs(repliesQ);
            repliesSnap.forEach(async (replyDoc) => {
              await updateDoc(doc(db, 'discussions', discDoc.id, 'replies', replyDoc.id), { userPhoto: dataUrl }).catch(() => {});
            });
          });

        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleExhibitionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('الرجاء اختيار ملف صورة صالح.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        try {
          await addDoc(collection(db, 'exhibitions'), {
            url: dataUrl,
            userId: user.uid,
            userName: user.displayName,
            timestamp: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'exhibitions');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      {/* Profile Header */}
      <div className="p-8 rounded-[2.5rem] glass border-indigo-400/20 relative overflow-hidden group flex flex-col justify-center transition-colors">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
           <UserIcon size={200} className="text-indigo-500" />
        </div>
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="flex items-center justify-center">
            <div className="relative group cursor-pointer" onClick={handleUpdateAvatar}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              {/* Dynamic Glow Effect */}
              <div className={cn("absolute inset-0 rounded-full blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500", getAstronautRank(user.xp).color.replace('text-', 'bg-'))}></div>
              
              <div className="w-32 h-32 rounded-full border-4 border-indigo-400 p-1 relative overflow-hidden z-10 bg-[#0a0b16]">
                <img src={user.photoURL} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <span className="text-xs font-bold text-white">تغيير الصورة</span>
                </div>
              </div>
              <div className={cn("absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold border-2 border-[#0a0b16] z-20 whitespace-nowrap shadow-xl", getAstronautRank(user.xp).color.replace('text-', 'bg-').replace('300', '500').replace('400', '500'), getAstronautRank(user.xp).color === 'text-white' ? 'text-black' : 'text-white')}>
                LVL {user.level}
              </div>
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-right space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex gap-4">
                <button onClick={() => setIsEditing(!isEditing)} className="px-6 py-2 bg-white/5 rounded-xl font-bold hover:bg-[#0a0b16]/20 transition-all text-sm">تعديل الملف</button>
                <button className="px-6 py-2 bg-indigo-500 rounded-xl font-bold hover:bg-indigo-700 transition-all text-sm">مشاركة</button>
              </div>
              <h2 className="text-3xl font-bold">{user.displayName}</h2>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-end gap-3 text-xs">
              <div className="text-center px-6 py-3 bg-[#0a0b16] rounded-2xl border border-white/5 backdrop-blur-md shadow-inner shadow-black/20"><span className="block font-black text-2xl text-indigo-400">{exhibitions.length}</span><span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">منشور</span></div>
              <div className="text-center px-6 py-3 bg-[#0a0b16] rounded-2xl border border-white/5 backdrop-blur-md shadow-inner shadow-black/20"><span className="block font-black text-2xl text-blue-400">{user.xp}</span><span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">XP</span></div>
              <div className="text-center px-6 py-3 bg-[#0a0b16] rounded-2xl border border-white/5 backdrop-blur-md shadow-inner shadow-black/20"><span className="block font-black text-2xl text-fuchsia-400">{friends.length}</span><span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">صديق</span></div>
            </div>

            <div className="space-y-4">
              {isEditing ? (
                <div className="flex flex-col gap-3 items-end w-full">
                  <div className="w-full sm:w-auto relative">
                    <input
                      value={missionRoleStr}
                      onChange={(e) => setMissionRoleStr(e.target.value)}
                      placeholder="اكتب تخصصك الفضائي..."
                      className="w-full bg-white/5/80 shadow-inner border border-white/10 rounded-xl px-4 py-2 text-right focus:outline-none focus:border-indigo-400 text-sm"
                      dir="rtl"
                    />
                    
                  </div>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="اكتب نبذة عنك..."
                    className="w-full bg-white/5/80 shadow-inner border border-white/10 rounded-xl p-3 text-right text-sm focus:outline-none"
                    dir="rtl"
                  />
                  <button onClick={handleUpdateBio} className="px-6 py-2 bg-indigo-500 rounded-xl hover:bg-indigo-600 transition-colors text-white text-sm font-bold">حفظ التغييرات</button>
                </div>
              ) : (
                <div className="space-y-2 text-right">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-gray-300">
                    <Rocket size={12} className="text-indigo-400" />
                    {user.missionRole || 'لم يتم تحديد التخصص'}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {user.bio || 'لا يوجد وصف حالياً... اضغط على "تعديل الملف" للإضافة'}
                  </p>
                </div>
              )}
            </div>

            {/* Badges Display */}
            <div className="pt-4 border-t border-white/5">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 text-right">الأوسمة المستحقة</h4>
              <div className="flex flex-wrap justify-end gap-3">
                {user.badges && user.badges.length > 0 ? (
                  user.badges.map(badgeId => {
                    const badge = BADGES.find(b => b.id === badgeId);
                    return badge ? (
                      <div key={badgeId} className="group relative">
                        <div className="w-10 h-10 rounded-xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 flex items-center justify-center text-xl hover:bg-white/5 transition-all cursor-help">
                          {badge.icon}
                        </div>
                        <div className="absolute bottom-full right-0 mb-2 w-32 p-2 bg-[#0a0b16] border border-white/10 rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          <p className="font-bold text-indigo-500">{badge.title}</p>
                          <p className="text-gray-400">{badge.description}</p>
                        </div>
                      </div>
                    ) : null;
                  })
                ) : (
                  <p className="text-[10px] text-gray-600 italic">لم تحصل على أي أوسمة بعد... استمر في التركيز!</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mt-8 space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-gray-400">
            <span>{getAstronautRank(user.xp).nextRankTitle}</span>
            <span>التقدم للرتبة التالية</span>
            <span className={getAstronautRank(user.xp).color}>{getAstronautRank(user.xp).title}</span>
          </div>
          <div className="h-6 bg-[#0a0b16] shadow-inner shadow-black/80 rounded-full overflow-hidden border border-white/10 relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${getAstronautRank(user.xp).progressPercentage}%` }}
              className="h-full bg-gradient-to-r from-indigo-500 to-blue-400"
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              {Math.round(getAstronautRank(user.xp).progressPercentage)}%
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
              <p className="text-xs text-gray-400">{friends.length} زملاء في المجرة</p>
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
                  src={friend.photoURL} 
                  className="w-10 h-10 rounded-full border-2 border-[#0a0b16] object-cover hover:scale-110 transition-transform cursor-help" 
                  referrerPolicy="no-referrer" 
                />
                {friend.lastActiveTime && (Date.now() - friend.lastActiveTime < 300000) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0b16]" title="متصل الآن" />
                )}
                <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 px-2 py-1 bg-[#0a0b16] border border-white/10 rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                  {friend.displayName}
                </div>
              </div>
            ))}
            {friends.length > 8 && (
              <div className="w-10 h-10 rounded-full border-2 border-[#0a0b16] bg-[#0a0b16] text-blue-400 flex items-center justify-center text-xs font-bold relative z-0 shadow-inner">
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
            xp={`${badge.minXp} XP`} 
            active={user.xp >= badge.minXp} 
          />
        ))}
      </div>

      <FarmDisplay user={user} isOwner={true} isStudying={isStudying} />

      <CosmicDiary user={user} exhibitions={exhibitions} isOwner={true} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Exhibitions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between p-6 rounded-3xl glass border border-white/5">
            <input 
              type="file" 
              ref={fileInputExhibitionRef} 
              onChange={handleExhibitionFileChange} 
              accept="image/*" 
              className="hidden" 
            />
            <button onClick={() => fileInputExhibitionRef.current?.click()} className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-bold shadow-sm shadow-indigo-500/10 border border-indigo-500/30">
              <Plus size={18} />
              إضافة صورة
            </button>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-pink-400" />
              معرض المحطات
            </h3>
          </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {exhibitions.map((ex, i) => (
            <motion.div 
              key={ex.id}
              whileHover={{ scale: 1.02 }}
              className="aspect-square rounded-3xl overflow-hidden border border-white/10 bg-[#0a0b16] shadow-lg shadow-indigo-900/10 group relative"
            >
              <img src={ex.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-xs font-bold">{ex.timestamp ? new Date(ex.timestamp.toDate()).toLocaleDateString('ar-EG') : ''}</span>
              </div>
            </motion.div>
          ))}
          {exhibitions.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
              <p className="text-gray-500 italic">لا توجد صور في المعرض بعد</p>
            </div>
          )}
        </div>
        </div>

        {/* Right Column - Stats or other bento items */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          <FocusHeatmap />
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-6 flex-1">
            <div className="p-6 rounded-3xl glass border border-orange-500/20 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-orange-500/5 group-hover:bg-orange-500/10 transition-colors"></div>
              <Flame size={48} className="text-orange-500 mb-4 animate-pulse drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
              <h4 className="text-xl font-black text-white mb-1">أيام التركيز</h4>
              <p className="text-4xl font-black text-orange-400 drop-shadow-md">{user.streak || 0}</p>
              <span className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">تتجدد غداً</span>
            </div>
            <div className="p-6 rounded-3xl glass border border-red-500/20 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors"></div>
              <Heart size={48} className="text-red-500 mb-4 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              <h4 className="text-xl font-black text-white mb-1">القلوب</h4>
              <p className="text-4xl font-black text-red-400 drop-shadow-md">{user.hearts}</p>
              <span className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">التحديات</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface BadgeCardProps {
  icon: string;
  title: string;
  xp: string;
  active?: boolean;
  key?: React.Key;
}

function DiscussionsView({ user }: { user: UserData }) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newReply, setNewReply] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingDiscussionId, setDeletingDiscussionId] = useState<string | null>(null);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'discussions'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDiscussions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Discussion)));
    }, (e) => handleFirestoreError(e, OperationType.GET, 'discussions'));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedDiscussion) {
      const q = query(collection(db, 'discussions', selectedDiscussion.id, 'replies'), orderBy('timestamp', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reply)));
      }, (e) => handleFirestoreError(e, OperationType.GET, `discussions/${selectedDiscussion.id}/replies`));
      return () => unsubscribe();
    }
  }, [selectedDiscussion]);

  const handleCreateDiscussion = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    try {
      await addDoc(collection(db, 'discussions'), {
        title: newTitle,
        content: newContent,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        timestamp: serverTimestamp(),
        repliesCount: 0
      });
      setNewTitle('');
      setNewContent('');
      setIsCreating(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'discussions');
    }
  };

  const handleSendReply = async () => {
    if (!newReply.trim() || !selectedDiscussion) return;
    try {
      await addDoc(collection(db, 'discussions', selectedDiscussion.id, 'replies'), {
        text: newReply,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        timestamp: serverTimestamp()
      });
      await updateDoc(doc(db, 'discussions', selectedDiscussion.id), {
        repliesCount: increment(1)
      });
      if (selectedDiscussion.userId !== user.uid) {
        addDoc(collection(db, 'users', selectedDiscussion.userId, 'notifications'), {
           type: 'reply',
           content: `رد ${user.displayName} على نقاشك: ${selectedDiscussion.title}`,
           read: false,
           timestamp: serverTimestamp()
        }).catch(console.error);
      }
      setNewReply('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `discussions/${selectedDiscussion.id}/replies`);
    }
  };

  const handleDeleteDiscussion = async (id: string, authorId: string) => {
    if (user.role !== 'admin' && user.uid !== authorId) return;
    try {
      await deleteDoc(doc(db, 'discussions', id));
      if (selectedDiscussion?.id === id) setSelectedDiscussion(null);
      setDeletingDiscussionId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `discussions/${id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="px-6 py-2 bg-indigo-500 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          {isCreating ? <X size={18} /> : <Plus size={18} />}
          {isCreating ? 'إلغاء' : 'بدء نقاش جديد'}
        </button>
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-indigo-500" />
          ساحة النقاش
        </h2>
      </div>

      {isCreating && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 space-y-4"
        >
          <input 
            type="text" 
            placeholder="عنوان الموضوع..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-white/5/80 shadow-inner border border-white/10 rounded-xl px-4 py-3 text-right focus:outline-none focus:ring-1 focus:ring-indigo-400"
            dir="rtl"
          />
          <textarea 
            placeholder="محتوى النقاش..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full bg-white/5/80 shadow-inner border border-white/10 rounded-xl px-4 py-3 text-right h-32 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            dir="rtl"
          />
          <button 
            onClick={handleCreateDiscussion}
            className="w-full py-3 bg-indigo-500 rounded-xl font-bold hover:bg-indigo-700 transition-all"
          >
            نشر الموضوع
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {selectedDiscussion ? (
          <div className="space-y-6">
            <button 
              onClick={() => setSelectedDiscussion(null)}
              className="text-indigo-500 font-bold flex items-center gap-2 hover:underline"
            >
              <SkipBack size={18} className="rotate-180" />
              العودة للنقاشات
            </button>
            <div className="p-8 rounded-3xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 space-y-6 relative overflow-hidden">
              <div className="atmosphere-bg opacity-10" />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <img src={selectedDiscussion.userPhoto} className="w-12 h-12 rounded-2xl border border-white/10" referrerPolicy="no-referrer" />
                  <div className="text-left">
                    <p className="font-bold text-base">{selectedDiscussion.userName}</p>
                    <p className="text-[10px] text-gray-500">{selectedDiscussion.timestamp?.toDate().toLocaleString('ar-EG')}</p>
                  </div>
                </div>
                <h3 className="text-2xl font-black">{selectedDiscussion.title}</h3>
              </div>
              <p className="text-gray-200 leading-relaxed text-right relative z-10 text-lg" dir="rtl">{selectedDiscussion.content}</p>
            </div>

            <div className="space-y-4 pr-6 border-r-2 border-white/5">
              {replies.map(reply => (
                <div key={reply.id} className="p-4 rounded-2xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <span className="text-xs text-gray-400">{reply.timestamp?.toDate().toLocaleString('ar-EG')}</span>
                       {(user.role === 'admin' || reply.userId === user.uid) && (
                          deletingReplyId === reply.id ? (
                            <div className="flex items-center gap-1.5 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30" onClick={e => e.stopPropagation()}>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteDoc(doc(db, 'discussions', selectedDiscussion.id, 'replies', reply.id));
                                  setDeletingReplyId(null);
                                }}
                                className="text-[9px] text-red-500 hover:text-white font-bold"
                              >نعم</button>
                              <button onClick={(e) => { e.stopPropagation(); setDeletingReplyId(null); }} className="text-[9px] text-gray-400">لا</button>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingReplyId(reply.id);
                              }}
                              className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">{reply.userName}</span>
                      <img src={reply.userPhoto} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 text-right" dir="rtl">{reply.text}</p>
                </div>
              ))}
            </div>

            <div className="relative">
              <textarea 
                placeholder="أضف رداً..."
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                className="w-full bg-white/5/80 shadow-inner border border-white/10 rounded-2xl px-6 py-4 text-right h-24 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                dir="rtl"
              />
              <button 
                onClick={handleSendReply}
                className="absolute left-2 bottom-2 px-6 py-2 bg-indigo-500 rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                رد
              </button>
            </div>
          </div>
        ) : (
          discussions.map(disc => (
            <motion.div 
              key={disc.id}
              whileHover={{ scale: 1.01 }}
              className="p-6 rounded-3xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 hover:bg-white/5 transition-all cursor-pointer group"
              onClick={() => setSelectedDiscussion(disc)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <MessageSquare size={14} />
                    {disc.repliesCount} ردود
                  </div>
                  {(user.role === 'admin' || disc.userId === user.uid) && (
                    deletingDiscussionId === disc.id ? (
                      <div className="flex items-center gap-2 bg-red-500/10 px-2 py-1 rounded border border-red-500/30" onClick={e => e.stopPropagation()}>
                        <span className="text-[10px] text-red-400">حذف؟</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteDiscussion(disc.id, disc.userId); }}
                          className="text-[10px] text-red-500 hover:text-white font-bold"
                        >نعم</button>
                        <button onClick={(e) => { e.stopPropagation(); setDeletingDiscussionId(null); }} className="text-[10px] text-gray-400">لا</button>
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeletingDiscussionId(disc.id); }}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-sm">{disc.userName}</p>
                    <p className="text-[10px] text-gray-500">{disc.timestamp?.toDate().toLocaleDateString('ar-EG')}</p>
                  </div>
                  <img src={disc.userPhoto} className="w-10 h-10 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-right group-hover:text-indigo-500 transition-colors">{disc.title}</h3>
              <p className="text-sm text-gray-400 text-right mt-2 line-clamp-2" dir="rtl">{disc.content}</p>
            </motion.div>
          ))
        )}
        {!selectedDiscussion && discussions.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
            <p className="text-gray-500 italic">لا توجد نقاشات حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleView({ user }: { user: UserData }) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [day, setDay] = useState('الأحد');
  const [time, setTime] = useState('');
  const [task, setTask] = useState('');
  const DAYS = ['الأحد', 'الأثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'schedule'), orderBy('time', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleItem)));
    }, (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}/schedule`));
    return () => unsubscribe();
  }, [user.uid]);

  const handleAddItem = async () => {
    if (!time || !task) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'schedule'), {
        day,
        time,
        task,
        userId: user.uid
      });
      setTime('');
      setTask('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/schedule`);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'schedule', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/schedule/${id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-400">
          <Info size={16} />
          <span className="text-xs font-bold">نظم وقتك وخطط لأسبوعك الدراسي</span>
        </div>
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <Calendar className="w-8 h-8 text-blue-400" />
          جدولي الأسبوعي
        </h2>
      </div>

      <div className="p-6 rounded-3xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 block text-right">المهمة</label>
          <input 
            type="text" 
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="مثال: مذاكرة رياضيات"
            className="w-full bg-white/5/80 shadow-inner border border-white/10 rounded-xl px-4 py-2 text-right focus:outline-none"
            dir="rtl"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 block text-right">الوقت</label>
          <input 
            type="time" 
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-white/5/80 shadow-inner border border-white/10 rounded-xl px-4 py-2 text-right focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 block text-right">اليوم</label>
          <select 
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-full bg-white/5/80 shadow-inner border border-white/10 rounded-xl px-4 py-2 text-right focus:outline-none"
            dir="rtl"
          >
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <button 
          onClick={handleAddItem}
          className="py-2 bg-blue-600 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          إضافة للجدول
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {DAYS.map(d => (
          <div key={d} className="space-y-3">
            <h3 className="text-center font-bold py-2 bg-[#0a0b16] shadow-lg shadow-indigo-900/10 rounded-xl border border-white/10 text-xs">{d}</h3>
            <div className="space-y-2">
              {items.filter(i => i.day === d).map(item => (
                <motion.div 
                  key={item.id} 
                  whileHover={{ scale: 1.05 }}
                  className="p-3 rounded-xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 relative group overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-1 h-full bg-blue-500/50" />
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X size={10} />
                  </button>
                  <div className="flex items-center gap-2 mb-1">
                    <Star size={10} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                    <p className="text-[10px] font-bold text-blue-400">{item.time}</p>
                  </div>
                  <p className="text-[10px] text-gray-200 leading-tight">{item.task}</p>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Star Map Visualization */}
      <div className="p-8 rounded-3xl glass border-white/5 relative overflow-hidden min-h-[300px]">
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full">
            {items.map((item, idx) => {
              if (idx === 0) return null;
              const prev = items[idx - 1];
              return (
                <line 
                  key={`line-${item.id}`}
                  x1={`${(idx - 1) * (100 / items.length) + 5}%`}
                  y1={`${30 + Math.sin(idx - 1) * 20}%`}
                  x2={`${idx * (100 / items.length) + 5}%`}
                  y2={`${30 + Math.sin(idx) * 20}%`}
                  stroke="rgba(59, 130, 246, 0.3)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })}
          </svg>
        </div>
        <div className="relative z-10 flex flex-wrap gap-8 justify-center items-center">
          {items.map((item, idx) => (
            <motion.div
              key={`star-${item.id}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.2 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <Star size={20} className="text-blue-400 fill-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-white truncate max-w-[80px]">{item.task}</p>
                <p className="text-[8px] text-gray-500">{item.day}</p>
              </div>
            </motion.div>
          ))}
          {items.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <Star size={48} className="mx-auto mb-4 opacity-20" />
              <p>أضف مهاماً لترى خريطتك النجمية تتشكل</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminView({ user }: { user: UserData }) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [exhibitions, setExhibitions] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);

  // Confirmation states
  const [banningUserId, setBanningUserId] = useState<string | null>(null);
  const [deletingExhibitionId, setDeletingExhibitionId] = useState<string | null>(null);
  const [deletingSuggestionId, setDeletingSuggestionId] = useState<string | null>(null);
  const [deletingDiscussionId, setDeletingDiscussionId] = useState<string | null>(null);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'profiles'), (snap) => {
      setUsers(snap.docs.map(doc => doc.data() as UserData));
    }, (e) => handleFirestoreError(e, OperationType.GET, 'profiles'));

    const unsubSuggestions = onSnapshot(collection(db, 'suggestions'), (snap) => {
      setSuggestions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (e) => handleFirestoreError(e, OperationType.GET, 'suggestions'));

    const unsubExhibitions = onSnapshot(collection(db, 'exhibitions'), (snap) => {
      setExhibitions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (e) => handleFirestoreError(e, OperationType.GET, 'exhibitions'));

    const unsubDiscussions = onSnapshot(collection(db, 'discussions'), (snap) => {
      setDiscussions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Discussion)));
    }, (e) => handleFirestoreError(e, OperationType.GET, 'discussions'));

    return () => { unsubUsers(); unsubSuggestions(); unsubExhibitions(); unsubDiscussions(); };
  }, []);

  const handleBanUser = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { banned: !currentStatus });
      await updateDoc(doc(db, 'profiles', uid), { banned: !currentStatus });
      setBanningUserId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleDeleteExhibition = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'exhibitions', id));
      setDeletingExhibitionId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `exhibitions/${id}`);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'suggestions', id));
      setDeletingSuggestionId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `suggestions/${id}`);
    }
  };

  const handleDeleteDiscussion = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'discussions', id));
      setDeletingDiscussionId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `discussions/${id}`);
    }
  };

  // handleDeleteChatMessage was removed from here because it's managed via modifying global chat messages in place directly through the UI, but it doesn't seem to be used in the JSX below.


  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <Shield className="w-6 h-6 text-indigo-500" />
        لوحة تحكم الإدارة
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Users Monitoring */}
        <div className="lg:col-span-2 p-8 rounded-3xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              مراقبة الرواد ({users.length})
            </h3>
            <div className="px-3 py-1 bg-blue-500/10 rounded-full text-[10px] font-bold text-blue-400">نشط الآن</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {users.map(u => (
              <div key={u.uid} className="p-4 rounded-3xl bg-white/5/80 shadow-inner border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    {banningUserId === u.uid ? (
                      <div className="flex flex-col gap-1 items-center bg-white/10 rounded-xl px-2 py-1">
                        <span className="text-[8px] text-gray-300 font-bold">{u.banned ? 'إلغاء الحظر؟' : 'تأكيد الحظر؟'}</span>
                        <div className="flex gap-1">
                          <button onClick={() => handleBanUser(u.uid, !!u.banned)} className="text-[10px] bg-red-500 text-white px-2 rounded">نعم</button>
                          <button onClick={() => setBanningUserId(null)} className="text-[10px] bg-gray-500 text-white px-2 rounded">لا</button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setBanningUserId(u.uid)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all shadow-sm flex items-center justify-center",
                          u.banned ? "bg-green-600 hover:bg-green-700 shadow-green-600/20" : "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                        )}
                        title={u.banned ? 'إلغاء الحظر' : 'حظر'}
                      >
                        <ShieldAlert size={14} />
                      </button>
                    )}
                    <button 
                      onClick={() => setEditingUser(u)}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all shadow-sm bg-sky-600 hover:bg-sky-700 shadow-sky-600/20 text-white flex items-center justify-center"
                      title="تعديل البيانات"
                    >
                      <Settings size={14} />
                    </button>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">{u.displayName}</div>
                    <div className="text-[10px] text-gray-400">💖 {u.hearts || 0} | 🚀 ج{u.level} ({u.xp})</div>
                    <p className="text-[10px] text-indigo-500 font-medium">{u.currentActivity || 'في المدار'}</p>
                  </div>
                </div>
                <img src={u.photoURL} className="w-10 h-10 rounded-2xl border border-white/10 object-cover" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
        </div>

        {/* Content Management */}
        <div className="space-y-6">
          {/* Suggestions */}
          <div className="p-5 rounded-3xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-yellow-400" />
              الاقتراحات
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
              {suggestions.map(s => (
                <div key={s.id} className="p-2 rounded-xl bg-space-dark/80 border border-white/5 flex items-center justify-between">
                  {deletingSuggestionId === s.id ? (
                    <div className="flex items-center gap-1.5 bg-red-500/10 px-1 py-0.5 rounded border border-red-500/30">
                      <span className="text-[9px] text-red-500">حذف؟</span>
                      <button onClick={() => handleDeleteSuggestion(s.id)} className="text-[9px] text-red-500 font-bold">نعم</button>
                      <button onClick={() => setDeletingSuggestionId(null)} className="text-[9px] text-gray-400">لا</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeletingSuggestionId(s.id)} className="text-red-400 hover:text-red-500"><Trash2 size={14} /></button>
                  )}
                  <p className="text-[10px] text-gray-300 text-right flex-1 px-3">{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Discussions */}
          <div className="p-5 rounded-3xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-indigo-500" />
              النقاشات
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
              {discussions.map(d => (
                <div key={d.id} className="p-2 rounded-xl bg-space-dark/80 border border-white/5 flex items-center justify-between">
                  {deletingDiscussionId === d.id ? (
                    <div className="flex items-center gap-1.5 bg-red-500/10 px-1 py-0.5 rounded border border-red-500/30">
                      <span className="text-[9px] text-red-500">حذف؟</span>
                      <button onClick={() => handleDeleteDiscussion(d.id)} className="text-[9px] text-red-500 font-bold">نعم</button>
                      <button onClick={() => setDeletingDiscussionId(null)} className="text-[9px] text-gray-400">لا</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeletingDiscussionId(d.id)} className="text-red-400 hover:text-red-500"><Trash2 size={14} /></button>
                  )}
                  <p className="text-[10px] text-gray-300 text-right flex-1 px-3 font-bold">{d.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Exhibitions */}
          <div className="p-5 rounded-3xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-pink-400" />
              المعرض
            </h3>
            <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
              {exhibitions.map(ex => (
                <div key={ex.id} className="relative group aspect-square rounded-lg overflow-hidden border border-white/5">
                  <img src={ex.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  {deletingExhibitionId === ex.id ? (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-1">
                      <span className="text-[10px] text-red-400 font-bold">تأكيد الحذف؟</span>
                      <div className="flex gap-2">
                        <button onClick={() => handleDeleteExhibition(ex.id)} className="text-[10px] bg-red-500 text-white px-2 rounded">نعم</button>
                        <button onClick={() => setDeletingExhibitionId(null)} className="text-[10px] bg-white/20 text-white px-2 rounded">لا</button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setDeletingExhibitionId(ex.id)}
                      className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0b16] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h3 className="font-bold text-lg text-white">تعديل رواد الفضاء</h3>
                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400 block text-right">مستوى (ج)</label>
                  <input
                    type="number"
                    value={editingUser.level}
                    onChange={(e) => setEditingUser({ ...editingUser, level: parseInt(e.target.value) || 1 })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-right focus:outline-none focus:border-indigo-500"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400 block text-right">نقاط الخبرة (XP)</label>
                  <input
                    type="number"
                    value={editingUser.xp}
                    onChange={(e) => setEditingUser({ ...editingUser, xp: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-right focus:outline-none focus:border-indigo-500"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400 block text-right">طاقة الدرع/القلوب (💖)</label>
                  <input
                    type="number"
                    value={editingUser.hearts}
                    onChange={(e) => setEditingUser({ ...editingUser, hearts: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-right focus:outline-none focus:border-indigo-500"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400 block text-right">النشاط الحالي</label>
                  <input
                    type="text"
                    value={editingUser.currentActivity || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, currentActivity: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-right focus:outline-none focus:border-indigo-500"
                    dir="rtl"
                    placeholder="مثال: في المدار"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-white/10 bg-white/5 flex gap-4">
                <button
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'users', editingUser.uid), {
                                                level: editingUser.level,
                        xp: editingUser.xp,
                        hearts: editingUser.hearts,
                        currentActivity: editingUser.currentActivity || '',
                      });
                      await updateDoc(doc(db, 'profiles', editingUser.uid), {
                        level: editingUser.level,
                        xp: editingUser.xp,
                      });
                      setEditingUser(null);
                    } catch (e) {
                      handleFirestoreError(e, OperationType.UPDATE, `users/${editingUser.uid}`);
                    }
                  }}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-all shadow-lg"
                >
                  حفظ التعديلات
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BadgeCard({ icon, title, xp, active = false }: BadgeCardProps) {
  return (
    <div className={cn(
      "p-4 rounded-3xl border flex flex-col items-center text-center gap-2 transition-all",
      active ? "bg-indigo-500/20 border-indigo-400/50" : "bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border-white/10 opacity-40 grayscale"
    )}>
      <span className="text-3xl mb-1">{icon}</span>
      <h4 className="font-bold text-[10px]">{title}</h4>
      <span className="text-[8px] text-gray-400 uppercase tracking-wider">{xp}</span>
    </div>
  );
}

function CosmicDiary({ user, exhibitions, isOwner }: { user: UserData, exhibitions: any[], isOwner?: boolean }) {
  const milestones = [];
  
  milestones.push({
    title: "يوم الانطلاق",
    description: isOwner ? "بداية الرحلة الكونية في المنصة 🚀" : "بداية رحلته الكونية في المنصة 🚀",
    color: "bg-indigo-500",
    icon: <Rocket size={18} />
  });
  
  if (user.totalFocusSessions && user.totalFocusSessions > 0) {
    milestones.push({
      title: "أول إرساء فضائي",
      description: isOwner ? "إتمام أول جلسة تركيز بنجاح! ⏱️" : "أتم أول جلسة تركيز بنجاح! ⏱️",
      color: "bg-fuchsia-500",
      icon: <Timer size={18} />
    });
  }

  if (user.xp >= 100) {
    milestones.push({
      title: "كسر حاجز الغلاف الجوي",
      description: "تم الوصول إلى 100 نجمة ضوئية (XP) 🌟",
      color: "bg-blue-500",
      icon: <Target size={18} />
    });
  }

  if (exhibitions && exhibitions.length > 0) {
    milestones.push({
      title: "الإشارة الأولى",
      description: isOwner ? `تم مشاركة أول اكتشاف في محطة المعرض 📸` : `شارك أول اكتشاف في محطة المعرض 📸`,
      color: "bg-pink-500",
      icon: <ImageIcon size={18} />
    });
  }

  if (user.level > 1) {
    milestones.push({
      title: `ترقية الرتبة !`,
      description: isOwner ? `تم الوصول إلى المستوى ${user.level} في التسلسل القيادي للأسطول الفضائي! 🎖️` : `وصل إلى المستوى ${user.level} في التسلسل القيادي! 🎖️`,
      color: "bg-orange-500",
      icon: <Award size={18} />
    });
  }

  if (user.badges && user.badges.length > 0) {
     milestones.push({
       title: "وسام كوني جديد!",
       description: isOwner ? "تم استحقاق وسام جدارة لتسجيل نقطة مهمة في الرحلة 🏅" : "استحق وسام جدارة لتسجيل نقطة مهمة 🏅",
       color: "bg-violet-500",
       icon: <Activity size={18} />
     });
  }

  if (user.streak && user.streak >= 3) {
      milestones.push({
          title: "استدامة نجمية",
          description: isOwner ? `حفاظ على سلسلة تركيز لمدة ${user.streak} أيام متواصلة 🔥` : `سلسلة تركيز لمدة ${user.streak} أيام متواصلة 🔥`,
          color: "bg-orange-600",
          icon: <Flame size={18} />
      });
  }

  const sortedMilestones = [...milestones].reverse();

  return (
    <div className="p-6 rounded-3xl bg-[#0a0b16]/80 backdrop-blur-xl border border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-transparent"></div>
      
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
           <BookOpen size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">مذكرات الرحلة الكونية</h3>
          <p className="text-sm text-gray-400">{isOwner ? 'سجل الإنجازات والمحطات المهمة في مسيرتك الفضائية' : 'سجل الإنجازات والمحطات المهمة في مسيرته الفضائية'}</p>
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
                <div className={`absolute -right-[43px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-4 border-[#0a0b16] flex items-center justify-center ${m.color} text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10`}>
                  {m.icon}
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-default relative overflow-hidden group ml-4">
                  <div className="absolute top-0 right-0 w-1 h-full bg-white/10 group-hover:bg-white/20 transition-colors" />
                  <h4 className="text-white font-bold mb-1 text-sm">{m.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{m.description}</p>
                </div>
             </motion.div>
         ))}
      </div>
    </div>
  )
}

function FarmDisplay({ user, isOwner, isStudying = true }: { user: UserData, isOwner: boolean, isStudying?: boolean }) {
  const [show3DFarm, setShow3DFarm] = useState(false);

  return (
    <>
      {show3DFarm && (
        <Farm3D 
          onClose={() => setShow3DFarm(false)} 
          worldId={user.uid} 
          isOwner={isOwner}
          currentUserName={auth.currentUser?.displayName || 'لاعب'}
          userItems={user?.items || []}
          userXp={user?.xp || 0}
          isStudying={isStudying}
        />
      )}
      
      <div className="bg-[#0b0c16] border border-white/5 rounded-3xl p-8 shadow-2xl relative mb-8 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1623512224734-8c88682a85e6?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c16] via-[#0b0c16]/80 to-transparent"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          <h2 className="text-3xl font-bold text-white mb-2 font-['Space_Grotesk']">عوالم الإنجاز (3D)</h2>
          <p className="text-gray-400 mb-8 max-w-lg">
            {isOwner ? 'ادخل إلى عالمك الخاص في تجربة ثلاثية الأبعاد، ازرع، اربِ الحيوانات وابنِ مزرعتك!' : `استكشف عالم ${user.displayName} الخاص`}
          </p>
          
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl w-full max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex gap-4 justify-center items-center">
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 text-xs mb-1">الخبرة (XP)</span>
                  <span className="text-emerald-400 text-xl font-bold">💎 {user.xp || 0}</span>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 text-xs mb-1">المستوى</span>
                  <span className="text-sky-400 text-xl font-bold">⭐ {user.level || 1}</span>
                </div>
              </div>
              
              <button 
                onClick={() => setShow3DFarm(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold p-4 py-5 rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-3 animate-pulse-slow block w-full"
              >
                <span className="text-3xl">🌍</span>
                <span className="text-xl">{isOwner ? 'دخول عالمي الخاص' : 'دخول العالم'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function UserModal({ userId, currentUserId, currentUser, onClose }: { userId: string, currentUserId: string, currentUser?: UserData, onClose: () => void }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [exhibitions, setExhibitions] = useState<any[]>([]);
  const [friends, setFriends] = useState<UserData[]>([]);
  const [myFleet, setMyFleet] = useState<Fleet | null>(null);

  useEffect(() => {
    if (currentUser?.fleetId) {
      const unsub = onSnapshot(doc(db, 'fleets', currentUser.fleetId), snap => {
        if (snap.exists()) setMyFleet({ id: snap.id, ...snap.data() } as Fleet);
      });
      return () => unsub();
    }
  }, [currentUser?.fleetId]);

  const handleInviteToFleet = async () => {
    if (!myFleet || !currentUser?.fleetId) return;
    try {
      await updateDoc(doc(db, 'users', userId), { fleetInvites: arrayUnion(myFleet.id) });
      alert('تم إرسال دعوة الانضمام للأسطول!');
    } catch (e) {}
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'profiles', userId), (snap) => {
      if (snap.exists()) setUserData(snap.data() as UserData);
    });
    const friendUnsub = onSnapshot(doc(db, 'users', currentUserId, 'friends', userId), (snap) => {
      setIsFriend(snap.exists());
    });
    return () => { unsub(); friendUnsub(); };
  }, [userId, currentUserId]);

  useEffect(() => {
    const q = query(collection(db, 'exhibitions'), where('userId', '==', userId), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExhibitions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (e) => handleFirestoreError(e, OperationType.GET, 'exhibitions_user_' + userId));
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const q = query(collection(db, 'users', userId, 'friends'), limit(20));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const friendIds = snapshot.docs.map(doc => doc.id);
      if (friendIds.length > 0) {
        try {
          const friendsQuery = query(collection(db, 'profiles'), where('uid', 'in', friendIds));
          const friendsSnap = await getDocs(friendsQuery);
          setFriends(friendsSnap.docs.map(doc => doc.data() as UserData));
        } catch (e) {
          console.error("Error fetching friends details:", e);
        }
      } else {
        setFriends([]);
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, 'users/' + userId + '/friends'));
    return () => unsubscribe();
  }, [userId]);

  const handleToggleFriend = async () => {
    if (!userData) return;
    const friendRef = doc(db, 'users', currentUserId, 'friends', userId);
    const otherFriendRef = doc(db, 'users', userId, 'friends', currentUserId);
    
    try {
      if (isFriend) {
        await deleteDoc(friendRef);
        await deleteDoc(otherFriendRef);
        await updateDoc(doc(db, 'users', currentUserId), { friendsCount: increment(-1) });
        await updateDoc(doc(db, 'users', userId), { friendsCount: increment(-1) });
      } else {
        await setDoc(friendRef, { timestamp: serverTimestamp() });
        await setDoc(otherFriendRef, { timestamp: serverTimestamp() });
        await updateDoc(doc(db, 'users', currentUserId), { friendsCount: increment(1) });
        await updateDoc(doc(db, 'users', userId), { friendsCount: increment(1) });
        addDoc(collection(db, 'users', userId, 'notifications'), {
           type: 'friend',
           content: 'قام صديق جديد بإضافتك!', // Cannot access user.displayName easily here without context, let's just make it generic or if context has current user
           read: false,
           timestamp: serverTimestamp()
        }).catch(console.error);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'friends');
    }
  };

  if (!userData) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#000108]/90 overflow-y-auto backdrop-blur-xl">
      <div className="w-full min-h-screen p-4 md:p-8 relative">
        <button onClick={onClose} className="fixed top-6 left-6 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors z-[110] shadow-xl backdrop-blur-md">
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
                  <div className={cn("absolute inset-0 rounded-full blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500", getAstronautRank(userData.xp).color.replace('text-', 'bg-'))}></div>
                  
                  <div className="w-32 h-32 rounded-full border-4 border-indigo-400 p-1 relative overflow-hidden z-10 bg-[#0a0b16]">
                    <img src={userData.photoURL} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className={cn("absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold border-2 border-[#0a0b16] z-20 whitespace-nowrap shadow-xl", getAstronautRank(userData.xp).color.replace('text-', 'bg-').replace('300', '500').replace('400', '500'), getAstronautRank(userData.xp).color === 'text-white' ? 'text-black' : 'text-white')}>
                    LVL {userData.level}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 text-center md:text-right space-y-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex gap-4 flex-wrap">
                    {userId !== currentUserId && (
                      <button 
                        onClick={handleToggleFriend}
                        className={cn(
                          "px-6 py-2 rounded-xl font-bold transition-all text-sm flex items-center gap-2",
                          isFriend ? "bg-white/5 border border-white/10 hover:bg-white/10" : "bg-indigo-500 hover:bg-indigo-700"
                        )}
                      >
                        {isFriend ? <Users size={16} /> : <Plus size={16} />}
                        {isFriend ? 'إلغاء الصداقة' : 'إرسال طلب صداقة'}
                      </button>
                    )}
                    {userId !== currentUserId && myFleet && (myFleet.ownerId === currentUser?.uid || myFleet.coAdmins?.includes(currentUser?.uid || '')) && !userData.fleetId && (
                      <button 
                        onClick={handleInviteToFleet}
                        className="px-6 py-2 rounded-xl font-bold transition-all text-sm flex items-center gap-2 bg-fuchsia-500 hover:bg-fuchsia-600 border border-fuchsia-400/30"
                      >
                        <Shield size={16} /> دعوة للأسطول
                      </button>
                    )}
                  </div>
                  <h2 className="text-3xl font-bold">{userData.displayName}</h2>
                </div>
                
                <div className="flex flex-wrap justify-center md:justify-end gap-3 text-xs">
                  <div className="text-center px-6 py-3 bg-[#0a0b16] rounded-2xl border border-white/5 backdrop-blur-md shadow-inner shadow-black/20"><span className="block font-black text-2xl text-indigo-400">{exhibitions.length}</span><span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">منشور</span></div>
                  <div className="text-center px-6 py-3 bg-[#0a0b16] rounded-2xl border border-white/5 backdrop-blur-md shadow-inner shadow-black/20"><span className="block font-black text-2xl text-blue-400">{userData.xp}</span><span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">XP</span></div>
                  <div className="text-center px-6 py-3 bg-[#0a0b16] rounded-2xl border border-white/5 backdrop-blur-md shadow-inner shadow-black/20"><span className="block font-black text-2xl text-fuchsia-400">{friends.length}</span><span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">صديق</span></div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 text-right">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-gray-300">
                      <Rocket size={12} className="text-indigo-400" />
                      {userData.missionRole || 'لم يتم تحديد التخصص'}
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {userData.bio || 'لا يوجد وصف حالياً...'}
                    </p>
                  </div>
                </div>

                {/* Badges Display */}
                <div className="pt-4 border-t border-white/5">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 text-right">الأوسمة المستحقة</h4>
                  <div className="flex flex-wrap justify-end gap-3">
                    {userData.badges && userData.badges.length > 0 ? (
                      userData.badges.map(badgeId => {
                        const badge = BADGES.find(b => b.id === badgeId);
                        return badge ? (
                          <div key={badgeId} className="group relative">
                            <div className="w-10 h-10 rounded-xl bg-[#0a0b16] shadow-lg shadow-indigo-900/10 border border-white/10 flex items-center justify-center text-xl hover:bg-white/5 transition-all cursor-help">
                              {badge.icon}
                            </div>
                            <div className="absolute bottom-full right-0 mb-2 w-32 p-2 bg-[#0a0b16] border border-white/10 rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              <p className="font-bold text-indigo-500">{badge.title}</p>
                              <p className="text-gray-400">{badge.description}</p>
                            </div>
                          </div>
                        ) : null;
                      })
                    ) : (
                      <p className="text-[10px] text-gray-600 italic">لا توجد أوسمة بعد.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="mt-8 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                <span>{getAstronautRank(userData.xp).nextRankTitle}</span>
                <span>التقدم للرتبة التالية</span>
                <span className={getAstronautRank(userData.xp).color}>{getAstronautRank(userData.xp).title}</span>
              </div>
              <div className="h-6 bg-[#0a0b16] shadow-inner shadow-black/80 rounded-full overflow-hidden border border-white/10 relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${getAstronautRank(userData.xp).progressPercentage}%` }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-blue-400"
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  {Math.round(getAstronautRank(userData.xp).progressPercentage)}%
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
                  <p className="text-xs text-gray-400">{friends.length} زملاء في المجرة</p>
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
                      src={friend.photoURL} 
                      className="w-10 h-10 rounded-full border-2 border-[#0a0b16] object-cover hover:scale-110 transition-transform cursor-help" 
                      referrerPolicy="no-referrer" 
                    />
                    {friend.lastActiveTime && (Date.now() - friend.lastActiveTime < 300000) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0b16]" title="متصل الآن" />
                    )}
                    <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 px-2 py-1 bg-[#0a0b16] border border-white/10 rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                      {friend.displayName}
                    </div>
                  </div>
                ))}
                {friends.length > 8 && (
                  <div className="w-10 h-10 rounded-full border-2 border-[#0a0b16] bg-[#0a0b16] text-blue-400 flex items-center justify-center text-xs font-bold relative z-0 shadow-inner">
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
                xp={badge.minXp + ' XP'} 
                active={userData.xp >= badge.minXp} 
              />
            ))}
          </div>

          <FarmDisplay user={userData} isOwner={false} />

          <CosmicDiary user={userData} exhibitions={exhibitions} isOwner={false} />

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
                  className="aspect-square rounded-3xl overflow-hidden border border-white/10 bg-[#0a0b16] shadow-lg shadow-indigo-900/10 group relative"
                >
                  <img src={ex.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-xs font-bold">{ex.timestamp ? new Date(ex.timestamp.toDate()).toLocaleDateString('ar-EG') : ''}</span>
                  </div>
                </div>
              ))}
              {exhibitions.length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
                  <p className="text-gray-500 italic">لا توجد صور في المعرض بعد</p>
                </div>
              )}
            </div>
            </div>

            {/* Right Column - Stats or other bento items */}
            <div className="lg:col-span-1 space-y-6 flex flex-col">
              <div className="p-6 rounded-3xl glass border border-orange-500/20 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-orange-500/5 group-hover:bg-orange-500/10 transition-colors"></div>
                <Flame size={48} className="text-orange-500 mb-4 animate-pulse drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                <h4 className="text-xl font-black text-white mb-1">أيام التركيز</h4>
                <p className="text-4xl font-black text-orange-400 drop-shadow-md">{userData.streak || 0}</p>
                <span className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">تتجدد غداً</span>
              </div>
              <div className="p-6 rounded-3xl glass border border-red-500/20 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors"></div>
                <Heart size={48} className="text-red-500 mb-4 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                <h4 className="text-xl font-black text-white mb-1">القلوب</h4>
                <p className="text-4xl font-black text-red-400 drop-shadow-md">{userData.hearts}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


function NavLink({ icon, label, active = false, onClick, className }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-all text-xs lg:text-sm font-bold truncate flex-shrink min-w-0 max-w-[140px]",
        active 
          ? "bg-indigo-500/20 text-indigo-500 border border-indigo-400/30 shadow-sm shadow-indigo-500/10" 
          : "text-gray-400 hover:text-white hover:bg-white/5 shadow-none",
        className
      )}
      title={label}
    >
      <span className={cn("flex-shrink-0 transition-transform", active && "scale-110")}>{icon}</span>
      <span className="truncate min-w-0 hidden lg:inline">{label}</span>
    </button>
  );
}







const DEFAULT_SIGNALS = [
  {
    id: 'default-1',
    title: 'صناعة الموافقة المشفرة',
    content: 'هل تساءلت يوماً كيف تتفق وسائل الإعلام العالمية على نفس الرواية في نفس الوقت؟ يتم استخدام تقنيات "صناعة الموافقة" حيث يتم تكرار رسالة محددة عبر آلاف المنصات حتى تصبح هي الحقيقة الوحيدة المقبولة. الهدف ليس إقناعك، بل جعلك تشعر بالعزلة إذا فكرت بطريقة مختلفة. لاحظ الكلمات المفتاحية التي تظهر فجأة في كل مكان.',
    category: 'الإعلام الموجه',
    authorId: 'system',
    timestamp: new Date(),
    views: 10452,
    likes: 0
  },
  {
    id: 'default-2',
    title: 'وهم الندرة الاقتصادية',
    content: 'يتم برمجة العالم للاعتقاد بأن الموارد نادرة دائماً لتبرير التضخم المستمر والسيطرة على مقدرات الشعوب. في الحقيقة، النظام الاقتصادي المالي مبني على "الديون" كسلعة بحد ذاتها. عندما تدرك أن المال المعاصر ليس مدعوماً بالذهب بل بـ "الثقة" المبرمجة، ستفهم لماذا يتم هندسة الأزمات الاقتصادية بانتظام لنقل الثروات من الطبقة المتوسطة إلى أعلى 1%.',
    category: 'النظام الاقتصادي',
    authorId: 'system',
    timestamp: new Date(),
    views: 8930,
    likes: 0
  },
  {
    id: 'default-3',
    title: 'خوارزميات التشتيت العظيم',
    content: 'انتباهك هو أثمن مورد في القرن الحادي والعشرين، أغلى من النفط. تم تصميم وسائل التواصل الاجتماعي ليس للتواصل، بل لاستخلاص الدوبامين وإبقائك في حالة "رد فعل" مستمر. العقول المشتتة لا تستطيع التفكير بعمق، ولا تستطيع كشف التلاعب. خطوتك الأولى للوعي هي استعادة السيطرة على انتباهك وتقليل تعرضك للمحتوى القصير السريع.',
    category: 'الحرب النفسية',
    authorId: 'system',
    timestamp: new Date(),
    views: 15200,
    likes: 0
  },
  {
    id: 'default-4',
    title: 'مشروع توحيد الوعي',
    content: 'تتجه النخب العالمية نحو خلق ثقافة موحدة لا تعتمد على الإلهيات بل على "الاستهلاك" و "الامتثال التكنولوجي". يتم محو الهويات المحلية والوطنية والدينية تدريجياً لصالح هوية عالمية يسهل توقعها والسيطرة عليها. التمسك بجذورك وهويتك وقيمك الأصيلة هو أعظم أشكال التمرد في هذا العصر.',
    category: 'الدين العالمي الجديد',
    authorId: 'system',
    timestamp: new Date(),
    views: 22100,
    likes: 0
  },
  {
    id: 'default-5',
    title: 'تكنولوجيا المراقبة الشاملة',
    content: 'الهواتف، الساعات الذكية، والأجهزة المنزلية المتصلة بالإنترنت ليست مجرد أدوات للراحة. إنها أكبر شبكة مراقبة طوعية في تاريخ البشرية. يتم جمع بيانات دقات قلبك، نمط حديثك، ومكان تواجدك، ليس للإعلانات فقط، بل لبناء نماذج تنبؤية لسلوك المجتمع بأكمله وتوجيهه دون أن يشعر.',
    category: 'تصنيف شديد السرية',
    authorId: 'system',
    timestamp: new Date(),
    views: 34500,
    likes: 0
  },
  {
    id: 'default-6',
    title: 'تاريخ الدوافع الاستهلاكية',
    content: 'يتم استخدام الإعلانات ليس لتعريفك بالمنتج، بل لربط قيمك الإنسانية الأساسية (كالحب، والسعادة، والنجاح) بمنتجات مادية. تم هندسة هذه الأفكار لجعلك تعتقد أن النقص الذي تشعر به لا يمكن سده إلا من خلال الاستهلاك المستمر.',
    category: 'الحرب النفسية',
    authorId: 'system',
    timestamp: new Date(),
    views: 14500,
    likes: 0
  },
  {
    id: 'default-7',
    title: 'وهم الاختيار السياسي',
    content: 'في الكثير من الأنظمة العالمية، يتم تقديم شخصيات أو أحزاب تبدو متناقضة تماماً، ولكنها تدار من قبل نفس الجيوب المالية والشركات الكبرى. الهدف هو إشغال الجماهير بصراع وهمي وتفريقهم بينما تستمر نفس السياسات الاقتصادية والجيوسياسية.',
    category: 'النظام الاقتصادي',
    authorId: 'system',
    timestamp: new Date(),
    views: 8400,
    likes: 0
  },
  {
    id: 'default-8',
    title: 'الاستغباء الترفيهي',
    content: 'صناعة الترفيه الحديثة ليست مجرد تسلية بريئة. إنها أداة مصممة بعناية لمكافأة السلوكيات السطحية وتهميش الثقافة العميقة. يتم الترويج للمحتوى التافه بقوة ليصبح هو المعيار السائد، مما يجعل الشباب يفقدون القدرة على التحليل النقدي.',
    category: 'الإعلام الموجه',
    authorId: 'system',
    timestamp: new Date(),
    views: 22300,
    likes: 0
  },
  {
    id: 'default-9',
    title: 'نظام التعليم المبرمج',
    content: 'النظام التعليمي التقليدي صُمم في الثورة الصناعية ليس لتخريج مفكرين، بل لتخريج عمال مطيعين يجلسون في صفوف، يتبعون التعليمات، ويخافون من ارتكاب الأخطاء. المدرسة بشكلها الحالي غالباً ما تقتل الإبداع الطبيعي لدى الإنسان.',
    category: 'الدين العالمي الجديد',
    authorId: 'system',
    timestamp: new Date(),
    views: 31000,
    likes: 0
  },
  {
    id: 'default-10',
    title: 'طبقات الإنترنت المظلم',
    content: 'ما تراه على محركات البحث لا يمثل سوى 4% من الإنترنت الحقيقي (الويب السطحي). باقي الطبقات (الديب ويب والدارك ويب) تحتوي على أسرار الحكومات، الأسواق السوداء، وتبادل المعلومات غير المراقبة، وهو العالم الذي تعمل فيه العديد من الكيانات الخفية.',
    category: 'تصنيف شديد السرية',
    authorId: 'system',
    timestamp: new Date(),
    views: 45000,
    likes: 0
  },
  {
    id: 'default-11',
    title: 'هندسة الخوف المستدام',
    content: 'تحتاج الأنظمة من وقت لآخر إلى "أزمة" (صحية، اقتصادية، أمنية) لكي يتنازل الأفراد طواعية عن حرياتهم مقابل وهم "الأمان". الخوف هو أسهل طريقة لبرمجة الطاعة العمياء في العقول.',
    category: 'الحرب النفسية',
    authorId: 'system',
    timestamp: new Date(),
    views: 18200,
    likes: 0
  },
  {
    id: 'default-12',
    title: 'مراقبة المشاعر عبر الخوارزميات',
    content: 'الذكاء الاصطناعي اليوم يحلل ليس فقط ما تضغط عليه، بل مدة توقفك عند شاشة معينة، وحركة عينيك إن أمكن، بل وسرعة كتابتك لكشف حالتك المزاجية واستهدافك بالإعلان أو الفكرة المناسبة للحظة ضعفك.',
    category: 'الحرب النفسية',
    authorId: 'system',
    timestamp: new Date(),
    views: 16400,
    likes: 0
  },
  {
    id: 'default-13',
    title: 'العملات الرقمية للبنوك المركزية (CBDC)',
    content: 'الهدف من التوجه نحو مجتمع بدون نقد (Cashless) ليس التسهيل عليك، بل امتلاك رقابة مطلقة على كل عملية شراء تقوم بها. مع العملات الرقمية المبرمجة، يمكن إيقاف رصيدك بضغطة زر إذا خالفت "القواعد".',
    category: 'النظام الاقتصادي',
    authorId: 'system',
    timestamp: new Date(),
    views: 29000,
    likes: 0
  },
  {
    id: 'default-14',
    title: 'صناعة التريند والهشيم الرقمي',
    content: 'التريندات لا تولد صدفة. هناك لجان ذباب إلكتروني وأنظمة خوارزمية تعمل على تضخيم حدث تافه للتغطية على أحداث وقرارات سياسية أو اقتصادية حاسمة تقع في نفس الوقت. انتبه لما لا يتم الحديث عنه.',
    category: 'الإعلام الموجه',
    authorId: 'system',
    timestamp: new Date(),
    views: 12500,
    likes: 0
  },
  {
    id: 'default-15',
    title: 'الدواء بدلاً من الشفاء',
    content: 'النموذج الطبي التجاري مبني في بعض جوانبه الكبرى على إدارة الأمراض المزمنة بدلاً من علاجها نهائياً. الفرد السليم لا يدر أرباحاً، والفرد الميت لا يدر أرباحاً. الفرد المريض المعلق بالأدوية هو النموذج المثالي للربح المستدام.',
    category: 'تصنيف شديد السرية',
    authorId: 'system',
    timestamp: new Date(),
    views: 52000,
    likes: 0
  },
  {
    id: 'default-16',
    title: 'تحريف التاريخ البشري',
    content: 'التاريخ يكتبه المنتصرون. يتم إعادة كتابة المناهج التاريخية مراراً وتكراراً لبرمجة نظرتنا للماضي بما يخدم مصالح الحاضر. الكثير من الحضارات العظيمة تم تشويه إنجازاتها لجعلنا نعتقد أننا اليوم في ذروة التطور المطلق.',
    category: 'الإعلام الموجه',
    authorId: 'system',
    timestamp: new Date(),
    views: 9300,
    likes: 0
  },
  {
    id: 'default-17',
    title: 'المدن الذكية كسجون مفتوحة',
    content: 'تُسوق المدن الذكية على أنها بيئة صديقة متطورة، وفي الحقيقة هي بنية تحتية لـ "رصيد السلوك الاجتماعي" (Social Credit System) حيث يتم تقييمك ومعاقبتك تلقائياً بناءً على تتبع الكاميرات لخطواتك وسلوكك اليومي.',
    category: 'الدين العالمي الجديد',
    authorId: 'system',
    timestamp: new Date(),
    views: 14600,
    likes: 0
  },
  {
    id: 'default-18',
    title: 'اغتيال الخيال',
    content: 'العقل الذي لا يستطيع تخيل مستقبل بديل لا يستطيع التمرد على الحاضر. يتم إغراق الجيل الجديد بمحتوى ديستوبي (سوداوي) حصراً لقتل الأمل وجعلهم يقبلون بالواقع السيء كأنه المصير الحتمي للبشرية.',
    category: 'الحرب النفسية',
    authorId: 'system',
    timestamp: new Date(),
    views: 11000,
    likes: 0
  },
  {
    id: 'default-19',
    title: 'شركات إدارة الأصول',
    content: 'شركات مثل بلاك روك وفانغارد تمتلك فعلياً حصصاً حاكمة في كل شركات الأدوية، التقنية، السلاح، والطيران في العالم بل وصنع القرار. هيمنتهم المالية جعلتهم أقوى من الكثير من حكومات العالم المستقلة.',
    category: 'النظام الاقتصادي',
    authorId: 'system',
    timestamp: new Date(),
    views: 37500,
    likes: 0
  },
  {
    id: 'default-20',
    title: 'النسوية الموجهة والتفكك الأسري',
    content: 'تم اختطاف بعض الحركات الاجتماعية العادلة وتحويل مسارها لإحداث صراع مستمر بين الجنسين وعدم استقرار مبني على الكراهية. الهدف النهائي هو تفكيك الأسرة، لأن الأسرة القوية المستقلة هي العقبة الأخيرة أمام سيطرة الدولة الكلية على الفرد منذ ولادته.',
    category: 'الإعلام الموجه',
    authorId: 'system',
    timestamp: new Date(),
    views: 41000,
    likes: 0
  },
  {
    id: 'default-21',
    title: 'أكذوبة القيمة الغذائية',
    content: 'تم تغيير هرم الغذاء العالمي في منتصف القرن الماضي استجابة لضغوطات شركات السكر والحبوب، مما أدى لربط الدهون بالكوليسترول ظلماً، والتسبب في أوبئة السمنة والسكري الحالية لضمان استمرارية دوران عجلة الدواء.',
    category: 'تصنيف شديد السرية',
    authorId: 'system',
    timestamp: new Date(),
    views: 28400,
    likes: 0
  },
  {
    id: 'default-22',
    title: 'استهلاك التراث والروحانيات',
    content: 'تم تسليع الروحانيات (كاليوغا والتأمل) وتحويلها إلى منتجات تباع في عبوات بلاستيكية وشعارات. تم إفراغها من مبدأ التزكية النفسية الحقيقي وتحولها لـ "مكمل ترفيهي" للراحة المؤقتة بدلاً من التحول الجذري المناهض للمادية.',
    category: 'الدين العالمي الجديد',
    authorId: 'system',
    timestamp: new Date(),
    views: 17200,
    likes: 0
  },
  {
    id: 'default-23',
    title: 'قانون رد الفعل المدروس',
    content: "(Problem - Reaction - Solution). تخلق السلطات الخفية مشكلة معينة، وتدع الجماهير تتفاعل بالذعر، ثم تقدم 'الحل' الذي كانت خططت له مسبقاً، والذي يتضمن غالباً فقدان المزيد من الحريات والمكاسب لصالح النخبة.",
    category: 'تصنيف شديد السرية',
    authorId: 'system',
    timestamp: new Date(),
    views: 33100,
    likes: 0
  },
  {
    id: 'default-24',
    title: 'تسليع التمرد',
    content: 'حتى الغضب يتم استيعابه. متى ما ظهرت ثقافة مضادة أو حركة رافضة للنظام، سارعت المؤسسات الرأسمالية إلى طباعة شعاراتهم على القمصان وبيعها لهم! فيعتقد المتمرد أنه انتصر، بينما هو يمول النظام الذي يحاربه.',
    category: 'النظام الاقتصادي',
    authorId: 'system',
    timestamp: new Date(),
    views: 9500,
    likes: 0
  },
  {
    id: 'default-25',
    title: 'برمجة التوقعات',
    content: 'تستخدم أفلام هوليوود تقنية "البرمجة التنبؤية". يتم عرض كوارث، أو فيروسات، أو تغييرات اجتماعية جذرية في الأفلام الخيالية قبل سنوات من حدوثها، وذلك لتهيئة العقل الباطن للجمهور لتقبلها لاحقاً كـ "أمر متوقع".',
    category: 'الإعلام الموجه',
    authorId: 'system',
    timestamp: new Date(),
    views: 21600,
    likes: 0
  },
  {
    id: 'default-26',
    title: 'استعباد وقت الفراغ',
    content: 'الرأسمالية المتأخرة لم تعد تكتفي باستغلالك كموظف لديه ساعات عمل، بل تحولت لاستغلال وقت فراغك ولعبك وحتى نومك لاستخراج البيانات وتغذية الخوارزميات، ليصبح الإنسان مجرد خادم لمحيط من الذكاء الاصطناعي.',
    category: 'الحرب النفسية',
    authorId: 'system',
    timestamp: new Date(),
    views: 19800,
    likes: 0
  },
  {
    id: 'default-27',
    title: 'حجب المعرفة الحقيقية',
    content: 'على الرغم من أننا في "عصر المعلومات"، إلا أن المعرفة العميقة الحقيقية (في الماليات، بناء الثروات، الفهم الجيوسياسي العميق، والوعي بالذات) محاصرة وسط بحر من المعلومات المضللة، لتصبح نادرة كما كانت تماماً في العصور الوسطى.',
    category: 'تصنيف شديد السرية',
    authorId: 'system',
    timestamp: new Date(),
    views: 26500,
    likes: 0
  },
  {
    id: 'default-28',
    title: 'وهم الخصوصية',
    content: 'لا يوجد شيء اسمه "تصفح خفي" أو "رسائل مشفرة" بالكامل بعيداً عن أعين الوكالات الكبرى. الخصوصية الوحيدة المتبقية هي ما لا تقوله، ما لا تكتبه، وما لا تبحث عنه إلكترونياً على الإطلاق.',
    category: 'الدين العالمي الجديد',
    authorId: 'system',
    timestamp: new Date(),
    views: 13900,
    likes: 0
  },
  {
    id: 'default-29',
    title: 'الهندسة العكسية لمنظومة الجمال',
    content: 'تغيير معايير "الجمال" والفنون المعمارية نحو الأسوأ، البارد، والمفكك (الباوهاوس والعمارة الوحشية) ليس خطأ فنياً، بل أداة لفصل الإنسان عن الفطرة الإلهية للجمال والطمأنينة وإبقائه في حالة تشوه بصري ونفسي.',
    category: 'الحرب النفسية',
    authorId: 'system',
    timestamp: new Date(),
    views: 15400,
    likes: 0
  },
  {
    id: 'default-30',
    title: 'تزييف المعارضات',
    content: 'أخطر أنواع السيطرة أن تدير أنت بنفسك حركة المقاومة التي تعارضك. يتم دس شخصيات استخباراتية أو عميلة لتكون هي رأس الحربة للمعارضة لكي تفشلها في النهاية من الداخل بأوامر عليا.',
    category: 'تصنيف شديد السرية',
    authorId: 'system',
    timestamp: new Date(),
    views: 39000,
    likes: 0
  },
  {
    id: 'default-31',
    title: 'الصحة النفسية كـ "سلعة"',
    content: 'تحويل الحزن الطبيعي أو القلق المشروع من ظروف الحياة القاسية لـ "أمراض طبية" تحتاج لمضادات اكتئاب ومخدرات نفسية لتخدير الناس عن أسباب تعاستهم الحقيقية، المتمثلة في النظام الاقتصادي والمجتمعي.',
    category: 'النظام الاقتصادي',
    authorId: 'system',
    timestamp: new Date(),
    views: 27100,
    likes: 0
  },
  {
    id: 'default-32',
    title: 'وهم الإنجاز الافتراضي',
    content: 'الألعاب وأوسمة التواصل الاجتماعي تعطيك جرعات صغيرة من الدوبامين لإيهام دماغك بأنك تحقق انتصارات وإنجازات. هذا الإشباع البلاستيكي يمنع الشاب من الغضب والمحاولة الجادة لصناعة إنجاز حقيقي في واقعه المأساوي.',
    category: 'الحرب النفسية',
    authorId: 'system',
    timestamp: new Date(),
    views: 19500,
    likes: 0
  },
  {
    id: 'default-33',
    title: 'تسليح الطقس التكتيكي',
    content: 'تطوير تقنيات تعديل المناخ مثل تلقيح السحب الاستراتيجي والتلاعب بطبقات الجو العليا لم تعد نظرية مؤامرة، بل يتم استغلالها سياسياً لضرب محاصيل زراعية لدول أو خلق كوارث تبدو كأنها طبيعية بالكامل.',
    category: 'تصنيف شديد السرية',
    authorId: 'system',
    timestamp: new Date(),
    views: 48000,
    likes: 0
  },
  {
    id: 'default-34',
    title: 'التاريخ الدائري والإعادة',
    content: 'الأزمات التي نعيشها اليوم ليست عشوائية، إنها أنماط تاريخية مدروسة تكرر نفسها للإطاحة بإمبراطوريات وصعود أخرى. من دراسة سقوط روما والإمبراطوريات الكبرى، تستمد النخب الحديثة قوانين السيطرة وضمان بقائها في القمة.',
    category: 'الدين العالمي الجديد',
    authorId: 'system',
    timestamp: new Date(),
    views: 11800,
    likes: 0
  },
  {
    id: 'default-35',
    title: 'صحوة الـ Matrix',
    content: 'لحظة الإدراك الحقيقية تبدأ عندما تتوقف عن تصديق كل ما يأتيك من الشاشات. الخروج المادي من المنظومة قد يكون مستحيلاً في هذا العصر، ولكن العزلة الشعورية والانفصال الفكري هي الحرية الوحيدة المتبقية لقلة من البشر.',
    category: 'الإعلام الموجه',
    authorId: 'system',
    timestamp: new Date(),
    views: 25600,
    likes: 0
  }
];

const DEFAULT_COORDS = {
  'default-1': { lat: 31.5, lng: 34.5 },
  'default-2': { lat: 40.7, lng: -74.0 },
  'default-3': { lat: 51.5, lng: -0.1 },
  'default-4': { lat: -33.8, lng: 151.2 },
  'default-5': { lat: 35.6, lng: 139.6 },
  'default-6': { lat: 15.2, lng: -45.6 },
  'default-7': { lat: -25.8, lng: 120.4 },
  'default-8': { lat: 55.4, lng: -110.1 },
  'default-9': { lat: -45.1, lng: 30.5 },
  'default-10': { lat: 65.9, lng: 160.8 },
  'default-11': { lat: 5.6, lng: -85.3 },
  'default-12': { lat: -15.3, lng: 90.7 },
  'default-13': { lat: 45.8, lng: 15.2 },
  'default-14': { lat: -55.2, lng: -135.4 },
  'default-15': { lat: 25.1, lng: 60.9 },
  'default-16': { lat: -35.9, lng: -20.3 },
  'default-17': { lat: 10.4, lng: 110.6 },
  'default-18': { lat: -5.7, lng: -60.8 },
  'default-19': { lat: 35.2, lng: 45.1 },
  'default-20': { lat: -65.1, lng: 170.5 },
  'default-21': { lat: 40.5, lng: -105.7 },
  'default-22': { lat: -10.8, lng: 75.3 },
  'default-23': { lat: 60.1, lng: -30.4 },
  'default-24': { lat: -20.6, lng: -160.8 },
  'default-25': { lat: 15.9, lng: 20.1 },
  'default-26': { lat: -50.4, lng: 140.5 },
  'default-27': { lat: 30.7, lng: -175.2 },
  'default-28': { lat: -40.3, lng: -55.6 },
  'default-29': { lat: 50.8, lng: 105.1 },
  'default-30': { lat: -30.1, lng: 50.8 },
  'default-31': { lat: 20.4, lng: -120.3 },
  'default-32': { lat: -60.9, lng: -5.4 },
  'default-33': { lat: 68.2, lng: 65.7 },
  'default-34': { lat: -5.1, lng: 155.2 },
  'default-35': { lat: 48.5, lng: -70.9 }
};

export function BlackHolesView({ user }: { user: UserData }) {
  const [globalProgress, setGlobalProgress] = useState(0);
  const [topContributors, setTopContributors] = useState<UserData[]>([]);
  const targetGoal = 1000;
  
  // calculate total focus sessions from all users
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let totalSessions = 0;
        let users: UserData[] = [];
        usersSnapshot.forEach(doc => {
          const data = doc.data() as UserData;
          totalSessions += data.totalFocusSessions || 0;
          users.push(data);
        });
        
        users.sort((a, b) => (b.totalFocusSessions || 0) - (a.totalFocusSessions || 0));
        setTopContributors(users.slice(0, 3));
        
        // Let's say 1 session is 25 minutes = ~0.41 hours
        let totalHours = totalSessions * 0.41;
        setGlobalProgress(Math.floor(totalHours));
      } catch (e) {
        console.error("Failed to fetch black hole progress", e);
      }
    };
    fetchProgress();
  }, []);

  const progressPercent = Math.min((globalProgress / targetGoal) * 100, 100);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in relative z-10 px-4 md:px-0 mt-8 mb-32">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-2xl border border-violet-500/30 text-violet-400">
          <Target size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-bold font-display tracking-tight text-white mb-1">الثقوب السوداء (تحديات جماعية)</h2>
          <p className="text-indigo-200">تعاونوا مع جميع الرواد للوصول إلى الهدف وفك تشفير المعارف الكونية.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 relative p-8 bg-black/60 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
          {/* Animated Black Hole Background */}
          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
            <motion.div 
               animate={{ rotate: 360, scale: [1, 1.05, 1] }} 
               transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
               className="absolute w-[400px] h-[400px] rounded-full"
               style={{
                 background: 'radial-gradient(circle, rgba(0,0,0,1) 10%, rgba(139,92,246,0.3) 40%, rgba(0,0,0,0) 70%)',
                 boxShadow: '0 0 100px 20px rgba(139,92,246,0.2)'
               }}
            />
            <motion.div 
               animate={{ rotate: -360 }} 
               transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
               className="absolute w-[300px] h-[300px] rounded-full border border-violet-500/20 border-dashed"
            />
             <motion.div 
               animate={{ rotate: 360 }} 
               transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
               className="absolute w-[200px] h-[200px] rounded-full border border-fuchsia-500/30 border-dotted"
            />
          </div>
          
          <div className="z-10 text-center flex flex-col items-center">
            <div className="w-28 h-28 mb-6 rounded-full bg-black border-4 border-violet-500/50 shadow-[0_0_50px_rgba(139,92,246,0.8)] flex items-center justify-center relative overflow-hidden">
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-0 bg-gradient-to-tr from-violet-500/20 to-fuchsia-500/20"
               />
               <span className="text-3xl font-bold text-white relative z-10">{progressPercent.toFixed(1)}%</span>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-3 line-clamp-2 leading-snug">
               تحدي الثقب الأسود: شفرة النجم المفقود
            </h3>
            <p className="text-indigo-200 mb-8 max-w-md leading-relaxed text-sm">
              يجب على جميع رواد الفضاء في المنصة تجميع 1000 ساعة تركيز هذا الأسبوع معاً لفك تشفير مقالة سرية جديدة في قسم الوعي الكوني.
            </p>
            
            <div className="w-full max-w-md bg-black/50 rounded-full h-5 border border-white/10 overflow-hidden relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.5)]"
              />
            </div>
            <div className="flex justify-between w-full max-w-md mt-3 text-sm font-medium">
               <span className="text-violet-400">{globalProgress} ساعة تركيز مكتملة</span>
               <span className="text-gray-500">الهدف: {targetGoal} س</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-[#0f1123]/80 backdrop-blur-md rounded-3xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500/50 to-transparent"></div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Award size={20} className="text-fuchsia-400" />
              الجائزة المخبأة
            </h3>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-4">
               <div className="p-3 bg-black/50 rounded-xl">
                  <Lock size={20} className="text-gray-400" />
               </div>
               <div>
                 <h4 className="text-white font-bold mb-1 text-sm">ملف مشفر (التصنيف: سري للغاية)</h4>
                 <p className="text-xs text-gray-400 leading-relaxed">
                   يحتوي هذا الملف على حقائق قوية مخفية. لن يتم كشفها إلا بتعاون جميع الرواد!
                 </p>
               </div>
            </div>
          </div>
          
          <div className="p-6 bg-[#0f1123]/80 backdrop-blur-md rounded-3xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500/50 to-transparent"></div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Flame size={20} className="text-orange-400" />
              أفضل المساهمين
            </h3>
            <div className="space-y-3">
               {topContributors.length > 0 ? (
                 topContributors.map((usr, i) => (
                   <div key={usr.uid} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-gray-500 w-4 text-center">{i + 1}</div>
                        <img src={usr.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${usr.uid}`} alt={usr.displayName || 'Unnamed'} className="w-8 h-8 rounded-full bg-black/50" referrerPolicy="no-referrer" />
                        <span className="text-sm text-gray-200 font-medium">{usr.displayName || 'رائد مجهول'}</span>
                      </div>
                      <span className="text-xs text-orange-400 font-bold bg-orange-400/10 px-2 py-1 rounded-lg">
                        {usr.totalFocusSessions ? Math.floor(usr.totalFocusSessions * 0.41) : 0} س
                      </span>
                   </div>
                 ))
               ) : (
                 <div className="text-center py-4 text-gray-400 text-sm">لا يوجد مساهمين بعد. كن أول من يساهم!</div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AwarenessView({ user }: { user: UserData }) {
  const [signals, setSignals] = useState<AwarenessSignal[]>([]);
  const [showHudTitle, setShowHudTitle] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<AwarenessSignal | null>(null);
  const [isAdmin] = useState(user.role === 'admin');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('الإعلام الموجه');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingSignalId, setDeletingSignalId] = useState<string | null>(null);
  
  const globeRef = useRef<any>(null);

  // Generate deterministic but random-looking coordinates based on id
  const getCoordinates = (id: string, index: number) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    // ensure we scatter them nicely
    const lat = (hash % 140) - 70; // avoid poles
    const lng = ((hash * Math.max(1, index)) % 360) - 180;
    return { lat, lng };
  };

  useEffect(() => {
    const q = query(collection(db, 'awareness_signals'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AwarenessSignal));
      setSignals([...fetched, ...DEFAULT_SIGNALS]);
    }, (e) => handleFirestoreError(e, OperationType.GET, 'awareness_signals'));
    return () => unsubscribe();
  }, []);

  // force resize for globe on laptop
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // auto rotate globe
  useEffect(() => {
    if (globeRef.current && !selectedSignal) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 1.0;
    }
  }, [selectedSignal]);

  const handleCreate = async () => {
    if (!newTitle || !newContent || !isAdmin) return;
    setIsCreating(true);
    try {
      await addDoc(collection(db, 'awareness_signals'), {
        title: newTitle,
        content: newContent,
        category: newCategory,
        authorId: user.uid,
        timestamp: serverTimestamp(),
        views: 0,
        likes: 0
      });
      setNewTitle('');
      setNewContent('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'awareness_signals');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'awareness_signals', id));
      if (selectedSignal?.id === id) setSelectedSignal(null);
      setDeletingSignalId(null);
    } catch(e) {
      handleFirestoreError(e, OperationType.DELETE, `awareness_signals/${id}`);
    }
  };

  const handleReadSignal = async (sig: AwarenessSignal) => {
    setSelectedSignal(sig);
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = false;
      let coords = DEFAULT_COORDS[sig.id as keyof typeof DEFAULT_COORDS];
      if (!coords) {
         coords = getCoordinates(sig.id, signals.findIndex(s => s.id === sig.id));
      }
      globeRef.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 2 }, 1000);
    }
    try {
      if (!sig.id.startsWith('default-')) await updateDoc(doc(db, 'awareness_signals', sig.id), { views: increment(1) });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `awareness_signals/${sig.id}`);
    }
  };

  const pointsData = signals.map((sig, i) => {
    let coords = DEFAULT_COORDS[sig.id as keyof typeof DEFAULT_COORDS];
    if (!coords) {
       coords = getCoordinates(sig.id, i);
    }
    
    let color = '#00ffcc'; // target blue-green color    
    return {
      lat: coords.lat,
      lng: coords.lng,
      size: 1,
      color: color,
      signal: sig
    };
  });

  const arcsData = Array.from({length: 15}).map((_, i) => ({
    startLat: (Math.random() - 0.5) * 160,
    startLng: (Math.random() - 0.5) * 360,
    endLat: (Math.random() - 0.5) * 160,
    endLng: (Math.random() - 0.5) * 360,
    color: ['rgba(6, 182, 212, 0.4)', 'rgba(16, 185, 129, 0.4)'][i % 2]
  }));

  return (
    <div className="relative w-full h-[80vh] md:h-[calc(100vh-120px)] rounded-[2rem] overflow-hidden bg-[#000108] border border-cyan-900/30 block shadow-2xl">
      {/* 3D Globe Container */}
      <div className="absolute inset-0 cursor-crosshair">
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude={0.02}
          pointRadius={0.3}
          pointsMerge={false}
          onPointClick={(point: any) => handleReadSignal(point.signal)}
          
          arcsData={arcsData}
          arcColor="color"
          arcDashLength={0.4}
          arcDashGap={0.2}
          arcDashAnimateTime={2500}
          
          ringColor={(d: any) => d.color}
          ringMaxRadius={2.5}
          ringPropagationSpeed={3}
          ringRepeatPeriod={800}
          ringsData={pointsData}
          ringLat="lat"
          ringLng="lng"
          
          atmosphereColor="#06b6d4"
          atmosphereAltitude={0.2}
        />
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
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              transition={{ duration: 0.3 }}
              onClick={() => setShowHudTitle(false)}
              className="bg-[#0a0b16]/80 backdrop-blur-md border border-cyan-500/30 p-4 md:p-6 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] pointer-events-auto cursor-pointer hover:border-cyan-400/50 transition-all group"
              title="اضغط للإӡف�ء"
            >
              <h2 className="text-xl md:text-2xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-l from-cyan-400 to-emerald-400 flex items-center gap-3">
                <TerminalIcon size={24} className="text-cyan-400 group-hover:scale-110 transition-transform" /> شبكة الوعي العالمي
              </h2>
              <p className="text-cyan-500/80 font-mono text-xs hidden md:block">
                STATUS: ONLINE | TRACKING {signals.length} ACTIVE SIGNALS...<br/>
                &gt; اضغط على النقاط المضيئة لاكتشاف الحقائق المخفية.
              </p>
              <p className="text-cyan-500/50 font-mono text-[9px] mt-2 block opacity-0 group-hover:opacity-100 transition-opacity">انقر للإخفاء ✕</p>
            </motion.div>
          )}
          </AnimatePresence>
          
          {isAdmin && !selectedSignal && (
            <div className="pointer-events-auto">
              <button 
                onClick={() => document.getElementById('admin-signal-form')?.classList.toggle('hidden')}
                className="px-4 py-2 bg-cyan-900/40 text-cyan-400 border border-cyan-500/50 rounded-xl hover:bg-cyan-800/60 transition font-mono text-xs md:text-sm"
              >
                &gt; ADMIN_OVERRIDE
              </button>
            </div>
          )}
        </div>

        {/* Admin Form */}
        {isAdmin && (
          <div id="admin-signal-form" className="hidden mt-4 bg-[#05050a]/90 backdrop-blur-xl border border-cyan-500/50 p-6 rounded-2xl w-full max-w-md pointer-events-auto shadow-2xl ml-auto self-end">
            <h3 className="text-cyan-400 font-bold mb-4 flex items-center gap-2"><ShieldAlert size={18} /> بث إشارة جديدة</h3>
            <input 
              type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="عنوان الإشارة..."
              className="w-full bg-[#000108] border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 focus:outline-none focus:border-cyan-400 text-sm mb-3"
              dir="rtl"
            />
            <select
              value={newCategory} onChange={e => setNewCategory(e.target.value)}
              className="w-full bg-[#000108] border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 focus:outline-none focus:border-cyan-400 text-sm mb-3"
              dir="rtl"
            >
              <option>الإعلام الموجه</option>
              <option>النظام الاقتصادي</option>
              <option>الدين العالمي الجديد</option>
              <option>الحرب النفسية</option>
              <option>تصنيف شديد السرية</option>
            </select>
            <textarea 
              value={newContent} onChange={e => setNewContent(e.target.value)}
              placeholder="محتوى الإشارة..."
              className="w-full bg-[#000108] border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 focus:outline-none focus:border-cyan-400 text-sm min-h-[100px] mb-3"
              dir="rtl"
            />
            <button 
              onClick={handleCreate} disabled={!newTitle || !newContent || isCreating}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all"
            >
              {isCreating ? 'جاري البث...' : 'إطلاق الإشارة'}
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
              className="absolute right-0 top-0 md:top-24 bottom-0 md:bottom-6 w-full md:w-[450px] max-w-full pointer-events-auto bg-[#0a0b16]/90 backdrop-blur-xl border-l md:border border-cyan-500/40 rounded-none md:rounded-l-3xl p-6 md:p-8 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Radio size={200} className="text-cyan-500" />
              </div>

              <div className="flex justify-between items-center mb-6 relative z-10">
                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-full border border-cyan-500/30 uppercase tracking-widest font-mono shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                  {selectedSignal.category}
                </span>
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    deletingSignalId === selectedSignal.id ? (
                      <div className="flex items-center gap-1.5 bg-red-500/10 px-1 py-0.5 rounded border border-red-500/30">
                        <span className="text-[9px] text-red-500">حذف؟</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(selectedSignal.id); }} className="text-[9px] text-red-500 font-bold">نعم</button>
                        <button onClick={(e) => { e.stopPropagation(); setDeletingSignalId(null); }} className="text-[9px] text-gray-400">لا</button>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setDeletingSignalId(selectedSignal.id); }} className="text-gray-500 hover:text-red-500 transition-colors">
                        <X size={18}/>
                      </button>
                    )
                  )}
                  <button onClick={() => {
                    setSelectedSignal(null);
                    if (globeRef.current) {
                      globeRef.current.controls().autoRotate = true;
                    }
                  }} className="text-cyan-500 hover:text-cyan-300 font-mono text-sm">
                    [ CLOSE ]
                  </button>
                </div>
              </div>

              <h2 className="text-2xl font-black text-white mb-6 leading-tight relative z-10 text-right">{selectedSignal.title}</h2>
              
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

function AnalyticsView({ user, friends }: { user: UserData, friends: UserData[] }) {
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
        name: d.toLocaleDateString('ar-SA', { weekday: 'short' }),
        "ساعات التركيز": parseFloat(hours.toFixed(1))
      });
    }
    return data;
  }, [user.xp]);

  const friendsComparison = React.useMemo(() => {
    const list = [...friends, user]
      .sort((a, b) => (b.level * 100 + b.xp) - (a.level * 100 + a.xp))
      .slice(0, 5)
      .map(u => ({
        name: u.uid === user.uid ? 'أنت' : u.displayName.split(' ')[0],
        xp: u.xp + (u.level * 100)
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
        <div className="bg-[#0a0b16] rounded-3xl p-6 border border-white/10 shadow-xl shadow-indigo-900/10 text-right">
          <h3 className="text-xl font-bold mb-6 text-white flex items-center justify-end gap-2">
             ساعات التركيز <BarChart3 className="text-indigo-400" />
          </h3>
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={studyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0b16', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                  itemStyle={{ color: '#818cf8', display: 'flex', flexDirection: 'row-reverse', gap: '4px' }}
                />
                <Line type="monotone" dataKey="ساعات التركيز" stroke="#818cf8" strokeWidth={3} dot={{ fill: '#818cf8', strokeWidth: 2 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0a0b16] rounded-3xl p-6 border border-white/10 shadow-xl shadow-fuchsia-900/10 text-right">
          <h3 className="text-xl font-bold mb-6 text-white flex items-center justify-end gap-2">
            تصنيفك بين الأصدقاء <Users className="text-fuchsia-400" />
          </h3>
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={friendsComparison} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} hide />
                <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip 
                  cursor={{fill: '#ffffff05'}}
                  contentStyle={{ backgroundColor: '#0a0b16', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                  itemStyle={{ color: '#e879f9', display: 'flex', flexDirection: 'row-reverse', gap: '4px' }}
                />
                <Bar dataKey="xp" fill="#e879f9" radius={[0, 4, 4, 0]} barSize={24} name="نقاط الخبرة (XP)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function FleetsView({ user }: { user: UserData }) {
  const [isConfirmingDisband, setIsConfirmingDisband] = useState(false);
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);

  useEffect(() => {
    if (user.email === 'lumafashionhq@gmail.com') {

      const q = query(collection(db, 'fleets'), where('name', '==', 'رواد التميز'));
      getDocs(q).then(snap => snap.forEach(d => deleteDoc(d.ref).catch(()=>{}))).catch(()=>{});
    }
  }, [user.email]);

  const [activeFleet, setActiveFleet] = useState<Fleet | null>(null);
  const [allFleets, setAllFleets] = useState<Fleet[]>([]);
  const [fleetMembers, setFleetMembers] = useState<UserData[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newFleetName, setNewFleetName] = useState('');
  const [newFleetDesc, setNewFleetDesc] = useState('');
  const [fleetChat, setFleetChat] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [invitedFleets, setInvitedFleets] = useState<Fleet[]>([]);
  const [kickingMemberId, setKickingMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (user.fleetInvites && user.fleetInvites.length > 0 && !user.fleetId) {
      const q = query(collection(db, 'fleets'), where('__name__', 'in', user.fleetInvites.slice(0, 10)));
      const unsub = onSnapshot(q, snap => {
        setInvitedFleets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Fleet)));
      });
      return () => unsub();
    } else {
      setInvitedFleets([]);
    }
  }, [user.fleetInvites, user.fleetId]);

  const handleAcceptInvite = async (fleetId: string) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'fleets', fleetId), { members: arrayUnion(user.uid) });
      batch.update(doc(db, 'users', user.uid), { fleetId, fleetInvites: arrayRemove(fleetId) });
      await batch.commit();
    } catch(e) {}
  };

  const handleRejectInvite = async (fleetId: string) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { fleetInvites: arrayRemove(fleetId) });
    } catch(e) {}
  };
  
  useEffect(() => {
    if (user.fleetId) {
      const unsub = onSnapshot(doc(db, 'fleets', user.fleetId), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Fleet;
          if (!data.members.includes(user.uid)) {
            setActiveFleet(null);
            updateDoc(doc(db, 'users', user.uid), { fleetId: deleteField() }).catch(()=>{});
          } else {
            setActiveFleet({ id: snap.id, ...data });
          }
        } else {
          setActiveFleet(null);
          updateDoc(doc(db, 'users', user.uid), { fleetId: deleteField() }).catch(()=>{});
        }
      });
      return () => unsub();
    } else {
      setActiveFleet(null);
    }
  }, [user.fleetId]);

  useEffect(() => {
    if (!user.fleetId) {
      const q = query(collection(db, 'fleets'), orderBy('xp', 'desc'), limit(20));
      const unsub = onSnapshot(q, (snap) => {
        setAllFleets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Fleet)));
      });
      return () => unsub();
    }
  }, [user.fleetId]);

  useEffect(() => {
    if (activeFleet?.members?.length) {
      const loadMembers = async () => {
        try {
          const chunks = [];
          for (let i = 0; i < activeFleet.members.length; i += 10) chunks.push(activeFleet.members.slice(i, i + 10));
          let allMems: UserData[] = [];
          for (const chunk of chunks) {
            const q = query(collection(db, 'users'), where('uid', 'in', chunk));
            const snap = await getDocs(q);
            allMems = [...allMems, ...snap.docs.map(d => d.data() as UserData)];
          }
          setFleetMembers(allMems);
        } catch (e) {}
      };
      loadMembers();
    }
  }, [activeFleet?.members]);

  useEffect(() => {
    if (activeFleet) {
      const q = query(collection(db, 'fleets', activeFleet.id, 'messages'), orderBy('timestamp', 'desc'), limit(50));
      const unsub = onSnapshot(q, (snap) => {
        setFleetChat(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)).reverse());
      });
      return () => unsub();
    }
  }, [activeFleet?.id]);

  const handleCreateFleet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFleetName.trim() || !newFleetDesc.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'fleets'), {
        name: newFleetName,
        description: newFleetDesc,
        ownerId: user.uid,
        members: [user.uid],
        totalFocusHours: 0,
        xp: 0,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'users', user.uid), { fleetId: docRef.id });
      setIsCreating(false);
    } catch (e) {}
  };

  const handleDisbandFleet = async () => {
    if (!activeFleet) return;
    try {
      await deleteDoc(doc(db, 'fleets', activeFleet.id));
      await updateDoc(doc(db, 'users', user.uid), { fleetId: deleteField() });
      setActiveFleet(null);
      setIsConfirmingDisband(false);
    } catch(e) {
      alert('حدث خطأ أثناء تفكيك الأسطول.');
    }
  };

  const handlePromoteMember = async (memberId: string) => {
    if (!activeFleet) return;
    try {
      await updateDoc(doc(db, 'fleets', activeFleet.id), { coAdmins: arrayUnion(memberId) });
    } catch(e) {}
  };

  const handleDemoteMember = async (memberId: string) => {
    if (!activeFleet) return;
    try {
      await updateDoc(doc(db, 'fleets', activeFleet.id), { coAdmins: arrayRemove(memberId) });
    } catch(e) {}
  };

  const handleKickMember = async (memberId: string) => {
    if (!activeFleet || activeFleet.ownerId !== user.uid) return;
    try {
      const updates: any = { members: arrayRemove(memberId) };
      if (activeFleet.coAdmins?.includes(memberId)) {
        updates.coAdmins = arrayRemove(memberId);
      }
      await updateDoc(doc(db, 'fleets', activeFleet.id), updates);
      setKickingMemberId(null);
    } catch (e) {}
  };

  const handleJoinFleet = async (fleetId: string) => {
    try {
      await updateDoc(doc(db, 'fleets', fleetId), { members: arrayUnion(user.uid) });
      await updateDoc(doc(db, 'users', user.uid), { fleetId });
    } catch (e) {}
  };

  const handleLeaveFleet = async () => {
    if (!activeFleet) return;
    try {
      const updates: any = { members: arrayRemove(user.uid) };
      if (activeFleet.coAdmins?.includes(user.uid)) {
        updates.coAdmins = arrayRemove(user.uid);
      }
      await updateDoc(doc(db, 'fleets', activeFleet.id), updates);
      await updateDoc(doc(db, 'users', user.uid), { fleetId: deleteField() });
      setActiveFleet(null);
      setIsConfirmingLeave(false);
    } catch(e) {
      alert('حدث خطأ أثناء المغادرة.');
    }
  };

  const handleSendFleetMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !activeFleet) return;
    try {
      await addDoc(collection(db, 'fleets', activeFleet.id, 'messages'), {
        text: newMsg,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        timestamp: serverTimestamp(),
        type: 'text'
      });
      setNewMsg('');
    } catch(e) {}
  };

  if (!user.fleetId || !activeFleet) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 fade-in pb-20 mt-8 px-4" dir="rtl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-fuchsia-400 flex items-center gap-2">
              <Users className="text-fuchsia-400" /> الأساطيل الفضائية (التحالفات)
            </h2>
            <p className="text-gray-400 mt-2">انضم إلى أسطول فضائي أو قم بتأسيس أسطولك الخاص للمنافسة مع البقية!</p>
          </div>
          <button onClick={() => setIsCreating(true)} className="bg-gradient-to-l from-indigo-600 to-indigo-500 text-white font-bold px-6 py-3 rounded-full hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center gap-2">
            <Plus size={20} /> أسطول جديد
          </button>
        </div>

        {isCreating && (
          <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="bg-[#0a0b16] p-6 rounded-3xl border border-indigo-500/30 shadow-2xl mb-8">
            <h3 className="text-2xl font-bold text-white mb-4">تأسيس أسطول جديد 🚀</h3>
            <form onSubmit={handleCreateFleet} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2 font-bold text-sm">اسم الأسطول</label>
                <input required value={newFleetName} onChange={e=>setNewFleetName(e.target.value)} maxLength={25} className="w-full bg-[#090915] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="مثال: رواد التميز..." />
              </div>
              <div>
                <label className="block text-gray-400 mb-2 font-bold text-sm">وصف الأسطول (الأهداف والرؤية)</label>
                <textarea required value={newFleetDesc} onChange={e=>setNewFleetDesc(e.target.value)} maxLength={150} className="w-full bg-[#090915] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 h-24 transition-colors resize-none" placeholder="نطمح لأن نكون الأسطول الأول في المجرة..." />
              </div>
              <div className="flex gap-4 pt-2">
                <button type="submit" className="flex-1 bg-indigo-500 text-white font-bold py-3 rounded-xl hover:bg-indigo-400 transition-colors">تأسيس الان</button>
                <button type="button" onClick={() => setIsCreating(false)} className="px-6 bg-white/5 text-gray-400 font-bold rounded-xl hover:bg-white/10 transition-colors">إلغاء</button>
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
              {invitedFleets.map(fleet => (
                <div key={fleet.id} className="bg-fuchsia-900/10 backdrop-blur-md rounded-3xl p-6 border border-fuchsia-500/20 shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 flex items-center justify-center text-white font-black text-2xl">
                      {fleet.name.charAt(0)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-indigo-300">
                      <Users size={14} /> {fleet.members?.length || 0}/10
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{fleet.name}</h3>
                  <p className="text-gray-400 text-sm h-10 line-clamp-2 mb-4">{fleet.description}</p>
                  
                  <div className="flex gap-2">
                    <button onClick={() => handleAcceptInvite(fleet.id)} disabled={fleet.members?.length >= 10} className="flex-1 py-2 rounded-xl font-bold text-sm bg-fuchsia-500 hover:bg-fuchsia-600 text-white transition-colors disabled:opacity-50">
                      قبول
                    </button>
                    <button onClick={() => handleRejectInvite(fleet.id)} className="px-4 py-2 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">
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
            <motion.div key={fleet.id} initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: i*0.05}} className="bg-[#0a0b16]/90 backdrop-blur-md rounded-3xl p-6 border border-white/10 hover:border-indigo-500/50 transition-colors relative overflow-hidden group shadow-lg">
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-indigo-500 via-fuchsia-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                  {fleet.name.charAt(0)}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-indigo-300">
                  <Users size={14} /> {fleet.members?.length || 0}/10
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 relative z-10">{fleet.name}</h3>
              <p className="text-gray-400 text-sm h-10 line-clamp-2 mb-4 relative z-10">{fleet.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <div className="flex flex-col items-center bg-white/5 rounded-xl py-2 px-1">
                  <span className="text-yellow-400 font-black text-lg flex items-center gap-1"><Star size={14}/> {fleet.xp}</span>
                  <span className="text-[10px] text-gray-500">نقاط الخبرة</span>
                </div>
                <div className="flex flex-col items-center bg-white/5 rounded-xl py-2 px-1">
                  <span className="text-sky-400 font-black text-lg flex items-center gap-1"><Timer size={14}/> {Math.floor((fleet.totalFocusHours || 0) * 10) / 10}</span>
                  <span className="text-[10px] text-gray-500">ساعات التركيز</span>
                </div>
              </div>
              
              <button onClick={() => handleJoinFleet(fleet.id)} disabled={fleet.members?.length >= 10} className="w-full relative z-10 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-colors border border-dashed border-indigo-500/30">
                {fleet.members?.length >= 10 ? 'الأسطول ممتلئ' : 'انضم للأسطول'}
              </button>
            </motion.div>
          ))}
          {allFleets.length === 0 && !isCreating && (
            <div className="col-span-full py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed flex flex-col items-center justify-center text-gray-500">
              <Rocket className="w-16 h-16 text-gray-600 mb-4 opacity-50" />
              <p className="text-lg">لا توجد أساطيل بعد. كن أول من يؤسس أسطولاً في المجرة!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 fade-in pb-20 mt-8 px-4" dir="rtl">
      <div className="bg-[#0a0b16] rounded-3xl p-8 border border-white/10 shadow-xl shadow-indigo-900/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-l from-indigo-500 via-fuchsia-500 to-cyan-500"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-fuchsia-600 rounded-2xl flex items-center justify-center text-4xl font-black text-white shadow-[0_0_30px_rgba(99,102,241,0.5)]">
              {activeFleet.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white">{activeFleet.name}</h1>
                <span className="text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-full border border-indigo-500/30 whitespace-nowrap">أسطولك التعاوني</span>
              </div>
              <p className="text-gray-400 mt-2 max-w-lg">{activeFleet.description}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
             <div className="flex items-center gap-6 bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="text-center">
                  <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-t from-yellow-500 to-yellow-200">{activeFleet.xp}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">مجموع XP</div>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="text-center">
                  <div className="text-2xl font-black text-sky-400">{Math.floor((activeFleet.totalFocusHours || 0) * 10) / 10}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">ساعات التركيز</div>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="text-center">
                  <div className="text-2xl font-black text-indigo-400">{activeFleet.members?.length || 0}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">أعضاء</div>
                </div>
             </div>
             {activeFleet.ownerId === user.uid ? (
               <div className="flex flex-col gap-2">
                 {!isConfirmingDisband ? (
                   <button onClick={() => setIsConfirmingDisband(true)} className="text-xs bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 hover:border-red-500 transition-all font-bold flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm">
                     <Trash2 size={14} /> تفكيك الأسطول
                   </button>
                 ) : (
                   <div className="flex flex-col gap-2 bg-red-500/10 p-2 rounded-xl border border-red-500/30">
                     <div className="text-xs text-red-400 font-bold text-center">هل أنت متأكد نهائياً؟</div>
                     <div className="flex gap-2">
                       <button onClick={handleDisbandFleet} className="flex-1 text-xs bg-red-500 text-white hover:bg-red-600 transition-all font-bold py-1.5 rounded-lg">
                         نعم، فكك
                       </button>
                       <button onClick={() => setIsConfirmingDisband(false)} className="flex-1 text-xs bg-white/10 text-gray-300 hover:bg-white/20 transition-all font-bold py-1.5 rounded-lg">
                         تراجع
                       </button>
                     </div>
                   </div>
                 )}
               </div>
             ) : (
               <div className="flex flex-col gap-2">
                 {!isConfirmingLeave ? (
                   <button onClick={() => setIsConfirmingLeave(true)} className="text-xs bg-white/5 hover:bg-red-500/10 text-red-500 transition-all font-bold flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm border border-transparent hover:border-red-500/30">
                     <LogOut size={14} /> مغادرة الأسطول
                   </button>
                 ) : (
                   <div className="flex flex-col gap-2 bg-red-500/10 p-2 rounded-xl border border-red-500/30">
                     <div className="text-xs text-red-400 font-bold text-center">متأكد من المغادرة؟</div>
                     <div className="flex gap-2">
                       <button onClick={handleLeaveFleet} className="flex-1 text-xs bg-red-500 text-white hover:bg-red-600 transition-all font-bold py-1.5 rounded-lg">
                         نعم، غادر
                       </button>
                       <button onClick={() => setIsConfirmingLeave(false)} className="flex-1 text-xs bg-white/10 text-gray-300 hover:bg-white/20 transition-all font-bold py-1.5 rounded-lg">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px] items-start">
        <div className="lg:col-span-2 bg-[#0a0b16]/90 backdrop-blur-xl rounded-3xl border border-white/10 flex flex-col h-full overflow-hidden shadow-xl">
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
             <h3 className="text-lg font-bold text-white flex items-center gap-2">
               <MessageCircle size={20} className="text-fuchsia-400" /> غرفة تواصل الأسطول
             </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
             {fleetChat.map((msg) => (
                <div key={msg.id} className={`flex ${msg.userId === user.uid ? 'justify-start md:flex-row' : 'justify-end md:flex-row'} gap-3`}>
                  <img src={msg.userPhoto} alt="" className="w-10 h-10 rounded-full border-2 border-white/10 shadow-sm" referrerPolicy="no-referrer" />
                  <div className={`flex flex-col gap-1 max-w-[75%] ${msg.userId === user.uid ? 'items-start' : 'items-end'}`}>
                    <span className={`text-xs opacity-70 font-bold ${msg.userId === user.uid ? 'text-indigo-300' : 'text-gray-400'}`}>
                      {msg.userName}
                    </span>
                    <div className={`rounded-2xl p-4 text-sm shadow-sm leading-relaxed ${msg.userId === user.uid ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm' : 'bg-[#15162c] border border-white/5 text-gray-200 rounded-tl-sm'}`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
             ))}
             {fleetChat.length === 0 && (
               <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 opacity-50">
                 <MessageSquare size={48} />
                 <p className="text-sm">غرفة التواصل تبدو هادئة.. ابدأ المحادثة الآن!</p>
               </div>
             )}
          </div>
          
          <div className="p-4 border-t border-white/10 bg-[#070811]">
            <form onSubmit={handleSendFleetMsg} className="flex gap-3">
              <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} placeholder="أرسل رسالة لطاقم الأسطول..." className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all text-sm" />
              <button type="submit" disabled={!newMsg.trim()} className="bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 disabled:from-white/10 disabled:to-white/10 disabled:text-gray-500 text-white px-5 rounded-2xl transition-all shrink-0 flex items-center justify-center shadow-lg"><Send size={20} className="-translate-x-0.5" /></button>
            </form>
          </div>
        </div>

        <div className="bg-[#0a0b16]/90 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-xl flex flex-col h-full">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield size={20} className="text-indigo-400"/> طاقم الأسطول 
            </h3>
            <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full text-gray-300 font-mono tracking-widest">{activeFleet.members?.length}/10</span>
          </div>
          
          <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar pr-2">
            {fleetMembers.map(m => (
              <div key={m.uid} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group">
                <img src={m.photoURL} alt="" className="w-11 h-11 rounded-full border-2 border-white/10 group-hover:border-indigo-400 transition-colors shadow-sm" referrerPolicy="no-referrer" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm truncate">{m.displayName}</span>
                    {activeFleet.ownerId === m.uid ? (
                       <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/30">مسؤول</span>
                     ) : activeFleet.coAdmins?.includes(m.uid) ? (
                       <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">نائب مسؤول</span>
                     ) : null}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="text-[11px] text-indigo-300 font-medium">مستوى {m.level}</div>
                    <div className="text-[11px] text-yellow-500/80 font-medium flex items-center gap-1"><Star size={10}/> {m.xp}</div>
                  </div>
                </div>
                {activeFleet.ownerId === user.uid && m.uid !== user.uid && (
                  <div className="flex flex-col gap-2 shrink-0">
                    {activeFleet.coAdmins?.includes(m.uid) ? (
                      <button onClick={() => handleDemoteMember(m.uid)} className="text-[10px] px-2 py-1 bg-fuchsia-500/10 text-fuchsia-400 hover:bg-fuchsia-500/20 rounded-md transition-colors whitespace-nowrap">سحب نائب مسؤول</button>
                    ) : (
                      <button onClick={() => handlePromoteMember(m.uid)} className="text-[10px] px-2 py-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-md transition-colors whitespace-nowrap">ترقية لنائب مسؤول</button>
                    )}
                    {kickingMemberId === m.uid ? (
                      <div className="flex items-center gap-1.5 bg-red-500/10 px-1 py-1 rounded-md border border-red-500/30">
                        <span className="text-[9px] text-red-500">طرد؟</span>
                        <button onClick={() => handleKickMember(m.uid)} className="text-[9px] text-white bg-red-500 px-1.5 py-0.5 rounded">نعم</button>
                        <button onClick={() => setKickingMemberId(null)} className="text-[9px] text-gray-400 px-1.5 py-0.5">لا</button>
                      </div>
                    ) : (
                      <button onClick={() => setKickingMemberId(m.uid)} className="text-[10px] px-2 py-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-md transition-colors whitespace-nowrap">طرد</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
