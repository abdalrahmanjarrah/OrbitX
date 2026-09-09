import { playSound } from "../lib/sound";
import {
  fetchBlackHoleData,
  claimBlackHolePrize,
  BLACK_HOLE_TARGET_MINUTES,
  BLACK_HOLE_PRIZE_XP,
} from "../lib/blackHole";
import { showToast } from "../lib/cosmicUI";
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
import { UserSearchView } from "../components/UserSearchView";

import { SURAHS, BADGES, MeteorEffect, RECITERS, UserData, Fleet, Discussion, Reply, ScheduleItem, Room, Challenge, AwarenessSignal, Message } from '../shared';
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
import UserModal from './UserModal';
import NavLink from './NavLink';
import FleetsView from './FleetsView';
import { useLanguage } from '../context/LanguageContext';

export default function BlackHolesView({ user }: { user: UserData }) {
  const [globalProgress, setGlobalProgress] = useState(0);
  const [topContributors, setTopContributors] = useState<UserData[]>([]);
  const [bountyClaimed, setBountyClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const claimAttemptedRef = useRef(false);
  const { isAr, t } = useLanguage();
  const targetGoal = 1000;

  // Real weekly progress: sums the current week's focus minutes from all users.
  // It auto-resets every Monday because weekStart/weekFocusMinutes on each user
  // already roll over on the first session of the new week.
  useEffect(() => {
    const fetchWeeklyProgress = async () => {
      try {
        const data = await fetchBlackHoleData(user);
        setTopContributors(data.contributors);
        setBountyClaimed(data.prizeAlreadyClaimed);

        // 1 hour focus = 60 minutes (weekMinutes already in minutes).
        setGlobalProgress(Math.floor(data.weekMinutes / 60));

        // Bounty auto-claim: once the collective target is reached, every
        // astronaut who contributed focus this week receives the prize once.
        const weekMinutes = user?.weekFocusMinutes || 0;
        const helpedThisWeek = weekMinutes > 0;
        if (
          !claimAttemptedRef.current &&
          !data.prizeAlreadyClaimed &&
          data.weekMinutes >= BLACK_HOLE_TARGET_MINUTES &&
          helpedThisWeek
        ) {
          claimAttemptedRef.current = true;
          setClaiming(true);
          const ok = await claimBlackHolePrize(user);
          setClaiming(false);
          if (ok) {
            setBountyClaimed(true);
            showToast(
              isAr
                ? `🎉 تم فك شفرة الثقب الأسود! حصلت على ${BLACK_HOLE_PRIZE_XP} XP كجائزة جماعية!`
                : `🎉 Black hole decrypted! You earned ${BLACK_HOLE_PRIZE_XP} XP as a group bounty!`,
              "success"
            );
            playSound("levelup");
          }
        }
      } catch (e) {
        console.error("Failed to fetch black hole progress", e);
      }
    };
    fetchWeeklyProgress();
  }, [user, isAr]);

  const progressPercent = Math.min((globalProgress / targetGoal) * 100, 100);
  const reachedTarget = globalProgress >= targetGoal;

  return (
    <div className={cn("max-w-5xl mx-auto space-y-8 animate-fade-in relative z-10 px-4 md:px-0 mt-8 mb-32", isAr ? "text-right" : "text-left")}>
      <div className={cn("flex items-center gap-4 mb-8", isAr ? "flex-row" : "flex-row-reverse self-end justify-end")}>
        <div className="p-3 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-2xl border border-violet-500/30 text-violet-400">
          <Target size={28} />
        </div>
        <div className={isAr ? "text-right" : "text-left"}>
          <h2 className="text-3xl font-bold font-display tracking-tight text-white mb-1">
            {isAr ? "الثقوب السوداء (تحديات جماعية)" : "Black Holes (Cosmic Challenges)"}
          </h2>
          <p className="text-indigo-200">
            {isAr 
              ? "تعاونوا مع جميع الرواد للوصول إلى الهدف وفك تشفير المعارف الكونية."
              : "Collaborate with all cosmic pilots to reach target parameters and unlock classified space documents."}
          </p>
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
                background:
                  "radial-gradient(circle, rgba(0,0,0,1) 10%, rgba(139,92,246,0.3) 40%, rgba(0,0,0,0) 70%)",
                boxShadow: "0 0 100px 20px rgba(139,92,246,0.2)",
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
              <span className="text-3xl font-bold text-white relative z-10">
                {progressPercent.toFixed(1)}%
              </span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-3 line-clamp-2 leading-snug">
              {isAr ? "تحدي الثقب الأسود: شفرة النجم المفقود" : "Black Hole: Code of the Lost Star"}
            </h3>
            <p className="text-indigo-200 mb-8 max-w-md leading-relaxed text-sm">
              {isAr
                ? "يجب على جميع رواد الفضاء في المنصة تجميع 1000 ساعة تركيز هذا الأسبوع معاً لفك تشفير مقالة سرية جديدة في قسم الوعي الكوني."
                : "All astronauts must collectively complete 1000 hours of focused study this week to decrypt and unlock a super-secret entry inside the Cosmic Awareness Hub."}
            </p>

            <div className="w-full max-w-md bg-black/50 rounded-full h-5 border border-white/10 overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.5)]"
              />
            </div>
            <div className="flex justify-between w-full max-w-md mt-3 text-sm font-medium">
              <span className="text-violet-400">
                {isAr ? `${globalProgress} ساعة تركيز هذا الأسبوع` : `${globalProgress} hours focused this week`}
              </span>
              <span className="text-gray-500">
                {isAr ? `الهدف: ${targetGoal} س` : `Goal: ${targetGoal}h`}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-[#0f1123]/80 backdrop-blur-md rounded-3xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500/50 to-transparent"></div>
            <h3 className={cn("text-lg font-bold text-white mb-4 flex items-center gap-2", isAr ? "flex-row" : "flex-row-reverse")}>
              <Award size={20} className="text-fuchsia-400" />
              <span>{isAr ? "الجائزة المخبأة" : "Hidden Bounty"}</span>
            </h3>
            <div className={cn("p-4 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-4", isAr ? "flex-row" : "flex-row-reverse")}>
              <div className={cn("p-3 rounded-xl", bountyClaimed ? "bg-amber-500/20" : "bg-black/50")}>
                {bountyClaimed ? (
                  <Award size={20} className="text-amber-400" />
                ) : (
                  <Lock size={20} className="text-gray-400" />
                )}
              </div>
              <div className={cn("flex-1", isAr ? "text-right" : "text-left")}>
                <h4 className="text-white font-bold mb-1 text-sm">
                  {bountyClaimed
                    ? (isAr ? "ملف مفكك! الجائزة في حسابك ✅" : "Decrypted archive! Bounty delivered ✅")
                    : reachedTarget
                      ? (isAr ? "تم فك شفرة الثقب الأسود! استلم مكافأتك الجماعية" : "Black hole decrypted! Claim your group bounty")
                      : (isAr ? "ملف مشفر (التصنيف: سري للغاية)" : "Encrypted Archive (Classified: Top Secret)")}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {bountyClaimed
                    ? (isAr ? `تم صرف ${BLACK_HOLE_PRIZE_XP} XP لمساهمتك هذا الأسبوع. شكراً لكونك جزءاً من نصر الجماعة!`
                        : `You received ${BLACK_HOLE_PRIZE_XP} XP for your weekly contribution. Thanks for being part of the collective!`)
                    : reachedTarget
                      ? (isAr ? `الهدف الجماعي (${targetGoal} ساعة) تحقق! اضغط الزر لاستلام ${BLACK_HOLE_PRIZE_XP} XP قبل نهاية الأسبوع.`
                          : `Collective goal (${targetGoal}h) reached! Tap the button to claim ${BLACK_HOLE_PRIZE_XP} XP before the week ends.`)
                      : (isAr 
                          ? `يحتوي هذا الملف على ${BLACK_HOLE_PRIZE_XP} XP لمصلّح كل مساهم يشارك في هذا الأسبوع. لن يُكشف إلا بتعاون جميع الرواد!`
                          : `This archive holds ${BLACK_HOLE_PRIZE_XP} XP for every contributor. It stays locked until collective goals are satisfied.`)}
                </p>
              </div>
            </div>

            {reachedTarget && !bountyClaimed && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                disabled={claiming}
                onClick={async () => {
                  if (claiming) return;
                  setClaiming(true);
                  const ok = await claimBlackHolePrize(user);
                  setClaiming(false);
                  if (ok) {
                    setBountyClaimed(true);
                    showToast(
                      isAr
                        ? `🎉 استلمت ${BLACK_HOLE_PRIZE_XP} XP من الجائزة الجماعية!`
                        : `🎉 You claimed ${BLACK_HOLE_PRIZE_XP} XP from the group bounty!`,
                      "success"
                    );
                    playSound("levelup");
                  } else {
                    showToast(
                      isAr ? "تعذر صرف الجائزة حالياً. أعد المحاولة خلال لحظات." : "Could not pay the bounty right now. Try again shortly.",
                      "warning"
                    );
                  }
                }}
                className={cn(
                  "w-full mt-4 py-2.5 px-4 rounded-xl text-sm font-bold transition-all",
                  claiming
                    ? "bg-white/10 text-gray-300 cursor-wait"
                    : "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:brightness-110 shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer"
                )}
              >
                {claiming
                  ? (isAr ? "جارٍ صرف الجائزة..." : "Delivering bounty...")
                  : (isAr ? `استلم ${BLACK_HOLE_PRIZE_XP} XP 🏆` : `Claim ${BLACK_HOLE_PRIZE_XP} XP 🏆`)}
              </motion.button>
            )}
          </div>

          <div className="p-6 bg-[#0f1123]/80 backdrop-blur-md rounded-3xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500/50 to-transparent"></div>
            <h3 className={cn("text-lg font-bold text-white mb-4 flex items-center gap-2", isAr ? "flex-row" : "flex-row-reverse")}>
              <Flame size={20} className="text-orange-400" />
              <span>{isAr ? "أفضل المساهمين" : "Top Contributors"}</span>
            </h3>
            <div className="space-y-3">
              {topContributors.length > 0 ? (
                topContributors.map((usr, i) => (
                  <div
                    key={usr.uid}
                    className={cn("flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors", isAr ? "flex-row" : "flex-row-reverse")}
                  >
                    <div className={cn("flex items-center gap-3", isAr ? "flex-row" : "flex-row-reverse")}>
                      <div className="font-bold text-gray-500 w-4 text-center">
                        {i + 1}
                      </div>
                      <img
                        src={
                          usr.photoURL ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${usr.uid}`
                        }
                        alt={usr.displayName || (isAr ? "مجهول" : "Unnamed")}
                        className="w-8 h-8 rounded-full bg-black/50"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-sm text-gray-200 font-medium">
                        {usr.displayName || (isAr ? "رائد مجهول" : "Anonymous Astronaut")}
                      </span>
                    </div>
                    <span className="text-xs text-orange-400 font-bold bg-orange-400/10 px-2 py-1 rounded-lg">
                      {Math.round(((usr.weekFocusMinutes || 0) / 60) * 10) / 10} {isAr ? "س" : "h"} {isAr ? "هذا الأسبوع" : "this week"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">
                  {isAr ? "لا يوجد مساهمين بعد. كن أول من يساهم!" : "No contributors detected. Be the first to launch focus!"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
