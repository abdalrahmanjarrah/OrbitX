import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar,
  Info,
  Plus,
  X,
  Star,
  Clock,
  CheckCircle,
  Circle,
  Trash2,
  Flame,
  Tag,
  Zap,
  AlertCircle,
  GripVertical,
  Check,
  Timer,
  Target,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, getWeekStartISO } from "../lib/utils";
import { db, handleFirestoreError, OperationType, auth } from "../firebase";
import {
  collection,
  doc,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  onSnapshot as originalOnSnapshot,
  increment,
  getDocs,
} from "firebase/firestore";
import { ScheduleItem, UserData } from "../shared";
import { requestXpGrant } from "../lib/xpSystem";
import { useLanguage } from "../context/LanguageContext";

// Custom wrapper to intercept onSnapshot errors safely
function onSnapshot(...args: any[]) {
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

const DAYS = [
  "الأحد",
  "الأثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const PRIORITIES = [
  {
    value: "low",
    label: "عادلة",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
  },
  {
    value: "medium",
    label: "متوسطة",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
  },
  {
    value: "high",
    label: "عالية",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
] as const;

const TASK_COLORS = [
  "#38BDF8",
  "#2DD4BF",
  "#8B5CF6",
  "#D946EF",
  "#F43F5E",
  "#F59E0B",
  "#A3E635",
  "#94A3B8",
];

const CATEGORIES = ["دراسة", "مراجعة", "اختبار", "مشروع", "عام"];

export default function ScheduleView({ user }: { user: UserData }) {
  const { isAr, t } = useLanguage();
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New task form state
  const [isCreating, setIsCreating] = useState(false);
  const [day, setDay] = useState(DAYS[new Date().getDay()]); // Current day index
  const [time, setTime] = useState("");
  const [task, setTask] = useState("");
  const [duration, setDuration] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [category, setCategory] = useState("دراسة");
  const [color, setColor] = useState(TASK_COLORS[0]);
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);

  // Filter state
  const [filterMode, setFilterMode] = useState<"all" | "today" | "pending">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(
    DAYS[new Date().getDay()],
  );

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const fetchSchedule = async () => {
      try {
        const q = query(
          collection(db, "users", user.uid, "schedule"),
          firestoreLimit(200),
        );
        const snapshot = await getDocs(q);
        if (isMounted) {
          const fetchedItems = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as ScheduleItem,
          );
          fetchedItems.sort((a, b) =>
            (a.time || "00:00").localeCompare(b.time || "00:00"),
          );
          setItems(fetchedItems);
          setLoading(false);
        }
      } catch (e) {
        handleFirestoreError(
          e,
          OperationType.GET,
          `users/${user.uid}/schedule`,
        );
        if (isMounted) setLoading(false);
      }
    };
    fetchSchedule();
    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  const handleAddItem = async () => {
    if (!time || !task) return;
    try {
      setIsCreating(false);
      const newItemData = {
        day,
        time,
        task,
        userId: user.uid,
        completed: false,
        duration: duration ? parseInt(duration) : 0,
        priority,
        category,
        color,
        timestamp: serverTimestamp(),
      };
      const docRef = await addDoc(
        collection(db, "users", user.uid, "schedule"),
        newItemData,
      );

      setItems((prev) => {
        const next = [
          ...prev,
          {
            id: docRef.id,
            ...newItemData,
            timestamp: null,
          } as any as ScheduleItem,
        ];
        next.sort((a, b) =>
          (a.time || "00:00").localeCompare(b.time || "00:00"),
        );
        return next;
      });

      setTime("");
      setTask("");
      setDuration("");
    } catch (e) {
      handleFirestoreError(
        e,
        OperationType.WRITE,
        `users/${user.uid}/schedule`,
      );
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      // Optimistic delete
      setItems((prev) => prev.filter((i) => i.id !== id));
      await deleteDoc(doc(db, "users", user.uid, "schedule", id));
    } catch (e) {
      handleFirestoreError(
        e,
        OperationType.DELETE,
        `users/${user.uid}/schedule/${id}`,
      );
    }
  };

  const toggleComplete = async (item: ScheduleItem) => {
    try {
      const isNowCompleted = !item.completed;

      // Optimistic update
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, completed: isNowCompleted } : i,
        ),
      );

      const updates: any = { completed: isNowCompleted };

      // Give initial 10 XP if completed for the first time
      // To make it simple and less exploitable, we will just give XP and don't care if they uncheck and check again?
      // ACTUALLY NO, that can be exploited.
      // Best approach: Add a field "rewarded: true"
      updates.completedAt = isNowCompleted ? serverTimestamp() : null;

      if (isNowCompleted && !(item as any).rewarded) {
        updates.rewarded = true;
        // Give XP to user
        requestXpGrant(
          user.uid,
          user.fleetId,
          null,
          false,
          10,
          "task_completed",
          true,
        );
      }

      await updateDoc(doc(db, "users", user.uid, "schedule", item.id), updates);
    } catch (e) {
      handleFirestoreError(
        e,
        OperationType.WRITE,
        `users/${user.uid}/schedule/${item.id}`,
      );
    }
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId);
    e.dataTransfer.setData("itemId", itemId);
    // Needed for visual effect
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetDay: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
    setDraggedItemId(null);

    if (!itemId) return;
    const item = items.find((i) => i.id === itemId);
    if (!item || item.day === targetDay) return;

    try {
      // Optimistic update
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, day: targetDay } : i)),
      );
      await updateDoc(doc(db, "users", user.uid, "schedule", itemId), {
        day: targetDay,
      });
    } catch (err) {
      console.error("Error moving task:", err);
    }
  };

  // derived state
  const currentDayName = DAYS[new Date().getDay()];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterMode === "today" && item.day !== currentDayName) return false;
      if (filterMode === "pending" && item.completed) return false;
      if (
        searchQuery &&
        !item.task.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [items, filterMode, searchQuery, currentDayName]);

  const progress = useMemo(() => {
    if (items.length === 0) return 0;
    // نسبة إنجاز الأسبوع الحقيقية: عدد المهام المنجزة هذا الأسبوع فقط
    // (وفق حقل completedAt) مقسوم على مهام خطة هذا الأسبوع
    // (وفق حقل timestamp — والمهام القديمة بلا timestamp تُعامل كخطة قائمة).
    const weekStartMs = new Date(getWeekStartISO()).getTime();
    const nowMs = Date.now();
    const toMs = (v: unknown): number | null => {
      if (!v) return null;
      if (typeof v === "number") return v;
      if (typeof v === "string") return new Date(v).getTime();
      if (typeof v === "object" && v !== null) {
        const obj = v as { seconds?: number; nanos?: number; toMillis?: () => number };
        if (typeof obj.toMillis === "function") return obj.toMillis();
        if (typeof obj.seconds === "number")
          return obj.seconds * 1000 + (obj.nanos ?? 0) / 1e6;
      }
      return null;
    };
    const inWeek = items.filter((i) => {
      const tMs = toMs((i as unknown as { timestamp?: unknown }).timestamp);
      if (tMs === null) return true;
      return tMs >= weekStartMs && tMs <= nowMs;
    });
    const doneThisWeek = inWeek.filter((i) => {
      if (!i.completed) return false;
      const cMs = toMs((i as unknown as { completedAt?: unknown }).completedAt);
      return cMs !== null && cMs >= weekStartMs;
    }).length;
    if (inWeek.length === 0) return 0;
    return Math.round((doneThisWeek / inWeek.length) * 100);
  }, [items]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 relative min-h-screen">
      {/* Background ambient gradient */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-blue-900/10 to-transparent -z-10 rounded-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-space-dark/80 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/5 sticky top-0 z-30">
        <div className="flex flex-col md:flex-row md:items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white">
                مركز المهام
              </h2>
              <p className="text-sm text-blue-300 font-medium tracking-wide">
                خطط، نفذ، وانطلق
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {/* Progress overview */}
          <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-3 border border-white/10 shrink-0 w-full md:w-auto">
            <div className="text-right flex-1 md:w-32">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-bold text-gray-300" title={isAr ? "تُحتسب المهام المنجزة من بداية الأسبوع (الاثنين) وحتى اليوم" : "Counts tasks completed from the start of the week (Monday) until today"}>نسبة إنجاز الأسبوع كامل</span>
                <span className="text-blue-400 font-bold">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                />
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
              <Target size={20} className="text-blue-400" />
            </div>
          </div>

          <button
            onClick={() => setIsCreating(!isCreating)}
            className="w-full md:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 whitespace-nowrap text-white"
          >
            {isCreating ? <X size={20} /> : <Plus size={20} />}
            <span className="">
              {isCreating ? "إلغاء التخطيط" : "مهمة جديدة"}
            </span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      {!loading && !isCreating && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-64 relative border border-white/10 rounded-xl bg-space-dark focus-within:border-blue-500/50 transition-colors">
            <input
              type="text"
              placeholder={isAr ? "ابحث في مهامك..." : "Search your tasks..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("w-full bg-transparent px-10 py-2.5 text-sm focus:outline-none text-white placeholder-gray-600 font-medium", isAr ? "text-right" : "text-left")}
              dir={isAr ? "rtl" : "ltr"}
            />
            <Search className="absolute top-3 start-3 w-4 h-4 text-gray-500" />
          </div>

          <div className="flex items-center justify-end gap-2 text-sm font-bold bg-space-dark/60 p-1.5 rounded-2xl border border-white/5 w-full md:w-auto overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setFilterMode("all")}
              className={cn(
                "px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap",
                filterMode === "all"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300",
              )}
            >
              <Calendar size={16} /> كل المهام
            </button>
            <button
              onClick={() => setFilterMode("today")}
              className={cn(
                "px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap",
                filterMode === "today"
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm"
                  : "text-gray-500 hover:text-gray-300",
              )}
            >
              <Zap size={16} /> لليوم فقط
            </button>
            <button
              onClick={() => setFilterMode("pending")}
              className={cn(
                "px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap",
                filterMode === "pending"
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm"
                  : "text-gray-500 hover:text-gray-300",
              )}
            >
              <AlertCircle size={16} /> قيد الانتظار
            </button>
          </div>
        </div>
      )}

      {/* Week Strip */}
      {!loading && !isCreating && (
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
          <div className="grid grid-cols-7 gap-2 md:gap-3 min-w-[560px] md:min-w-0">
          {DAYS.map((dayName) => {
            const dayItems = items.filter((i) => i.day === dayName);
            const done = dayItems.filter((i) => i.completed).length;
            const total = dayItems.length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const isToday = dayName === currentDayName;
            const isActive = filterMode === "today" && selectedDay === dayName;
            return (
              <button
                key={dayName}
                onClick={() => {
                  setSelectedDay(dayName);
                  setFilterMode("today");
                }}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 px-1 rounded-2xl border transition-all",
                  isActive
                    ? "bg-blue-500/15 border-blue-500/40 shadow-lg shadow-blue-500/10"
                    : "bg-space-dark/70 border-white/5 hover:border-white/15 hover:bg-white/5",
                )}
              >
                <span
                  className={cn(
                    "text-xs md:text-sm font-black tracking-wide",
                    isToday ? "text-blue-400" : "text-gray-300",
                  )}
                >
                  {dayName}
                </span>
                <div className="flex items-center gap-1 text-[10px] font-bold">
                  <span className={total > 0 && done === total ? "text-green-400" : "text-gray-500"}>
                    {done}/{total}
                  </span>
                </div>
                {total > 0 && (
                  <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        done === total ? "bg-green-500" : "bg-blue-500",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {isToday && (
                  <span className="text-[11px] bg-blue-500 font-bold px-1.5 py-0.5 rounded-full text-white">
                    اليوم
                  </span>
                )}
              </button>
            );
          })}
          </div>
        </div>
      )}

      {/* Task Creation Modal / Dropdown */}
      <AnimatePresence mode="wait">
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="p-6 md:p-8 rounded-3xl bg-gradient-to-b from-[#101223] to-space-dark shadow-2xl border border-blue-500/30 space-y-6 overflow-hidden"
          >
            <h3 className={cn("text-xl font-bold text-blue-300", isAr ? "text-right" : "text-left")}>
              {isAr ? "تفاصيل المهمة الجديدة" : "New Task Details"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Right column in RTL */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className={cn("text-sm font-bold text-gray-400 block", isAr ? "text-right" : "text-left")}>
                    {isAr ? "عنوان المهمة" : "Task Title"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder={isAr ? "مثال: مراجعة فيزياء الوحدة 3" : "e.g. Study Physics Chapter 3"}
                    className={cn("w-full bg-black/40 border border-blue-500/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold placeholder:font-medium placeholder:text-gray-600 transition-all text-white", isAr ? "text-right" : "text-left")}
                    dir={isAr ? "rtl" : "ltr"}
                  />
                </div>

                <div className={cn("flex gap-4", isAr ? "flex-row" : "flex-row-reverse")}>
                  <div className="space-y-2 w-full">
                    <label className={cn("text-sm font-bold text-gray-400 block", isAr ? "text-right" : "text-left")}>
                      {isAr ? "اليوم المستهدف" : "Target Day"}
                    </label>
                    <select
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                      className={cn("w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none text-white text-sm appearance-none cursor-pointer", isAr ? "text-right" : "text-left")}
                      dir={isAr ? "rtl" : "ltr"}
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d} className="bg-space-dark">
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 w-full">
                    <label className={cn("text-sm font-bold text-gray-400 block", isAr ? "text-right" : "text-left")}>
                      {isAr ? "الساعة" : "Time"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className={cn("w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none text-white text-sm cursor-pointer", isAr ? "text-right" : "text-left")}
                      dir={isAr ? "rtl" : "ltr"}
                    />
                  </div>
                </div>
              </div>

              {/* Left column in RTL */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className={cn("text-sm font-bold text-gray-400 block", isAr ? "text-right" : "text-left")}>
                    {isAr ? "الأهمية" : "Priority"}
                  </label>
                  <div className={cn("flex gap-2", isAr ? "flex-row" : "flex-row-reverse")}>
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPriority(p.value as any)}
                        className={cn(
                          "flex-1 py-3 rounded-xl border text-sm font-bold transition-all",
                          priority === p.value
                            ? `${p.bg} ${p.border} ${p.color} ring-1 ring-white/10`
                            : "bg-black/20 border-white/5 text-gray-500 hover:bg-white/5",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={cn("flex gap-4", isAr ? "flex-row" : "flex-row-reverse")}>
                  <div className="space-y-2 w-full">
                    <label className={cn("text-sm font-bold text-gray-400 block", isAr ? "text-right" : "text-left")}>
                      {isAr ? "المدة (دقائق) - اختياري" : "Duration (mins) - Optional"}
                    </label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder={isAr ? "مثال: 45" : "e.g. 45"}
                      className={cn("w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none text-white text-sm placeholder:text-gray-600", isAr ? "text-right" : "text-left")}
                      dir={isAr ? "rtl" : "ltr"}
                    />
                  </div>

                  <div className="space-y-2 w-full">
                    <label className={cn("text-sm font-bold text-gray-400 block", isAr ? "text-right" : "text-left")}>
                      {isAr ? "التصنيف" : "Category"}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={cn("w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none text-white text-sm appearance-none cursor-pointer", isAr ? "text-right" : "text-left")}
                      dir={isAr ? "rtl" : "ltr"}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} className="bg-space-dark">
                          {c === "دراسة" ? (isAr ? "دراسة" : "Study") : c === "مراجعة" ? (isAr ? "مراجعة" : "Review") : c === "اختبار" ? (isAr ? "اختبار" : "Exam") : c === "مشروع" ? (isAr ? "مشروع" : "Project") : (isAr ? "عام" : "General")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Color */}
            <div className="space-y-2">
              <label className={cn("text-sm font-bold text-gray-400 block", isAr ? "text-right" : "text-left")}>
                {isAr ? "لون المهمة" : "Task Color"}
              </label>
              <div className={cn("flex flex-wrap gap-2", isAr ? "flex-row" : "flex-row-reverse")}>
                {TASK_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all hover:scale-110 active:scale-95",
                      color === c
                        ? "border-white ring-2 ring-white/30 scale-110"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`task color ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 space-x-reverse space-x-3">
              <button
                onClick={handleAddItem}
                disabled={!time || !task}
                className="px-8 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all text-white disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                تأكيد المهمة
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Board */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {DAYS.map((d) => (
            <div
              key={d}
              className="h-64 rounded-3xl bg-space-dark animate-pulse border border-white/5 p-4 space-y-4"
            >
              <div className="h-6 bg-white/5 rounded-md w-1/2 mx-auto" />
              <div className="h-20 bg-white/5 rounded-2xl w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-8 pb-10">
          {DAYS.filter((d) =>
            filterMode === "today" ? d === selectedDay : true,
          ).map((dayName) => {
            const dayItems = filteredItems.filter((i) => i.day === dayName);
            const dayCompletedCount = dayItems.filter(
              (i) => i.completed,
            ).length;
            const dayTotal = dayItems.length;
            const isToday = dayName === currentDayName;
            const dayPct = dayTotal
              ? Math.round((dayCompletedCount / dayTotal) * 100)
              : 0;

            return (
              <div
                key={dayName}
                className={cn(
                  "flex flex-col gap-3 p-4 md:p-5 rounded-3xl transition-colors border",
                  isToday
                    ? "bg-blue-500/5 border-blue-500/20"
                    : "bg-space-dark/50 border-white/5",
                )}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, dayName)}
              >
                {/* Day Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Calendar size={18} className="text-blue-400" />
                    </div>
                    <h3
                      className={cn(
                        "text-lg md:text-xl font-black tracking-wide",
                        isToday ? "text-blue-400" : "text-gray-200",
                      )}
                    >
                      {dayName}
                    </h3>
                    {isToday && (
                      <span className="text-[10px] bg-blue-500 font-bold px-2 py-0.5 rounded-full text-white">
                        اليوم
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400">
                      <span
                        className={
                          dayTotal > 0 && dayCompletedCount === dayTotal
                            ? "text-green-400"
                            : "text-blue-400"
                        }
                      >
                        {dayCompletedCount}
                      </span>
                      /{dayTotal}
                    </span>
                    <div className="w-28 h-1.5 bg-black/50 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          dayTotal > 0 && dayCompletedCount === dayTotal
                            ? "bg-green-500"
                            : "bg-gradient-to-r from-blue-500 to-indigo-500",
                        )}
                        style={{ width: `${dayPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                <div className="flex flex-col gap-2.5">
                  <AnimatePresence>
                    {dayItems.map((item) => {
                      const pInfo =
                        PRIORITIES.find((p) => p.value === item.priority) ||
                        PRIORITIES[1];
                      const isCompleted = item.completed;
                      return (
                        <motion.div
                          layoutId={item.id}
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          draggable
                          onDragStart={(e) =>
                            handleDragStart(e as any, item.id)
                          }
                          className={cn(
                            "p-3.5 md:p-4 rounded-2xl border relative group cursor-grab active:cursor-grabbing transition-all",
                            isCompleted
                              ? "bg-space-dark/50 border-white/5 opacity-60"
                              : `bg-[#0e1021] ${pInfo.border} ${pInfo.bg.replace("/10", "/5")}`,
                            draggedItemId === item.id
                              ? "opacity-50 scale-[0.98]"
                              : "",
                          )}
                        >
                          <div className="flex items-center gap-3 md:gap-4">
                            {/* Time Column — clickable to edit */}
                            <div className="shrink-0 w-14 md:w-16 text-center flex flex-col items-center">
                              {editingTimeId === item.id ? (
                                <input
                                  type="time"
                                  defaultValue={item.time}
                                  autoFocus
                                  onBlur={(e) => {
                                    const v = e.target.value;
                                    setEditingTimeId(null);
                                    if (!v) {
                                      setItems((prev) =>
                                        prev.map((i) =>
                                          i.id === item.id
                                            ? { ...i, time: item.time }
                                            : i,
                                        ),
                                      );
                                      return;
                                    }
                                    if (v !== item.time) {
                                      updateDoc(
                                        doc(db, "users", user.uid, "schedule", item.id),
                                        { time: v },
                                      ).catch((err: any) =>
                                        handleFirestoreError(
                                          err,
                                          OperationType.WRITE,
                                          `users/${user.uid}/schedule/${item.id}`,
                                        ),
                                      );
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  className="w-full bg-black/40 border border-blue-500/30 rounded-lg px-1.5 py-1 text-center text-sm md:text-base font-black text-white cursor-pointer"
                                  dir="ltr"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingTimeId(item.id)}
                                  title={isAr ? "اضغط لتغيير الوقت" : "Click to change time"}
                                  className={cn(
                                    "relative transition-colors",
                                    isCompleted
                                      ? "text-gray-500 hover:text-blue-400"
                                      : "text-white hover:text-blue-400",
                                  )}
                                  dir="ltr"
                                >
                                  {item.time}
                                  <Clock
                                    size={10}
                                    className="absolute -top-1 -right-2 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  />
                                </button>
                              )}
                              {(item.duration ? item.duration > 0 : false) && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                                  <Timer size={9} />
                                  {item.duration}د
                                </span>
                              )}
                            </div>

                            {/* Accent Stripe (task color or priority) */}
                            <div
                              className={cn(
                                "w-1 self-stretch rounded-full shrink-0",
                                isCompleted ? "bg-gray-700" : pInfo.bg.replace("/10", "/60"),
                              )}
                              style={
                                !isCompleted && item.color
                                  ? { backgroundColor: item.color }
                                  : undefined
                              }
                            />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "font-bold text-sm md:text-base truncate transition-colors",
                                  isCompleted
                                    ? "text-gray-500 line-through"
                                    : "text-white",
                                )}
                              >
                                {item.task}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
                                  <Tag size={9} />
                                  {item.category || "عام"}
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                    isCompleted
                                      ? "bg-white/5 border-white/10 text-gray-500"
                                      : `${pInfo.bg} ${pInfo.border} ${pInfo.color}`,
                                  )}
                                >
                                  {pInfo.label}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(item.id);
                                }}
                                className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                                title={isAr ? "حذف" : "Delete"}
                              >
                                <Trash2 size={13} />
                              </button>
                              <button
                                onClick={() => toggleComplete(item)}
                                className={cn(
                                  "p-2 rounded-xl transition-all border",
                                  isCompleted
                                    ? "bg-green-500 border-green-400 text-white shadow-green-500/20"
                                    : "bg-black/30 border-white/10 hover:border-blue-500 hover:bg-blue-500/10 text-gray-500 hover:text-blue-400",
                                )}
                                title={isAr ? "إنجاز" : "Complete"}
                              >
                                <Check
                                  size={15}
                                  className={cn(
                                    "transition-transform duration-300",
                                    isCompleted ? "scale-100" : "scale-0",
                                  )}
                                />
                                {!isCompleted && (
                                  <div className="w-3.5 h-3.5 rounded-full" />
                                )}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {dayItems.length === 0 && (
                    <div className="border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center p-6 text-center opacity-50 pointer-events-none min-h-[90px]">
                      <GripVertical className="text-white/10 mb-2" size={20} />
                      <p className="text-xs text-gray-500 font-bold">
                        {isAr ? "لا مهام لهذا اليوم — اسحب مهمة هنا" : "No tasks — drag a task here"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
