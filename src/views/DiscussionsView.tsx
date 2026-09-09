import React, { useState, useEffect } from "react";
import {
  MessageCircle,
  Plus,
  X,
  Trash2,
  Heart,
  Flame,
  Rocket,
  ChevronRight,
  ChevronLeft,
  Hash,
  MessageSquare,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import {
  collection,
  doc,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment,
  deleteDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { Discussion, Reply, UserData } from "../shared";
import { cn } from "../lib/utils";
import { useLanguage } from "../context/LanguageContext";

export default function DiscussionsView({ user }: { user: UserData }) {
  const { isAr, t } = useLanguage();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] =
    useState<Discussion | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newReply, setNewReply] = useState("");
  const [category, setCategory] = useState("عام");
  const [isCreating, setIsCreating] = useState(false);

  const [loading, setLoading] = useState(true);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [limitCount, setLimitCount] = useState(20);
  const [sortBy, setSortBy] = useState<"newest" | "trending">("newest");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const fetchDiscussions = async () => {
      let q;
      if (sortBy === "trending") {
        q = query(
          collection(db, "discussions"),
          orderBy("repliesCount", "desc"),
          firestoreLimit(limitCount),
        );
      } else {
        q = query(
          collection(db, "discussions"),
          orderBy("timestamp", "desc"),
          firestoreLimit(limitCount),
        );
      }

      try {
        const snapshot = await getDocs(q);
        if (isMounted) {
          setDiscussions(
            snapshot.docs.map(
              (doc) => ({ id: doc.id, ...(doc.data() as any) }) as Discussion,
            ),
          );
          setLoading(false);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, "discussions");
        if (isMounted) setLoading(false);
      }
    };
    fetchDiscussions();
    return () => {
      isMounted = false;
    };
  }, [limitCount, sortBy]);

  useEffect(() => {
    let isMounted = true;
    if (selectedDiscussion) {
      setRepliesLoading(true);
      const fetchReplies = async () => {
        const q = query(
          collection(db, "discussions", selectedDiscussion.id, "replies"),
          firestoreLimit(200),
        );
        try {
          const snapshot = await getDocs(q);
          if (isMounted) {
            const fetchedReplies = snapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() }) as Reply,
            );
            // Sort safely in-memory so missing/pending timestamps are correctly placed at the end
            fetchedReplies.sort((a, b) => {
              const timeA =
                a.timestamp && typeof (a.timestamp as any).toDate === "function"
                  ? (a.timestamp as any).toDate().getTime()
                  : a.timestamp
                    ? new Date(a.timestamp as any).getTime()
                    : Date.now();
              const timeB =
                b.timestamp && typeof (b.timestamp as any).toDate === "function"
                  ? (b.timestamp as any).toDate().getTime()
                  : b.timestamp
                    ? new Date(b.timestamp as any).getTime()
                    : Date.now();
              return timeA - timeB;
            });
            setReplies(fetchedReplies);
            setRepliesLoading(false);
          }
        } catch (e) {
          handleFirestoreError(
            e,
            OperationType.GET,
            `discussions/${selectedDiscussion.id}/replies`,
          );
          if (isMounted) setRepliesLoading(false);
        }
      };
      fetchReplies();
    }
    return () => {
      isMounted = false;
    };
  }, [selectedDiscussion]);

  const handleCreateDiscussion = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    try {
      setIsCreating(false);
      const docData = {
        title: newTitle,
        content: newContent,
        category: category,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        timestamp: serverTimestamp(),
        repliesCount: 0,
        likesCount: 0,
        likedBy: [],
      };
      const docRef = await addDoc(collection(db, "discussions"), docData);

      setDiscussions((prev) => [
        { id: docRef.id, ...docData } as any as Discussion,
        ...prev,
      ]);

      setNewTitle("");
      setNewContent("");
      setCategory("عام");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "discussions");
    }
  };

  const handleSendReply = async () => {
    if (!newReply.trim() || !selectedDiscussion) return;
    try {
      const replyData = {
        text: newReply,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        timestamp: serverTimestamp(),
      };
      const docRef = await addDoc(
        collection(db, "discussions", selectedDiscussion.id, "replies"),
        replyData,
      );

      setReplies((prev) => [
        ...prev,
        { id: docRef.id, ...replyData } as any as Reply,
      ]);
      setDiscussions((prev) =>
        prev.map((d) =>
          d.id === selectedDiscussion.id
            ? { ...d, repliesCount: (d.repliesCount || 0) + 1 }
            : d,
        ),
      );

      await updateDoc(doc(db, "discussions", selectedDiscussion.id), {
        repliesCount: increment(1),
        lastActivity: serverTimestamp(),
      });

      if (selectedDiscussion.userId !== user.uid) {
        addDoc(
          collection(db, "users", selectedDiscussion.userId, "notifications"),
          {
            type: "reply",
            content: isAr ? `رد ${user.displayName} على موضوعك: ${selectedDiscussion.title}` : `${user.displayName} replied to your thread: ${selectedDiscussion.title}`,
            read: false,
            timestamp: serverTimestamp(),
          },
        ).catch(() => {});
      }
      setNewReply("");
    } catch (e) {
      handleFirestoreError(
        e,
        OperationType.WRITE,
        `discussions/${selectedDiscussion.id}/replies`,
      );
    }
  };

  const handleDeleteDiscussion = async (id: string, authorId: string) => {
    if (user.role !== "admin" && user.uid !== authorId) return;
    try {
      await deleteDoc(doc(db, "discussions", id));
      setDiscussions((prev) => prev.filter((d) => d.id !== id));
      if (selectedDiscussion?.id === id) setSelectedDiscussion(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `discussions/${id}`);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!selectedDiscussion) return;
    try {
      await deleteDoc(
        doc(db, "discussions", selectedDiscussion.id, "replies", replyId),
      );
      setReplies((prev) => prev.filter((r) => r.id !== replyId));

      setDiscussions((prev) =>
        prev.map((d) =>
          d.id === selectedDiscussion.id
            ? { ...d, repliesCount: Math.max(0, (d.repliesCount || 0) - 1) }
            : d,
        ),
      );
      setSelectedDiscussion((prev) =>
        prev
          ? { ...prev, repliesCount: Math.max(0, (prev.repliesCount || 0) - 1) }
          : null,
      );

      await updateDoc(doc(db, "discussions", selectedDiscussion.id), {
        repliesCount: increment(-1),
      });
    } catch (e) {
      handleFirestoreError(
        e,
        OperationType.DELETE,
        `discussions/${selectedDiscussion.id}/replies/${replyId}`,
      );
    }
  };

  const handleLike = async (id: string) => {
    if (!user) return;
    try {
      const targetDisc =
        discussions.find((d) => d.id === id) ||
        (selectedDiscussion && selectedDiscussion.id === id
          ? selectedDiscussion
          : null);
      if (!targetDisc) return;

      const likedBy = (targetDisc as any).likedBy || [];
      const hasLiked = likedBy.includes(user.uid);

      let newLikedBy: string[];
      let likesCountChange: number;

      if (hasLiked) {
        newLikedBy = likedBy.filter((uid: string) => uid !== user.uid);
        likesCountChange = -1;
      } else {
        newLikedBy = [...likedBy, user.uid];
        likesCountChange = 1;
      }

      // 1. Update local state immediately for instant feedback
      setDiscussions((prev) =>
        prev.map((d) => {
          if (d.id === id) {
            const currentLikes = (d as any).likesCount || 0;
            return {
              ...d,
              likedBy: newLikedBy,
              likesCount: Math.max(0, currentLikes + likesCountChange),
            };
          }
          return d;
        }),
      );

      if (selectedDiscussion && selectedDiscussion.id === id) {
        setSelectedDiscussion((prev) => {
          if (!prev) return null;
          const currentLikes = (prev as any).likesCount || 0;
          return {
            ...prev,
            likedBy: newLikedBy,
            likesCount: Math.max(0, currentLikes + likesCountChange),
          };
        });
      }

      // 2. Perform database update
      await updateDoc(doc(db, "discussions", id), {
        likedBy: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likesCount: increment(likesCountChange),
      });

      // Send Firestore notification if a new like is registered, and author is not the active user
      if (!hasLiked && targetDisc.userId && targetDisc.userId !== user.uid) {
        addDoc(
          collection(db, "users", targetDisc.userId, "notifications"),
          {
            type: "like",
            content: isAr
              ? `أعجب ${user.displayName} بموضوعك: ${targetDisc.title}`
              : `${user.displayName} liked your thread: ${targetDisc.title}`,
            read: false,
            timestamp: serverTimestamp(),
          }
        ).catch((err) => console.warn("Error sending like notification:", err));
      }
    } catch (e) {
      // rollback or ignore silently
    }
  };

  const filteredDiscussions = discussions.filter(
    (d) =>
      d.title.includes(searchQuery) ||
      d.content.includes(searchQuery) ||
      (d as any).category?.includes(searchQuery),
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 relative min-h-screen" dir={isAr ? "rtl" : "ltr"}>
      {/* Background ambient gradient */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-indigo-900/10 to-transparent -z-10 rounded-3xl" />

      {/* Header section */}
      {!selectedDiscussion && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-20 bg-space-dark/80 backdrop-blur-md p-4 rounded-3xl shadow-xl shadow-black/5 border border-white/5">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <h2 className="text-3xl font-black flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              <MessageCircle className="w-8 h-8 text-indigo-400" />
              {isAr ? "النقاشات" : "Discussions"}
            </h2>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <input
              type="text"
              placeholder={isAr ? "ابحث في النقاشات..." : "Search discussions..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 w-full md:w-64 transition-all", isAr ? "text-right" : "text-left")}
              dir={isAr ? "rtl" : "ltr"}
            />
            {!user.isGuest && (
              <button
                onClick={() => setIsCreating(!isCreating)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20 whitespace-nowrap"
              >
                {isCreating ? <X size={18} /> : <Plus size={18} />}
                <span className="hidden sm:inline">
                  {isCreating ? (isAr ? "إلغاء" : "Cancel") : (isAr ? "موضوع جديد" : "New post")}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sort / Filters */}
      {!selectedDiscussion && !isCreating && (
        <div className="flex items-center justify-end gap-2 text-sm font-medium">
          <button
            onClick={() => setSortBy("newest")}
            className={cn(
              "px-4 py-1.5 rounded-full transition-all border",
              sortBy === "newest"
                ? "bg-white/10 border-white/20 text-white"
                : "border-transparent text-gray-500 hover:text-gray-300",
            )}
          >
            {isAr ? "الأحدث" : "Latest"}
          </button>
          <button
            onClick={() => setSortBy("trending")}
            className={cn(
              "px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-all border",
              sortBy === "trending"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "border-transparent text-gray-500 hover:text-gray-300",
            )}
          >
            <Flame size={14} />
            {isAr ? "شائع" : "Popular"}
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {isCreating && !selectedDiscussion && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="p-6 md:p-8 rounded-3xl bg-gradient-to-b from-[#101223] to-space-dark shadow-xl shadow-indigo-900/10 border border-indigo-500/20 space-y-5 overflow-hidden"
          >
            <h3 className={cn("text-xl font-bold text-indigo-300", isAr ? "text-right" : "text-left")}>
              {isAr ? "بدء موضوع جديد" : "Start a new post"}
            </h3>

            <div className={cn("flex gap-4", isAr ? "flex-row" : "flex-row-reverse")}>
              <input
                type="text"
                placeholder={isAr ? "عنوان الموضوع..." : "Discussion subject..."}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className={cn("flex-1 bg-black/40 border border-indigo-500/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all font-bold placeholder:font-normal placeholder:text-gray-600", isAr ? "text-right" : "text-left")}
                dir={isAr ? "rtl" : "ltr"}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={cn("bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none text-sm text-gray-300 w-32", isAr ? "text-right" : "text-left")}
                dir={isAr ? "rtl" : "ltr"}
              >
                <option value="عام">{isAr ? "عام" : "General"}</option>
                <option value="دراسة">{isAr ? "دراسة" : "Study"}</option>
                <option value="سؤال">{isAr ? "سؤال" : "Question"}</option>
                <option value="شطحة">{isAr ? "شطحة" : "Rambling"}</option>
              </select>
            </div>

            <textarea
              placeholder={isAr ? "اكتب ما يدور في ذهنك هنا..." : "Write down what's on your mind here..."}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className={cn("w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 min-h-[140px] focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all resize-y", isAr ? "text-right" : "text-left")}
              dir={isAr ? "rtl" : "ltr"}
            />

            <div className={cn("flex", isAr ? "justify-end" : "justify-start")}>
              <button
                onClick={handleCreateDiscussion}
                disabled={!newTitle.trim() || !newContent.trim()}
                className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all text-white disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
              >
                <Rocket size={18} />
                {isAr ? "نشر الان" : "Publish Now"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-5">
        {selectedDiscussion ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <button
              onClick={() => setSelectedDiscussion(null)}
              className={cn("text-gray-400 hover:text-white font-bold flex items-center gap-2 transition-colors bg-space-dark px-4 py-2 rounded-xl border border-white/5 w-max", isAr ? "flex-row" : "flex-row-reverse")}
            >
              {isAr ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              {isAr ? "العودة للساحة" : "Back to Forum"}
            </button>

            <div className="p-6 md:p-8 rounded-3xl bg-[#0e1021] shadow-2xl shadow-black/40 border border-white/10 space-y-6 relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

              <div className={cn("flex items-start justify-between relative z-10", isAr ? "flex-row text-right" : "flex-row-reverse text-left")}>
                <div className={cn("flex items-center gap-4", isAr ? "flex-row" : "flex-row-reverse")}>
                  <img
                    src={
                      selectedDiscussion.userPhoto ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedDiscussion.userId}`
                    }
                    className="w-14 h-14 rounded-2xl border-2 border-indigo-500/20 shadow-lg"
                    referrerPolicy="no-referrer"
                    alt={selectedDiscussion.userName}
                  />
                  <div>
                    <p className="font-bold text-lg text-white">
                      {selectedDiscussion.userName}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      {selectedDiscussion.timestamp &&
                      typeof (selectedDiscussion.timestamp as any).toDate ===
                        "function"
                        ? (selectedDiscussion.timestamp as any)
                            .toDate()
                            .toLocaleString(isAr ? "ar-EG" : "en-US")
                        : (isAr ? "الآن" : "Now")}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-indigo-300 font-medium border border-indigo-500/10 flex items-center gap-1">
                    <Hash size={12} />
                    {((selectedCategory) => {
                      if (selectedCategory === "عام") return isAr ? "عام" : "General";
                      if (selectedCategory === "دراسة") return isAr ? "دراسة" : "Study";
                      if (selectedCategory === "سؤال") return isAr ? "سؤال" : "Question";
                      if (selectedCategory === "شطحة") return isAr ? "شطحة" : "Rambling";
                      return selectedCategory;
                    })((selectedDiscussion as any).category || "عام")}
                  </span>
                </div>
              </div>

              <h3 className={cn("text-2xl md:text-3xl font-black mt-4 leading-tight", isAr ? "text-right" : "text-left")}>
                {selectedDiscussion.title}
              </h3>

              <div className={cn("w-12 h-1 bg-indigo-500/50 rounded-full", isAr ? "ml-auto" : "mr-auto")} />

              <p
                className={cn("text-gray-200 leading-relaxed relative z-10 text-lg md:text-xl whitespace-pre-wrap font-medium", isAr ? "text-right" : "text-left")}
                dir={isAr ? "rtl" : "ltr"}
              >
                {selectedDiscussion.content}
              </p>

              <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/5 text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  {!user.isGuest && (
                    <button
                      onClick={() => handleLike(selectedDiscussion.id)}
                      className={cn(
                        "flex items-center gap-1.5 transition-colors cursor-pointer",
                        ((selectedDiscussion as any).likedBy || []).includes(
                          user.uid,
                        )
                          ? "text-pink-500 hover:text-pink-400"
                          : "text-gray-400 hover:text-pink-400",
                      )}
                    >
                      <Heart
                        size={18}
                        className={
                          ((selectedDiscussion as any).likedBy || []).includes(
                            user.uid,
                          )
                            ? "fill-pink-500"
                            : ""
                        }
                      />
                      <span>
                        {Array.isArray((selectedDiscussion as any).likedBy)
                          ? (selectedDiscussion as any).likedBy.length
                          : (selectedDiscussion as any).likesCount || 0}
                      </span>
                    </button>
                  )}
                  <div className="flex items-center gap-1.5">
                    <MessageSquare size={18} />
                    <span>{selectedDiscussion.repliesCount} {isAr ? "ردود" : "Replies"}</span>
                  </div>
                </div>

                {(user.role === "admin" ||
                  selectedDiscussion.userId === user.uid) && (
                  <button
                    onClick={() => {
                      handleDeleteDiscussion(
                        selectedDiscussion.id,
                        selectedDiscussion.userId,
                      );
                    }}
                    className="text-red-500/70 hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">{isAr ? "حذف" : "Delete"}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4 pr-4 md:pr-12 relative before:content-[''] before:absolute before:right-0 before:top-4 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500/50 before:to-transparent">
              {repliesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-5 rounded-2xl bg-space-dark/50 animate-pulse border border-white/5 h-20"
                    />
                  ))}
                </div>
              ) : (
                replies.map((reply) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={reply.id}
                    className="p-5 rounded-3xl bg-[#0e1021]/80 shadow-md border border-white/5 space-y-3 ms-auto max-w-[95%] relative before:content-[''] before:absolute before:-right-4 md:before:-right-12 before:top-8 before:w-4 md:before:w-12 before:h-0.5 before:bg-indigo-500/30"
                  >
                    <div className={cn("flex items-center justify-between", isAr ? "flex-row" : "flex-row-reverse")}>
                      <div className={cn("flex items-center gap-3", isAr ? "flex-row" : "flex-row-reverse")}>
                        <img
                          src={
                            reply.userPhoto ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${reply.userId}`
                          }
                          className="w-8 h-8 rounded-full border border-white/10"
                          referrerPolicy="no-referrer"
                        />
                        <span className="font-bold text-sm text-gray-200">
                          {reply.userName}
                        </span>
                      </div>
                      <div className={cn("flex items-center gap-3", isAr ? "flex-row" : "flex-row-reverse")}>
                        <span className="text-xs text-gray-500 font-mono">
                          {reply.timestamp &&
                          typeof (reply.timestamp as any).toDate === "function"
                            ? (reply.timestamp as any)
                                .toDate()
                                .toLocaleString(isAr ? "ar-EG" : "en-US")
                            : (isAr ? "الآن" : "Now")}
                        </span>
                        {(user.role === "admin" ||
                          reply.userId === user.uid) && (
                          <button
                            onClick={() => handleDeleteReply(reply.id)}
                            className="text-gray-600 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p
                      className={cn("text-base text-gray-300 leading-relaxed whitespace-pre-wrap", isAr ? "text-right" : "text-left")}
                      dir={isAr ? "rtl" : "ltr"}
                    >
                      {reply.text}
                    </p>
                  </motion.div>
                ))
              )}
            </div>

            <div className="sticky bottom-4 z-20">
              {user.isGuest ? (
                <div className={cn("p-4 bg-[#0e1021]/90 backdrop-blur-xl border border-indigo-500/20 rounded-3xl shadow-2xl shadow-black/50 flex items-center gap-3", isAr ? "flex-row" : "flex-row-reverse")}>
                  <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
                  <p className="text-sm text-indigo-200/80 font-medium">
                    {isAr
                      ? "أنت في وضع المشاهدة — النقاشات للقراءة فقط. سجّل الدخول للمشاركة."
                      : "You're in guest mode — discussions are read-only. Sign in to participate."}
                  </p>
                </div>
              ) : (
                <div className={cn("relative p-2 bg-[#0e1021]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex gap-2 w-full mx-auto shadow-black/50", isAr ? "flex-row" : "flex-row-reverse")}>
                  <input
                    type="text"
                    placeholder={isAr ? "أكتب ردك هنا..." : "Write your reply..."}
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    className={cn("flex-1 bg-transparent px-4 py-3 focus:outline-none text-white placeholder-gray-500", isAr ? "text-right" : "text-left")}
                    dir={isAr ? "rtl" : "ltr"}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!newReply.trim()}
                    className="px-6 bg-indigo-500 hover:bg-indigo-600 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:hover:bg-indigo-500 flex items-center justify-center flex-shrink-0"
                  >
                    {isAr ? "إرسال" : "Send"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-32 rounded-3xl bg-space-dark animate-pulse border border-white/5"
                  />
                ))}
              </div>
            ) : filteredDiscussions.length === 0 ? (
              <div className="py-24 text-center flex flex-col items-center justify-center gap-4 bg-space-dark/50 rounded-3xl border border-dashed border-white/10 mx-auto max-w-lg">
                <MessageCircle className="w-16 h-16 text-gray-600" />
                <p className="text-xl text-gray-400 font-bold">
                  {isAr ? "الساحة صامتة اليوم" : "The forum is quiet today"}
                </p>
                <p className="text-gray-500 text-sm">
                  {isAr ? "كن أول من يفتح نقاشاً مثيراً للاهتمام!" : "Be the first to start an exciting discussion!"}
                </p>
                {!user.isGuest && (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="mt-4 px-6 py-2 bg-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/30 transition-all font-bold"
                  >
                    {isAr ? "إبدأ نقاشاً" : "Start a discussion"}
                  </button>
                )}
              </div>
            ) : (
              filteredDiscussions.map((disc, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={disc.id}
                  onClick={() => setSelectedDiscussion(disc)}
                  className="p-5 md:p-6 rounded-3xl bg-[#0e1021] border border-white/5 hover:border-indigo-500/30 hover:bg-[#121528] transition-all cursor-pointer group shadow-sm hover:shadow-xl hover:shadow-indigo-900/20 relative"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-l-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className={cn("flex flex-col items-start justify-between gap-4", isAr ? "md:flex-row" : "md:flex-row-reverse")}>
                    {/* User Info & Category */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <img
                        src={
                          disc.userPhoto ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${disc.userId}`
                        }
                        className="w-10 h-10 rounded-xl border border-white/10 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                      <div className={isAr ? "text-right" : "text-left"}>
                        <div className={cn("flex items-center gap-2", isAr ? "justify-start" : "justify-start")}>
                          <p className="font-bold text-sm text-gray-200">
                            {disc.userName}
                          </p>
                          <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-gray-400 w-max">
                            {((selectedCategory) => {
                              if (selectedCategory === "عام") return isAr ? "عام" : "General";
                              if (selectedCategory === "دراسة") return isAr ? "دراسة" : "Study";
                              if (selectedCategory === "سؤال") return isAr ? "سؤال" : "Question";
                              if (selectedCategory === "شطحة") return isAr ? "شطحة" : "Rambling";
                              return selectedCategory;
                            })((disc as any).category || "عام")}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono">
                          {disc.timestamp &&
                          typeof (disc.timestamp as any).toDate === "function"
                            ? (disc.timestamp as any)
                                .toDate()
                                .toLocaleDateString(isAr ? "ar-EG" : "en-US")
                            : (isAr ? "الآن" : "Now")}
                        </p>
                      </div>
                    </div>

                    {/* Title & Stats */}
                    <div className={cn("flex-1 flex flex-col", isAr ? "text-right items-end" : "text-left items-start")}>
                      <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-2">
                        {disc.title}
                      </h3>
                      <p
                        className={cn("text-sm text-gray-400 line-clamp-2 md:w-3/4 mb-4", isAr ? "text-right" : "text-left")}
                        dir={isAr ? "rtl" : "ltr"}
                      >
                        {disc.content}
                      </p>

                      <div className={cn("flex gap-4 items-center w-full justify-between md:justify-start", isAr ? "flex-row" : "flex-row-reverse")}>
                        <div className="flex gap-4 items-center">
                          {/* Replies display */}
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                            <MessageSquare size={14} className="text-indigo-400" />
                            <span>{disc.repliesCount || 0}</span>
                          </div>

                          {/* Interactive Like/Heart button direct from the card listing */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(disc.id);
                            }}
                            className={cn(
                              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-all duration-300 h-8",
                              ((disc as any).likedBy || []).includes(user.uid)
                                ? "text-pink-400 bg-pink-500/10 border border-pink-500/20"
                                : "text-gray-400 hover:text-pink-400 hover:bg-white/5 border border-transparent"
                            )}
                          >
                            <Heart
                              size={14}
                              className={
                                ((disc as any).likedBy || []).includes(user.uid)
                                  ? "fill-pink-500 text-pink-500"
                                  : ""
                              }
                            />
                            <span>
                              {Array.isArray((disc as any).likedBy)
                                ? (disc as any).likedBy.length
                                : (disc as any).likesCount || 0}
                            </span>
                          </button>
                        </div>

                        {(user.role === "admin" ||
                          disc.userId === user.uid) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDiscussion(disc.id, disc.userId);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 sm:text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-100 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}

            {!loading && discussions.length >= limitCount && !searchQuery && (
              <div className="flex justify-center pt-4 pb-10">
                <button
                  onClick={() => setLimitCount((prev) => prev + 20)}
                  className="px-6 py-2 rounded-full border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm font-bold"
                >
                  {isAr ? "تحميل المزيد" : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
