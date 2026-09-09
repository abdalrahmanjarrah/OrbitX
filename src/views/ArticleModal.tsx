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

export default function ArticleModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/20 backdrop-blur-sm">
      <div className="min-h-full flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-space-dark rounded-3xl p-6 md:p-8 w-full max-w-2xl border border-indigo-500/20 shadow-2xl shadow-indigo-900/40 relative my-8"
        >
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-full z-10"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4 mb-6 pt-4">
            <div className="p-4 rounded-2xl bg-indigo-500/20 text-indigo-400 shadow-inner">
              <BookOpen size={32} />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2">
                كيف تتغلب على التشتت في العالم الرقمي؟
              </h2>
              <div className="text-sm text-indigo-300 font-bold flex items-center gap-2">
                <Telescope size={16} />{" "}
                <span>استراتيجيات رواد الفضاء لإدارة الوقت</span>
              </div>
            </div>
          </div>

          <div className="prose prose-invert prose-indigo max-w-none text-gray-300 space-y-6 text-sm md:text-base leading-relaxed">
            <p>
              في عصرنا الحالي المليء بالإشعارات والتنبيهات المستمرة، أصبح الحفاظ
              على التركيز تحدياً يشبه محاولة توجيه مركبة فضائية عبر حقل من
              الكويكبات. كيف يمكننا الحفاظ على هدوئنا وإنتاجيتنا وسط هذا الضجيج
              الرقمي؟ دعونا نتعلم من أولئك الذين يعتمد بقاؤهم على التركيز
              المطلق: <strong>رواد الفضاء</strong>.
            </p>

            <div className="p-5 rounded-2xl bg-indigo-900/20 border border-indigo-500/10">
              <h4 className="text-indigo-400 font-bold text-lg mb-3 flex items-center gap-2">
                <Target size={20} /> 1. قاعدة "الصندوق المغلق" (The Airlock
                Strategy)
              </h4>
              <p>
                قبل الخروج إلى الفضاء المفتوح، يقضي رواد الفضاء وقتاً في غرفة
                معادلة الضغط (Airlock). طبّق هذا في عملك: قبل بدء مهمة عميقة،
                اصنع "غرفة ضغط" رقمية. أغلق جميع الإشعارات، ضع هاتفك في وضع
                الطيران، أو استخدم تطبيقات حظر المشتتات لمدة محددة. لا تدخل إلى
                فضاء العمل العميق وأنت ما زلت متصلاً بضجيج الأرض.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-indigo-900/20 border border-indigo-500/10">
              <h4 className="text-indigo-400 font-bold text-lg mb-3 flex items-center gap-2">
                <Timer size={20} /> 2. المهام المجدولة بالدقائق
                (Micro-Scheduling)
              </h4>
              <p>
                على متن محطة الفضاء الدولية (ISS)، يتم جدولة وقت رواد الفضاء
                بزيادات مدتها 5 دقائق. هذا لا يعني أن تكون مهووساً، بل يعني أن
                تخصص وقتاً محدداً لكل مهمة (Timeboxing). عندما تعرف أن لديك 45
                دقيقة فقط لهذه المهمة قبل الانتقال للتالية، سيقل احتمال انجرافك
                نحو تصفح وسائل التواصل الاجتماعي.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-indigo-900/20 border border-indigo-500/10">
              <h4 className="text-indigo-400 font-bold text-lg mb-3 flex items-center gap-2">
                <Radio size={20} /> 3. تواصل فعّال ومحدّد (Houston, We Have a
                Protocol)
              </h4>
              <p>
                التواصل مع الأرض يتم في أوقات محددة وبصيغ واضحة. خصص أوقاتاً
                محددة (مرتين أو ثلاث يومياً) للتحقق من البريد الإلكتروني
                والرسائل. لا تجعل بريدك الإلكتروني مفتوحاً طوال اليوم ليكون جهاز
                تحكم عن بعد يتيح للآخرين تشتيت انتباهك في أي وقت.
              </p>
            </div>

            <blockquote className="border-r-4 border-indigo-500 pr-4 italic text-gray-400 bg-white/5 p-4 rounded-l-xl">
              "التركيز ليس مجرد اختيار ما يجب التركيز عليه، بل هو بالأحرى اختيار
              ملايين الأشياء التي يجب تجاهلها."
            </blockquote>

            <p>
              تذكر، التركيز هو عضلة. كلما دربتها على البقاء في مهمة واحدة أطول،
              أصبحت أقوى. ابدأ بمهمة واحدة لمدة 25 دقيقة (تقنية بومودورو)، ثم
              كافئ نفسك بـ 5 دقائق من الراحة. ستفاجأ بحجم الإنجازات التي ستحققها
              عندما تتحكم أنت في توجيه دفة الانتباه!
            </p>
          </div>

          <div className="mt-8 flex justify-end border-t border-white/10 pt-6">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <CheckCircle size={18} />
              إتمام القراءة
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
