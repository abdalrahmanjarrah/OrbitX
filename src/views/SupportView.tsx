import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Info,
  HelpCircle,
  Mail,
  Send,
  Activity,
  MessageSquare,
  Trash,
  CheckCircle,
  History,
  User,
  ShieldCheck,
  XCircle,
  Inbox,
  Lock,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Search,
  Filter
} from "lucide-react";
import { UserData } from "../shared";
import { db, handleFirestoreError, OperationType } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  getDocs,
  limit,
} from "firebase/firestore";
import { cn } from "../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { showToast, confirmDialog } from "../lib/cosmicUI";

interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
}

interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  status: "open" | "closed";
  lastMessage: string;
  updatedAt: any;
  messages: ChatMessage[];
}

export default function SupportView({ user }: { user: UserData }) {
  const { isAr } = useLanguage();
  const [tab, setTab] = useState<"support" | "suggestions">("support");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketText, setTicketText] = useState("");
  const [suggestionText, setSuggestionText] = useState("");

  // Suggestions list states
  const [suggestionsList, setSuggestionsList] = useState<any[]>([]);
  const [replyingSuggestionId, setReplyingSuggestionId] = useState<
    string | null
  >(null);
  const [suggestionReplyText, setSuggestionReplyText] = useState("");
  const [deletingSuggestionId, setDeletingSuggestionId] = useState<
    string | null
  >(null);

  // Chat Support states
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [userReplyText, setUserReplyText] = useState("");
  const [adminReplyText, setAdminReplyText] = useState("");
  const [activeTicketTab, setActiveTicketTab] = useState<"new" | "history">("new");
  
  // Admin search & filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isAdminUser = user?.role === "admin";

  // Auto-scroll inside active chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTicketId, tickets]);

  // Real-time synchronization of support tickets
  useEffect(() => {
    if (!user?.uid) return;

    let ticketsQuery;
    if (isAdminUser) {
      // Admins get to view all tickets in the system
      ticketsQuery = query(
        collection(db, "support_tickets"),
        orderBy("updatedAt", "desc")
      );
    } else {
      // Normal users view only their own tickets
      ticketsQuery = query(
        collection(db, "support_tickets"),
        where("userId", "==", user.uid),
        orderBy("updatedAt", "desc")
      );
    }

    const unsubscribe = onSnapshot(
      ticketsQuery,
      (snapshot) => {
        const ticketList: SupportTicket[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          ticketList.push({
            id: docSnap.id,
            userId: data.userId || "",
            userName: data.userName || "",
            status: data.status || "open",
            lastMessage: data.lastMessage || "",
            updatedAt: data.updatedAt,
            messages: data.messages || []
          } as SupportTicket);
        });
        setTickets(ticketList);
        
        // If the user has an active open ticket, default select it for chat
        if (!isAdminUser && ticketList.length > 0 && !selectedTicketId) {
          const openTicket = ticketList.find(t => t.status === "open");
          if (openTicket) {
            setSelectedTicketId(openTicket.id);
            setActiveTicketTab("history");
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "support_tickets");
      }
    );

    return () => unsubscribe();
  }, [user?.uid, isAdminUser]);

  // Create a new support ticket
  const handleCreateTicket = async () => {
    if (!ticketText.trim()) return;
    setIsSubmitting(true);
    try {
      const initialMessage: ChatMessage = {
        senderId: user.uid,
        senderName: user.displayName || user.email || (isAr ? "مستخدم" : "User"),
        text: ticketText,
        createdAt: Date.now()
      };

      const docRef = await addDoc(collection(db, "support_tickets"), {
        userId: user.uid,
        userName: user.displayName || user.email || (isAr ? "مستخدم" : "User"),
        status: "open",
        lastMessage: ticketText,
        updatedAt: serverTimestamp(),
        messages: [initialMessage]
      });

      setSelectedTicketId(docRef.id);
      setTicketText("");
      setActiveTicketTab("history");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "support_tickets");
    } finally {
      setIsSubmitting(false);
    }
  };

  // User sends message in active ticket
  const handleUserSendMessage = async (ticket: SupportTicket) => {
    if (!userReplyText.trim()) return;
    const textToSend = userReplyText.trim();
    setUserReplyText("");

    try {
      const newMessage: ChatMessage = {
        senderId: user.uid,
        senderName: user.displayName || user.email || (isAr ? "مستخدم" : "User"),
        text: textToSend,
        createdAt: Date.now()
      };

      const ticketRef = doc(db, "support_tickets", ticket.id);
      await updateDoc(ticketRef, {
        messages: arrayUnion(newMessage),
        lastMessage: textToSend,
        updatedAt: serverTimestamp(),
        status: "open" // reopen if closed
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `support_tickets/${ticket.id}`);
    }
  };

  // Admin replies to active ticket
  const handleAdminSendReply = async (ticket: SupportTicket) => {
    if (!adminReplyText.trim()) return;
    const textToSend = adminReplyText.trim();
    setAdminReplyText("");

    try {
      const newMessage: ChatMessage = {
        senderId: "admin",
        senderName: "الادارة",
        text: textToSend,
        createdAt: Date.now()
      };

      const ticketRef = doc(db, "support_tickets", ticket.id);
      await updateDoc(ticketRef, {
        messages: arrayUnion(newMessage),
        lastMessage: textToSend,
        updatedAt: serverTimestamp()
      });

      // Notify the ticket owner that the admin replied
      if (ticket.userId && ticket.userId !== "admin") {
        addDoc(collection(db, "users", ticket.userId, "notifications"), {
          type: "support_reply",
          content: `ردّت الإدارة على تذكرتك: "${textToSend.slice(0, 100)}${
            textToSend.length > 100 ? "..." : ""
          }"`,
          read: false,
          timestamp: serverTimestamp(),
        }).catch(() => {});
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `support_tickets/${ticket.id}`);
    }
  };

  // Toggle ticket status (Open/Close)
  const handleToggleTicketStatus = async (ticket: SupportTicket) => {
    const newStatus = ticket.status === "open" ? "closed" : "open";
    try {
      const ticketRef = doc(db, "support_tickets", ticket.id);
      await updateDoc(ticketRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `support_tickets/${ticket.id}`);
    }
  };

  // Delete message as Admin
  const handleDeleteMessage = async (ticket: SupportTicket, message: ChatMessage) => {
    if (!(await confirmDialog(isAr ? "هل أنت متأكد من حذف هذه الرسالة؟" : "Are you sure you want to delete this message?", { title: isAr ? "حذف الرسالة" : "Delete message", danger: true }))) return;
    try {
      const ticketRef = doc(db, "support_tickets", ticket.id);
      
      // Filter out target message securely by checkingSender, timestamp, and content
      // This is 100% robust and bypasses arrayRemove silences if any property type slightly shifts
      const updatedMessages = ticket.messages.filter(m => 
        !(m.createdAt === message.createdAt && m.senderId === message.senderId && m.text === message.text)
      );

      await updateDoc(ticketRef, {
        messages: updatedMessages
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `support_tickets/${ticket.id}`);
    }
  };

  // Delete whole ticket as Admin
  const handleDeleteTicket = async (ticketId: string) => {
    if (!(await confirmDialog(isAr ? "هل أنت متأكد من حذف هذه المحادثة بالكامل؟" : "Are you sure you want to delete this entire chat?", { title: isAr ? "حذف المحادثة" : "Delete chat", danger: true }))) return;
    try {
      setSelectedTicketId(null);
      await deleteDoc(doc(db, "support_tickets", ticketId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `support_tickets/${ticketId}`);
    }
  };

  // Suggestions submissions
  const handleSubmitSuggestion = async () => {
    if (!suggestionText.trim()) return;
    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, "suggestions"), {
        text: suggestionText.trim(),
        userId: user.uid,
        userName: user.displayName || user.email || (isAr ? "مستخدم" : "User"),
        timestamp: serverTimestamp(),
      });
      setSuggestionText("");
      setSuggestionsList((prev) => [
        { id: docRef.id, text: suggestionText.trim(), userId: user.uid, userName: user.displayName || user.email || (isAr ? "مستخدم" : "User"), timestamp: null },
        ...prev,
      ]);
      showToast(
        isAr
          ? "تم إرسال اقتراحك بنجاح. شكراً لمساهمتك في تطوير OrbitX!"
          : "Your suggestion was submitted successfully. Thank you for contributing to OrbitX!",
        "success",
      );
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "suggestions");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live published suggestions so users see their ideas + admin replies in real time
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(db, "suggestions"),
        orderBy("timestamp", "desc"),
        limit(50),
      ),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSuggestionsList(list);
      },
      (e) => {
        handleFirestoreError(e, OperationType.GET, "suggestions");
      },
    );
    return unsubscribe;
  }, []);

  const handleReplySuggestion = async (id: string) => {
    if (!suggestionReplyText.trim()) return;
    try {
      await updateDoc(doc(db, "suggestions", id), {
        reply: suggestionReplyText.trim(),
        repliedAt: serverTimestamp(),
      });
      setSuggestionsList((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, reply: suggestionReplyText.trim() } : s,
        ),
      );
      setReplyingSuggestionId(null);
      setSuggestionReplyText("");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `suggestions/${id}`);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    try {
      await deleteDoc(doc(db, "suggestions", id));
      setSuggestionsList((prev) => prev.filter((s) => s.id !== id));
      setDeletingSuggestionId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `suggestions/${id}`);
    }
  };

  const getTicketTimeLabel = (ticket: SupportTicket) => {
    if (!ticket.updatedAt) return "";
    const date = ticket.updatedAt.toDate ? ticket.updatedAt.toDate() : new Date(ticket.updatedAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (ms: number) => {
    const d = new Date(ms);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  // Filtered tickets for Admin
  const adminFilteredTickets = tickets.filter(t => {
    const matchesSearch = t.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 max-w-7xl mx-auto space-y-8"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Cinematic Header Block */}
      <div className="bg-gradient-to-br from-[#0c0c16] to-[#050510] border border-white/10 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-[10px] uppercase tracking-widest font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                OrbitX Communications
              </span>
              {isAdminUser && (
                <span className="px-3 py-1 text-[10px] uppercase tracking-widest font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                  <ShieldCheck size={10} /> {isAr ? "الادارة" : "Admin Panel"}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
              <HelpCircle className="text-indigo-400" size={32} />
              {isAr ? "مركز الدعم والاتصالات الفنية" : "Cosmic Support & Comms Hub"}
            </h1>
            <p className="text-gray-400 max-w-xl text-xs md:text-sm leading-relaxed">
              {isAr
                ? "يمكنك فتح قناة اتصال مباشرة وآمنة مع الإدارة لحل أي مشكلة، أو إرسال اقتراحات إبداعية لتطوير المحطة."
                : "Open an encrypted direct channel with the administration, or dispatch custom ideas via the Suggestions module."}
            </p>
          </div>
          
          {/* Main Tabs */}
          <div className="flex bg-space-dark/80 border border-white/10 rounded-2xl p-1 self-stretch lg:self-auto">
            <button
              onClick={() => setTab("support")}
              className={cn(
                "flex-1 lg:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs md:text-sm",
                tab === "support"
                  ? "bg-indigo-600 text-white shadow-xl"
                  : "text-gray-400 hover:text-white hover:bg-white/5",
              )}
            >
              <MessageSquare size={16} />
              {isAr ? "الدعم الفني الشامل" : "Interactive Chat"}
            </button>
            <button
              onClick={() => setTab("suggestions")}
              className={cn(
                "flex-1 lg:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs md:text-sm",
                tab === "suggestions"
                  ? "bg-fuchsia-600 text-white shadow-xl"
                  : "text-gray-400 hover:text-white hover:bg-white/5",
              )}
            >
              <Activity size={16} />
              {isAr ? "الاقتراحات والتحسينات" : "Suggestions Module"}
            </button>
          </div>
        </div>
      </div>

      {tab === "support" ? (
        isAdminUser ? (
          /* ========================================= */
          /* ADMIN DASHBOARD VIEW                      */
          /* ========================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px] items-stretch">
            {/* Left Sidebar: Tickets list */}
            <div className="lg:col-span-5 bg-space-dark border border-white/10 rounded-3xl p-5 flex flex-col space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Inbox size={18} className="text-indigo-400" />
                  {isAr ? "قائمة التذاكر المستلمة" : "Dispatched Transmissions"}
                  <span className="text-xs bg-[#16182e] text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/20">
                    {adminFilteredTickets.length}
                  </span>
                </h2>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setStatusFilter("all")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                      statusFilter === "all" ? "bg-white/10 text-white border border-white/20" : "text-gray-500 hover:text-white"
                    )}
                  >
                    {isAr ? "الكل" : "All"}
                  </button>
                  <button 
                    onClick={() => setStatusFilter("open")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                      statusFilter === "open" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "text-gray-500 hover:text-white"
                    )}
                  >
                    {isAr ? "المفتوحة" : "Open"}
                  </button>
                  <button 
                    onClick={() => setStatusFilter("closed")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                      statusFilter === "closed" ? "bg-white/5 text-gray-400 border border-white/5" : "text-gray-500 hover:text-white"
                    )}
                  >
                    {isAr ? "المغلقة" : "Closed"}
                  </button>
                </div>
              </div>

              {/* Search ticket box */}
              <div className="relative">
                <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder={isAr ? "ابحث باسم المستخدم أو نص الرسالة..." : "Search tickets, message content..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-space-dark border border-white/10 rounded-xl ps-10 pe-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Scroller list */}
              <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2 pr-1 custom-scrollbar">
                {adminFilteredTickets.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-xs">
                    {isAr ? "لا توجد تذاكر دعم تطابق معايير البحث." : "No support tickets matching these parameters."}
                  </div>
                ) : (
                  adminFilteredTickets.map((t) => {
                    const isSelected = t.id === selectedTicketId;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicketId(t.id)}
                        className={cn(
                          "p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group",
                          isSelected
                            ? "bg-indigo-600/10 border-indigo-500/40 shadow-inner shadow-indigo-950/50"
                            : "bg-space-dark/60 border-white/5 hover:border-white/15"
                        )}
                      >
                        {t.status === "open" && (
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500" />
                        )}
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-1.5">
                            <User size={13} className="text-gray-400" />
                            <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                              {t.userName}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {getTicketTimeLabel(t)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate max-w-[280px]">
                          {t.lastMessage}
                        </p>
                        
                        <div className="mt-3 flex justify-between items-center text-[10px]">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md font-bold font-mono tracking-wide",
                            t.status === "open" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-gray-500 border border-white/5"
                          )}>
                            {t.status === "open" ? (isAr ? "مفتوحة" : "OPEN") : (isAr ? "مغلقة" : "CLOSED")}
                          </span>
                          <span className="text-gray-500 group-hover:text-amber-400 transition-colors flex items-center gap-1">
                            {t.messages.length} {isAr ? "رسائل" : "messages"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Chat panel */}
            <div className="lg:col-span-7 bg-space-dark border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-xl">
              {activeTicket ? (
                <div className="h-full flex flex-col min-h-[500px]">
                  {/* Chat header */}
                  <div className="border-b border-white/10 p-4 bg-space-dark/40 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base">{activeTicket.userName}</h3>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-widest",
                          activeTicket.status === "open" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse" : "bg-white/5 text-gray-500"
                        )}>
                          {activeTicket.status === "open" ? (isAr ? "نشط" : "ACTIVE") : (isAr ? "مغلق" : "CLOSED")}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono">{activeTicket.id}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleTicketStatus(activeTicket)}
                        className={cn(
                          "p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5",
                          activeTicket.status === "open" 
                            ? "bg-amber-600/10 border-amber-500/30 text-amber-400 hover:bg-amber-600/20"
                            : "bg-emerald-600/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/20"
                        )}
                        title={activeTicket.status === "open" ? (isAr ? "إغلاق التذكرة" : "Close Ticket") : isAr ? "إعادة فتح التذكرة" : "Reopen Ticket"}
                      >
                        {activeTicket.status === "open" ? (
                          <>
                            <XCircle size={14} />
                            <span>{isAr ? "إغلاق التذكرة" : "Close Ticket"}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={14} />
                            <span>{isAr ? "فتح مجدداً" : "Reopen"}</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteTicket(activeTicket.id)}
                        className="p-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                        title={isAr ? "حذف التذكرة" : "Delete Ticket"}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Message scroll areas */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-h-[400px]">
                    {activeTicket.messages.length === 0 ? (
                      <div className="py-12 text-center text-gray-500 text-xs">
                        {isAr ? "لا توجد رسائل في هذه المحادثة." : "No messages found in this chat channel."}
                      </div>
                    ) : (
                      activeTicket.messages.map((msg, index) => {
                        const isAdminMsg = msg.senderId === "admin" || msg.senderName === "الادارة";
                        return (
                          <div
                            key={index}
                            className={cn(
                              "flex flex-col max-w-[85%] relative group/msg",
                              isAdminMsg ? "mr-auto items-start" : "ml-auto items-end"
                            )}
                          >
                            <span className="text-[10px] text-gray-500 font-mono mb-1 px-1">
                              {msg.senderName} • {formatMessageTime(msg.createdAt)}
                            </span>
                            <div
                              className={cn(
                                "p-3.5 rounded-2xl relative border shadow-lg flex items-start gap-2",
                                isAdminMsg
                                  ? "bg-emerald-600/10 border-emerald-500/30 text-white rounded-tl-none font-medium"
                                  : "bg-[#16182e] border-white/5 text-gray-200 rounded-tr-none"
                              )}
                            >
                              <div className="break-words max-w-full text-xs md:text-sm whitespace-pre-wrap leading-relaxed">
                                {msg.text}
                              </div>
                              
                              {/* Option to delete specific message */}
                              <button
                                onClick={() => handleDeleteMessage(activeTicket, msg)}
                                className="opacity-60 lg:opacity-0 lg:group-hover/msg:opacity-100 hover:text-red-400 text-gray-500 transition-all rounded p-1 hover:bg-white/5"
                                title={isAr ? "حذف الرسالة" : "Delete message"}
                              >
                                <Trash size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Admin message input dispatch */}
                  <div className="p-4 border-t border-white/10 bg-space-dark/20 flex gap-3">
                    <textarea
                      value={adminReplyText}
                      onChange={(e) => setAdminReplyText(e.target.value)}
                      placeholder={isAr ? "اكتب الرد الرسمي للإدارة هنا..." : "Compose official administration response..."}
                      className="flex-1 bg-space-dark border border-white/10 rounded-xl px-4 py-3 text-white text-xs md:text-sm focus:outline-none focus:border-indigo-500 transition-all resize-none h-12"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAdminSendReply(activeTicket);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleAdminSendReply(activeTicket)}
                      disabled={!adminReplyText.trim()}
                      className="px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-all flex items-center justify-center gap-1"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col justify-center items-center py-20 text-center px-4">
                  <div className="w-16 h-16 bg-[#16182e] rounded-full border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
                    <MessageSquare size={30} />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">
                    {isAr ? "لم يتم تحديد أي محادثة" : "No Dispatch Selected"}
                  </h3>
                  <p className="text-gray-400 text-xs max-w-sm leading-relaxed">
                    {isAr
                      ? "الرجاء تحديد تذكرة دعم فني من العمود الأيسر وبدء التشغيل لمعالجة استفسار العميل."
                      : "Choose an active transmission from the list to synchronize feed and transmit responses."}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================= */
          /* NORMAL USER Support View WITH chat rooms   */
          /* ========================================= */
          <div className="bg-space-dark border border-white/10 rounded-3xl overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-12 min-h-[550px] items-stretch">
            {/* Sidebar with existing ticket tabs and helpful guides */}
            <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 p-5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex bg-space-dark/80 border border-white/10 rounded-xl p-1">
                  <button
                    onClick={() => setActiveTicketTab("new")}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                      activeTicketTab === "new" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                    )}
                  >
                    {isAr ? "تذكرة جديدة" : "Open New Ticket"}
                  </button>
                  <button
                    onClick={() => setActiveTicketTab("history")}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      activeTicketTab === "history" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                    )}
                  >
                    <History size={13} />
                    {isAr ? "محادثاتك" : "My Chats"}
                    {tickets.length > 0 && (
                      <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded-full text-[11px]">
                        {tickets.length}
                      </span>
                    )}
                  </button>
                </div>

                {activeTicketTab === "history" && (
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {tickets.length === 0 ? (
                      <p className="text-center text-[11px] text-gray-500 py-6">
                        {isAr ? "لا توجد أي محادثات دعم سابقة." : "You have no support history."}
                      </p>
                    ) : (
                      tickets.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedTicketId(t.id);
                          }}
                          className={cn(
                            "p-3 rounded-xl border text-right cursor-pointer transition-all",
                            t.id === selectedTicketId
                              ? "bg-indigo-600/10 border-indigo-500/40 text-white"
                              : "bg-space-dark/40 border-white/5 text-gray-400 hover:border-white/10"
                          )}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className={cn(
                              "text-[11px] px-1.5 py-0.5 rounded-md font-bold",
                              t.status === "open" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-gray-500"
                            )}>
                              {t.status === "open" ? (isAr ? "مفتوحة" : "OPEN") : (isAr ? "مغلقة" : "CLOSED")}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {getTicketTimeLabel(t)}
                            </span>
                          </div>
                          <p className="text-xs truncate font-medium">{t.lastMessage}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Security Banner */}
              <div className="bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
                <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck size={14} />
                  {isAr ? "اتصال مشفر وآمن" : "Encrypted Comms"}
                </h4>
                <p className="text-[10px] text-indigo-200/70 leading-relaxed">
                  {isAr
                    ? "تخضع جميع المحادثات لحماية الخصوصية ومراقبة الجودة لزيادة كفاءة واستقرار بيئة OrbitX."
                    : "For planetary validation guidelines, all messages are timestamped & securely stored."}
                </p>
              </div>
            </div>

            {/* Main support area context */}
            <div className="lg:col-span-8 flex flex-col justify-between">
              {activeTicketTab === "new" ? (
                /* CREATE NEW PANEL */
                <div className="p-6 md:p-8 space-y-6 flex-grow flex flex-col justify-center max-w-2xl mx-auto">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                      <Mail size={22} className="text-indigo-400" />
                      {isAr ? "وصف المشكلة التقنية" : "Transmit Support Request"}
                    </h2>
                    <p className="text-gray-400 text-xs md:text-sm">
                      {isAr
                        ? "يرجى كتابة شرح وافٍ للمشكلة، وسنقوم بالرد المباشر عليك ومناقشتها في الشات الفوري هنا."
                        : "Describe the parameters of the anomaly. Our dispatchers will assist you in this sandbox chat."}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <textarea
                      value={ticketText}
                      onChange={(e) => setTicketText(e.target.value)}
                      placeholder={isAr ? "مثال: واجهت مشكلة في زيادة XP عند الانتهاء من الدراسة..." : "E.g., Having issues syncing XP updates upon study completion..."}
                      className="w-full bg-space-dark border border-white/10 rounded-2xl p-5 text-white text-xs md:text-sm focus:outline-none focus:border-indigo-500 transition-all h-36 resize-none shadow-inner"
                    />
                    <button
                      onClick={handleCreateTicket}
                      disabled={isSubmitting || !ticketText.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={15} />
                          {isAr ? "إطلاق التذكرة الفورية" : "Transmit Signal"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* CHAT INTERACTIVE PANEL */
                <div className="flex-grow flex flex-col h-full min-h-[450px]">
                  {activeTicket ? (
                    <div className="flex-grow flex flex-col h-full justify-between">
                      {/* Chat room header */}
                      <div className="bg-space-dark/50 p-4 border-b border-white/10 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-white text-sm">{isAr ? "غرفة المحادثة النشطة" : "Active Flight Support"}</h4>
                            {activeTicket.status === "closed" && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                                {isAr ? "مغلقة ومؤرشفة" : "CLOSED & ARCHIVED"}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono">ID: {activeTicket.id}</p>
                        </div>
                        
                        {activeTicket.status === "open" && (
                          <button
                            onClick={() => handleToggleTicketStatus(activeTicket)}
                            className="px-3 py-1 flex items-center gap-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-gray-300 font-bold transition-all"
                          >
                            <XCircle size={11} />
                            {isAr ? "إغلاق كـ منتهي" : "Mark resolved"}
                          </button>
                        )}
                      </div>

                      {/* Chat messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[350px]">
                        {activeTicket.messages.map((msg, idx) => {
                          const isAdminMsg = msg.senderId === "admin" || msg.senderName === "الادارة";
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "flex flex-col max-w-[80%]",
                                isAdminMsg ? "mr-auto items-start" : "ml-auto items-end"
                              )}
                            >
                              <span className="text-[11px] text-gray-500 mb-0.5 px-1 font-mono">
                                {isAdminMsg ? (isAr ? "الادارة 🛡️" : "SUPPORT CREW") : (isAr ? "أنت" : "YOU")} • {formatMessageTime(msg.createdAt)}
                              </span>
                              <div
                                className={cn(
                                  "p-3 rounded-2xl text-xs md:text-sm border shadow-lg leading-relaxed whitespace-pre-wrap break-words",
                                  isAdminMsg
                                    ? "bg-indigo-600/10 border-indigo-500/20 text-white rounded-tl-none font-medium"
                                    : "bg-[#16182e]/80 border-white/15 text-gray-200 rounded-tr-none"
                                )}
                              >
                                {msg.text}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Chat input */}
                      <div className="p-4 border-t border-white/10 bg-space-dark/20 flex gap-3">
                        <input
                          type="text"
                          value={userReplyText}
                          onChange={(e) => setUserReplyText(e.target.value)}
                          placeholder={
                            activeTicket.status === "closed"
                              ? (isAr ? "المحادثاة مغلقة. اكتب رسالة لفتحها مجدداً..." : "Ticket is closed. Write to reopen...")
                              : (isAr ? "اكتب تفاصيل إضافية ليقرأها الدعم الفني..." : "Type clear details for dispatch staff...")
                          }
                          className="flex-1 bg-space-dark border border-white/10 rounded-xl px-4 py-3 text-white text-xs md:text-sm focus:outline-none focus:border-indigo-500 transition-all h-11"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleUserSendMessage(activeTicket);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleUserSendMessage(activeTicket)}
                          disabled={!userReplyText.trim()}
                          className="px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all flex items-center justify-center gap-1"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col justify-center items-center py-20 text-center px-4">
                      <div className="w-16 h-16 bg-[#16182e] rounded-full border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
                        <MessageSquare size={30} />
                      </div>
                      <h3 className="text-white font-bold text-lg mb-2">
                        {isAr ? "اختر محادثة لاستئنافها" : "No Support Session Loaded"}
                      </h3>
                      <p className="text-gray-400 text-xs max-w-sm leading-relaxed">
                        {isAr
                          ? "يمكنك الانتقال لقسم 'محادثاتك' في اليمين للاطلاع عليها أو فتح تذكرة جديدة تماماً."
                          : "Choose an existing support chat on the sidebar, or compose a new study dispatch signal above."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        /* ========================================= */
        /* SUGGESTIONS MODULE                        */
        /* ========================================= */
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-space-dark border border-white/10 rounded-3xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8"
        >
          <div className="md:col-span-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <MessageSquare className="text-fuchsia-400" />
                {isAr ? "صندوق الاقتراحات الفضائية" : "Cosmic Suggestions Module"}
              </h2>
              <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
                {isAr
                  ? "نحن نستمع دوماً! شاركنا أفكارك الإبداعية، ميزات جديدة تتمنى إضافتها، أو تعديلات لتحسين تجربة OrbitX لزملائك الرواد."
                  : "We always monitor high frequencies. Share custom feature designs, physics enhancements, or optimization ideas."}
              </p>
            </div>

            <div className="space-y-4">
              <textarea
                value={suggestionText}
                onChange={(e) => setSuggestionText(e.target.value)}
                placeholder={isAr ? "اقتراحي لتطوير المحطة هو... (اكتب بحرية، فريق الإدارة يقرأ كل المقترحات ويناقشها)" : "Describe your suggestion with detail... (we evaluate every payload, admin crew reads everything)"}
                className="w-full bg-space-dark border border-white/10 rounded-2xl p-6 text-white text-xs md:text-sm focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 min-h-[180px] transition-all resize-none shadow-inner"
              />
              <button
                onClick={handleSubmitSuggestion}
                disabled={isSubmitting || !suggestionText.trim()}
                className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(192,38,211,0.3)] hover:shadow-[0_0_30px_rgba(192,38,211,0.5)] flex items-center justify-center gap-2 text-xs md:text-sm"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={15} />
                    {isAr ? "إطلاق الاقتراح في الفضاء" : "Launch Proposal"}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="md:col-span-4 flex flex-col justify-center bg-gradient-to-br from-fuchsia-950/20 to-pink-950/10 border border-fuchsia-500/20 p-6 rounded-2xl relative overflow-hidden self-stretch">
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-[40px] pointer-events-none" />
            <h3 className="text-fuchsia-300 font-bold mb-3 flex items-center gap-2 text-sm">
              <Sparkles size={16} />
              {isAr ? "فكرة ملهمة؟ 💡" : "Cosmic Sparks 💡"}
            </h3>
            <p className="text-fuchsia-200/80 text-xs leading-relaxed">
              {isAr
                ? "هل تعلم أن الكثير من الميزات الملحمية مثل جدول العادات وتدفق XP بدأت كفكرة بسيطة في صندوق الاقتراحات الفضية؟ لا تتردد أبداً في طرح أي فكرة مهما بدت غريبة!"
                : "Many features inside our station began as creative suggestions. Help us optimize OrbitX for everyone."}
            </p>
          </div>
        </motion.div>
      )}

      {/* Published Suggestions Feed */}
      {tab === "suggestions" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-space-dark border border-white/10 rounded-3xl p-6 md:p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity size={18} className="text-fuchsia-400" />
              {isAr ? "الاقتراحات المنشورة" : "Published Suggestions"}
              <span className="text-xs bg-[#16182e] text-fuchsia-300 font-mono px-2 py-0.5 rounded-full border border-fuchsia-500/20">
                {suggestionsList.length}
              </span>
            </h2>
          </div>

          {suggestionsList.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              {isAr
                ? "لا توجد اقتراحات بعد — كن أول من يطلق فكرة!"
                : "No suggestions yet — be the first to launch an idea!"}
            </div>
          ) : (
            <div className="space-y-4">
              {suggestionsList.map((s) => (
                <div
                  key={s.id}
                  className="p-4 md:p-5 rounded-2xl bg-space-dark border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-fuchsia-300">
                      <Sparkles size={13} />
                      {s.userName || "رائد"}
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdminUser && (
                        <button
                          onClick={() => {
                            setReplyingSuggestionId(s.id);
                            setSuggestionReplyText(s.reply || "");
                          }}
                          className="text-[11px] text-blue-400 hover:underline"
                        >
                          {isAr ? "رد" : "Reply"}
                        </button>
                      )}
                      {(isAdminUser || s.userId === user.uid) &&
                        (deletingSuggestionId === s.id ? (
                          <div className="flex items-center gap-1.5 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30">
                            <span className="text-[10px] text-red-500">
                              {isAr ? "حذف؟" : "Delete?"}
                            </span>
                            <button
                              onClick={() => handleDeleteSuggestion(s.id)}
                              className="text-[10px] text-red-500 font-bold"
                            >
                              {isAr ? "نعم" : "Yes"}
                            </button>
                            <button
                              onClick={() => setDeletingSuggestionId(null)}
                              className="text-[10px] text-gray-400"
                            >
                              {isAr ? "لا" : "No"}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingSuggestionId(s.id)}
                            className="text-[11px] text-red-400 hover:underline"
                          >
                            {isAr ? "حذف" : "Delete"}
                          </button>
                        ))}
                    </div>
                  </div>

                  <p className="text-sm text-gray-100 leading-relaxed">
                    {s.text}
                  </p>

                  {replyingSuggestionId === s.id && (
                    <div className="flex items-center gap-2 mt-3 bg-blue-900/20 p-2 rounded-xl border border-blue-500/30">
                      <input
                        type="text"
                        value={suggestionReplyText}
                        onChange={(e) => setSuggestionReplyText(e.target.value)}
                        placeholder={
                          isAr ? "اكتب رد الإدارة هنا..." : "Write admin reply..."
                        }
                        className={cn(
                          "flex-1 bg-transparent text-xs text-blue-100 placeholder-blue-300/50 outline-none",
                          isAr ? "text-right" : "text-left",
                        )}
                        dir={isAr ? "rtl" : "ltr"}
                      />
                      <button
                        onClick={() => handleReplySuggestion(s.id)}
                        className="text-[10px] bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold"
                      >
                        {isAr ? "حفظ" : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setReplyingSuggestionId(null);
                          setSuggestionReplyText("");
                        }}
                        className="text-[10px] bg-white/10 hover:bg-white/20 text-gray-300 px-3 py-1.5 rounded-lg"
                      >
                        {isAr ? "إلغاء" : "Cancel"}
                      </button>
                    </div>
                  )}

                  {s.reply && (
                    <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border-r-2 border-blue-500 text-xs text-blue-300">
                      <span className="font-bold block mb-1">
                        {isAr ? "رد الإدارة:" : "Admin reply:"}
                      </span>
                      {s.reply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
