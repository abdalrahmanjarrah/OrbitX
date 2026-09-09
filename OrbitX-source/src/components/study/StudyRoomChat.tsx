import React, { useRef, useEffect, useState } from "react";
import { useRenderLog } from "../../firebaseDebug";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircle, Send, Trash2, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../../context/LanguageContext";
import { doc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../firebase";
import { Room, Message, UserData } from "../../shared";
import { setDoc } from "firebase/firestore";

export interface StudyRoomChatProps {
  room: Room;
  messages: Message[];
  typingNames: string[];
  user: UserData;
  stationId: string;
  isHost: boolean;
  isSpectator?: boolean;
  handleSendMessage: (customText?: string) => Promise<any> | any;
  onSelectUser: (id: string) => void;
  isChatDrawerOpen: boolean;
  setIsChatDrawerOpen: (open: boolean) => void;
  safeUpdateRoom: (data: any) => Promise<void>;
}

function StudyRoomChatComponent({
  room,
  messages,
  typingNames,
  user,
  stationId,
  isHost,
  isSpectator = false,
  handleSendMessage,
  onSelectUser,
  isChatDrawerOpen,
  setIsChatDrawerOpen,
  safeUpdateRoom,
}: StudyRoomChatProps) {
  useRenderLog("StudyRoomChat", {
    messagesCount: messages.length,
    typingNames,
    isChatDrawerOpen,
  });
  const [localNewMessage, setLocalNewMessage] = useState("");
  const { isAr, t } = useLanguage();
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastTypingUpdate = useRef(0);
  const typingTimeoutRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  // Safely manage component mount state to defeat memory leaks & post-unmount updates
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-clear chat errors
  useEffect(() => {
    if (chatError) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setChatError(null);
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [chatError]);

  const onSend = async () => {
    if (!localNewMessage.trim()) return;
    const msgText = localNewMessage;

    // Instantly wipe typing state, clear timeouts, and reset timestamps
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    lastTypingUpdate.current = 0;

    try {
      const success = await handleSendMessage(msgText);
      if (success !== false) {
        if (isMountedRef.current) {
          setLocalNewMessage("");
        }
        deleteDoc(doc(db, "rooms", stationId, "typing", user.uid)).catch(
          () => {},
        );
      }
    } catch (e) {
      console.error("[StudyRoomChat] Send failed:", e);
    }
  };

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const lastMsg = messages[messages.length - 1];
    const isMyMsg = lastMsg && lastMsg.userId === user.uid;

    // Check if user is near the bottom of the chat container (allow 120 pixels buffer)
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      120;

    if (isMyMsg || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, user.uid]);

  useEffect(() => {
    const capturedUid = user?.uid;
    const capturedStationId = stationId;

    return () => {
      // Clear timers and erase the indicator immediately upon unmount/re-effect
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (capturedUid && capturedStationId) {
        deleteDoc(
          doc(db, "rooms", capturedStationId, "typing", capturedUid),
        ).catch(() => {});
      }
    };
  }, [user?.uid, stationId]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isChatDrawerOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: 20 }}
            animate={{ height: "500px", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: 20 }}
            className="w-[min(24rem,calc(100vw-2.5rem))] bg-gradient-to-br from-[#0c0c16]/95 to-[#050510]/95 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl shadow-indigo-900/40 mb-4 flex flex-col"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-space-dark/80 shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <MessageCircle
                    size={18}
                    className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                  />
                  <h3 className="font-bold text-right text-sm tracking-wide">
                    دردشة المحطة
                  </h3>
                </div>
                {isHost && (
                  <button
                    onClick={async () => {
                      await safeUpdateRoom({
                        isChatLocked: !room?.isChatLocked,
                      });
                    }}
                    className={cn(
                      "text-[10px] px-2 py-1 rounded-full font-bold transition-all",
                      room?.isChatLocked
                        ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30",
                    )}
                  >
                    {room?.isChatLocked ? "دردشة مغلقة 🔒" : "دردشة مفتوحة 🔓"}
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsChatDrawerOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div
              ref={chatContainerRef}
              className="flex-1 p-3 overflow-y-auto space-y-3 relative custom-scrollbar"
            >
              {chatError && (
                <div
                  className="sticky top-0 z-25 text-[11px] text-red-300 font-bold bg-red-950/80 border border-red-500/20 p-2.5 rounded-xl backdrop-blur-sm mb-2 text-center shadow-lg animate-bounce"
                  dir={isAr ? "rtl" : "ltr"}
                >
                  {chatError}
                </div>
              )}
              {typingNames.length > 0 && (
                <div
                  className={cn("sticky top-0 z-10 text-[10px] text-indigo-400 italic mb-2 animate-pulse bg-space-dark/80 p-1.5 rounded-lg backdrop-blur-sm self-start inline-block", isAr ? "text-right" : "text-left")}
                  dir={isAr ? "rtl" : "ltr"}
                >
                  {typingNames.slice(0, 3).join(isAr ? " و " : ", ")}{" "}
                  {typingNames.length > 3
                    ? (isAr ? "وآخرون يكتبون..." : "and others are typing...")
                    : typingNames.length > 1
                      ? (isAr ? "يكتبون الآن..." : "are typing...")
                      : (isAr ? "يكتب الآن..." : "is typing...")}
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col",
                    msg.userId === user.uid ? "items-end" : "items-start",
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {(user.role === "admin" || msg.userId === user.uid) &&
                      (deletingMsgId === msg.id ? (
                        <div className="flex items-center gap-1.5 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30">
                          <button
                            onClick={async () => {
                              try {
                                await deleteDoc(
                                  doc(
                                    db,
                                    "rooms",
                                    stationId,
                                    "messages",
                                    msg.id,
                                  ),
                                );
                                setDeletingMsgId(null);
                              } catch (e) {
                                handleFirestoreError(
                                  e,
                                  OperationType.DELETE,
                                  `rooms/${stationId}/messages/${msg.id}`,
                                );
                                setChatError(
                                  "⚠️ عذراً، فشل تدمير الرسالة! تحقق من الاتصال بالشبكة.",
                                );
                                setDeletingMsgId(null);
                              }
                            }}
                            className="text-[11px] text-red-500 hover:text-white font-bold"
                          >
                            نعم
                          </button>
                          <button
                            onClick={() => setDeletingMsgId(null)}
                            className="text-[11px] text-gray-400"
                          >
                            لا
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingMsgId(msg.id)}
                          className="text-red-500 hover:text-red-400 p-1"
                        >
                          <Trash2 size={10} />
                        </button>
                      ))}
                    <button
                      onClick={() =>
                        msg.userId !== "system" && onSelectUser(msg.userId)
                      }
                      className={cn(
                        "flex items-center gap-1.5",
                        msg.userId !== "system" &&
                          "hover:text-indigo-500 transition-colors",
                      )}
                    >
                      <span className="text-[11px] text-gray-400 font-medium">
                        {msg.userName}
                      </span>
                      {msg.userPhoto && (
                        <img
                          src={msg.userPhoto}
                          className="w-3.5 h-3.5 rounded-full"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </button>
                  </div>
                  <div
                    className={cn(
                      "px-4 py-2 rounded-2xl text-sm max-w-[85%] leading-relaxed",
                      msg.userId === user.uid
                        ? "bg-indigo-500 text-white rounded-tr-none"
                        : "bg-white/10 text-gray-200 rounded-tl-none",
                      msg.userId === "system" &&
                        "bg-red-500/20 text-red-400 border border-red-500/30 italic w-full max-w-full text-center",
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-space-dark/80 border-t border-white/10 shrink-0">
              <div className="relative">
                {(() => {
                  const isLockedForMe = isSpectator || (room?.isChatLocked && !isHost);
                  return (
                    <>
                      <input
                        type="text"
                        disabled={isLockedForMe}
                        value={localNewMessage}
                        onChange={(e) => {
                          setLocalNewMessage(e.target.value);
                          const now = Date.now();
                          if (
                            typeof window !== "undefined" &&
                            (window as any).__firestoreQuotaExceeded
                          ) {
                            return; // Guard typing indicator when Firestore quota has run out
                          }
                          if (now - lastTypingUpdate.current > 10000) {
                            lastTypingUpdate.current = now;
                            setDoc(
                              doc(db, "rooms", stationId, "typing", user.uid),
                              { name: user.displayName, time: now },
                            ).catch(() => {});
                          }
                          if (typingTimeoutRef.current) {
                            clearTimeout(typingTimeoutRef.current);
                            typingTimeoutRef.current = null;
                          }
                          typingTimeoutRef.current = setTimeout(() => {
                            if (isMountedRef.current && user?.uid) {
                              deleteDoc(
                                doc(db, "rooms", stationId, "typing", user.uid),
                              ).catch(() => {});
                            }
                            if (isMountedRef.current) {
                              typingTimeoutRef.current = null;
                            }
                          }, 4000);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !isLockedForMe) {
                            onSend();
                          }
                        }}
                        placeholder={
                          isSpectator
                            ? (isAr ? "وضع المشاهدة — الدردشة للقراءة فقط 👁️" : "Spectator mode — chat is read-only 👁️")
                            : isLockedForMe
                              ? (isAr ? "الدردشة مغلقة حالياً من قبل المشرف 🔒" : "Chat is currently locked by the host 🔒")
                              : (isAr ? "اكتب رسالة..." : "Type a message...")
                        }
                        className={cn(
                          "w-full bg-space-dark shadow-inner border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 text-white placeholder:text-gray-600 transition-all",
                          isAr ? "pl-14 text-right" : "pr-14 text-left",
                          isLockedForMe
                            ? isSpectator
                              ? "border-indigo-500/20 opacity-70 cursor-not-allowed text-gray-400 placeholder:text-indigo-400/50"
                              : "border-red-500/30 opacity-70 cursor-not-allowed text-gray-400 placeholder:text-red-400/60"
                            : "border-white/5",
                        )}
                        dir={isAr ? "rtl" : "ltr"}
                      />
                      <button
                        onClick={onSend}
                        disabled={isLockedForMe}
                        className={cn(
                          "absolute top-1.5 bottom-1.5 px-3 rounded-lg transition-colors flex items-center justify-center",
                          isAr ? "left-1.5" : "right-1.5",
                          isLockedForMe
                            ? "bg-red-500/10 text-red-400/50 cursor-not-allowed"
                            : "bg-indigo-500 hover:bg-indigo-600 text-white",
                        )}
                      >
                        <Send size={16} />
                      </button>
                    </>
                  );
                })()}
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
            : "bg-space-dark border border-white/10 text-cyan-400 hover:bg-white/5 shadow-black/50",
        )}
      >
        <MessageCircle
          size={20}
          className={cn(
            !isChatDrawerOpen && "drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]",
          )}
        />
      </button>
    </div>
  );
}

export default React.memo(StudyRoomChatComponent);
