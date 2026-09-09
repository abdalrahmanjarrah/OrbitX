import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LogOut,
  User as UserIcon,
  Rocket,
  Edit3,
  Image as ImageIcon,
  Plus,
  Trash2,
  Users,
  Flame,
  Award,
  CheckCircle,
  Eye,
  Zap,
  Target,
  Clock,
  Calendar,
  Swords,
  Palette,
} from "lucide-react";
import {
  auth,
  db,
  logout,
  handleFirestoreError,
  OperationType,
} from "../firebase";
import {
  collection,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { UserData } from "../shared";
import { cn } from "../lib/utils";
import { showToast } from "../lib/cosmicUI";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { getLevelFromXp, getLevelProgress, getLevelColor, getXpForLevel, getXpToNextLevel, getLevelRankName, getLevelUpReward, MILESTONE_LEVELS } from "../lib/levelConfig";

export default function ProfileView({
  user,
  isStudying,
}: {
  user: UserData;
  isStudying?: boolean;
}) {
  const { isAr, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [exhibitions, setExhibitions] = useState<any[]>([]);
  const [deletingExhibitionId, setDeletingExhibitionId] = useState<
    string | null
  >(null);
  const [friends, setFriends] = useState<UserData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user.bio || "");
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [missionRoleStr, setMissionRoleStr] = useState(user.missionRole || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputExhibitionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchExhibitions = async () => {
      try {
        const q = query(
          collection(db, "exhibitions"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc"),
        );
        const snapshot = await getDocs(q);
        setExhibitions(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      } catch (e) {
        handleFirestoreError(
          e,
          OperationType.GET,
          `exhibitions_user_${user.uid}`,
        );
      }
    };
    fetchExhibitions();
  }, [user.uid]);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const q = query(
          collection(db, "users", user.uid, "friends"),
          limit(20),
        );
        const snapshot = await getDocs(q);
        const friendIds = snapshot.docs.map((doc) => doc.id);
        if (friendIds.length > 0) {
          const friendsQuery = query(
            collection(db, "profiles"),
            where("uid", "in", friendIds),
          );
          const friendsSnap = await getDocs(friendsQuery);
          setFriends(friendsSnap.docs.map((doc) => doc.data() as UserData));
        } else {
          setFriends([]);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `users/${user.uid}/friends`);
      }
    };
    fetchFriends();
  }, [user.uid]);

  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    const DAY_NAMES = [
      "الأحد",
      "الأثنين",
      "الثلاثاء",
      "الأربعاء",
      "الخميس",
      "الجمعة",
      "السبت",
    ];
    const todayName = DAY_NAMES[new Date().getDay()];
    const fetchTodayTasks = async () => {
      try {
        const q = query(
          collection(db, "users", user.uid, "schedule"),
          where("day", "==", todayName),
          orderBy("time", "asc"),
          limit(5),
        );
        const snapshot = await getDocs(q);
        setTodayTasks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `users/${user.uid}/schedule`);
      } finally {
        setTasksLoading(false);
      }
    };
    fetchTodayTasks();
  }, [user.uid]);

  const handleUpdateBio = async () => {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        bio,
        missionRole: missionRoleStr,
        displayName,
      });
      setIsEditing(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("الرجاء اختيار ملف صورة صالح.", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        try {
          await updateDoc(doc(db, "users", user.uid), { photoURL: dataUrl });
          const collectionsToUpdate = [
            "discussions",
            "suggestions",
          ];
          for (const col of collectionsToUpdate) {
            getDocs(
              query(collection(db, col), where("userId", "==", user.uid)),
            ).then((snap) => {
              snap.forEach((docSnap) =>
                updateDoc(doc(db, col, docSnap.id), {
                  userPhoto: dataUrl,
                }).catch(() => {}),
              );
            });
          }
          getDocs(collection(db, "discussions")).then((discSnap) => {
            discSnap.forEach((discDoc) => {
              getDocs(
                query(
                  collection(db, "discussions", discDoc.id, "replies"),
                  where("userId", "==", user.uid),
                ),
              ).then((repliesSnap) => {
                repliesSnap.forEach((replyDoc) =>
                  updateDoc(
                    doc(db, "discussions", discDoc.id, "replies", replyDoc.id),
                    { userPhoto: dataUrl },
                  ).catch(() => {}),
                );
              });
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

  const handleExhibitionFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("الرجاء اختيار ملف صورة صالح.", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 800;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        try {
          await addDoc(collection(db, "exhibitions"), {
            url: dataUrl,
            userId: user.uid,
            userName: user.displayName,
            timestamp: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, "exhibitions");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const userLevel = getLevelFromXp(user.xp);
  const levelColors = getLevelColor(userLevel);
  const levelProgress = getLevelProgress(user.xp, userLevel);
  const isAdminView = user.role === "admin";

  // Upcoming milestone "ladder": the next few special levels ahead of the user,
  // each showing its level badge, rank name, remaining XP and level-up reward.
  const upcomingMilestones = (() => {
    const list: {
      level: number;
      xpNeeded: number;
      reward: number;
      colors: ReturnType<typeof getLevelColor>;
      rank: string;
    }[] = [];
    for (const lv of [...MILESTONE_LEVELS].sort((a, b) => a - b)) {
      if (lv > userLevel) {
        list.push({
          level: lv,
          xpNeeded: Math.max(0, getXpForLevel(lv) - (user.xp || 0)),
          reward: getLevelUpReward(lv),
          colors: getLevelColor(lv),
          rank: getLevelRankName(lv),
        });
      }
      if (list.length >= 4) break;
    }
    return list;
  })();

  return (
    <div
      className="w-full max-w-6xl mx-auto pb-24 overflow-x-hidden min-h-screen font-sans selection:bg-indigo-500/30 text-white"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-[-1] pointer-events-none opacity-40">
        <div className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute bottom-[20%] right-[10%] w-[50vw] h-[50vw] bg-fuchsia-600/10 blur-[150px] rounded-full mix-blend-screen animate-[pulse_15s_ease-in-out_infinite_reverse]" />
      </div>

      {/* Main Profile Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-12"
      >
        <div className="bg-[#080b1a]/80 backdrop-blur-xl border border-indigo-500/20 rounded-[3rem] p-8 md:p-12 shadow-[0_0_80px_rgba(30,27,75,0.8)] overflow-hidden relative group">
          {/* Subtle Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:10px_10px] opacity-20 pointer-events-none" />

          {/* Action Buttons Top Left */}
          <div className="absolute top-8 left-8 flex gap-3 z-20">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-3 bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/50 rounded-2xl transition-all group/edit shadow-lg"
            >
              <Edit3 className="w-5 h-5 text-indigo-300 group-hover/edit:text-indigo-200" />
            </button>
            <button
              onClick={logout}
              className="p-3 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 rounded-2xl transition-all group/logout shadow-lg"
            >
              <LogOut className="w-5 h-5 text-red-300 group-hover/logout:text-red-200" />
            </button>
            <button
              onClick={toggleTheme}
              title={theme === "amber" ? (isAr ? "الوضع الأصلي" : "Default theme") : (isAr ? "الوضع الذهبي" : "Amber theme")}
              className="p-3 bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/50 rounded-2xl transition-all group/theme shadow-lg"
            >
              <Palette className={cn("w-5 h-5 transition-colors", theme === "amber" ? "text-amber-400 group-hover/theme:text-amber-300" : "text-gray-400 group-hover/theme:text-amber-400")} />
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-14 relative z-10 w-full text-center md:text-right">
            {/* Avatar with Orbit */}
            <div className="relative w-48 h-48 md:w-56 md:h-56 shrink-0 flex items-center justify-center">
              {/* Rotating Rings */}
              <div className={cn("absolute border rounded-full animate-[spin_10s_linear_infinite]", isAdminView ? "inset-0 border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.25)]" : "inset-0 border-indigo-500/20")} />
              <div className={cn("absolute border rounded-full animate-[spin_15s_linear_infinite_reverse]", isAdminView ? "inset-2 border-dashed border-amber-300/40" : "inset-2 border-dashed border-fuchsia-500/30")} />

              {/* Glowing Aura based on Level */}
              <div
                className={cn(
                  "absolute inset-6 rounded-full blur-[40px] opacity-60 animate-[pulse_4s_ease-in-out_infinite]",
                  isAdminView ? "bg-amber-400/40" : levelColors.bg,
                )}
              />

              

              {/* Admin Badge Float */}
              {isAdminView && (
                <motion.div
                  initial={{ y: 0 }}
                  animate={{ y: [-4, 4, -4] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="absolute -bottom-2 right-0 z-30 px-3 py-1.5 rounded-full text-[11px] font-black border border-amber-400/60 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_20px_rgba(251,191,36,0.5)] flex items-center gap-1"
                >
                  <Award size={12} />
                  ADMIN
                </motion.div>
              )}

              {/* Level Badge Float - Top Left */}
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: [-5, 5, -5] }}
                transition={{
                  repeat: Infinity,
                  duration: 4,
                  ease: "easeInOut",
                }}
                className={cn(
                  "absolute top-2 left-2 px-3 py-1.5 rounded-full text-[11px] font-black border z-30 shadow-[0_0_20px_currentColor] flex items-center gap-1",
                  levelColors.text,
                  "border-current bg-[#080b1a]",
                )}
              >
                <Award size={12} />
                LVL {userLevel}
              </motion.div>

              {/* Main Avatar Avatar */}
              <div
                className={cn(
                  "w-36 h-36 md:w-44 md:h-44 rounded-full border-4 relative z-20 overflow-hidden cursor-pointer group/avatar max-w-full bg-[#080b1a] shrink-0",
                  isAdminView
                    ? "border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.4)]"
                    : "border-indigo-400",
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <img
                  src={
                    user.photoURL ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`
                  }
                  alt={user.displayName}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover/avatar:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <span className="text-xs font-bold text-white tracking-widest uppercase flex flex-col items-center gap-1">
                    <ImageIcon size={16} />
                    تغيير الصورة
                  </span>
                </div>
              </div>

              {/* XP Circular Progress */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none -rotate-90 scale-[0.85]"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="4"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="url(#xpGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${levelProgress * 3.01} 301`}
                  initial={{ strokeDasharray: "0 301" }}
                  animate={{
                    strokeDasharray: `${levelProgress * 3.01} 301`,
                  }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient
                    id="xpGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Inner Details */}
            <div className="flex-1 space-y-5">
              {isEditing ? (
                <div className="space-y-4 max-w-xl text-right ml-auto">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="الأسم المستعار..."
                    className="w-full bg-[#0a0f25] border border-white/10 rounded-xl px-5 py-3 focus:outline-none focus:border-indigo-400 text-2xl font-bold font-display shadow-inner"
                  />
                  <input
                    value={missionRoleStr}
                    onChange={(e) => setMissionRoleStr(e.target.value)}
                    placeholder="تخصصك الفضائي (مثل مبرمج، مهندس، الخ)..."
                    className="w-full bg-[#0a0f25] border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-400 text-sm font-mono text-indigo-300"
                  />
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="اكتب نبذتك..."
                    rows={3}
                    className="w-full bg-[#0a0f25] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400 text-sm resize-none"
                  />
                  <button
                    onClick={handleUpdateBio}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] transition-all flex items-center justify-center gap-2 w-full sm:w-auto ml-0"
                  >
                    <CheckCircle size={16} /> حفظ الهوية
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[11px] font-mono tracking-widest text-indigo-300 mb-4 shadow-sm">
                      <Rocket size={12} className="text-fuchsia-400" />
                      {user.missionRole || (isAr ? "مستكشف مبتدئ" : "ROOKIE EXPLORER")}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black font-display tracking-tight text-white drop-shadow-lg mb-2 flex items-center gap-3">
                      {user.displayName}
                      {isStudying && (
                        <span
                          className="relative flex h-3 w-3"
                          title="في وضع التركيز"
                        >
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                      )}
                    </h1>
                    <div className="flex items-center gap-2 mb-4">
                      <span
                        className={cn(
                          "text-lg font-bold drop-shadow-md",
                          levelColors.text,
                        )}
                      >
                        المستوى {userLevel}
                      </span>
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                      <span className="text-sm font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-md">
                        {user.xp} XP
                      </span>
                    </div>
                    <div className="max-w-2xl text-gray-400 text-[15px] leading-relaxed">
                      {user.bio ||
                        "مجرد شرارة تسبح في سديم واسع. لم يكتب صاحب هذا الحساب قصته بعد."}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left/Main Column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Stats Section - Premium Glass Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[
              {
                title: "الخبرة الكلية",
                value: `${user.xp || 0} XP`,
                icon: <Zap size={20} />,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
                border: "border-amber-500/20",
              },
              {
                title: "ساعات التركيز",
                value: `${
                  user.totalFocusMinutes
                    ? Math.round((user.totalFocusMinutes / 60) * 10) / 10
                    : Math.round(((user.xp || 0) / 60) * 10) / 10
                } س`,
                icon: <Clock size={20} />,
                color: "text-blue-400",
                bg: "bg-blue-500/10",
                border: "border-blue-500/20",
              },
              {
                title: "السباقات الفائزة",
                value: user.challengeWins || 0,
                icon: <Swords size={20} />,
                color: "text-indigo-400",
                bg: "bg-indigo-500/10",
                border: "border-indigo-500/20",
              },
              {
                title: "سلسلة الأيام",
                value: `${user.streak || 0} 🔥`,
                icon: <Flame size={20} />,
                color: "text-orange-400",
                bg: "bg-orange-500/10",
                border: "border-orange-500/20",
              },
              {
                title: "الأصدقاء",
                value: friends.length,
                icon: <Users size={20} />,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
                border: "border-emerald-500/20",
              },
            ].map((stat, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i}
                className={`p-5 rounded-3xl bg-[#080b1a]/40 backdrop-blur-md border ${stat.border} hover:bg-[#080b1a]/80 transition-colors group relative overflow-hidden`}
              >
                <div
                  className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full ${stat.bg} -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-700 ease-out`}
                />
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${stat.bg} ${stat.color} relative z-10 group-hover:scale-110 transition-transform`}
                >
                  {stat.icon}
                </div>
                <div className="relative z-10 flex items-end justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                      {stat.title}
                    </p>
                    <p
                      className={`text-2xl font-black font-display font-mono ${stat.color} drop-shadow-md`}
                    >
                      {stat.value}
                    </p>
                  </div>
                  {stat.title === "الأصدقاء" && friends.length > 0 && (
                    <div className="flex -space-x-2 space-x-reverse mb-1">
                      {friends.slice(0, 3).map((f, idx) => (
                        <img
                          key={idx}
                          src={
                            f.photoURL ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${f.uid}`
                          }
                          alt={f.displayName}
                          className="w-6 h-6 rounded-full border-2 border-[#080b1a] object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Mission Progress + Today's Missions — powered by real data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#080b1a]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 rounded-br-full -translate-x-16 -translate-y-16 blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-6 gap-3">
                <h3 className="text-lg font-bold font-display text-white flex items-center gap-3">
                  <Rocket className="text-amber-400" /> رحلتك نحو المستوى التالي
                </h3>
                <span
                  className={`text-[11px] font-bold px-3 py-1 rounded-full border border-white/10 bg-white/5 ${levelColors.text} whitespace-nowrap`}
                >
                  LVL {userLevel}
                </span>
              </div>
              <div className="relative z-10">
                <div className="flex items-end justify-between mb-2">
                  <p className="text-[12px] text-gray-400">
                    {isAr
                      ? `${getXpToNextLevel(userLevel)} XP متبقية للمستوى ${userLevel + 1}`
                      : `${getXpToNextLevel(userLevel)} XP left to Level ${userLevel + 1}`}
                  </p>
                  <p className="text-sm font-mono font-bold text-amber-400">
                    {Math.round(levelProgress)}%
                  </p>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelProgress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                  />
                </div>

                {/* Upcoming Milestone Ladder */}
                {upcomingMilestones.length > 0 ? (
                  <div className="mt-6" id="profile-milestone-ladder">
                    <p className="text-[11px] font-bold text-gray-500 mb-2.5">
                      المحطات الجاية في رحلتك
                    </p>
                    <div className="space-y-2.5">
                      {upcomingMilestones.map((ms, i) => (
                        <motion.div
                          key={ms.level}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.08 }}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-black/30 border border-white/5 backdrop-blur-sm hover:border-white/15 transition-colors"
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 shadow-md ${ms.colors.bg}`}
                          >
                            {ms.level}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-bold text-white truncate">
                                {ms.rank}
                              </span>
                              {i === 0 && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/20 font-bold shrink-0">
                                  التالي
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-mono text-gray-500 mt-0.5" dir="ltr">
                              متبقي +{ms.xpNeeded.toLocaleString()} XP
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg whitespace-nowrap">
                            هدية +{ms.reward}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 text-center py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm font-black text-amber-300">وصلت لأعلى مستوى! 🏆</p>
                    <p className="text-[11px] text-gray-500 mt-1">أنت في قمة الرحلة يا أسطورة.</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 mt-6" id="profile-journey-mini-stats">
                  {[
                    {
                      label: "سلسلة الأيام",
                      value: `${user.streak || 0}`,
                      icon: <Flame size={16} />,
                      color: "text-orange-400",
                      bg: "bg-orange-500/10",
                      border: "border-orange-500/20",
                    },
                    {
                      label: "جلسات التركيز",
                      value: `${user.focusSessions || user.totalFocusSessions || 0}`,
                      icon: <Clock size={16} />,
                      color: "text-blue-400",
                      bg: "bg-blue-500/10",
                      border: "border-blue-500/20",
                    },
                    {
                      label: "تحديات مكسبة",
                      value: `${user.challengeWins || 0}`,
                      icon: <Swords size={16} />,
                      color: "text-indigo-400",
                      bg: "bg-indigo-500/10",
                      border: "border-indigo-500/20",
                    },
                  ].map((m, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-2xl bg-black/30 border ${m.border} backdrop-blur-sm`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${m.bg} ${m.color}`}
                      >
                        {m.icon}
                      </div>
                      <p className={`text-lg font-black font-mono ${m.color}`}>
                        {m.value}
                      </p>
                      <p className="text-[11px] text-gray-500">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#080b1a]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full translate-x-16 -translate-y-16 blur-2xl pointer-events-none" />
              <h3 className="text-lg font-bold font-display text-white flex items-center gap-3 mb-6">
                <Calendar className="text-emerald-400" /> مهامك اليوم
              </h3>
              <div className="relative z-10 space-y-3">
                {tasksLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-14 rounded-2xl bg-white/5 animate-pulse"
                    />
                  ))
                ) : todayTasks.length === 0 ? (
                  <div className="py-10 text-center">
                    <CheckCircle
                      className="mx-auto text-emerald-400/40 mb-3"
                      size={36}
                    />
                    <p className="text-sm text-gray-400">لا مهام مجدولة لليوم</p>
                    <p className="text-[11px] text-gray-600 mt-1">
                      خطّط مهامك من صفحة الجدول
                    </p>
                  </div>
                ) : (
                  todayTasks.map((task) => {
                    const prioColor =
                      task.priority === "high"
                        ? "border-red-500/30 text-red-400"
                        : task.priority === "medium"
                          ? "border-amber-500/30 text-amber-400"
                          : "border-emerald-500/30 text-emerald-400";
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3.5 rounded-2xl bg-black/30 border border-white/5 backdrop-blur-sm hover:border-white/10 transition-colors"
                      >
                        <div
                          className={`w-1.5 self-stretch rounded-full ${
                            task.completed ? "bg-emerald-500/60" : "bg-white/15"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[13px] font-bold text-white truncate ${
                              task.completed ? "line-through text-gray-500" : ""
                            }`}
                          >
                            {task.task}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-[11px] font-mono text-gray-500"
                              dir="ltr"
                            >
                              {task.time}
                            </span>
                            {task.priority && (
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-full border ${prioColor}`}
                              >
                                {task.priority === "high"
                                  ? "عاجل"
                                  : task.priority === "medium"
                                    ? "متوسط"
                                    : "عادي"}
                              </span>
                            )}
                          </div>
                        </div>
                        {task.completed ? (
                          <CheckCircle
                            size={18}
                            className="text-emerald-400 shrink-0"
                          />
                        ) : (
                          <span className="w-5 h-5 rounded-full border border-white/15 shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right/Side Column */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          {/* Exhibitions Gallery Redesign - Masonry feel */}
          <div className="bg-[#080b1a]/60 backdrop-blur-xl border border-indigo-400/20 rounded-[3rem] p-6 flex flex-col h-full relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black font-display text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-400" /> معرض
                  الذكريات
                </h3>
                <p className="text-[11px] text-gray-500 font-mono mt-1">
                  {exhibitions.length} MEDIA LOGS
                </p>
              </div>
              <button
                onClick={() => fileInputExhibitionRef.current?.click()}
                className="w-10 h-10 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white rounded-full transition-all flex items-center justify-center shadow-lg hover:shadow-[0_0_20px_theme(colors.indigo.500/50)] group/plus"
              >
                <Plus
                  size={18}
                  className="group-hover/plus:rotate-90 transition-transform"
                />
              </button>
              <input
                type="file"
                ref={fileInputExhibitionRef}
                onChange={handleExhibitionFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
              {exhibitions.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 pb-4">
                  {exhibitions.map((ex, i) => (
                    <motion.div
                      key={ex.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        "rounded-2xl overflow-hidden border border-white/10 bg-black relative group/ex",
                        i % 3 === 0
                          ? "col-span-2 aspect-[2/1]"
                          : "aspect-square",
                      )}
                    >
                      {ex.url ? (
                        <img
                          src={ex.url}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover/ex:scale-110"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-space-dark flex items-center justify-center text-[10px] text-gray-500 font-mono">
                          LOADING
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/ex:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <span className="text-[10px] font-mono text-gray-300 font-bold mb-2">
                          {ex.timestamp
                            ? new Date(
                                typeof (ex.timestamp as any).toDate ===
                                  "function"
                                  ? (ex.timestamp as any).toDate()
                                  : (ex.timestamp as any),
                              ).toLocaleDateString("en-US")
                            : "LOG"}
                        </span>
                        {deletingExhibitionId === ex.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteDoc(doc(db, "exhibitions", ex.id)).catch(
                                  () => {},
                                );
                                setDeletingExhibitionId(null);
                              }}
                              className="flex-1 py-1 bg-red-500 text-white rounded-lg text-[10px] font-bold"
                            >
                              حذف
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingExhibitionId(null);
                              }}
                              className="flex-1 py-1 bg-white/20 text-white rounded-lg text-[10px] font-bold"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingExhibitionId(ex.id);
                            }}
                            className="absolute top-2 left-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white backdrop-blur-md opacity-0 group-hover/ex:opacity-100 transition-all -translate-y-2 group-hover/ex:translate-y-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div
                  className="h-48 flex flex-col items-center justify-center text-center opacity-50 relative group cursor-pointer"
                  onClick={() => fileInputExhibitionRef.current?.click()}
                >
                  <div className="absolute inset-0 border-2 border-dashed border-white/20 rounded-2xl group-hover:border-indigo-500/50 transition-colors" />
                  <ImageIcon
                    size={32}
                    className="text-gray-500 mb-3 group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-500"
                  />
                  <p className="text-xs font-mono text-gray-400">
                    NO MEDIA DETECTED
                    <br />
                    CLICK TO UPLOAD LOG
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
