import React, { useState, useEffect } from "react";
import { Swords, Mail, Send, CheckCircle, XCircle, Timer, User, Loader2, Flame } from "lucide-react";
import { Challenge, UserData } from "../../shared";
import { db } from "../../firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { ensurePushSubscription, sendPushToUser } from "../../lib/pushManager";

interface ChallengeInvitesProps {
  incomingInvites: Challenge[];
  outgoingInvites: Challenge[];
  currentUser: UserData;
  onRefresh: () => void;
}

const formatDuration = (mins: number) => {
  if (mins >= 1440) {
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    return h > 0 ? `${d} أيام و ${h} ساعات` : `${d} يوم`;
  }
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} ساعات و ${m} دقيقة` : `${h} ساعات`;
  }
  return `${mins} دقيقة`;
};

export const ChallengeInvites: React.FC<ChallengeInvitesProps> = ({
  incomingInvites,
  outgoingInvites,
  currentUser,
  onRefresh,
}) => {
  const [friends, setFriends] = useState<UserData[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<UserData | null>(null);
  const [duration, setDuration] = useState<number>(25);
  const [sendingInvite, setSendingInvite] = useState(false);

  // Load user friends on mount/refresh
  useEffect(() => {
    let isMounted = true;
    const fetchFriends = async () => {
      setLoadingFriends(true);
      try {
        const friendsRef = collection(db, "users", currentUser.uid, "friends");
        const snap = await getDocs(friendsRef);
        const friendIds = snap.docs.map(doc => doc.id);

        if (friendIds.length === 0) {
          setFriends([]);
          setLoadingFriends(false);
          return;
        }

        // Chunk if there are too many, but limit(20) handles it safely
        const profilesRef = collection(db, "profiles");
        const q = query(profilesRef, where("uid", "in", friendIds.slice(0, 10)));
        const profilesSnap = await getDocs(q);

        if (isMounted) {
          const fetched = profilesSnap.docs.map(doc => doc.data() as UserData);
          setFriends(fetched);
        }
      } catch (err) {
        console.warn("Failed fetching friends for quick invite:", err);
      } finally {
        if (isMounted) setLoadingFriends(false);
      }
    };

    fetchFriends();
    return () => {
      isMounted = false;
    };
  }, [currentUser.uid]);

  const handleAcceptInvite = async (challenge: Challenge) => {
    try {
      await updateDoc(doc(db, "challenges", challenge.id), {
        status: "active",
        startTime: Date.now(),
      });
      await addDoc(collection(db, "users", challenge.challengerId, "notifications"), {
        type: "challenge_accepted",
        content: `قبل ${currentUser.displayName} التحدي! النزال بدأ الآن — مين بيجمع أكتر دقائق تركيز خلال ${challenge.durationMinutes} دقيقة؟ ⚡`,
        challengeId: challenge.id,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderPhoto: currentUser.photoURL,
        read: false,
        timestamp: serverTimestamp(),
      }).catch(console.error);
      sendPushToUser(
        challenge.challengerId,
        "قبل التحدي! ⚡",
        `${currentUser.displayName} قبل تحديك — النزال بدأ الآن!`,
        "/OrbitX../#/duels"
      );
      onRefresh();
    } catch (err) {
      console.error("Failed accepting challenge:", err);
    }
  };

  const handleDeclineInvite = async (challenge: Challenge) => {
    try {
      await updateDoc(doc(db, "challenges", challenge.id), {
        status: "declined"
      });
      await addDoc(collection(db, "users", challenge.challengerId, "notifications"), {
        type: "challenge_declined",
        content: `رفض ${currentUser.displayName} تحديك هذه المرة. لا بأس، جرب مع شخص آخر!`,
        challengeId: challenge.id,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        read: false,
        timestamp: serverTimestamp(),
      }).catch(console.error);
      onRefresh();
    } catch (err) {
      console.error("Failed declining challenge:", err);
    }
  };

  const handleSendChallenge = async () => {
    if (!selectedFriend) return;
    setSendingInvite(true);
    try {
      // Create new challenge entry in DB
      const challengeData = {
        challengerId: currentUser.uid,
        challengerName: currentUser.displayName,
        challengerPhoto: currentUser.photoURL || null,
        challengedId: selectedFriend.uid,
        challengedName: selectedFriend.displayName || "صديق",
        challengedPhoto: selectedFriend.photoURL || null,
        status: "pending",
        createdAt: Date.now(),
        durationMinutes: duration,
        progressPlayer1: 0,
        progressPlayer2: 0,
        rewardsClaimed: []
      };

      const docRef = await addDoc(collection(db, "challenges"), challengeData);

      // Create a push notification
      await addDoc(collection(db, "users", selectedFriend.uid, "notifications"), {
        type: "challenge",
        content: `⚡ ${currentUser.displayName} رمى عليك صفخة: مين يجمع أكتر دقائق تركيز خلال ${formatDuration(duration)}؟`,
        challengeId: docRef.id,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderPhoto: currentUser.photoURL,
        read: false,
        timestamp: serverTimestamp(),
      });

      ensurePushSubscription(currentUser.uid);
      sendPushToUser(
        selectedFriend.uid,
        "تحدي جديد 🥊",
        `${currentUser.displayName} تحدّاك: مين يجمع أكتر دقائق تركيز خلال ${formatDuration(duration)}؟`,
        "/OrbitX../#/duels"
      );

      setSelectedFriend(null);
      onRefresh();
    } catch (err) {
      console.error("Error creating manual challenge:", err);
    } finally {
      setSendingInvite(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* فتح نزال — نموذج سريع */}
      <div className="lg:col-span-5 p-6 rounded-3xl border border-rose-500/10 bg-gradient-to-br from-[#110f1f] to-[#0a0912] shadow-[0_15px_40px_rgba(244,63,94,0.08)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-9 h-9 rounded-xl bg-rose-500/12 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Swords size={17} />
          </span>
          <div>
            <h3 className="text-md font-bold text-white">افتح نزال تركيز</h3>
            <p className="text-[10px] text-gray-500">اختر مقاتلاً وحدد مدة الحلبة</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed mb-6 mt-3">
          كل دقيقة تركيز تجمعها بأي محطة تتحول لنقطة، والأكثر تركيزاً عند انتهاء
          المدة يرفع راية الفوز ويحرز الجوائز!
        </p>

        {loadingFriends ? (
          <div className="flex justify-center py-6">
            <Loader2 size={20} className="text-rose-400 animate-spin" />
          </div>
        ) : friends.length === 0 ? (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-gray-500">
            لا توجد حسابات زملاء حالية. انتقل لقسم "البث والاستكشاف" لإضافة مرافقين في رحلتك!
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-300 font-semibold block mb-2">اختر المقاتل</label>
              <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[170px] pr-1">
                {friends.map((friend) => {
                  const isSelected = selectedFriend?.uid === friend.uid;
                  return (
                    <button
                      key={friend.uid}
                      type="button"
                      onClick={() => setSelectedFriend(friend)}
                      className={`p-2.5 rounded-xl border text-right transition-all flex items-center gap-2.5 ${
                        isSelected
                          ? "bg-rose-500/10 border-rose-500/60 text-white shadow-[0_4px_16px_rgba(244,63,94,0.2)]"
                          : "bg-white/[0.01] border-white/5 text-gray-400 hover:border-rose-500/30 hover:text-white"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {friend.photoURL ? (
                          <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <User size={14} className="text-rose-400" />
                        )}
                      </div>
                      <span className="text-xs font-bold truncate">{friend.displayName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedFriend && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-3 pt-2"
              >
                <div>
                  <label className="text-xs text-gray-300 font-semibold block mb-2">مدة النزال</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { mins: 25, label: "25 دقيقة" },
                      { mins: 50, label: "50 دقيقة" },
                      { mins: 90, label: "90 دقيقة" },
                      { mins: 360, label: "6 ساعات" },
                      { mins: 1440, label: "يوم كامل" },
                      { mins: 4320, label: "3 أيام" },
                    ].map((opt) => (
                      <button
                        key={opt.mins}
                        type="button"
                        onClick={() => setDuration(opt.mins)}
                        className={`py-1.5 px-1 rounded-lg border font-mono text-[11px] font-bold transition-all ${
                          duration === opt.mins
                            ? "bg-amber-500/10 border-amber-500/60 text-amber-300"
                            : "bg-white/[0.01] border-white/5 text-gray-400 hover:border-white/10"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={sendingInvite}
                  onClick={handleSendChallenge}
                  className="w-full py-2.5 bg-gradient-to-l from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_18px_rgba(244,63,94,0.3)] disabled:opacity-50 mt-4 transition-all active:scale-95"
                >
                  {sendingInvite ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} />
                  )}
                  <span>إطلاق النزال</span>
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* الطلبات */}
      <div className="lg:col-span-7 space-y-6">
        {/* طلبات واردة */}
        <div className="p-6 rounded-3xl border border-white/5 bg-space-dark/30">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Mail size={15} className="text-fuchsia-400" />
            <span>طلبات نزال واردة ({incomingInvites.length})</span>
            {incomingInvites.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-[10px] font-bold text-fuchsia-300">
                <Flame size={10} className="inline animate-pulse mr-0.5 -mt-0.5" />
                خصمك ينتظر
              </span>
            )}
          </h4>

          {incomingInvites.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-500">
              لا توجد طلبات نزال مرسلة لك حالياً.
            </div>
          ) : (
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {incomingInvites.map((challenge) => (
                <div
                  key={challenge.id}
                  className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 transition-hover hover:border-fuchsia-500/20"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/25 flex items-center justify-center text-fuchsia-400 text-xs font-black overflow-hidden shrink-0">
                      {challenge.challengerPhoto ? (
                        <img src={challenge.challengerPhoto} alt={challenge.challengerName} className="w-full h-full object-cover" />
                      ) : (
                        challenge.challengerName.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{challenge.challengerName}</div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <Timer size={10} />
                        <span>مدة النزال: {formatDuration(challenge.durationMinutes)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleAcceptInvite(challenge)}
                      className="px-3.5 py-1.5 bg-gradient-to-l from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 active:scale-95"
                    >
                      <CheckCircle size={12} />
                      <span>قبول</span>
                    </button>

                    <button
                      onClick={() => handleDeclineInvite(challenge)}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold rounded-lg transition-colors"
                      title="رفض"
                    >
                      <XCircle size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* طلبات مرسلة */}
        <div className="p-6 rounded-3xl border border-white/5 bg-space-dark/30">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Send size={15} className="text-amber-400" />
            <span>طلبات مرسلة بانتظار الرد ({outgoingInvites.length})</span>
          </h4>

          {outgoingInvites.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-500">
              لم ترسل أي طلبات معلقة بعد.
            </div>
          ) : (
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {outgoingInvites.map((challenge) => (
                <div
                  key={challenge.id}
                  className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 text-xs font-black overflow-hidden shrink-0">
                      {challenge.challengedPhoto ? (
                        <img src={challenge.challengedPhoto} alt={challenge.challengedName} className="w-full h-full object-cover" />
                      ) : (
                        challenge.challengedName.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{challenge.challengedName}</div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <Timer size={10} />
                        <span>مدة النزال: {formatDuration(challenge.durationMinutes)}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] text-gray-400 shrink-0 flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-amber-400"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                    </span>
                    بانتظار الموافقة...
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
