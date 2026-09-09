import React, { useState, useEffect } from "react";
import {
  Shield,
  Users,
  Activity,
  Terminal as TerminalIcon,
  AlertTriangle,
  ShieldAlert,
  Zap,
  Database,
  Cpu,
  Globe2,
  Radio,
  Server,
  Trash2,
  CheckCircle,
  Settings,
  MessageSquare,
  MessageCircle,
  ImageIcon,
  Plus,
  X,
  Lock,
  Unlock,
  Eye,
  BarChart3,
  Search,
  Crosshair,
  Video,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "../lib/utils";
import { db, handleFirestoreError, OperationType } from "../firebase";
import {
  getQueueSnapshot,
  subscribeToErrorQueue,
  dismissError,
  clearQueue,
  downloadQueue,
  areErrorNotificationsEnabled,
  setErrorNotificationsEnabled,
  type QueuedError,
} from "../lib/errorQueue";
import {
  getRecentSession,
  subscribeToSession,
  clearSessionTape,
  type SessionEvent,
} from "../lib/sessionRecorder";
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { UserData, Discussion } from "../shared";
import { adminSetXP } from "../lib/xpSystem";
import { showToast, confirmDialog } from "../lib/cosmicUI";

// In-memory module cache to prevent aggressive Firestore read billing on Admin tab swaps / re-renders
let lastAdminFetchTime = 0;
let cachedUsers: UserData[] = [];
let cachedSuggestions: any[] = [];
let cachedExhibitions: any[] = [];
let cachedDiscussions: Discussion[] = [];
let cachedSupportTickets: any[] = [];
let cachedErrorLogs: any[] = [];

import { useLanguage } from "../context/LanguageContext";

export default function AdminView({ user }: { user: UserData }) {
  const { isAr, t } = useLanguage();
  const [users, setUsers] = useState<UserData[]>(() => cachedUsers);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>(
    () => cachedSuggestions,
  );
  const [exhibitions, setExhibitions] = useState<any[]>(
    () => cachedExhibitions,
  );
  const [discussions, setDiscussions] = useState<Discussion[]>(
    () => cachedDiscussions,
  );
  const [supportTickets, setSupportTickets] = useState<any[]>(
    () => cachedSupportTickets,
  );
  const [errorLogs, setErrorLogs] = useState<any[]>(() => cachedErrorLogs);
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueuedError[]>(() => getQueueSnapshot().errors);
  useEffect(() => {
    return subscribeToErrorQueue(() => {
      setQueue(getQueueSnapshot().errors);
    });
  }, []);
  const [errorNotify, setErrorNotify] = useState<boolean>(() => areErrorNotificationsEnabled());
  const [sessionEvts, setSessionEvts] = useState<SessionEvent[]>(() => getRecentSession(60));
  useEffect(() => {
    return subscribeToSession(() => {
      setSessionEvts(getRecentSession(60));
    });
  }, []);
  const [announcementText, setAnnouncementText] = useState("");
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateVersion, setUpdateVersion] = useState("");
  const [updateDescription, setUpdateDescription] = useState("");
  const [replySuggestionId, setReplySuggestionId] = useState<string | null>(null);
  const [suggestionReplyText, setSuggestionReplyText] = useState("");

  // Anomaly Data Simulation
  const systemData = [
    { time: "00:00", load: 30, anomalies: 0 },
    { time: "04:00", load: 45, anomalies: 1 },
    { time: "08:00", load: 80, anomalies: 5 },
    { time: "12:00", load: 60, anomalies: 2 },
    { time: "16:00", load: 90, anomalies: 8 },
    { time: "20:00", load: 50, anomalies: 0 },
  ];

  const handleSendAnnouncement = async () => {
    if (!announcementText.trim()) return;
    try {
      await addDoc(collection(db, "global_notifications"), {
        text: announcementText,
        timestamp: Date.now(),
        adminId: user.uid,
      });
      setAnnouncementText("");
      showToast(isAr ? "تم إرسال الإعلان لجميع المستخدمين." : "Announcement dispatched to all users.", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "global_notifications");
    }
  };

  const handleEmergencyAlert = async () => {
    if (!announcementText.trim()) return;
    if (
      !(await confirmDialog(
        isAr
          ? "هل أنت متأكد من إطلاق تنبيه طوارئ عام؟ سيتم مقاطعة الجميع!"
          : "Are you sure you want to trigger a GLOBAL EMERGENCY ALERT? This will interrupt everyone!",
        { title: isAr ? "تنبيه طوارئ" : "Emergency alert", danger: true },
      ))
    )
      return;
    try {
      await addDoc(collection(db, "admin_alerts"), {
        message: announcementText,
        adminId: user.uid,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
      setAnnouncementText("");
      showToast(isAr ? "تم إطلاق تنبيه الطوارئ!" : "EMERGENCY ALERT dispatched!", "warning");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "admin_alerts");
    }
  };

  const handlePublishUpdate = async () => {
    if (!updateTitle.trim() || !updateDescription.trim()) {
      showToast("الرجاء إدخال عنوان التحديث والوصف لمتابعة النشر!", "warning");
      return;
    }
    try {
      await addDoc(collection(db, "app_updates"), {
        title: updateTitle.trim(),
        version: updateVersion.trim() || "تحديث للمنظومة الكونية 🚀",
        description: updateDescription.trim(),
        timestamp: Date.now(),
        adminId: user.uid,
      });
      setUpdateTitle("");
      setUpdateVersion("");
      setUpdateDescription("");
      showToast("🎉 تم نشر وتعميم التحديث الجديد بنجاح على جميع الأعضاء!", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "app_updates");
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      const now = Date.now();
      if (now - lastAdminFetchTime < 30000 && cachedUsers.length > 0) {
        if (isMounted) {
          setUsers(cachedUsers);
          setSuggestions(cachedSuggestions);
          setExhibitions(cachedExhibitions);
          setDiscussions(cachedDiscussions);
          setSupportTickets(cachedSupportTickets);
          setErrorLogs(cachedErrorLogs);
        }
        return;
      }

      try {
        const usersSnap = await getDocs(
          query(
            collection(db, "profiles"),
            orderBy("lastActiveTime", "desc"),
            limit(100),
          ),
        );
        const fetchedUsers = usersSnap.docs.map(
          (doc) => doc.data() as UserData,
        );
        if (isMounted) setUsers(fetchedUsers);

        const suggestionsSnap = await getDocs(
          query(
            collection(db, "suggestions"),
            orderBy("timestamp", "desc"),
            limit(50),
          ),
        );
        const fetchedSuggestions = suggestionsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        if (isMounted) setSuggestions(fetchedSuggestions);

        const exhibitionsSnap = await getDocs(
          query(
            collection(db, "exhibitions"),
            orderBy("timestamp", "desc"),
            limit(50),
          ),
        );
        const fetchedExhibitions = exhibitionsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        if (isMounted) setExhibitions(fetchedExhibitions);

        const discussionsSnap = await getDocs(
          query(
            collection(db, "discussions"),
            orderBy("timestamp", "desc"),
            limit(50),
          ),
        );
        const fetchedDiscussions = discussionsSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Discussion,
        );
        if (isMounted) setDiscussions(fetchedDiscussions);

        const supportSnap = await getDocs(
          query(
            collection(db, "support_tickets"),
            orderBy("createdAt", "desc"),
            limit(50),
          ),
        );
        const fetchedSupportTickets = supportSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        if (isMounted) setSupportTickets(fetchedSupportTickets);

        const errorSnap = await getDocs(
          query(
            collection(db, "errors"),
            orderBy("ts", "desc"),
            limit(50),
          ),
        );
        const fetchedErrorLogs = errorSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        if (isMounted) setErrorLogs(fetchedErrorLogs);
        cachedErrorLogs = fetchedErrorLogs;

        // Update in-memory session cache
        lastAdminFetchTime = now;
        cachedUsers = fetchedUsers;
        cachedSuggestions = fetchedSuggestions;
        cachedExhibitions = fetchedExhibitions;
        cachedDiscussions = fetchedDiscussions;
        cachedSupportTickets = fetchedSupportTickets;
      } catch (e) {
        console.warn(e);
      }
    };
    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeUsers = users.filter(
    (u) => Date.now() - (u.lastActiveTime || 0) < 300000,
  ).length;
  const totalUsers = users.length;
  const sysHealth = activeUsers > 50 ? 85 : 98;
  const openTickets = supportTickets.filter((t) => t.status === "open").length;
  const openSuggestions = suggestions.length;

  const handleSuggestionReply = async (id: string) => {
    if (!suggestionReplyText.trim()) return;
    try {
      await updateDoc(doc(db, "suggestions", id), {
        reply: suggestionReplyText.trim(),
        repliedAt: serverTimestamp(),
      });
      const updatedSuggestions = suggestions.map((s) =>
        s.id === id ? { ...s, reply: suggestionReplyText.trim() } : s,
      );
      setSuggestions(updatedSuggestions);
      cachedSuggestions = updatedSuggestions;
      setReplySuggestionId(null);
      setSuggestionReplyText("");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `suggestions/${id}`);
    }
  };

  const handleBanUser = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "users", uid), { banned: !currentStatus });
      await updateDoc(doc(db, "profiles", uid), { banned: !currentStatus });
      // Invalidate the cache to ensure the user list is re-fetched next time
      lastAdminFetchTime = 0;
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleDeleteDoc = async (col: string, id: string) => {
    try {
      await deleteDoc(doc(db, col, id));
      // Update local state and the corresponding cached arrays directly to avoid redundant bulk reads
      if (col === "suggestions") {
        setSuggestions((prev) => {
          const next = prev.filter((item) => item.id !== id);
          cachedSuggestions = next;
          return next;
        });
      } else if (col === "exhibitions") {
        setExhibitions((prev) => {
          const next = prev.filter((item) => item.id !== id);
          cachedExhibitions = next;
          return next;
        });
      } else if (col === "discussions") {
        setDiscussions((prev) => {
          const next = prev.filter((item) => item.id !== id);
          cachedDiscussions = next;
          return next;
        });
      } else if (col === "support_tickets") {
        setSupportTickets((prev) => {
          const next = prev.filter((item) => item.id !== id);
          cachedSupportTickets = next;
          return next;
        });
      } else if (col === "errors") {
        setErrorLogs((prev) => {
          const next = prev.filter((item) => item.id !== id);
          cachedErrorLogs = next;
          return next;
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `${col}/${id}`);
    }
  };

  const handleClearErrorLog = async () => {
    if (!(await confirmDialog(
      isAr
        ? "هل أنت متأكد من مسح سجل الأخطاء بالكامل؟"
        : "Are you sure you want to clear the entire error log?",
      { title: isAr ? "مسح سجل الأخطاء" : "Clear error log", danger: true },
    ))) return;
    try {
      await Promise.allSettled(
        errorLogs.map((e) => deleteDoc(doc(db, "errors", e.id))),
      );
      setErrorLogs([]);
      cachedErrorLogs = [];
      showToast(isAr ? "تم مسح سجل الأخطاء." : "Error log cleared.", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, "errors/*");
    }
  };

  const formatErrorTime = (ts: any): string => {
    if (!ts) return "—";
    const n = typeof ts === "number" ? ts : Number(ts);
    if (!Number.isFinite(n)) return String(ts);
    const diff = Date.now() - n;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(n).toLocaleDateString();
  };

  return (
    <div
      className="min-h-screen bg-[#020308] text-cyan-50 font-mono p-4 md:p-8 space-y-8 relative overflow-x-hidden"
      dir="ltr"
    >
      {/* Background Grid & Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,#020308_100%)] z-0" />

      {/* Header */}
      <header className="relative z-10 flex flex-col md:flex-row justify-between items-center border-b border-cyan-500/30 pb-6 mb-8 drop-shadow-[0_0_15px_rgba(0,255,255,0.3)]">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Shield className="w-12 h-12 text-cyan-400" />
            <div className="absolute inset-0 animate-ping opacity-50">
              <Shield className="w-12 h-12 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
              ORBITX OVERSEER
            </h1>
            <p className="text-cyan-500/80 text-sm tracking-widest uppercase">
              {isAr ? "مركز القيادة والتحكم العام" : "Global Command & Control Hub"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-4 md:mt-0">
          <div className="flex flex-col items-end">
            <span className="text-xs text-cyan-600 uppercase">{isAr ? "توقيت النظام" : "System Time"}</span>
            <span className="text-xl font-bold font-mono text-cyan-300">
              {new Date().toLocaleTimeString("en-US", { hour12: false })}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-cyan-600 uppercase">
              Admin Clearance
            </span>
            <span className="text-xl font-bold font-mono text-fuchsia-500">
              LEVEL OMEGA
            </span>
          </div>
        </div>
      </header>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Core System Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#050B14] border border-cyan-500/30 p-6 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.1)_inset]">
            <h3 className="text-cyan-400 font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
              <Server size={18} /> Core Telemetry
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-cyan-500/20 pb-2">
                <span className="text-cyan-600 uppercase text-xs">
                  System Health
                </span>
                <span className="text-green-400 font-bold">{sysHealth}%</span>
              </div>
              <div className="flex justify-between items-center border-b border-cyan-500/20 pb-2">
                <span className="text-cyan-600 uppercase text-xs">
                  Active Sessions
                </span>
                <span className="text-cyan-400 font-bold">{activeUsers}</span>
              </div>
              <div className="flex justify-between items-center border-b border-cyan-500/20 pb-2">
                <span className="text-cyan-600 uppercase text-xs">
                  Total Users
                </span>
                <span className="text-blue-400 font-bold">{totalUsers}</span>
              </div>
              <div className="flex justify-between items-center border-b border-cyan-500/20 pb-2">
                <span className="text-cyan-600 uppercase text-xs">
                  Open Tickets
                </span>
                <span className="text-amber-400 font-bold">{openTickets}</span>
              </div>
              <div className="flex justify-between items-center border-b border-cyan-500/20 pb-2">
                <span className="text-cyan-600 uppercase text-xs">
                  Incoming Ideas
                </span>
                <span className="text-fuchsia-400 font-bold">{openSuggestions}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#050B14] border border-fuchsia-500/30 p-6 rounded-xl shadow-[0_0_30px_rgba(255,0,255,0.05)_inset]">
            <h3 className="text-fuchsia-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={18} /> Server Anomaly Sensor
            </h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={systemData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#00FFFF"
                    opacity={0.1}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#00FFFF"
                    opacity={0.5}
                    fontSize={10}
                  />
                  <YAxis stroke="#00FFFF" opacity={0.5} fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#050B14",
                      borderColor: "#00FFFF",
                      color: "#00FFFF",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="anomalies"
                    stroke="#FF00FF"
                    strokeWidth={2}
                    dot={{ r: 2, fill: "#FF00FF" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#050B14] border border-yellow-500/30 p-6 rounded-xl shadow-[0_0_30px_rgba(255,255,0,0.05)_inset]">
            <h3 className="text-yellow-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <Radio size={18} /> {isAr ? "البث العام" : "Global Broadcast"}
            </h3>
            <div className="space-y-4">
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder={isAr ? "اكتب رسالة البث..." : "Enter broadcast message..."}
                className="w-full bg-[#020308] border border-yellow-900 rounded p-2 text-yellow-300 focus:outline-none focus:border-yellow-400 font-mono text-xs min-h-[80px]"
              />
              <button
                onClick={handleSendAnnouncement}
                className="w-full bg-yellow-600/20 text-yellow-400 border border-yellow-500 py-2 text-xs font-bold uppercase hover:bg-yellow-500 hover:text-[#020308] transition-all cursor-pointer"
              >
                Execute Broadcast
              </button>
              <button
                onClick={handleEmergencyAlert}
                className="w-full mt-2 bg-red-600/20 text-red-500 border border-red-600 py-2 text-xs font-bold uppercase hover:bg-red-600 hover:text-white transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] animate-pulse cursor-pointer"
              >
                TRIGGER EMERGENCY ALERT
              </button>
            </div>
          </div>

          {/* New Cosmic App Updates Deployer Card */}
          <div
            className="bg-[#050B14] border border-fuchsia-500/30 p-6 rounded-xl shadow-[0_0_30px_rgba(236,72,153,0.05)_inset] space-y-4"
            dir={isAr ? "rtl" : "ltr"}
          >
            <h3 className={cn("text-fuchsia-400 font-bold tracking-widest flex items-center gap-2 text-sm sm:text-base", isAr ? "text-right justify-end" : "text-left justify-start")}>
              <span>{isAr ? "بث تحديث جديد للمنصة" : "Broadcast Platform Update"}</span>
              <Zap size={18} className="text-fuchsia-400 animate-pulse" />
            </h3>
            <p className={cn("text-[11px] text-gray-400 border-b border-fuchsia-950 pb-2", isAr ? "text-right" : "text-left")}>
              {isAr
                ? "سيظهر هذا التحديث لجميع المستخدمين في منتصف الشاشة ولن يتكرر بمجرد إغلاقه."
                : "This update will pop up in the center screen for all users, only once."}
            </p>
            <div className={cn("space-y-3", isAr ? "text-right" : "text-left")}>
              <div>
                <label className="text-fuchsia-300 text-xs font-bold block mb-1">
                  {isAr ? "عنوان التحديث الرئيسي 🚀" : "Primary Update Title 🚀"}
                </label>
                <input
                  type="text"
                  value={updateTitle}
                  onChange={(e) => setUpdateTitle(e.target.value)}
                  placeholder={isAr ? "مثال: إضافة قسم تحدي الفضاء والمجلس المطور" : "e.g. Added Galactic Space Challenges"}
                  className={cn("w-full bg-[#020308] border border-fuchsia-900/60 rounded p-2 text-fuchsia-200 focus:outline-none focus:border-fuchsia-500 text-xs font-sans placeholder-gray-600", isAr ? "text-right" : "text-left")}
                />
              </div>
              <div>
                <label className="text-fuchsia-300 text-xs font-bold block mb-1">
                  {isAr ? "رقم الإصدار والترميز 🏷️" : "Version Number & Code 🏷️"}
                </label>
                <input
                  type="text"
                  value={updateVersion}
                  onChange={(e) => setUpdateVersion(e.target.value)}
                  placeholder={isAr ? "مثال: الإصدار الجديد v2.1.0" : "e.g. New Release v2.1.0"}
                  className={cn("w-full bg-[#020308] border border-fuchsia-900/60 rounded p-2 text-fuchsia-200 focus:outline-none focus:border-fuchsia-500 text-xs font-sans placeholder-gray-600", isAr ? "text-right" : "text-left")}
                />
              </div>
              <div>
                <label className="text-fuchsia-300 text-xs font-bold block mb-1">
                  {isAr ? "مميزات التحديث (كل ميزة بسطر جديد) ✨" : "Update Features (one per line) ✨"}
                </label>
                <textarea
                  value={updateDescription}
                  onChange={(e) => setUpdateDescription(e.target.value)}
                  placeholder={isAr ? "مثال:\n• قمنا بحل مشكلة الإعجابات المزيفة بالنقاشات\n• أضفنا إمكانية حذف النقاشات والردود فوراً" : "e.g.\n• Added personal task lists\n• Built multi-lingual language support context"}
                  className={cn("w-full bg-[#020308] border border-fuchsia-900/60 rounded p-2 text-fuchsia-200 focus:outline-none focus:border-fuchsia-500 text-xs font-sans min-h-[120px] leading-relaxed placeholder-gray-600", isAr ? "text-right" : "text-left")}
                />
              </div>
              <button
                onClick={handlePublishUpdate}
                className="w-full bg-fuchsia-600/25 hover:bg-fuchsia-600 text-fuchsia-300 hover:text-white border border-fuchsia-500 py-2.5 rounded text-xs font-black transition-all shadow-[0_2px_12px_rgba(236,72,153,0.15)] hover:shadow-[0_4px_20px_rgba(236,72,153,0.35)] cursor-pointer"
              >
                {isAr ? "إطلاق ونشر مصفوفة التحديث 🌌" : "Publish & Launch Update Matrix 🌌"}
              </button>
            </div>
          </div>
        </div>

        {/* Global User Monitoring */}
        <div className="lg:col-span-3 bg-[#050B14] border border-cyan-500/30 p-6 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.1)_inset] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <Crosshair size={18} /> {isAr ? "تتبع الطواقم النشطة" : "Active Personnel Tracking"}
            </h3>
            <div className="relative border border-cyan-500/50 rounded flex items-center">
              <Search className="absolute left-2 w-4 h-4 text-cyan-500" />
              <input
                type="text"
                placeholder={isAr ? "معرف التتبع أو الاسم..." : "Trace ID or Handle..."}
                className="bg-[#020308] text-cyan-300 w-full pl-8 pr-2 py-1 text-sm focus:outline-none focus:shadow-[0_0_10px_rgba(0,255,255,0.5)] transition-all rounded"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 max-h-[460px]">
            {users.map((u) => (
              <div
                key={u.uid}
                className="bg-[#020308] border border-cyan-900 hover:border-cyan-500 transition-colors rounded p-3 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={
                        u.photoURL ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${u.uid}`
                      }
                      alt="Avatar"
                      className="w-10 h-10 rounded border border-cyan-700 object-cover"
                    />
                    {Date.now() - (u.lastActiveTime || 0) < 300000 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_lime]"></div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-cyan-100 flex items-center gap-2">
                      {u.displayName}
                      <span className="text-[11px] px-1.5 py-0.5 border border-cyan-800 rounded bg-cyan-950 text-cyan-400">
                        LVL {u.level}
                      </span>
                    </div>
                    <div className="text-xs text-cyan-600 font-mono mt-1">
                      {isAr ? "الحالة:" : "STATUS:"}{" "}
                      <span className="text-cyan-400">
                        {u.currentActivity || (isAr ? "خامل" : "IDLE")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingUser(u)}
                    className="p-2 border border-blue-900 text-blue-500 hover:border-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-all"
                    title={isAr ? "تعديل الصلاحيات" : "Modify Clearance"}
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    onClick={() => handleBanUser(u.uid, !!u.banned)}
                    className={cn(
                      "p-2 border rounded transition-all",
                      u.banned
                        ? "border-green-900 text-green-500 hover:bg-green-900/30"
                        : "border-red-900 text-red-500 hover:bg-red-900/30 hover:border-red-500",
                    )}
                    title={u.banned ? (isAr ? "إعادة الوصول" : "Restore Access") : isAr ? "إلغاء الوصول" : "Revoke Access"}
                  >
                    {u.banned ? <Unlock size={16} /> : <Lock size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SIGNALS INTERCEPT (suggestions + support tickets) — temporarily removed from admin panel.
        Signals Intercept card
        <div className="bg-[#050B14] border border-cyan-500/30 p-6 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.1)_inset] lg:col-span-2">
          <h3 className="text-cyan-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <Radio size={18} /> Signals Intercept (Reports & Ideas)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              <h4 className="text-[10px] text-orange-600 uppercase border-b border-orange-900 pb-1 mb-2 space-y-2">
                Support Tickets
              </h4>
              {supportTickets.map((s) => (
                <div
                  key={s.id}
                  className="bg-[#020308] border-l-2 border-l-orange-500 p-2 text-xs flex justify-between group"
                >
                  <div className="truncate pr-4 w-full">
                    <span className="text-orange-300 font-bold block mb-1">
                      {s.userName} ({s.userEmail})
                    </span>
                    <span className="text-cyan-300 block whitespace-pre-wrap leading-relaxed">
                      {s.text}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteDoc("support_tickets", s.id)}
                    className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {supportTickets.length === 0 && (
                <span className="text-xs text-orange-800">
                  NO SUPPORT TICKETS
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              <h4 className="text-[10px] text-cyan-600 uppercase border-b border-cyan-900 pb-1 mb-2 space-y-2">
                Suggestions Stream
              </h4>
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="bg-[#020308] border-l-2 border-l-yellow-500 p-2 text-xs flex flex-col gap-1 group"
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-cyan-300 break-words">{s.text}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setReplySuggestionId(s.id);
                          setSuggestionReplyText(s.reply || "");
                        }}
                        className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Reply"
                      >
                        <MessageSquare size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc("suggestions", s.id)}
                        className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  {replySuggestionId === s.id && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        value={suggestionReplyText}
                        onChange={(e) => setSuggestionReplyText(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSuggestionReply(s.id)
                        }
                        placeholder="Reply..."
                        className="flex-1 bg-[#0a1120] border border-cyan-800 rounded px-2 py-1 text-cyan-200 text-[11px] outline-none focus:border-cyan-500"
                        dir="ltr"
                      />
                      <button
                        onClick={() => handleSuggestionReply(s.id)}
                        className="text-[10px] bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded font-bold"
                      >
                        OK
                      </button>
                    </div>
                  )}
                  {s.reply && (
                    <div className="mt-1 pl-2 border-l-2 border-cyan-500 text-cyan-400">
                      <span className="font-bold">ADMIN:</span> {s.reply}
                    </div>
                  )}
                </div>
              ))}
              {suggestions.length === 0 && (
                <span className="text-xs text-cyan-800">
                  NO INCOMING SIGNALS
                </span>
              )}
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              <h4 className="text-[10px] text-cyan-600 uppercase border-b border-cyan-900 pb-1 mb-2">
                Hivemind Nexus (Discussions)
              </h4>
              {discussions.map((d) => (
                <div
                  key={d.id}
                  className="bg-[#020308] border-l-2 border-l-blue-500 p-2 text-xs flex justify-between group"
                >
                  <span className="text-cyan-300 truncate pr-4">{d.title}</span>
                  <button
                    onClick={() => handleDeleteDoc("discussions", d.id)}
                    className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {discussions.length === 0 && (
                <span className="text-xs text-cyan-800">
                  NO INCOMING SIGNALS
                </span>
              )}
            </div>
          </div>
        </div>
*/}

        {/* Error Queue — الفلتر المركزي للأخطاء (حل سريع دونك ما تغوص بالتفاصيل) */}
        <div className="bg-[#050B14] border border-amber-500/30 p-6 rounded-xl shadow-[0_0_30px_rgba(255,150,0,0.08)_inset] lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-amber-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle size={18} /> {isAr ? "فلتر الأخطاء المركزي" : "Central Error Queue"}
              </h3>
              <span className="text-[9px] text-amber-300/60 border border-amber-500/30 rounded px-1.5 py-0.5">
                {isAr ? "متجمعات + عدّادات" : "aggregated"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(["critical", "high", "medium", "low"] as const).map((sev) => {
                  if (!queue.some((e) => e.severity === sev)) return null;
                  const colors: Record<string, string> = {
                    critical: "bg-red-500/20 text-red-300 border-red-500/40",
                    high: "bg-orange-500/20 text-orange-300 border-orange-500/40",
                    medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
                    low: "bg-sky-500/20 text-sky-300 border-sky-500/40",
                  };
                  return (
                    <span key={sev} className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${colors[sev]}`}>
                      {sev} {queue.filter((e) => e.severity === sev).length}
                    </span>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  clearQueue();
                  showToast("تم مسح فلتر الأخطاء", "success");
                }}
                disabled={queue.length === 0}
                className="text-[10px] bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded font-bold transition-colors disabled:opacity-30"
              >
                {isAr ? "مسح الفلتر" : "Clear"}
              </button>
              <button
                onClick={() => downloadQueue()}
                disabled={queue.length === 0}
                className="text-[10px] bg-sky-600 hover:bg-sky-500 text-white px-2 py-1 rounded font-bold transition-colors disabled:opacity-30"
              >
                {isAr ? "تنزيل تقرير" : "Download"}
              </button>
              <button
                onClick={() => {
                  const next = !errorNotify;
                  const ok = setErrorNotificationsEnabled(next);
                  if (ok) {
                    setErrorNotify(next);
                    showToast(
                      next
                        ? "سأصلك إشعار فوري عند أي خطأ حرج/عالٍ"
                        : "أُطفئت إشعارات الأخطاء",
                      "success",
                    );
                  }
                }}
                className={`text-[10px] px-2 py-1 rounded font-bold transition-colors ${
                  errorNotify
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-200"
                }`}
              >
                {errorNotify
                  ? (isAr ? "🔔 الإشعارات مفعّلة" : "🔔 Notifications ON")
                  : (isAr ? "🔕 فعّل الإشعارات" : "🔕 Enable alerts")}
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
            {queue.length === 0 && (
              <div className="text-center py-8">
                <Shield size={28} className="mx-auto mb-2 text-emerald-500" />
                <p className="text-emerald-400 text-xs font-bold">
                  {isAr ? "الفلتر نظيف. كل شيء تحت السيطرة 🚀" : "Queue is clean. All under control 🚀"}
                </p>
              </div>
            )}
            {queue.map((e) => (
              <div
                key={e.id}
                className={`bg-[#020308] border p-3 text-xs group ${
                  e.dismissed ? "opacity-40 border-gray-800" : "border-amber-900/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpandedErrorId(expandedErrorId === e.id ? null : e.id)}
                    className="text-left flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                          e.severity === "critical"
                            ? "bg-red-500/25 text-red-300"
                            : e.severity === "high"
                              ? "bg-orange-500/25 text-orange-300"
                              : e.severity === "medium"
                                ? "bg-yellow-500/20 text-yellow-300"
                                : "bg-sky-500/20 text-sky-300"
                        }`}
                      >
                        {e.severity}
                      </span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                        {e.source}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-bold">
                        ×{e.count}
                      </span>
                      <span className="text-[9px] text-gray-500">
                        {formatErrorTime(e.lastAt)}
                      </span>
                      {e.dismissed && (
                        <span className="text-[9px] text-gray-500">({isAr ? "مخفِ" : "dismissed"})</span>
                      )}
                    </div>
                    <div className="text-amber-100 break-words leading-relaxed" dir="ltr">
                      {e.message}
                    </div>
                  </button>
                  <button
                    onClick={() => dismissError(e.id)}
                    className="text-gray-500 hover:text-amber-300 shrink-0 mt-1"
                    title={isAr ? "إخفاء" : "Dismiss"}
                  >
                    <Eye size={13} />
                  </button>
                </div>
                {expandedErrorId === e.id && (
                  <div className="mt-2 pt-2 border-t border-amber-900/40 space-y-1">
                    {e.stack && (
                      <pre
                        className="mt-1 p-2 bg-black/40 rounded text-[9px] text-orange-300 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar"
                        dir="ltr"
                      >
                        {e.stack}
                      </pre>
                    )}
                    {e.context && (
                      <pre className="text-[9px] text-gray-500 overflow-x-auto whitespace-pre-wrap" dir="ltr">
                        {JSON.stringify(e.context, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* كاميرا الجلسة — شريط واحد يرصد كل ما عمله المستخدم */}
        <div className="bg-[#050B14] border border-cyan-500/30 p-6 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.06)_inset] lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <Video size={18} /> {isAr ? "كاميرا الجلسة (الإثبات)" : "Session Camera"}
              </h3>
              <span className="text-[9px] text-cyan-300/60 border border-cyan-500/30 rounded px-1.5 py-0.5">
                {isAr ? "آخر ما صار بالموقع" : "recent actions"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-cyan-300/60">
                {sessionEvts.length} {isAr ? "حدث" : "events"}
              </span>
              <button
                onClick={() => {
                  clearSessionTape();
                  showToast("تم مسح شريط الكاميرا", "success");
                }}
                disabled={sessionEvts.length === 0}
                className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded font-bold transition-colors disabled:opacity-30"
              >
                {isAr ? "مسح الشريط" : "Clear"}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar pr-1">
            {sessionEvts.length === 0 && (
              <div className="text-center py-8">
                <Eye size={26} className="mx-auto mb-2 text-cyan-500" />
                <p className="text-cyan-400/80 text-xs font-bold">
                  {isAr
                    ? "الشريط فاضي حالياً — أي كبسة أو تنقل أو تنبيه رح يُسجّل لحظياً."
                    : "Tape is empty — clicks, navigation and warnings will be recorded live."}
                </p>
              </div>
            )}
            {[...sessionEvts].reverse().map((ev, i) => (
              <div
                key={`${ev.at}-${i}`}
                className="flex items-start gap-2 bg-[#020308] border border-cyan-900/30 p-2 text-[11px] group"
              >
                <span className="text-[9px] text-gray-500 mt-0.5 shrink-0 tabular-nums">
                  {formatErrorTime(ev.at)}
                </span>
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.5 rounded shrink-0 font-bold ${
                    ev.kind === "click"
                      ? "bg-cyan-500/20 text-cyan-300"
                      : ev.kind === "console"
                        ? "bg-amber-500/20 text-amber-300"
                        : ev.kind === "key"
                          ? "bg-indigo-500/20 text-indigo-300"
                          : "bg-gray-600/20 text-gray-300"
                  }`}
                >
                  {ev.kind}
                </span>
                <span className="text-gray-300 break-words leading-relaxed" dir="auto">
                  {ev.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Log — كاميرا الأمان للتطبيق */}
        <div className="bg-[#050B14] border border-red-500/30 p-6 rounded-xl shadow-[0_0_30px_rgba(255,0,0,0.1)_inset] lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-red-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={18} /> {isAr ? "سجل الأخطاء" : "Error Log"}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-red-300/60">
                {errorLogs.length} {isAr ? "خطأ مسجّل" : "errors"}
              </span>
              <button
                onClick={() => window.location.reload()}
                className="text-[10px] bg-red-600/30 hover:bg-red-500/40 text-red-200 px-2 py-1 rounded font-bold transition-colors"
              >
                {isAr ? "تحديث" : "Refresh"}
              </button>
              <button
                onClick={handleClearErrorLog}
                disabled={errorLogs.length === 0}
                className="text-[10px] bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded font-bold transition-colors disabled:opacity-30"
              >
                {isAr ? "مسح السجل" : "Clear"}
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
            {errorLogs.length === 0 && (
              <div className="text-center py-8">
                <Shield size={28} className="mx-auto mb-2 text-emerald-500" />
                <p className="text-emerald-400 text-xs font-bold">
                  {isAr ? "لا أخطاء مسجّلة. النظام يعمل بسلاسة 🚀" : "No errors logged. System running smooth 🚀"}
                </p>
              </div>
            )}
            {errorLogs.map((err) => (
              <div
                key={err.id}
                className="bg-[#020308] border border-red-900/40 p-3 text-xs group"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() =>
                      setExpandedErrorId(expandedErrorId === err.id ? null : err.id)
                    }
                    className="text-left flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">
                        {err.source || "unknown"}
                      </span>
                      {err.count > 1 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-bold">
                          ×{err.count}
                        </span>
                      )}
                      <span className="text-[9px] text-gray-500">
                        {formatErrorTime(err.ts)}
                      </span>
                      {err.userName && (
                        <span className="text-[9px] text-cyan-500 truncate">
                          {err.userName}
                        </span>
                      )}
                    </div>
                    <div className="text-red-200 break-words leading-relaxed" dir="ltr">
                      {err.message}
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteDoc("errors", err.id)}
                    className="text-red-500 hover:text-red-400 shrink-0 mt-1"
                    title={isAr ? "حذف" : "Delete"}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {expandedErrorId === err.id && (
                  <div className="mt-2 pt-2 border-t border-red-900/40 space-y-1">
                    {err.url && (
                      <div className="text-[9px] text-gray-500 truncate" dir="ltr">
                        {err.url}
                      </div>
                    )}
                    {err.uid && (
                      <div className="text-[9px] text-gray-500 truncate" dir="ltr">
                        uid: {err.uid}
                      </div>
                    )}
                    {err.stack && (
                      <pre
                        className="mt-1 p-2 bg-black/40 rounded text-[9px] text-orange-300 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar"
                        dir="ltr"
                      >
                        {err.stack}
                      </pre>
                    )}
                    {err.context && (
                      <pre
                        className="mt-1 p-2 bg-black/40 rounded text-[9px] text-cyan-300 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar"
                        dir="ltr"
                      >
                        {JSON.stringify(err.context, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Media Surveillance */}
        <div className="bg-[#050B14] border border-cyan-500/30 p-6 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.1)_inset]">
          <h3 className="text-cyan-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <Eye size={18} /> {isAr ? "مراقبة الوسائط" : "Media Surveillance"}
          </h3>
          <div className="grid grid-cols-3 gap-2 h-60 overflow-y-auto custom-scrollbar pr-1">
            {exhibitions.map((ex) => (
              <div
                key={ex.id}
                className="relative group aspect-square border border-cyan-900 overflow-hidden rounded"
              >
                <img
                  src={ex.url || undefined}
                  alt="Media"
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-transparent border-2 border-transparent group-hover:border-cyan-400 pointer-events-none transition-all rounded"></div>
                <button
                  onClick={() => handleDeleteDoc("exhibitions", ex.id)}
                  className="absolute top-1 right-1 bg-red-900/80 text-white p-1 rounded opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {exhibitions.length === 0 && (
              <span className="text-xs text-cyan-800 col-span-3">
                {isAr ? "لا يوجد وسائط" : "NO MEDIA DETECTED"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#050B14] border border-cyan-400 p-6 rounded-xl shadow-[0_0_50px_rgba(0,255,255,0.2)] w-full max-w-md space-y-4"
            >
              <div className="flex justify-between items-center border-b border-cyan-900 pb-2 mb-4">
                <h3 className="text-cyan-300 font-bold uppercase tracking-widest">
                  Override Parameter: {editingUser.displayName}
                </h3>
                <button
                  onClick={() => setEditingUser(null)}
                  className="text-cyan-600 hover:text-cyan-300"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 font-mono text-sm">
                <div>
                  <label className="text-cyan-600 text-xs uppercase block mb-1">
                    XP Value (Focus Minutes)
                  </label>
                  <input
                    type="number"
                    value={editingUser.xp}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        xp: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#020308] border border-cyan-900 rounded p-2 text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-cyan-600 text-xs uppercase block mb-1">
                    Clearance Level (LVL)
                  </label>
                  <input
                    type="number"
                    value={editingUser.level}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        level: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full bg-[#020308] border border-cyan-900 rounded p-2 text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-cyan-600 text-xs uppercase block mb-1">
                    Total Focus Sessions
                  </label>
                  <input
                    type="number"
                    value={editingUser.totalFocusSessions || 0}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        totalFocusSessions: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#020308] border border-cyan-900 rounded p-2 text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-cyan-600 text-xs uppercase block mb-1">
                    Status Override (Activity)
                  </label>
                  <input
                    type="text"
                    value={editingUser.currentActivity || ""}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        currentActivity: e.target.value,
                      })
                    }
                    className="w-full bg-[#020308] border border-cyan-900 rounded p-2 text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  onClick={async () => {
                    await adminSetXP(
                      editingUser.uid,
                      editingUser.xp,
                      editingUser.level,
                      editingUser.currentActivity,
                      editingUser.totalFocusSessions,
                    );
                    setEditingUser(null);
                  }}
                  className="flex-1 bg-cyan-600/20 border border-cyan-500 text-cyan-400 py-2 uppercase font-bold hover:bg-cyan-500 hover:text-[#020308] transition-all shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                >
                  Execute Protocol
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 border border-cyan-900 text-cyan-600 hover:border-cyan-500 hover:text-cyan-400 uppercase text-xs transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
