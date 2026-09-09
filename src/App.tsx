import { playSound } from "./lib/sound";
import { useRenderLog, authorizeDebugger } from "./firebaseDebug";
import { buildInviteLink } from "./lib/share";
import { checkAndRewardReferrals, REFERRAL_REWARD_XP } from "./lib/referrals";
import { shouldShowWhatsNew } from "./lib/versionConfig";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component, Suspense, lazy } from "react";
import LandingPage from "./components/LandingPage";
import { isAdminUser } from "./supabaseAdapter";
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
import StarBackground from "./components/StarBackground";

import { cn } from "./lib/utils";
import {
  auth,
  db,
  signInWithGoogle,
  signInAsGuest,
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
  ErrorBoundary,
} from "./shared";

import { showToast } from "./lib/cosmicUI";
import { getLevelFromXp } from "./lib/levelConfig";

const Dashboard = lazy(() => import("./views/Dashboard"));
const QuranPlayer = lazy(() => import("./views/QuranPlayer"));
const MissionRoleWizard = lazy(() =>
  import("./views/MissionRoleWizard"),
);
const WhatsNewModal = lazy(() => import("./components/WhatsNewModal"));
const LevelUpEffects = lazy(() => import("./components/LevelUpEffects"));


import { useLanguage } from "./context/LanguageContext";

function App() {
  useRenderLog("App");
  const { lang, isAr, t } = useLanguage();
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [view, setView] = useState<"landing" | "dashboard">("landing");
  const [loginError, setLoginError] = useState<{
    code: string;
    message: string;
    fullError?: string;
  } | null>(null);
  const lastSyncedProfileRef = useRef<string>("");
  const previousLevelRef = useRef<number | null>(null);
  const previousUserUidRef = useRef<string | null>(null);
  const previousXpRef = useRef<number>(0);
  const [inviteInfo, setInviteInfo] = useState<{
    inviterId: string;
    inviterName: string;
  } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Detect an invite link (?invite=UID) on load and welcome the newcomer
  useEffect(() => {
    let isMounted = true;
    try {
      const params = new URLSearchParams(window.location.search);
      const inviterId = params.get("invite");
      if (!inviterId) return;

      getDoc(doc(db, "profiles", inviterId))
        .then((snap) => {
          if (!isMounted) return;
          const name = snap.exists()
            ? (snap.data() as { displayName?: string }).displayName || null
            : null;
          setInviteInfo({
            inviterId,
            inviterName: name || "رائد فضاء من مجرة OrbitX",
          });
        })
        .catch(() => {
          if (isMounted)
            setInviteInfo({ inviterId, inviterName: "رائد فضاء من مجرة OrbitX" });
        });
    } catch (err) {
      console.warn("Failed reading invite param:", err);
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const copyInviteLink = async () => {
    if (!userData) return;
    try {
      await navigator.clipboard.writeText(buildInviteLink(userData.uid));
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2500);
    } catch (err) {
      console.warn("Failed copying invite link:", err);
    }
  };

  const handleLogin = async () => {
    try {
      setLoginError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Login attempt error:", err);
      const errorCode = err?.code || "";
      const errorMessage = err?.message || String(err);

      if (
        errorCode === "auth/popup-closed-by-user" ||
        errorCode === "auth/cancelled-popup-request"
      ) {
        console.log("User closed popup, ignoring.");
        return;
      }

      setLoginError({
        code: errorCode,
        message: errorMessage,
        fullError: `${errorCode} | ${errorMessage}`,
      });
    }
  };

  const handleGuestLogin = async () => {
    try {
      setLoginError(null);
      await signInAsGuest();
    } catch (err: any) {
      console.error("Guest login attempt error:", err);
      const code = err?.code || "guest-login-failed";
      setLoginError({
        code,
        message:
          code.includes("anonymous_provider_disabled")
            ? "Anonymous sign-ins are disabled in the Supabase project settings."
            : err?.message || String(err),
        fullError: `${code} | ${err?.message || String(err)}`,
      });
    }
  };

  useEffect(() => {
    if (user) {
      if (userData) {
        const isAuthorized = userData.role === "admin";
        authorizeDebugger(isAuthorized);
      }
    } else {
      authorizeDebugger(false);
    }
  }, [user, userData]);

  const [isQuotaExceeded, setIsQuotaExceeded] = useState(
    typeof window !== "undefined" && !!(window as any).__firestoreQuotaExceeded,
  );

  useEffect(() => {
    const handleQuota = () => {
      setIsQuotaExceeded(true);
    };
    window.addEventListener("firestore_quota_exceeded", handleQuota);
    return () => {
      window.removeEventListener("firestore_quota_exceeded", handleQuota);
    };
  }, []);

  useEffect(() => {
    if (user) {
      // Activity tracking
      let lastActivityUpdate = 0;
      const updateActivity = () => {
        if (
          typeof window !== "undefined" &&
          (window as any).__firestoreQuotaExceeded
        ) {
          return; // Guard against further quota errors when resource is exhausted
        }
        const now = Date.now();
        if (now - lastActivityUpdate > 180000) {
          // Throttle to 3 min (presence radar treats < 5 min as "active")
          lastActivityUpdate = now;
          if (user.isAnonymous) return; // Guests don't write activity to avoid profiles docs
          updateDoc(doc(db, "profiles", user.uid), {
            lastActiveTime: now,
          }).catch(() => {});
        }
      };

      const activityEvents = ["mousedown", "keydown", "touchstart"];
      activityEvents.forEach((e) =>
        window.addEventListener(e, updateActivity, { passive: true }),
      );
      updateActivity(); // Initial track

      const userRef = doc(db, "users", user.uid);
      const unsubscribe = onSnapshot(
        userRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserData;
            // Admin role is now decided by the server (admins table), never auto-upgraded client-side.
            isAdminUser(user.email).then((isAdmin) => {
              if (isAdmin && data.role !== "admin") {
                updateDoc(userRef, { role: "admin" }).catch((e) =>
                  handleFirestoreError(
                    e,
                    OperationType.WRITE,
                    `users/${user.uid}`,
                  ),
                );
              }
            });
            setUserData(data);
            setView("dashboard");
          } else {
            // Initialize new user
            const isGuest = !!user.isAnonymous || !user.email;
            const isAdminEmail =
              user.email === "lumafashionhq@gmail.com" ||
              user.email === "abdalrahmanjarrah94@gmail.com" ||
              user.email === "abdalrahmanjarrah1@gmail.com";

            const newUserData: UserData = {
              uid: user.uid,
              displayName: user.displayName || (isGuest ? "زائر" : "رائد فضاء"),
              email: user.email || "",
              photoURL: user.photoURL || "",
              level: 1,
              xp: 0,
              role: isAdminEmail ? "admin" : "user",
              friendsCount: 0,
              banned: false,
              currentActivity: isGuest
                ? "في وضع المشاهدة"
                : "في لوحة التحكم",
              streak: 1,
              lastActiveDate: new Date().toISOString().split("T")[0],
              isGuest: isGuest || undefined,
              completedWizard: isGuest ? true : undefined,
            };

            const initUser = async () => {
              // Restore from an existing public profile so returning users keep
              // their real XP/level/role instead of being reset to a fresh user.
              let restored: UserData | null = null;
              if (!isGuest) {
                const existingSnap = await getDoc(
                  doc(db, "profiles", user.uid),
                ).catch(() => null);
                if (existingSnap?.exists()) {
                  const p = existingSnap.data() as Partial<UserData>;
                  restored = {
                    ...newUserData,
                    ...p,
                    uid: user.uid,
                    displayName: p.displayName || newUserData.displayName,
                    level: typeof p.level === "number" ? p.level : 1,
                    xp: typeof p.xp === "number" ? p.xp : 0,
                    role: p.role || newUserData.role,
                    friendsCount: p.friendsCount ?? 0,
                    banned: p.banned ?? false,
                    currentActivity: newUserData.currentActivity,
                  };
                }
              }

              const userData = restored ?? newUserData;
              await setDoc(userRef, userData).catch((e) =>
                handleFirestoreError(
                  e,
                  OperationType.WRITE,
                  `users/${user.uid}`,
                ),
              );

              // Guests stay invisible on the public leaderboard: no profiles doc is created for them.
              // An existing profile is never overwritten (that would reset its XP/level).
              if (!isGuest && !restored) {
                const profileRef = doc(db, "profiles", user.uid);
                await setDoc(
                  profileRef,
                  {
                    uid: user.uid,
                    displayName: user.displayName || "رائد فضاء",
                    photoURL: user.photoURL || "",
                    bio: "",
                    level: 1,
                    xp: 0,
                    totalFocusSessions: 0,
                    friendsCount: 0,
                    role: isAdminEmail ? "admin" : "user",
                    banned: false,
                    currentActivity: "في لوحة التحكم",
                    streak: 1,
                    lastActiveDate: new Date().toISOString().split("T")[0],
                  },
                  { merge: true },
                ).catch((e) =>
                  handleFirestoreError(
                    e,
                    OperationType.WRITE,
                    `profiles/${user.uid}`,
                  ),
                );
              }

              // Immediately transition user state to prevent lockouts on realtime subscription delays
              setUserData(userData);
              setView("dashboard");

              // Record who invited this brand-new user so the inviter earns
              // 100 XP (see checkAndRewardReferrals). Self-invites are skipped,
              // guests are never attributed.
              const inviteParam = new URLSearchParams(
                window.location.search,
              ).get("invite");
              if (!isGuest && !restored && inviteParam && inviteParam !== user.uid) {
                updateDoc(doc(db, "profiles", user.uid), {
                  invitedBy: inviteParam,
                }).catch(() => {});
              }
            };
            initUser();
          }
        },
        (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}`),
      );

      return () => {
        unsubscribe();
        activityEvents.forEach((e) =>
          window.removeEventListener(e, updateActivity),
        );
      };
    } else {
      setUserData(null);
      setView("landing");
    }
  }, [user]);

  // Hearts recovery logic removed

  // Daily streak handling now lives in src/lib/streak.ts (applyDailyStreak),
  // called by DailyHabitCard on the home view. It also writes lastActiveDate.

  // Referral rewards: when a friend who joined through this user's invite link
  // shows up in profiles, credit the inviter 100 XP once per friend.
  const referralCheckedRef = useRef(false);
  useEffect(() => {
    if (!userData?.uid || userData.isGuest) return;
    if (referralCheckedRef.current) return;
    referralCheckedRef.current = true;
    checkAndRewardReferrals(userData, (count) => {
      showToast(
        `🎁 ربحت +${REFERRAL_REWARD_XP} XP عن كل صديق دُعيتَه! وصلت ${count} مكافأة`,
        "success",
      );
    }).catch(() => {});
  }, [userData?.uid, userData?.isGuest]);

  // What's New: show once per version
  useEffect(() => {
    if (userData && !userData.isGuest && shouldShowWhatsNew()) {
      setShowWhatsNew(true);
    }
  }, [userData]);

  useEffect(() => {
    if (userData) {
      const newBadges: string[] = [...(userData.badges || [])];
      let changed = false;

      // Check if challenge_champ badge expired
      if (
        newBadges.includes("challenge_champ") &&
        userData.challengeChampExpiry
      ) {
        if (Date.now() > userData.challengeChampExpiry) {
          const idx = newBadges.indexOf("challenge_champ");
          if (idx !== -1) {
            newBadges.splice(idx, 1);
            changed = true;
          }
        }
      }

      // Starter Badge (awarded on having at least 25 XP)
      if (userData.xp >= 25 && !newBadges.includes("starter")) {
        newBadges.push("starter");
        changed = true;
      }
      // Focus 10 Badge (awarded on having at least 250 XP)
      if (userData.xp >= 250 && !newBadges.includes("focus_10")) {
        newBadges.push("focus_10");
        changed = true;
      }
      // Master Focus Badge (previously streak_7, awarded on 1000 XP)
      if (userData.xp >= 1000 && !newBadges.includes("streak_7")) {
        newBadges.push("streak_7");
        changed = true;
      }
      if (userData.level >= 30 && !newBadges.includes("level_30")) {
        newBadges.push("level_30");
        changed = true;
      }

      if (changed) {
        updateDoc(doc(db, "users", userData.uid), {
          badges: newBadges,
        }).catch((e) => console.error("Badge update failed", e));
        updateDoc(doc(db, "profiles", userData.uid), {
          badges: newBadges,
        }).catch((e) => console.error("Profile badge update failed", e));
      }
    }
  }, [
    userData?.xp,
    userData?.level,
    userData?.uid,
    userData?.challengeChampExpiry,
  ]);

  useEffect(() => {
    if (userData) {
      const calculatedLevel = getLevelFromXp(userData.xp);
      const sessionKey = `lastCelebratedLevel_${userData.uid}`;

      // Initial load or user change: silently initialize without triggering the toast
      if (
        previousUserUidRef.current !== userData.uid ||
        previousLevelRef.current === null
      ) {
        previousUserUidRef.current = userData.uid;
        previousXpRef.current = userData.xp;

        const celebratedLevelStr = sessionStorage.getItem(sessionKey);
        const celebratedLevel = celebratedLevelStr
          ? parseInt(celebratedLevelStr, 10)
          : null;

        // Make sure previousLevelRef is initialized to the highest verified level
        previousLevelRef.current = Math.max(
          calculatedLevel,
          celebratedLevel !== null ? celebratedLevel : calculatedLevel,
        );

        if (celebratedLevel === null) {
          sessionStorage.setItem(sessionKey, String(calculatedLevel));
        }
        return;
      }

      const celebratedLevelStr = sessionStorage.getItem(sessionKey);
      const celebratedLevel = celebratedLevelStr
        ? parseInt(celebratedLevelStr, 10)
        : null;

      // Genuine promotion transition where the calculated level exceeds what was previously seen and celebrated
      if (
        calculatedLevel > previousLevelRef.current &&
        (celebratedLevel === null || calculatedLevel > celebratedLevel)
      ) {
        setShowLevelUp(true);
        playSound("levelup");
        sessionStorage.setItem(sessionKey, String(calculatedLevel));
        setTimeout(() => setShowLevelUp(false), 5000);
      }

      // Always keep the persistent ref updated with the latest state
      previousLevelRef.current = calculatedLevel;
      previousXpRef.current = userData.xp;
    }
  }, [userData?.xp, userData?.level, userData?.uid]);

  useEffect(() => {
    if (userData && !userData.isGuest) {
      const publicData = {
        uid: userData.uid,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        bio: userData.bio || "",
        totalFocusSessions: userData.totalFocusSessions || 0,
        friendsCount: userData.friendsCount || 0,
        banned: userData.banned || false,
        currentActivity: userData.currentActivity || "في المدار",
        xp: userData.xp || 0,
        level: userData.level || 1,
      };

      const serialized = JSON.stringify(publicData);
      if (lastSyncedProfileRef.current === serialized) {
        return;
      }
      if (
        typeof window !== "undefined" &&
        (window as any).__firestoreQuotaExceeded
      ) {
        return; // Guard profile updates
      }
      lastSyncedProfileRef.current = serialized;

      const profileRef = doc(db, "profiles", userData.uid);
      setDoc(profileRef, publicData, { merge: true }).catch((e) =>
        console.error("Profile sync failed", e),
      );
    }
  }, [userData]);

  if (loading || (user && !userData)) {
    return (
      <div className="min-h-screen bg-space-dark flex items-center justify-center">
        <Rocket className="w-12 h-12 text-indigo-400 animate-bounce" />
      </div>
    );
  }

  if (view === "landing" && !user) {
    return (
      <>
        <LandingPage
          onLogin={handleLogin}
          onGuest={handleGuestLogin}
          inviterName={
            inviteInfo && inviteInfo.inviterId !== userData?.uid
              ? inviteInfo.inviterName
              : undefined
          }
        />
        {loginError && (
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-[fade-in_0.2s_ease]"
            id="auth-error-overlay"
          >
            {(() => {
              const isAnonDisabled =
                loginError.code.includes("anonymous_provider_disabled");
              return (
            <div
              className={cn("bg-[#0a0f25]/95 border border-red-500/20 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl shadow-indigo-950/40 relative overflow-hidden", isAr ? "text-right" : "text-left")}
              dir={isAr ? "rtl" : "ltr"}
            >
              {/* Absolute floating cosmic decoration */}
              <div className="absolute top-[-50px] left-[-30px] w-32 h-32 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <button
                  onClick={() => setLoginError(null)}
                  className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className={cn("flex items-center gap-3", isAr ? "flex-row" : "flex-row-reverse")}>
                  <div className={isAr ? "text-right" : "text-left"}>
                    <h2 className="text-xl font-black text-white font-sans">
                      {isAnonDisabled
                        ? (isAr ? "وضع المشاهدة مو مفعّل بعد" : "Guest mode isn't enabled yet")
                        : (isAr ? "عقبة في المدار الفضائي" : "Orbital Space Hindrance")}
                    </h2>
                    <p className="text-xs text-red-400/80 mt-0.5">
                      {isAnonDisabled
                        ? (isAr ? "التسجيل المجهول معطّل في إعدادات Supabase" : "Anonymous sign-ins are disabled in the Supabase settings")
                        : (isAr ? "فشل الاتصال بمزود Google Auth" : "Failed to connect to Google Auth provider")}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-400/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-400 font-bold shrink-0">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Main info */}
              <div className="space-y-4 text-sm text-gray-300 leading-relaxed font-sans">
                <p className="font-semibold text-gray-200">
                  {isAnonDisabled
                    ? (isAr
                        ? "لتفعيل وضع المشاهدة، اذهب إلى لوحة تحكم Supabase وفعّل التسجيل المجهول. الخطوات:"
                        : "To enable guest mode, turn on anonymous sign-ins from your Supabase dashboard. Steps:")
                    : (isAr
                        ? "تلقينا خطأ من مزود Google أو أن الميزة مقيدة في متصفحك."
                        : "We encountered an error from the Google provider or it is restricted in your browser.")}
                </p>

                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-mono text-gray-400 text-left overflow-x-auto">
                  {loginError.fullError || loginError.message}
                </div>

                {isAnonDisabled ? (
                  <ol className="space-y-2 text-xs text-gray-400 font-sans">
                    <li>1. {isAr ? "افتح " + "Supabase Dashboard" + " ← مشروعك ← Authentication ← Sign In / Providers" : "Open Supabase Dashboard → your project → Authentication → Sign In / Providers"}</li>
                    <li>2. {isAr ? "فعّل خيار " + "Anonymous sign-ins" + " واحفظ التغييرات." : "Enable 'Anonymous sign-ins' and save."}</li>
                    <li>3. {isAr ? "ارجع وجرّب زر المشاهد من جديد." : "Come back and retry the guest button."}</li>
                  </ol>
                ) : (
                  <>
                <p className="text-gray-400">
                  {isAr
                    ? "تمنع المتصفحات الحديثة أحياناً النوافذ المنبثقة للتحقق من الهوية داخل إطارات المعاينة. يرجى تجربة الحل الأنسب أدناه:"
                    : "Modern browsers sometimes block popup logins within preview frames. Please try the solution below:"}
                </p>

                {/* List of solutions */}
                <div className="space-y-3 pt-2 font-sans">
                  <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-lg mt-0.5">🌐</span>
                    <div className={isAr ? "text-right" : "text-left"}>
                      <h4 className="font-bold text-indigo-300 text-xs">
                        {isAr ? "العرض في علامة تبويب جديدة (الحل الأسرع والأنسب)" : "Open in a new tab (most reliable)"}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        {isAr
                          ? "افتح التطبيق في صفحة مستقلة كاملة لتخطي قيود الإطار. اضغط على زر المعاينة الخارجي (Open in new tab) أعلى يمين نافذة AI Studio."
                          : "Open the app in an independent browser tab to bypass iframe restrictions. Click 'Open in new tab' at the top right of the AI Studio window."}
                      </p>
                    </div>
                  </div>
                </div>
                </>
                )}
              </div>

              {/* Footer controls */}
              <div className={cn("flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-white/5 font-sans", isAr ? "justify-end" : "justify-start")}>
                <button
                  onClick={() => setLoginError(null)}
                  className="px-4 py-2.5 bg-white/5 rounded-xl text-xs font-bold text-gray-300 hover:bg-white/10 transition-all border border-white/5"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                {!isAnonDisabled && (
                <button
                  onClick={() => {
                    setLoginError(null);
                    handleLogin();
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-indigo-900/30"
                >
                  {isAr ? "إعادة محاولة Google" : "Retry Google"}
                </button>
                )}
              </div>
            </div>
              );
            })()}
          </div>
        )}
      </>
    );
  }

  if (userData?.banned) {
    return (
      <div
        className="min-h-screen bg-space-dark flex flex-col items-center justify-center p-4 text-center"
        dir={isAr ? "rtl" : "ltr"}
      >
        <ShieldAlert className="w-24 h-24 text-red-500 mb-6" />
        <h1 className="text-4xl font-bold text-white mb-4">
          {t("common.banned", "تم حظر حسابك")}
        </h1>
        <p className="text-gray-400 max-w-md">
          {t(
            "common.banned_desc",
            "لقد تم حظر وصولك إلى المنصة بسبب مخالفة القوانين. إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الإدارة.",
          )}
        </p>
        <button
          onClick={logout}
          className="mt-8 px-8 py-3 bg-white/5 rounded-xl hover:bg-space-dark/20 transition-all font-sans text-xs"
        >
          {t("common.logout", "تسجيل الخروج")}
        </button>
      </div>
    );
  }

  return (
    <>
      {isQuotaExceeded && (
        <div
          className="bg-gradient-to-r from-amber-600/90 to-red-600/90 text-white text-xs md:text-sm py-2.5 px-4 text-center font-semibold relative z-[300] shadow-md flex items-center justify-center gap-2 select-none"
          dir={isAr ? "rtl" : "ltr"}
        >
          <span>
            {t(
              "common.quota",
              "🛡️ نظام الفضاء الرديف: ميزانية قاعدة البيانات المجانية لـ Firebase تجاوزت الحد المسموح به اليوم. نحن نوجه جميع عملياتك بنجاح محلياً لضمان تركيزك التام ومواصلة إنتاجيتك دون انقطاع.",
            )}
          </span>
          <button
            onClick={() => setIsQuotaExceeded(false)}
            className="underline hover:text-white/80 transition ml-2 text-[10px] md:text-sm font-bold bg-white/10 px-2 py-0.5 rounded"
          >
            {t("common.hide", "إخفاء")}
          </button>
        </div>
      )}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-gradient-to-r from-yellow-400 to-orange-500 p-1 rounded-2xl shadow-2xl shadow-indigo-900/20 shadow-orange-500/40"
          >
            <div
              className="bg-space-dark px-8 py-4 rounded-[calc(1rem-1px)] flex items-center gap-4"
              dir={isAr ? "rtl" : "ltr"}
            >
              <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center text-2xl">
                🎊
              </div>
              <div className="text-right">
                <h3 className="text-lg font-black text-white">
                  {t("level_up.title", "ترقية جديدة!")}
                </h3>
                <p className="text-gray-400 text-xs">
                  {lang === "ar"
                    ? `لقد وصلت للمستوى ${userData?.level}`
                    : `You reached Level ${userData?.level}`}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {userData && !userData.completedWizard && (
          <Suspense fallback={null}>
            <MissionRoleWizard
              user={userData}
              onComplete={(updates) => {
                setUserData((prev) => (prev ? { ...prev, ...updates } : null));
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>
      <Suspense fallback={null}>
        <QuranPlayer />
      </Suspense>
      {inviteInfo && userData && inviteInfo.inviterId !== userData.uid && (
        <div
          className="bg-gradient-to-r from-indigo-600/90 via-fuchsia-600/90 to-indigo-600/90 text-white text-xs md:text-sm py-3 px-4 text-center font-semibold relative z-[120] shadow-md flex flex-wrap items-center justify-center gap-x-4 gap-y-2 select-none"
          dir={isAr ? "rtl" : "ltr"}
        >
          <span>
            🚀 <strong>{inviteInfo.inviterName}</strong> دعاك إلى مجرة OrbitX —
            تبارزا في نزالات التركيز واصعدوا معاً في التصنيف!
          </span>
          <button
            onClick={copyInviteLink}
            className="underline hover:text-white/80 transition text-[10px] md:text-sm font-bold bg-white/10 px-2.5 py-0.5 rounded-full"
          >
            {inviteCopied
              ? "تم النسخ ✓"
              : "ادعُ صديقك أيضاً — انسخ رابطك"}
          </button>
          <button
            onClick={() => setInviteInfo(null)}
            className="underline hover:text-white/80 transition text-[10px] font-bold opacity-70"
          >
            إخفاء
          </button>
        </div>
      )}
      <Suspense fallback={null}>
        <Dashboard user={userData} onLogout={logout} onLogin={handleLogin} />
      </Suspense>
      {showWhatsNew && (
        <Suspense fallback={null}>
          <WhatsNewModal />
        </Suspense>
      )}
      {userData && previousXpRef.current !== undefined && (
        <Suspense fallback={null}>
          <LevelUpEffects
            xp={userData.xp}
            previousXp={previousXpRef.current}
            userId={userData.uid}
          />
        </Suspense>
      )}
    </>
  );
}

const GlobalAdminAlert = lazy(() => import("./views/GlobalAdminAlert"));
const GlobalAppUpdates = lazy(() => import("./views/GlobalAppUpdates"));

export default function WrappedApp() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <GlobalAdminAlert />
      </Suspense>
      <Suspense fallback={null}>
        <GlobalAppUpdates />
      </Suspense>
      <App />
    </ErrorBoundary>
  );
}
