import { useState, useEffect, useRef, useCallback } from "react";
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  deleteField,
  increment,
  onSnapshot,
} from "firebase/firestore";
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  setDoc,
  runTransaction
} from "../firebase";
import { requestXpGrant } from "./xpSystem";
import { showToast } from "./cosmicUI";
import { Debugger } from "../firebaseDebug";
import { Room, Challenge, Message, UserData } from "../shared";
import { playSound } from "./sound";
import { getWeekStartISO } from "./utils";

// Custom onSnapshot wrapper to prevent unauthenticated read crashes and track active listener counts
function safeOnSnapshot(
  queryRef: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void,
  pathLabel: string = "unspecified_snapshot"
) {
  if (!auth.currentUser) {
    // Return empty unsubscribe if not authenticated to prevent permission errors
    return () => {};
  }
  let isFirstLoad = true;
  const timerStart = performance.now();
  if (Debugger && Debugger.shouldAllowNewListener && !Debugger.shouldAllowNewListener(pathLabel)) {
    return () => {};
  }
  Debugger.trackListenerStart(pathLabel);
  
  const unsub = onSnapshot(
    queryRef,
    (snap) => {
      // Record first snapshot RTT latency metric
      if (timerStart > 0 && isFirstLoad) {
        Debugger.logLatency(`snapshot_load[${pathLabel}]`, timerStart, true);
        isFirstLoad = false;
      }
      Debugger.trackOnSnapshotTrigger(pathLabel, (snap as any).docs ? (snap as any).docs.length : 1);
      onNext(snap);
    },
    (e: any) => {
      if (!auth.currentUser) {
        // Ignore errors after signing out or during unmount
        return;
      }
      if (isFirstLoad) {
        Debugger.logLatency(`snapshot_load[${pathLabel}]`, timerStart, false, e?.message || String(e));
        isFirstLoad = false;
      }
      Debugger.logError(`safeOnSnapshot_listener[${pathLabel}]`, e);
      if (onError) {
        onError(e);
      } else {
        console.warn(`[Diagnostics] Intercepted safeOnSnapshot error on ${pathLabel}:`, e);
      }
    }
  );
  
  return () => {
    unsub();
    Debugger.trackListenerStop(pathLabel);
  };
}

// Global active hook instance tracking to secure mounts against unmount/remount race conditions (e.g. StrictMode, route transitions)
const activeHookInstances = new Map<string, string>(); // userId -> hookInstanceId

// Global session-level in-memory cache for participant profiles to eliminate redundant getDoc loads
const profileCache: Record<string, UserData> = {};

// Resolve a session startTime into epoch ms, handling every representation this
// app stores: ISO strings (Supabase adapter's serverTimestamp() -> toISOString()),
// epoch ms numbers (Date.now()), Firestore Timestamp objects (.toDate()/.seconds),
// and pending placeholder Timestamps whose seconds/nanoseconds are NaN (resolved to
// null so callers never compute NaN timers like "NaN:NaN").
function resolveStartTimeMs(startTime: any): number | null {
  if (!startTime) return null;
  if (typeof startTime === "string") {
    const ms = new Date(startTime).getTime();
    return isNaN(ms) ? null : ms;
  }
  if (typeof startTime === "number") {
    return isNaN(startTime) ? null : startTime;
  }
  if (typeof startTime.toDate === "function") {
    const t = startTime.toDate();
    const ms = t.getTime();
    return isNaN(ms) ? null : ms;
  }
  const secs = startTime.seconds;
  if (typeof secs !== "number") return null;
  if (isNaN(secs)) return null;
  return secs * 1000;
}

// Generate a randomized AFK check schedule for one focus round:
// - No checks during the first 10 minutes (users are getting settled).
// - Up to 3 checks per round, placed with long random gaps between them
//   (never back-to-back), each time chosen at random.
function generateAfkSchedule(durationSeconds: number): number[] {
  const minStart = 600; // 10 minutes in
  const count = 3;
  const minGap = 300; // at least 5 minutes between consecutive checks
  const endMargin = 60; // never trigger inside the last minute
  const latestStart = durationSeconds - endMargin;
  if (latestStart <= minStart) return [];

  const schedule: number[] = [];
  let t = minStart;
  for (let i = 0; i < count; i++) {
    const remaining = count - i - 1;
    const lo = t + (i === 0 ? 0 : minGap);
    const hi = latestStart - remaining * minGap;
    if (hi <= lo) break;
    t = lo + Math.random() * (hi - lo);
    schedule.push(Math.floor(t));
  }

  // Very short rounds can't fit spaced checks — still guarantee one random check.
  if (schedule.length === 0) {
    schedule.push(Math.floor(minStart + Math.random() * (latestStart - minStart)));
  }
  return schedule;
}

export function useSessionEngine(
  stationId: string,
  user: UserData,
  isSpectator: boolean,
  onExit: () => void
) {
  const [room, setRoom] = useState<Room | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [participantsData, setParticipantsData] = useState<UserData[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingMap, setTypingMap] = useState<Record<string, { name: string; time: number }>>({});
  const [challengeData, setChallengeData] = useState<Challenge | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<{ id: string; text: string; type: 'distraction' | 'presence' }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  // Dialogs and Modals
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showBetModal, setShowBetModal] = useState(false);
  const [showNextMissionModal, setShowNextMissionModal] = useState(false);
  const [showStudyLinkModal, setShowStudyLinkModal] = useState(false);
  const [nextMissionInput, setNextMissionInput] = useState("");
  const [pendingMission, setPendingMission] = useState<string | null>(null);
  const [betError, setBetError] = useState("");
  const [shieldPercent, setShieldPercent] = useState<number>(0);

  // States
  const [hasJoinedStation, setHasJoinedStation] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [sharedNotes, setSharedNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [showAFKCheck, setShowAFKCheck] = useState(false);
  const [isWatchingClass, setIsWatchingClass] = useState(false);
  const [afkTimeLeft, setAfkTimeLeft] = useState(60);
  const [showFuelLeak, setShowFuelLeakState] = useState(false);
  const [leakedXP, setLeakedXP] = useState(0);
  const [showAlert, setShowAlert] = useState(false);

  // MUTEX / EXIT LOCK
  const isExitingRef = useRef(false);
  const isJoinedRef = useRef(false);
  const lastDistractionWarningMsgTime = useRef(0);

  // STABILITY & SYNC SYSTEM CORES
  const userRef = useRef(user);
  const authTokenRef = useRef("");
  useEffect(() => {
    userRef.current = user;
    (user as any)?.getIdToken?.()
      .then((t: string) => {
        if (t) authTokenRef.current = t;
      })
      .catch(() => {});
  }, [user]);

  const instanceIdRef = useRef<string>("");
  if (!instanceIdRef.current) {
    instanceIdRef.current = Math.random().toString();
  }

  // Register this hook instance as the active session handler for the current user
  useEffect(() => {
    activeHookInstances.set(user.uid, instanceIdRef.current);
    
    // Cleanup active registration only if we are the current active instance on unmount
    return () => {
      if (activeHookInstances.get(user.uid) === instanceIdRef.current) {
        // Delay clearing slightly so the mounting instance has time to override
        setTimeout(() => {
          if (activeHookInstances.get(user.uid) === instanceIdRef.current) {
            activeHookInstances.delete(user.uid);
          }
        }, 500);
      }
    };
  }, [user.uid]);

  // Window unload listener to clear participant entry immediately using a keepalive beacon to the backend
  useEffect(() => {
    const handleUnload = () => {
      activeHookInstances.delete(userRef.current.uid);
      // Synchronously trigger exit cleanup if user was joined
      if (isJoinedRef.current && !isSpectator) {
        const payload = JSON.stringify({
          userId: userRef.current.uid,
          roomId: stationId,
          userName: userRef.current.displayName || userRef.current.uid,
          token: authTokenRef.current || undefined
        });

        // Use keepalive fetch which is fully supported by modern browsers for unload telemetry
        try {
          fetch("/api/leave-room", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: payload,
            keepalive: true
          });
        } catch (e) {
          try {
            const blob = new Blob([payload], { type: "application/json" });
            navigator.sendBeacon("/api/leave-room", blob);
          } catch (e2) {}
        }
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [stationId, isSpectator]);

  // Clock Offset Alignment system to offset local computer clock drift/skews
  const clockOffsetRef = useRef<number>(0);
  useEffect(() => {
    const fetchServerTime = async () => {
      try {
        const startCall = Date.now();
        const res = await fetch("/", { method: "HEAD" }).catch(() => fetch("/"));
        if (!res) return;
        const dateHeader = res.headers.get("Date");
        if (dateHeader) {
          const serverTime = new Date(dateHeader).getTime();
          const endCall = Date.now();
          const latency = (endCall - startCall) / 2;
          clockOffsetRef.current = (serverTime + latency) - endCall;
          console.log(`[Clock Synchronizer] Calculated clock skew offset: ${clockOffsetRef.current}ms`);
          Debugger.setClockSkew(clockOffsetRef.current);
        }
      } catch (e) {
        console.warn("[Clock Synchronizer] Failed to synchronize clock skew, defaulting to local time.", e);
        Debugger.logError("clock_sync_offset", e);
      }
    };
    fetchServerTime();
  }, [stationId]);

  // References
  const roomRef = doc(db, "rooms", stationId);
  const lastXpGrantTimestampRef = useRef<number | null>(null);
  const unsubRoomRef = useRef<(() => void) | null>(null);
  const unsubTypingRef = useRef<(() => void) | null>(null);
  const unsubMessagesRef = useRef<(() => void) | null>(null);
  const unsubChallengeRef = useRef<(() => void) | null>(null);
  const fuelLeakIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const localLeakedRef = useRef<number>(0);
  const afkScheduleRef = useRef<number[]>([]);
  const afkTriggeredRef = useRef<Set<number>>(new Set());
  const autoJoinAttempted = useRef(false);
  const participantsCountRef = useRef(0);
  const isWatchingClassRef = useRef(false);
  const currentBetRef = useRef<number>(0);
  const remainingShieldRef = useRef<number>(0);
  const studyLinkRef = useRef<string>(
    typeof window !== "undefined"
      ? window.localStorage.getItem("orbitx_study_link") || ""
      : ""
  );
  const nextMissionDismissedRef = useRef(false);
  const roomStatusRef = useRef<string | null>(null);
  const roomSnapshotRef = useRef<Room | null>(null);
  const isTransitioningRef = useRef(false);
  const lastXpUpdateTimeRef = useRef<number | null>(null);
  
  const afkFailCountRef = useRef<number>(0);
  const focusSessionKeyRef = useRef<string>("");
  const joinJoinedAtRef = useRef<number | null>(null);
  const xpIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTime = useRef<number>(0);
  const toggleCallLockRef = useRef<boolean>(false);

  const isDistractedRef = useRef<boolean>(false);
  const processedExitPenaltiesRef = useRef<Set<string>>(new Set());

  const setShowFuelLeak = useCallback((val: boolean) => {
    setShowFuelLeakState(val);
    if (!val) {
      isDistractedRef.current = false;
      if (fuelLeakIntervalRef.current) {
        clearInterval(fuelLeakIntervalRef.current);
        fuelLeakIntervalRef.current = null;
      }
    }
  }, []);

  const handleVisibilityChangeVal = useCallback(() => {
    if (isSpectator) return;
    if (!isJoinedRef.current) return;

    const shouldBeDistracted = document.visibilityState === "hidden" || !document.hasFocus();

    if (shouldBeDistracted) {
      if (roomStatusRef.current !== "focus") return;
      if (studyLinkRef.current && studyLinkRef.current.trim() !== "") return;
      if (isWatchingClassRef.current) return;

      // Mutex Guard: Only transition into distracted state ONCE per focus loss cycle
      if (isDistractedRef.current) return;
      isDistractedRef.current = true;

      setShowFuelLeakState(true);
      localLeakedRef.current = 0;
      setLeakedXP(0);

      try { playSound("alert"); } catch (e) {}

      if (participantsCountRef.current > 1) {
        const nowMs = Date.now();
        if (nowMs - lastDistractionWarningMsgTime.current > 180000) { // Limit distraction warnings to once per 3 minutes
          lastDistractionWarningMsgTime.current = nowMs;
          addDoc(collection(db, "rooms", stationId, "messages"), {
            text: `🚨 المحرك (${userRef.current.displayName}) توقف عن العمل! السفينة تتباطأ!`,
            userId: "system",
            userName: "نظام التنبيه",
            userPhoto: "",
            timestamp: serverTimestamp(),
            type: "text",
            isExitPenalty: true,
          }).catch(() => {});
        }
      }

      if (!fuelLeakIntervalRef.current) {
        fuelLeakIntervalRef.current = setInterval(async () => {
          // Self-Correcting / Safety check to prevent leaks outside active focus state
          if (!isJoinedRef.current || roomStatusRef.current !== "focus" || isWatchingClassRef.current) {
            if (fuelLeakIntervalRef.current) {
              clearInterval(fuelLeakIntervalRef.current);
              fuelLeakIntervalRef.current = null;
            }
            isDistractedRef.current = false;
            setShowFuelLeakState(false);
            return;
          }

          localLeakedRef.current += 1;
          setLeakedXP(localLeakedRef.current);

          if (currentBetRef.current > 0 && remainingShieldRef.current > 0) {
            remainingShieldRef.current = Math.max(0, remainingShieldRef.current - 1);
            setShieldPercent(Math.round((remainingShieldRef.current / currentBetRef.current) * 100));
          } else {
            try {
              await requestXpGrant(userRef.current.uid, userRef.current.fleetId, null, false, -1, "fuel_leak_tick", true);
            } catch (err) {
              console.error("Error draining XP:", err);
            }
          }
        }, 60000);
      }
    } else {
      // User returned to the tab — stop all penalties and restore XP path immediately.
      isDistractedRef.current = false;
      if (fuelLeakIntervalRef.current) {
        clearInterval(fuelLeakIntervalRef.current);
        fuelLeakIntervalRef.current = null;
      }
      setShowFuelLeak(false);
      lastXpUpdateTimeRef.current = Date.now() + clockOffsetRef.current;
    }
  }, [stationId, isSpectator]);

  // Presence heartbeat + ghost cleanup timing (see effects below).
  const PRESENCE_HEARTBEAT_MS = 20000; // write my own "I'm alive" marker every 20s while joined
  const PRESENCE_STALE_MS = 120000;    // no heartbeat for 2 min → user is a ghost (closed the site)
  const SWEEP_INTERVAL_MS = 30000;     // how often a joined client re-checks the point room
  const IDLE_HOST_KICK_MS = 30 * 60 * 1000; // leader idle (round not running) for 30 min → kicked out of the round

  const isHost = room ? ((room.hostId || room.creatorId) === user.uid || user.role === "admin") : false;

  // Sync stateful refs
  useEffect(() => { isJoinedRef.current = isJoined; }, [isJoined]);
  useEffect(() => { isWatchingClassRef.current = isWatchingClass; }, [isWatchingClass]);
  useEffect(() => { participantsCountRef.current = participantsData.length; }, [participantsData.length]);
  useEffect(() => { roomStatusRef.current = room?.timerStatus || null; }, [room?.timerStatus]);
  useEffect(() => { roomSnapshotRef.current = room; }, [room]);

  const isEditingNotesRef = useRef(isEditingNotes);
  useEffect(() => {
    isEditingNotesRef.current = isEditingNotes;
  }, [isEditingNotes]);

  const challengeDataRef = useRef<Challenge | null>(null);
  useEffect(() => {
    challengeDataRef.current = challengeData;
  }, [challengeData]);

  const participantsDataRef = useRef<UserData[]>([]);
  useEffect(() => {
    participantsDataRef.current = participantsData;
  }, [participantsData]);

  const onExitRef = useRef(onExit);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  const safeUpdateRoom = useCallback(async (data: any) => {
    if (isSpectator) return;
    const startMs = performance.now();
    try {
      await updateDoc(roomRef, data);
      Debugger.logLatency(`updateRoom[${stationId}]`, startMs, true);
    } catch (e) {
      Debugger.logLatency(`updateRoom[${stationId}]`, startMs, false, e instanceof Error ? e.message : String(e));
      Debugger.logError("safeUpdateRoom", e);
      console.error("safeUpdateRoom failed:", e);
    }
  }, [stationId, isSpectator]);

  // 1. COMPREHENSIVE SINGLE EXIT EXECUTION GUARANTEE
  const performSafeExit = useCallback(async (options: {
    isPenalty?: boolean;
    penaltyReason?: string;
    penaltyAmount?: number;
    customExitMessage?: string;
    skipFirebaseUpdate?: boolean;
  } = {}) => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setIsExiting(true);
    setShowExitDialog(false);

    console.log("[Exit Engine] Mutex engaged. Clearing intervals & loops.");

    // Hard fallback timeout to guarantee exit under any network/Firestore conditions
    const hardTimeoutId = setTimeout(() => {
      console.warn("[Exit Engine] Hard fallback timeout triggered. Forcing exit callback.");
      setIsExiting(false);
      isExitingRef.current = false;
      onExitRef.current();
    }, 3800);

    try {
      // Clean up all timers and intervals locally first to block any trailing ticks
      if (xpIntervalRef.current) {
        clearInterval(xpIntervalRef.current);
        xpIntervalRef.current = null;
      }
      if (fuelLeakIntervalRef.current) {
        clearInterval(fuelLeakIntervalRef.current);
        fuelLeakIntervalRef.current = null;
      }

      if (isSpectator) {
        console.log("[Exit Engine] Spectator clean local exit.");
        clearTimeout(hardTimeoutId);
        setIsExiting(false);
        isExitingRef.current = false;
        onExitRef.current();
        return;
      }

      if (options.isPenalty && options.penaltyReason) {
        // Exit XP penalty removed by product decision — leaving a station is
        // always free. Ghost cleanup + leader takeover already keep rounds safe.
        console.log("[Exit Engine] Exit penalty is disabled by design:", options.penaltyReason);
      }

      if (!options.skipFirebaseUpdate) {
        try {
          // Broadcast exit message if there's someone to read it
          if (participantsCountRef.current > 1) {
            await addDoc(collection(db, "rooms", stationId, "messages"), {
              text: options.customExitMessage || (options.isPenalty 
                ? `🚀 غادر المحرك (${userRef.current.displayName}) المحطة والتايمر يعمل بوضع الدراسة.`
                : `🚀 غادر المحرك (${userRef.current.displayName}) المحطة.`),
              userId: "system",
              userName: "نظام التنبيه",
              userPhoto: "",
              timestamp: serverTimestamp(),
              type: "text",
            });
          }

          // Get snapshot of current room to update host or delete empty room correctly
          const roomSnap = await getDoc(roomRef);
          if (roomSnap.exists()) {
            const rData = roomSnap.data() as Room;
            const rem = (rData.participants || []).filter((p: string) => p !== userRef.current.uid);
            
            const updates: any = {
              participants: arrayRemove(userRef.current.uid),
              emptyAt: rem.length === 0 ? serverTimestamp() : deleteField(),
            };
            
            const currentHostId = rData.hostId || rData.creatorId;
            if (currentHostId === userRef.current.uid && rem.length > 0) {
              updates.hostId = rem[0];
            }
            if (rem.length === 0) {
              updates.timerStatus = "idle";
            }
            
            await updateDoc(roomRef, updates);

            // Delete room after 5 minutes if it remains empty
            if (rem.length === 0) {
              setTimeout(async () => {
                try {
                  const checkSnap = await getDoc(roomRef);
                  if (checkSnap.exists() && (!(checkSnap.data() as any).participants || (checkSnap.data() as any).participants.length === 0)) {
                    await deleteDoc(roomRef);
                  }
                } catch (e) {}
              }, 300000);
            }
          }
        } catch (err) {
          console.warn("[Exit Engine] Firebase exit update bypassed / failed:", err);
        }
      }

      // Set user back to main dashboard activity
      try {
        await updateDoc(doc(db, "users", userRef.current.uid), {
          currentActivity: "في لوحة التحكم",
        });
      } catch (e) {}

      console.log("[Exit Engine] Cleanup complete inside try block.");
    } catch (e) {
      console.error("[Exit Engine] Fatal error during clean exit. Forcing exit anyway.", e);
    } finally {
      clearTimeout(hardTimeoutId);
      setIsExiting(false);
      isExitingRef.current = false;
      onExitRef.current();
    }
  }, [stationId, isSpectator]);

  const handleConfirmExit = useCallback(async () => {
    let isPenalty = false;
    let penaltyAmount = -10;
    if (roomSnapshotRef.current?.timerStatus === "focus") {
      isPenalty = true;
    }
    await performSafeExit({
      isPenalty,
      penaltyReason: "self_exit_penalty",
      penaltyAmount
    });
  }, [performSafeExit]);

  const toggleCall = useCallback(async () => {
    if (isSpectator) return;
    if (toggleCallLockRef.current) {
      console.warn("[toggleCall Shield] Blocked rapid toggle join/leave spam clicks.");
      return;
    }
    toggleCallLockRef.current = true;
    try {
      if (isJoinedRef.current) {
        setIsJoined(false);
        const docSnap = await getDoc(roomRef);
        if (docSnap.exists()) {
          const rData = docSnap.data() as Room;
          const rem = (rData.participants || []).filter((p: string) => p !== userRef.current.uid);
          const updates: any = {
            participants: arrayRemove(userRef.current.uid),
            emptyAt: rem.length === 0 ? serverTimestamp() : deleteField(),
          };
          const currentHostId = rData.hostId || rData.creatorId;
          if (currentHostId === userRef.current.uid && rem.length > 0) {
            updates.hostId = rem[0];
          }
          if (rem.length === 0) {
            updates.timerStatus = "idle";
          }
          await safeUpdateRoom(updates);
        }
        setHasJoinedStation(false);
      } else {
        setIsJoined(true);
        await safeUpdateRoom({
          participants: arrayUnion(userRef.current.uid),
          emptyAt: null,
        });
        setDoc(doc(db, "rooms", stationId, "participants", userRef.current.uid), {
          joinedAt: Date.now() + clockOffsetRef.current,
        }).catch(() => {});
        setHasJoinedStation(true);
      }
    } catch (e) {
      console.error("Failed toggleCall:", e);
    } finally {
      toggleCallLockRef.current = false;
    }
  }, [safeUpdateRoom, isSpectator]);

  // Auto-join on mounting
  useEffect(() => {
    const autoJoin = async () => {
      if (isSpectator) return;
      if (!autoJoinAttempted.current) {
        autoJoinAttempted.current = true;
        setHasJoinedStation(true);
        setIsJoined(true);
        try {
await updateDoc(roomRef, {
          participants: arrayUnion(userRef.current.uid),
          emptyAt: null,
        });
        setDoc(doc(db, "rooms", stationId, "participants", userRef.current.uid), {
          joinedAt: Date.now() + clockOffsetRef.current,
        }).catch(() => {});
        await updateDoc(doc(db, "users", userRef.current.uid), {
            currentActivity: `في مدار محطة: ${roomSnapshotRef.current?.name || "خاصة"}`,
          });
        } catch (e) {}
      }
    };
    autoJoin();
  }, [stationId, isSpectator]);

  // Real-time presence synchronization across tabs and kick actions
  useEffect(() => {
    if (room && isJoined && !isSpectator && !isExitingRef.current) {
      const isStillParticipant = (room.participants || []).includes(user.uid);
      if (!isStillParticipant) {
        console.log("[Presence Sync] User was removed from participants on another client. Exiting locally.");
        performSafeExit({ skipFirebaseUpdate: true });
      }
    }
  }, [room?.participants, user.uid, isJoined, isSpectator, performSafeExit]);

  // ---------------------------------------------------------------- Presence
  // 1) Heartbeat: while joined, keep a per-user "I'm alive" doc under
  //    rooms/{stationId}/participants/{uid} so other open clients (and this
  //    engine's own sweep) can tell who actually left the site. Works through
  //    the documents fallback, exactly like messages/typing.
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isSpectator || !isJoined || !auth.currentUser) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
      return;
    }
    const presenceRef = doc(db, "rooms", stationId, "participants", user.uid);
    const beat = () => {
      if (joinJoinedAtRef.current === null) {
        joinJoinedAtRef.current = Date.now() + clockOffsetRef.current;
      }
      setDoc(presenceRef, {
        joinedAt: joinJoinedAtRef.current,
        lastSeenAt: Date.now() + clockOffsetRef.current,
        userName: (user.displayName || user.uid),
      }).catch(() => {});
    };
    beat();
    heartbeatRef.current = setInterval(beat, PRESENCE_HEARTBEAT_MS);
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      deleteDoc(presenceRef).catch(() => {});
    };
  }, [isJoined, isSpectator, stationId, user.uid]);

  // 2) Ghost sweep + host handover, run while joined (not spectator):
  //    - Removes participants whose heartbeat went stale (closed the site).
  //    - Hands the host role over when the host is a ghost, OR when the host
  //      kept the station idle (timer not running) for IDLE_HOST_KICK_MS.
  //    - Resets a timer that was left running by an abandoned host (ancient
  //      startTime) back to idle when this client is taking over the host role.
  //    Writes are idempotent (arrayRemove / deterministic next-host sort), so
  //    multiple clients sweeping at the same time can't corrupt the room.
  const lastSweepAtRef = useRef(0);
  useEffect(() => {
    if (isSpectator || !isJoined || !auth.currentUser) return;
    const sweep = () => {
      const now = Date.now() + clockOffsetRef.current;
      if (now - lastSweepAtRef.current < SWEEP_INTERVAL_MS) return;
      lastSweepAtRef.current = now;

      // Authoritative fresh room read — kick/handover decisions must never rely
      // on a stale local snapshot. (That is what made a host who JUST started
      // the round get falsely read as "idle" and kicked out of his own station.)
      getDoc(roomRef)
        .then((roomSnap) => {
          if (!roomSnap.exists()) return undefined;
          const curRoom = roomSnap.data() as Room;
          const participants = curRoom.participants || [];
          if (participants.length === 0) return undefined;

          return getDocs(collection(db, "rooms", stationId, "participants")).then(
            (snap) => {
          const presence = new Map<string, number>();
          const joinedAt = new Map<string, number>();
          const nameById = new Map<string, string>();
          snap.docs.forEach((d: any) => {
            const data = d.data() || {};
            const t = resolveStartTimeMs(data.lastSeenAt ?? 0);
            if (t && t > 0) presence.set(d.id, t);
            const j = resolveStartTimeMs(data.joinedAt ?? 0);
            if (j && j > 0) joinedAt.set(d.id, j);
            if (data.userName) nameById.set(d.id, String(data.userName));
          });

          // Ghost = no fresh heartbeat AND not a brand-new member. Grace rule:
          // someone who joined within the last STALE window is never removed,
          // even if their first heartbeat hasn't landed yet.
          const ghostUids = participants.filter((p) => {
            if (p === user.uid) return false;
            const presenceT = presence.get(p);
            const joinedT = joinedAt.get(p);
            if (joinedT !== undefined && now - joinedT <= PRESENCE_STALE_MS) return false;
            if (presenceT === undefined) return joinedT === undefined;
            return now - presenceT > PRESENCE_STALE_MS;
          });

          const currentHost = curRoom.hostId || curRoom.creatorId;
          const updates: any = {};
          let handoverMade = false;
          let myTakeover = false;
          let kickedIdleHost: string | null = null;

          // Decide who should run the sweep's writes: the live host, or — when
          // no host is reachable — any active participant (self-healing).
          if (currentHost) {
            const hostIsGhost = ghostUids.includes(currentHost);
            const hostDropped = !participants.includes(currentHost);
            const lastRoomActivity =
              resolveStartTimeMs(curRoom.updatedAt ?? curRoom.createdAt) || 0;
            const idleSince =
              curRoom.timerStatus === "idle" ? now - lastRoomActivity : 0;
            const hostIsLazyIdle =
              curRoom.timerStatus === "idle" &&
              !hostIsGhost &&
              idleSince > IDLE_HOST_KICK_MS;

            // Active members eligible for leadership, ordered by join time
            // ("مي دخل بعده" takes over when the leader is removed).
            const activeCandidates = participants
              .filter((p) => p !== currentHost && !ghostUids.includes(p))
              .sort(
                (a, b) =>
                  (joinedAt.get(a) || 0) - (joinedAt.get(b) || 0)
              );
            const leaderJoinedAt = joinedAt.get(currentHost) || 0;
            const takeoverCandidate =
              activeCandidates.find(
                (p) => (joinedAt.get(p) || 0) > leaderJoinedAt
              ) || activeCandidates[0] || null;

            const shouldHandover = hostIsGhost || hostDropped || hostIsLazyIdle;
            const nextHost =
              takeoverCandidate ||
              (participants.length === 1 ? participants[0] : null);

            // Requirement: a PRESENT leader who left the round off for 30 min
            // is kicked out of the round entirely; the next person who joined
            // after him takes over.
            if (hostIsLazyIdle && activeCandidates.length > 0 && nextHost !== currentHost) {
              kickedIdleHost = currentHost;
            }

            if (shouldHandover && nextHost && nextHost !== currentHost) {
              updates.hostId = nextHost;
              handoverMade = true;
              myTakeover = nextHost === user.uid;
            }
          }

          // A timer left running by an abandoned host: whoever takes the host
          // role resets it to idle so the station is usable again, and doesn't
          // inherit doomed focus/break cycles from an ancient startTime.
          if (myTakeover && curRoom.timerStatus !== "idle" && curRoom.startTime) {
            const start = resolveStartTimeMs(curRoom.startTime);
            if (start !== null) {
              const durMs =
                (curRoom.timerStatus === "focus" ? curRoom.timerDuration : curRoom.breakDuration) *
                60 *
                1000;
              if (now - start > durMs * 3 + 5 * 60 * 1000) {
                updates.timerStatus = "idle";
                updates.startTime = deleteField();
              }
            }
          }

          const removeUids = [...ghostUids];
          if (kickedIdleHost) removeUids.push(kickedIdleHost);
          if (removeUids.length > 0) {
            updates.participants = arrayRemove(...removeUids);
          }

          if (Object.keys(updates).length === 0) return;

          const remaining = participants.filter((p) => !removeUids.includes(p));
          if (remaining.length > 0) {
            updates.emptyAt = null;
          } else {
            updates.emptyAt = deleteField();
            updates.timerStatus = "idle";
          }

          return updateDoc(roomRef, updates).then(() => {
            if (kickedIdleHost && remaining.length > 0 && updates.hostId) {
              const kickedName = nameById.get(kickedIdleHost) || "أحد القادة";
              const nextName = nameById.get(updates.hostId as string) || "عضو";
              return addDoc(collection(db, "rooms", stationId, "messages"), {
                text: `⏱️ القائد (${kickedName}) بقي في المحطة بدون تشغيل الجولة لمدة نصف ساعة — تم طرده، والقيادة الآن لـ (${nextName}).`,
                userId: "system",
                userName: "نظام التنبيه",
                userPhoto: "",
                timestamp: serverTimestamp(),
                type: "text",
              });
            }
            if (ghostUids.length > 0 && remaining.length > 0) {
              return addDoc(collection(db, "rooms", stationId, "messages"), {
                text: `👻 غادر ${ghostUids.length} المحطة تلقائياً (أغلقوا الموقع أو انقطعوا لا إرادياً).`,
                userId: "system",
                userName: "نظام التنبيه",
                userPhoto: "",
                timestamp: serverTimestamp(),
                type: "text",
              });
            }
            if (handoverMade) {
              return addDoc(collection(db, "rooms", stationId, "messages"), {
                text: `🛰️ تم نقل قيادة المحطة إلى عضو نشط آخر تلقائياً.`,
                userId: "system",
                userName: "نظام التنبيه",
                userPhoto: "",
                timestamp: serverTimestamp(),
                type: "text",
              });
            }
            return undefined;
          });
          });
        })
        .catch(() => {});
    };
    sweep();
    const sweepInterval = setInterval(sweep, SWEEP_INTERVAL_MS);
    return () => clearInterval(sweepInterval);
  }, [isJoined, isSpectator, stationId, user.uid]);

  // Main Room, Messaging and Typing Listeners
  useEffect(() => {
    if (!auth.currentUser) return;

    // Room subscription
    if (unsubRoomRef.current) {
      unsubRoomRef.current();
      unsubRoomRef.current = null;
    }
    unsubRoomRef.current = safeOnSnapshot(
      roomRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          // Room deleted underneath us: trigger immediately
          setTimeout(() => performSafeExit({ skipFirebaseUpdate: true }), 0);
          return;
        }
        const data = docSnap.data() as Room;
        setRoom({ id: docSnap.id, ...data });

        if (data.sharedNotes !== undefined && !isEditingNotesRef.current) {
          setSharedNotes(data.sharedNotes);
        }

        // Timer Sync relative to database startTime
        if (data.timerStatus !== "idle" && data.startTime) {
          const start = resolveStartTimeMs(data.startTime);
          if (start !== null) {
            const duration = (data.timerStatus === "focus" ? data.timerDuration : data.breakDuration) * 60 * 1000;
            const elapsed = (Date.now() + clockOffsetRef.current) - start;
            const remaining = Math.max(0, Math.floor((duration - elapsed) / 1000));
            setTimeLeft(remaining);
          }
          // While the server timestamp is still pending, keep the current display untouched
        } else {
          setTimeLeft(data.timerDuration * 60);
        }
      },
      (e) => {
        // Suppress room error logs if exiting
        if (!isExitingRef.current) {
          handleFirestoreError(e, OperationType.GET, `rooms/${stationId}`);
        }
      },
      `rooms/${stationId}`
    );

    // Live Typing subscription
    if (unsubTypingRef.current) {
      unsubTypingRef.current();
      unsubTypingRef.current = null;
    }
    unsubTypingRef.current = safeOnSnapshot(
      collection(db, "rooms", stationId, "typing"),
      (snap) => {
        const newMap: Record<string, { name: string; time: number }> = {};
        snap.docs.forEach((d: any) => {
          if (d.id !== userRef.current.uid) {
            newMap[d.id] = d.data() as { name: string; time: number };
          }
        });
        setTypingMap(newMap);
      },
      undefined,
      `rooms/${stationId}/typing`
    );

    const typingInterval = setInterval(() => {
      setTypingMap((m) => {
        let changed = false;
        const next = { ...m };
        const now = Date.now();
        for (const k in next) {
          if (now - next[k].time > 12000) {
            delete next[k];
            changed = true;
          }
        }
        return changed ? next : m;
      });
    }, 2000);

    // Messages Subscription
    const messagesQuery = query(
      collection(db, "rooms", stationId, "messages"),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    let initialLoadMsgs = true;
    if (unsubMessagesRef.current) {
      unsubMessagesRef.current();
      unsubMessagesRef.current = null;
    }
    unsubMessagesRef.current = safeOnSnapshot(
      messagesQuery,
      (snapshot) => {
        let msgs = snapshot.docs.map(
          (doc: any) => ({ id: doc.id, ...doc.data() }) as Message
        );
        msgs = msgs.reverse();
        setMessages(msgs);

        snapshot.docChanges().forEach((change: any) => {
          if (change.type === "added" && !initialLoadMsgs) {
            const msg = change.doc.data();
            if (msg.isExitPenalty) {
              setActiveAlerts(prev => [...prev, { id: change.doc.id, text: msg.text, type: 'distraction' }]);
            } else if (msg.type === 'system' || msg.text.includes("انضم إلى") || msg.text.includes("غادر المحطة")) {
              setActiveAlerts(prev => [...prev, { id: change.doc.id, text: msg.text, type: 'presence' }]);
            }
          }
        });
        initialLoadMsgs = false;
      },
      (e) => {
        if (!isExitingRef.current) {
          handleFirestoreError(e, OperationType.GET, `rooms/${stationId}/messages`);
        }
      },
      `rooms/${stationId}/messages`
    );

    document.addEventListener("visibilitychange", handleVisibilityChangeVal);
    window.addEventListener("blur", handleVisibilityChangeVal);
    window.addEventListener("focus", handleVisibilityChangeVal);

    return () => {
      if (unsubRoomRef.current) {
        unsubRoomRef.current();
        unsubRoomRef.current = null;
      }
      if (unsubTypingRef.current) {
        unsubTypingRef.current();
        unsubTypingRef.current = null;
      }
      if (unsubMessagesRef.current) {
        unsubMessagesRef.current();
        unsubMessagesRef.current = null;
      }
      clearInterval(typingInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChangeVal);
      window.removeEventListener("blur", handleVisibilityChangeVal);
      window.removeEventListener("focus", handleVisibilityChangeVal);

      if (fuelLeakIntervalRef.current) {
        clearInterval(fuelLeakIntervalRef.current);
        fuelLeakIntervalRef.current = null;
      }

      // Safe delayed mount-unmount teardown protecting against StrictMode and quick navigates
      if (!isExitingRef.current && !isSpectator) {
        const myInstanceId = instanceIdRef.current;
        setTimeout(async () => {
          // Verify if another instance has taken over in the meantime before performing DB write
          if (activeHookInstances.get(userRef.current.uid) === myInstanceId) {
            activeHookInstances.delete(userRef.current.uid);
            try {
              const updates = {
                participants: arrayRemove(userRef.current.uid)
              };
              await updateDoc(roomRef, updates);
              console.log("[Delayed Clean] Cleaned up room state successfully on total unmount.");
            } catch (e) {
              console.warn("Silent unmount cleanup error (expected if deleting room):", e);
            }
          } else {
            console.log("[Delayed Clean Shield] Bypassed stale unmount cleanup for", userRef.current.displayName);
          }
        }, 1200);
      }
    };
  }, [stationId, user.uid, isSpectator]);

  // Challenge live subscription
  useEffect(() => {
    if (room?.isChallenge && room?.challengeId && auth.currentUser) {
      if (unsubChallengeRef.current) {
        unsubChallengeRef.current();
        unsubChallengeRef.current = null;
      }
      unsubChallengeRef.current = safeOnSnapshot(doc(db, "challenges", room.challengeId), (docSnap) => {
        if (docSnap.exists()) {
          const c = { id: docSnap.id, ...docSnap.data() } as Challenge;
          setChallengeData(c);
          challengeDataRef.current = c;

          if (c.status === "active") {
            checkChallengeCompletion(room.challengeId).catch(() => {});
          }
        }
      }, undefined, `challenges/${room.challengeId}`);
    }
    return () => {
      if (unsubChallengeRef.current) {
        unsubChallengeRef.current();
        unsubChallengeRef.current = null;
      }
    };
  }, [room?.isChallenge, room?.challengeId]);

  // Local optimized key tracking to prevent array comparison identity re-run storms
  const participantsKey = (room?.participants || []).join(",");

  // Live query for participant profile info
  const pendingFetchesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const list = room?.participants || [];
    if (list.length > 0 && auth.currentUser) {
      // Retain only those participants that are still actively inside the room list
      setParticipantsData((prev) => prev.filter((p) => list.includes(p.uid)));

      list.forEach((uid) => {
        const exists = participantsDataRef.current.some((p) => p.uid === uid);
        if (!exists && !pendingFetchesRef.current.has(uid)) {
          // Check session-level in-memory cache first
          if (profileCache[uid] && profileCache[uid].uid === uid && profileCache[uid].displayName) {
            const fetched = profileCache[uid];
            setParticipantsData((current) => {
              if (!current.some((x) => x.uid === uid) && (roomSnapshotRef.current?.participants || []).includes(uid)) {
                return [...current, fetched];
              }
              return current;
            });
            return;
          }

          pendingFetchesRef.current.add(uid);
          getDoc(doc(db, "profiles", uid))
            .then(async (docSnap) => {
              let fetched = docSnap.exists() ? (docSnap.data() as UserData) : null;
              // A profile can be incomplete (e.g. a partial write left it without a
              // displayName). Fall back to the authoritative users doc so real members
              // remain visible in the room even when their public profile is broken.
              if (!fetched || fetched.uid !== uid || !fetched.displayName) {
                const userSnap = await getDoc(doc(db, "users", uid));
                if (userSnap.exists()) {
                  const userData = userSnap.data() as UserData;
                  // Keep good profile fields but never let null/undefined values
                  // (e.g. a profile written with all-null fields) override the
                  // authoritative users doc.
                  const profileGood = fetched
                    ? Object.fromEntries(
                        Object.entries(fetched).filter(([, v]) => v != null && v !== ""),
                      )
                    : {};
                  fetched = { ...userData, ...profileGood };
                }
              }
              if (!fetched || fetched.uid !== uid) return; // Skip broken/empty profiles
              profileCache[uid] = fetched; // Cache the fetched profile
              setParticipantsData((current) => {
                if (!current.some((x) => x.uid === uid) && (roomSnapshotRef.current?.participants || []).includes(uid)) {
                  return [...current, fetched];
                }
                return current;
              });
            })
            .catch((e) => {
              console.warn(`[Participant Sync] Failed to fetch profile for ${uid}:`, e);
            })
            .finally(() => {
              pendingFetchesRef.current.delete(uid);
            });
        }
      });
    } else {
      setParticipantsData([]);
    }
  }, [participantsKey]);

  // Verify visibility state when focus round starts to handle pre-inactive participants independently
  useEffect(() => {
    if (room?.timerStatus === "focus" && isJoined && !isSpectator) {
      const timer = setTimeout(() => {
        handleVisibilityChangeVal();
      }, 1500); // 1.5s stabilization delay
      return () => clearTimeout(timer);
    }
  }, [room?.timerStatus, isJoined, isSpectator, handleVisibilityChangeVal]);

  const startTimeVal = room?.startTime ? (resolveStartTimeMs(room.startTime) ?? 0) : 0;

  // Active worker ticking to obtain authentic remaining timer ticks
  useEffect(() => {
    if (room && room.timerStatus !== "idle" && room.startTime) {
      const workerCode = `
        let intervalId;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            intervalId = setInterval(() => self.postMessage('tick'), 1000);
          } else if (e.data === 'stop') {
            clearInterval(intervalId);
          }
        };
      `;
      const blob = new Blob([workerCode], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      worker.onmessage = () => {
        const r = roomSnapshotRef.current;
        if (!r || !r.startTime) return;

        // Securely handle pending Firestore server timestamps in latency-compensation phase
        const start = resolveStartTimeMs(r.startTime);
        if (start === null) {
          return; // تجاهل الـ tick، انتظر الـ startTime الحقيقي
        }

        const duration = (r.timerStatus === "focus" ? r.timerDuration : r.breakDuration) * 60 * 1000;
        const elapsed = (Date.now() + clockOffsetRef.current) - start;
        const remaining = Math.max(0, Math.floor((duration - elapsed) / 1000));
        setTimeLeft(remaining);
      };

      worker.postMessage("start");

      return () => {
        worker.postMessage("stop");
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
      };
    }
  }, [room?.timerStatus, startTimeVal, room?.timerDuration, room?.breakDuration]);

  // Distraction trigger Red Alert (alert only — no XP penalty; fuel leak handles draining)
  const triggerRedAlert = useCallback(async () => {
    if (isSpectator) return;
    setShowAlert(true);

    await addDoc(collection(db, "rooms", stationId, "messages"), {
      text: `☄️ نيزك ضرب المحطة! ${userRef.current.displayName} تشتت وفقد جزءاً من وقوده!`,
      userId: userRef.current.uid,
      userName: "نظام التنبيه",
      userPhoto: "",
      timestamp: serverTimestamp(),
      type: "text",
    });

    setTimeout(() => setShowAlert(false), 4000);
  }, [stationId, isSpectator]);

  // Manage Session Key to handle resets cleanly across re-syncs
  if (!isJoined) {
    focusSessionKeyRef.current = "";
  } else if (room?.timerStatus === "focus" && room?.startTime) {
    const startMs = resolveStartTimeMs(room.startTime);
    if (startMs !== null) {
      const sessionKey = startMs.toString();
      if (sessionKey && focusSessionKeyRef.current !== sessionKey) {
        focusSessionKeyRef.current = sessionKey;
        lastXpUpdateTimeRef.current = null;
        afkFailCountRef.current = 0;
        afkTriggeredRef.current = new Set();
        afkScheduleRef.current = generateAfkSchedule((room?.timerDuration || 25) * 60);
        nextMissionDismissedRef.current = false;
      }
    }
  }

  // Shared focus-XP grant logic used by the 1s interval AND by the settle-up
  // that fires when a focus phase legitimately ends. Extracting it guarantees
  // the final partial minute is never lost when the timer flips to break.
  const grantPendingFocusXp = useCallback(
    async (allowPartial = false, afkActive = false) => {
      if (isSpectator) return;
      const now = Date.now() + clockOffsetRef.current;
      if (isDistractedRef.current || afkActive || isWatchingClassRef.current) {
        lastXpUpdateTimeRef.current = now;
        return;
      }

      const secondsSpent = Math.floor(
        (now - (lastXpUpdateTimeRef.current || now)) / 1000,
      );

      if (secondsSpent < 60) {
        // On a legit focus-phase end, credit the partial minute once we have
        // at least half a minute of real focus since the last grant.
        if (!allowPartial || secondsSpent < 30) return;
      }

      let elapsedMinutes = Math.floor(secondsSpent / 60);
      if (elapsedMinutes < 1 && allowPartial) elapsedMinutes = 1;

      // HARD MATHEMATICAL BOUNDARY: Reject anomalies that exceed realistic parameters
      // A single tick of our 1s loop should grant at most 5 minutes of accrued XP (safety catch-up)
      const boundedMinutes = Math.min(elapsedMinutes, 5);
      const prevLastXpUpdateTime = lastXpUpdateTimeRef.current;
      lastXpUpdateTimeRef.current =
        (lastXpUpdateTimeRef.current || now) + elapsedMinutes * 60000;

      let globalLastGrant =
        (userRef.current as any).lastFocusXpUpdate !== undefined
          ? (userRef.current as any).lastFocusXpUpdate
          : (userRef.current as any).lastXpUpdate || 0;

      if (globalLastGrant && typeof globalLastGrant.toDate === "function") {
        globalLastGrant = globalLastGrant.toDate().getTime();
      } else if (
        globalLastGrant &&
        typeof globalLastGrant === "object" &&
        "seconds" in globalLastGrant
      ) {
        globalLastGrant = globalLastGrant.seconds * 1000;
      } else if (typeof globalLastGrant !== "number") {
        globalLastGrant = Number(globalLastGrant) || 0;
      }

      const lastGrant = Math.max(
        lastXpGrantTimestampRef.current || 0,
        globalLastGrant,
      );
      const globalElapsedMinutes = Math.max(
        0,
        Math.floor((now - lastGrant + 5000) / 60000),
      );

      // No per-session xp cap: keep earning 1 XP per real focus minute as long
      // as the user keeps studying. globalElapsedMinutes still anti-farms.
      let xpToGrant = Math.min(boundedMinutes, globalElapsedMinutes);

      const currentRoom = roomSnapshotRef.current;
      if (xpToGrant > 0 && currentRoom) {
        const result = await requestXpGrant(
          userRef.current.uid,
          userRef.current.fleetId,
          currentRoom.isChallenge ? currentRoom.challengeId : null,
          challengeDataRef.current
            ? userRef.current.uid === challengeDataRef.current.challengerId
            : false,
          xpToGrant,
          `Focus Interval Loop (Minutes: ${xpToGrant})`,
          false, // Enforce Transaction lock!
        );

        if (result === -1 || result === 0) {
          // Blocked by cooldown (or no actual grant). Rollback state so we retry on subsequent ticks
          lastXpUpdateTimeRef.current = prevLastXpUpdateTime;
          return 0;
        } else {
          lastXpGrantTimestampRef.current = now;
          return xpToGrant;
        }
      }
      return 0;
    },
    [stationId, isSpectator],
  );

  // Interactive interval positive XP progression loop
  useEffect(() => {
    if (isSpectator) return;
    if (!isJoined || room?.timerStatus !== "focus") {
      if (xpIntervalRef.current) {
        clearInterval(xpIntervalRef.current);
        xpIntervalRef.current = null;
      }
      return;
    }

    if (lastXpUpdateTimeRef.current === null) {
      lastXpUpdateTimeRef.current = Date.now() + clockOffsetRef.current;
    }

    if (xpIntervalRef.current) {
      clearInterval(xpIntervalRef.current);
    }

    xpIntervalRef.current = setInterval(async () => {
      const now = Date.now() + clockOffsetRef.current;
      const xpGranted = await grantPendingFocusXp(false, showAFKCheck);

      // Challenge tracking milestones (only fire when XP was actually granted)
      if (xpGranted > 0) {
        const currentRoom = roomSnapshotRef.current;
        if (currentRoom?.isChallenge && currentRoom.challengeId) {
          checkChallengeCompletion(currentRoom.challengeId).catch(() => {});

          if (challengeDataRef.current) {
            const c = challengeDataRef.current;
            const isMeP1 = userRef.current.uid === c.challengerId;

            const oldMyProgress = isMeP1 ? (c.progressPlayer1 || 0) : (c.progressPlayer2 || 0);
            const oppProgress = isMeP1 ? (c.progressPlayer2 || 0) : (c.progressPlayer1 || 0);

            const myNewProgress = oldMyProgress + xpGranted;
            const oppName = isMeP1 ? c.challengedName : c.challengerName;
            const myName = isMeP1 ? c.challengerName : c.challengedName;

            // 1. Check if we reached a multiple of 10 minutes
            if (Math.floor(myNewProgress / 10) > Math.floor(oldMyProgress / 10) && myNewProgress >= 10) {
              addDoc(collection(db, "rooms", stationId, "messages"), {
                text: `⚔️ الخصم ${myName} يتقدّم بثبات! لقد حقق الآن ${myNewProgress} دقائق تركيز فعلي متراكم!`,
                userId: "system",
                userName: "نظام التحديات",
                userPhoto: "",
                timestamp: serverTimestamp(),
                type: "text",
              }).catch((e) => console.error("Failed to add milestone msg:", e));

              const oppId = isMeP1 ? c.challengedId : c.challengerId;
              addDoc(collection(db, "users", oppId, "notifications"), {
                type: "challenge_push",
                content: `⚔️ خصمك ${myName} يتقدّم بثبات! لقد حقق ${myNewProgress} دقيقة تركيز فعلي في النزال!`,
                read: false,
                timestamp: serverTimestamp(),
              }).catch(() => {});
            }

            // 2. Check if we just took the lead
            if (oldMyProgress <= oppProgress && myNewProgress > oppProgress && oppProgress > 0) {
              addDoc(collection(db, "rooms", stationId, "messages"), {
                text: `🔥 الصدارة تتغير! لقد انتزع ${myName} القيادة في نزال التركيز بـ ${myNewProgress} دقيقة مقابل ${oppProgress} دقيقة لـ ${oppName}!`,
                userId: "system",
                userName: "نظام التحديات",
                userPhoto: "",
                timestamp: serverTimestamp(),
                type: "text",
              }).catch((e) => console.error("Failed to add lead change msg:", e));

              const oppId = isMeP1 ? c.challengedId : c.challengerId;
              addDoc(collection(db, "users", oppId, "notifications"), {
                type: "challenge_push",
                content: `🔥 لقد انتزع ${myName} الصدارة في نزال التركيز بـ ${myNewProgress} دقيقة محققة!`,
                read: false,
                timestamp: serverTimestamp(),
              }).catch(() => {});
            }
          }
        }
      }
    }, 1000);

    return () => {
      if (xpIntervalRef.current) {
        clearInterval(xpIntervalRef.current);
        xpIntervalRef.current = null;
      }
    };
  }, [isJoined, room?.timerStatus, isSpectator]);

  // AFK checking triggers (randomized schedule: up to 3 checks, none before
  // the first 10 minutes, with long random gaps between them)
  useEffect(() => {
    if (isSpectator) return;
    if (room?.timerStatus !== "focus" || timeLeft <= 0 || !isJoined) {
      setShowAFKCheck(false);
      setIsWatchingClass(false);
      return;
    }

    if (isWatchingClass) return;

    const durationSeconds = room.timerDuration * 60;
    const elapsed = durationSeconds - timeLeft;

    afkScheduleRef.current.forEach((at) => {
      if (Math.abs(elapsed - at) <= 2 && !afkTriggeredRef.current.has(at)) {
        afkTriggeredRef.current.add(at);
        if (!showAFKCheck) {
          setShowAFKCheck(true);
          setAfkTimeLeft(60);
          try {
            playSound("notification");
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
            audio.play().catch(() => {});
          } catch (e) {}
        }
      }
    });
  }, [timeLeft, room?.timerStatus, room?.timerDuration, isJoined, showAFKCheck, isWatchingClass, isSpectator]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showAFKCheck) {
      interval = setInterval(() => {
        setAfkTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimeout(() => handleAFKFailure(), 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showAFKCheck]);

  const handleAFKFailure = async () => {
    afkFailCountRef.current += 1;
    if (afkFailCountRef.current < 2) {
      setAfkTimeLeft(15);
      return;
    }
    setShowAFKCheck(false);
    await performSafeExit({
      customExitMessage: `💤 غادر ${user.displayName} المحطة بسبب عدم الاستجابة (AFK). تم حفظ نقاطه المسجلة حتى الآن.`
    });
  };

  // 2. AUTHORITATIVE & SYNCHRONIZED TIMER TRANSITION
  useEffect(() => {
    if (timeLeft > 0) {
      isTransitioningRef.current = false;
    }

    if (timeLeft === 0 && room && room.timerStatus !== "idle") {
      if (!room.startTime) return;
      if (isSpectator) return; // Spectators have no mutation rights

      const startMs = resolveStartTimeMs(room.startTime);
      if (startMs === null) return;
      const durationMs = (room.timerStatus === "focus" ? room.timerDuration : room.breakDuration) * 60 * 1000;
      const elapsed = (Date.now() + clockOffsetRef.current) - startMs;

      // Ensure 90% of the session time has objectively elapsed to guard against fast-forward timing glitches
      if (elapsed < durationMs - 15000) return;

      const isLegitEnd = elapsed <= durationMs + 2 * 60 * 1000;

      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;

      // Sound notification on legit end
      if (isLegitEnd) {
        if ("Notification" in window && Notification.permission === "granted" && document.visibilityState === "hidden") {
          new Notification("انتهى الوقت!", {
            body: room.timerStatus === "focus"
              ? "انتهت جلسة التركيز، حان وقت الاستراحة"
              : "انتهت الاستراحة، حان وقت التركيز",
          });
        }
        try { playSound("timer"); } catch (e) {}
      }

          // CLIENT-SIDE PROGRESS REWARDS (Safe, independent, and strictly bounded)
          if (room.timerStatus === "focus" && isLegitEnd) {
            const sessionStartVal = resolveStartTimeMs(room.startTime) ?? 0;
            const transitionLockKey = `processed_transition_${stationId}_${sessionStartVal}`;
            if (localStorage.getItem(transitionLockKey)) {
              console.log("[Collision Shield] Rewards already granted in another tab/instance for this session");
            } else {
              localStorage.setItem(transitionLockKey, "true");
              
              // SETTLE-UP: credit the final partial focus minute before the
              // timer flips to break. The 1s interval only grants full minutes,
              // so without this the tail of the session is silently lost.
              grantPendingFocusXp(true, false).catch(() => {});
              // Clean up old obsolete transition lock keys for this room to avoid filling storage
              try {
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.startsWith(`processed_transition_${stationId}_`) && key !== transitionLockKey) {
                    localStorage.removeItem(key);
                  }
                }
              } catch (e) {}

              // ANTI-CHEAT: "أُشاهد حصة" (watching class) mode earns nothing —
              // no refund, no session stats, no challenge credit. The user chose
              // to watch instead of focus, and gets no progression for it.
              if (!isWatchingClassRef.current) {
                const safeXpEarned = remainingShieldRef.current > 0 ? remainingShieldRef.current : 0;

                currentBetRef.current = 0;
                remainingShieldRef.current = 0;
                setShieldPercent(0);

                const updates: any = {
                  totalFocusSessions: increment(1),
                  lastStudyDate: new Date().toISOString().split("T")[0],
                };

                // Weekly duel counters — auto-reset to the current Monday when the week flips
                // NOTE: room.timerDuration is already in MINUTES (e.g. 25).
                const minutesEarned = room.timerDuration;
                const weekKey = getWeekStartISO();
                const sameWeek = userRef.current.weekStart === weekKey;
                updates.weekStart = weekKey;
                updates.weekFocusMinutes =
                  (sameWeek ? userRef.current.weekFocusMinutes || 0 : 0) + minutesEarned;
                updates.weekSessions =
                  (sameWeek ? userRef.current.weekSessions || 0 : 0) + 1;
                updates.totalFocusMinutes =
                  (userRef.current.totalFocusMinutes || 0) + minutesEarned;

                updateDoc(doc(db, "users", userRef.current.uid), updates).catch(() => {});

                let totalXpToGive = 0;
                if (safeXpEarned > 0) totalXpToGive += safeXpEarned;

                if (totalXpToGive > 0) {
                  requestXpGrant(userRef.current.uid, userRef.current.fleetId, null, false, totalXpToGive, `on_exit_session (refund)`, true);
                }

                if (userRef.current.fleetId) {
                  updateDoc(doc(db, "fleets", userRef.current.fleetId), {
                    totalFocusHours: increment(room.timerDuration / 60),
                  }).catch(() => {});
                }

                // Non-synchronous race: every completed focus session feeds the user's active challenges
                // room.timerDuration is already in minutes.
                creditFocusToActiveChallenges(userRef.current.uid, room.timerDuration);
              }
            }
          }

      // AUTHORITATIVE WRITE ROUTING
      // The round follows a natural cycle: a completed focus segment moves to
      // break, and a completed break moves back to focus (or idle when the host
      // stops the round). The host (creator) is the primary authorized writer;
      // the alphabetical backup chain only heals the timer if the host's write
      // never lands.
      const nextStatus = room.timerStatus === "focus" ? "break" : "idle";
      const focusToAdd = room.timerStatus === "focus" ? room.timerDuration * 60 : 0;

      // Alphabetical participant listing to establish a backup execution chain
      const sortedParticipants = [...(room.participants || [])].sort();
      const myAlphabeticalRank = sortedParticipants.indexOf(userRef.current.uid);

      // Rule: Only Host is primary authorized writer.
      // If Host is absent, the next alphabetical participant (rank 0 or 1) steps up after 5 seconds to heal the timer stall.
      // Calculate isHost directly using roomSnapshotRef.current to avoid race conditions when room is initially null.
      const currentRoomForTransition = roomSnapshotRef.current;
      const currentIsHost = currentRoomForTransition
        ? ((currentRoomForTransition.hostId || currentRoomForTransition.creatorId) === userRef.current.uid || userRef.current.role === "admin")
        : false;

      const transitionDelay = currentIsHost 
        ? 0 
        : (myAlphabeticalRank === 0 ? 5000 : 8000 + Math.random() * 4000);

      // Snapshot the identity of the session we are about to transition OUT of.
      // If another client starts a brand-new round (timerStatus back to "focus"
      // with a fresh startTime) before this delayed write runs, the old session
      // must NOT be transitioned anymore — otherwise it would wipe the new round.
      const scheduledSessionStart = resolveStartTimeMs(room.startTime);

      setTimeout(async () => {
        try {
          // Re-fetch room instantly to verify no other client completed the transition first
          const snapCheck = await getDoc(roomRef);
          if (snapCheck.exists()) {
            const currentR = snapCheck.data() as Room;
            const sameSession =
              currentR.timerStatus === room.timerStatus &&
              // Only treat the room as still in our old session when its startTime
              // is unchanged (a new round always carries a fresh startTime).
              (scheduledSessionStart === null ||
                resolveStartTimeMs(currentR.startTime) === scheduledSessionStart);
            if (sameSession) {
              // Room is still in the old status! It's our job to transition.
              const updateData: any = {
                timerStatus: nextStatus,
                startTime: nextStatus === "break" ? serverTimestamp() : deleteField(),
              };
              if (focusToAdd > 0) {
                updateData.accumulatedFocusSeconds = (currentR.accumulatedFocusSeconds || 0) + focusToAdd;
              }
              await updateDoc(roomRef, updateData);
              console.log(`[Authoritative Transition] Processed transition successfully. New State: ${nextStatus}`);
            }
          }
        } catch (e) {
          console.error("Timer transition write failed safely:", e);
        } finally {
          isTransitioningRef.current = false;
        }
      }, transitionDelay);
    }
  }, [timeLeft, room?.timerStatus, stationId, isSpectator]);

  // Credit focus minutes from ANY completed study session into the user's active challenges
  const creditFocusToActiveChallenges = async (userId: string, minutes: number) => {
    if (!userId || minutes <= 0) return;
    try {
      const q1 = query(
        collection(db, "challenges"),
        where("challengerId", "==", userId),
        where("status", "==", "active")
      );
      const q2 = query(
        collection(db, "challenges"),
        where("challengedId", "==", userId),
        where("status", "==", "active")
      );
      const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const seen = new Set<string>();
      for (const snap of [s1, s2]) {
        for (const d of snap.docs) {
          if (seen.has(d.id)) continue;
          seen.add(d.id);
          const c = d.data();
          const field = c.challengerId === userId ? "progressPlayer1" : "progressPlayer2";
          await updateDoc(doc(db, "challenges", d.id), {
            [field]: increment(minutes),
          }).catch(() => {});
          checkChallengeCompletion(d.id).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Credit focus to active challenges:", e);
    }
  };

  const checkChallengeCompletion = async (cId: string, forceCompleteEarly = false) => {
    const startMs = performance.now();
    try {
      const cRef = doc(db, "challenges", cId);
      let rewardedUser = false;
      let winnerId = "";
      let challengerId = "";
      let challengedId = "";
      let challengerName = "";
      let challengedName = "";
      let p1 = 0;
      let p2 = 0;

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(cRef);
        if (!snap.exists()) return;
        const cData = snap.data() as Challenge;
        if (cData.status !== "active") return;

        challengerId = cData.challengerId;
        challengedId = cData.challengedId;
        challengerName = cData.challengerName;
        challengedName = cData.challengedName;
        p1 = cData.progressPlayer1 || 0;
        p2 = cData.progressPlayer2 || 0;

        const startTime = cData.startTime || cData.createdAt || Date.now();
        const isExpired = (Date.now() - startTime) >= (cData.durationMinutes || 60) * 60000;

        if (isExpired || forceCompleteEarly) {
          if (p1 > p2) {
            winnerId = challengerId;
          } else if (p2 > p1) {
            winnerId = challengedId;
          } else if (p1 > 0 || p2 > 0) {
            winnerId = "draw";
          } else {
            winnerId = "tie";
          }

          transaction.update(cRef, { 
            status: "completed", 
            winnerId,
            completedAt: Date.now()
          });
          rewardedUser = true;
        }
      });

      Debugger.logLatency(`challenge_completion_tx[${cId}]`, startMs, true);

      if (rewardedUser && winnerId) {
        if (winnerId !== "draw" && winnerId !== "tie" && winnerId !== "") {
          const { grantChallengeReward } = await import("../lib/xpSystem");
          await grantChallengeReward(cId, winnerId);

          // Make "challengeWins" real: one win per completed challenge for the winner.
          await updateDoc(doc(db, "users", winnerId), {
            challengeWins: increment(1),
          }).catch(() => {});

          await addDoc(collection(db, "users", winnerId, "notifications"), {
            type: "challenge_win",
            content: `🏆 مبروك! لقد فزت بتحدي التركيز ضد ${winnerId === challengerId ? challengedName : challengerName}! تم إضافة شارة "بطل المعركة" الأسبوعية، 50 عملة، و 100 XP!`,
            read: false,
            timestamp: serverTimestamp(),
          }).catch(() => {});

          const loserId = winnerId === challengerId ? challengedId : challengerId;
          addDoc(collection(db, "users", loserId, "notifications"), {
            type: "challenge_completed",
            content: `⚔️ انتهى النزال! فاز ${winnerId === challengerId ? challengerName : challengedName} بـ ${Math.max(p1, p2)} دقيقة مقابل ${Math.min(p1, p2)} دقيقة لك. حظاً أوفر المرة القادمة!`,
            read: false,
            timestamp: serverTimestamp(),
          }).catch(() => {});
        } else {
          // Tie or Draw
          const msg = `🤝 انتهى النزال بالتعادل بين ${challengerName} و ${challengedName} بـ ${p1} دقيقة تركيز لكل منهما!`;
          addDoc(collection(db, "users", challengerId, "notifications"), {
            type: "challenge_completed",
            content: msg,
            read: false,
            timestamp: serverTimestamp(),
          }).catch(() => {});
          addDoc(collection(db, "users", challengedId, "notifications"), {
            type: "challenge_completed",
            content: msg,
            read: false,
            timestamp: serverTimestamp(),
          }).catch(() => {});
        }

        await addDoc(collection(db, "rooms", stationId, "messages"), {
          text: winnerId === "draw" || winnerId === "tie"
            ? `🤝 انتهى التحدي بالتعادل! كلا البطلين بذل روحه التركيزية بـ ${p1} دقيقة!` 
            : `🏆 انتهى التحدي رسميًا! الفائز بلقب الصدارة هو ${winnerId === challengerId ? challengerName : challengedName} بـ ${Math.max(p1, p2)} دقيقة تركيز!`,
          userId: "system",
          userName: "نظام التحديات",
          userPhoto: "",
          timestamp: serverTimestamp(),
          type: "text",
        });
      }
    } catch (e) {
      Debugger.logLatency(`challenge_completion_tx[${cId}]`, startMs, false, e instanceof Error ? e.message : String(e));
      Debugger.logError("checkChallengeCompletion", e);
      console.error(`Failed to check challenge transactionally: ${e}`);
    }
  };

  const handleSendMessage = useCallback(async (customText?: string) => {
    const textToSend = typeof customText === "string" ? customText : newMessage;
    if (!textToSend.trim()) return false;
    if (textToSend.length > 500) {
      showToast("الرسالة طويلة جداً! الحد الأقصى هو 500 حرف.", "warning");
      return false;
    }
    if (roomSnapshotRef.current?.isChatLocked && !isHost) {
      showToast("الدردشة مغلقة من قبل المشرف.", "warning");
      return false;
    }

    if (roomSnapshotRef.current?.timerStatus === "focus") {
      const now = Date.now();
      if (now - lastMessageTime.current < 5 * 60 * 1000) {
        const remainingMinutes = Math.ceil((5 * 60 * 1000 - (now - lastMessageTime.current)) / 60000);
        showToast(`التايمر يعمل بوضع الدراسة! يمكنك إرسال رسالة واحدة فقط كل 5 دقائق. يرجى الانتظار ${remainingMinutes} دقيقة.`, "warning");
        return false;
      }
      lastMessageTime.current = now;
    }

    if (typeof window !== "undefined" && (window as any).__firestoreQuotaExceeded) {
      // Robust client fallback: simulate adding the message locally so the room interface doesn't freeze
      const simulatedMsg = {
        id: "offline_" + Math.random().toString(36).substring(7),
        text: textToSend,
        userId: userRef.current.uid,
        userName: userRef.current.displayName,
        userPhoto: userRef.current.photoURL,
        timestamp: { toDate: () => new Date() }, // Mock Firestore timestamp object
        type: "text" as const,
        simulated: true,
      };
      setMessages((prev) => [...prev, simulatedMsg] as any);
      if (typeof customText !== "string") {
        setNewMessage("");
      }
      return true;
    }

    try {
      await addDoc(collection(db, "rooms", stationId, "messages"), {
        text: textToSend,
        userId: userRef.current.uid,
        userName: userRef.current.displayName,
        userPhoto: userRef.current.photoURL,
        timestamp: serverTimestamp(),
        type: "text",
      });
      if (typeof customText !== "string") {
        setNewMessage("");
      }
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `rooms/${stationId}/messages`);
      // Fallback locally even if write failed dynamically mid-flight
      const simulatedMsg = {
        id: "offline_err_" + Math.random().toString(36).substring(7),
        text: textToSend,
        userId: userRef.current.uid,
        userName: userRef.current.displayName,
        userPhoto: userRef.current.photoURL,
        timestamp: { toDate: () => new Date() },
        type: "text" as const,
        simulated: true,
      };
      setMessages((prev) => [...prev, simulatedMsg] as any);
      if (typeof customText !== "string") {
        setNewMessage("");
      }
      return true;
    }
  }, [stationId, isHost, newMessage]);

  const saveNotes = useCallback(async () => {
    if (sharedNotes === roomSnapshotRef.current?.sharedNotes) {
      setIsEditingNotes(false);
      return;
    }
    try {
      await safeUpdateRoom({ sharedNotes });
      setIsEditingNotes(false);
    } catch (e) {
      console.error("Failed to save notes", e);
    }
  }, [safeUpdateRoom, sharedNotes]);

  const handleNextMissionSubmit = () => {
    if (nextMissionInput.trim()) {
      localStorage.setItem("pendingMission", nextMissionInput.trim());
    }
    nextMissionDismissedRef.current = true;
    setShowNextMissionModal(false);
    setNextMissionInput("");
  };

  useEffect(() => {
    if (room?.timerStatus === "focus") {
      const stored = localStorage.getItem("pendingMission");
      if (stored) {
        setPendingMission(stored);
        localStorage.removeItem("pendingMission");
      } else {
        setPendingMission(null);
      }
    } else {
      setPendingMission(null);
    }
  }, [room?.timerStatus]);

  useEffect(() => {
    if (
      isJoined &&
      !isSpectator &&
      !nextMissionDismissedRef.current &&
      room?.timerStatus === "focus" &&
      timeLeft <= 60 &&
      timeLeft > 0 &&
      !isTransitioningRef.current &&
      room.timerDuration > 1
    ) {
      setShowNextMissionModal(true);
    }
  }, [timeLeft, room?.timerStatus, room?.timerDuration, isJoined, isSpectator]);

  // Private fields helper functions
  const incrementField = (amount: number) => increment(amount);

  return {
    room,
    timeLeft,
    participantsData,
    messages,
    typingMap,
    challengeData,
    activeAlerts,
    newMessage,
    setNewMessage,
    showExitDialog,
    setShowExitDialog,
    showBetModal,
    setShowBetModal,
    showNextMissionModal,
    setShowNextMissionModal,
    showStudyLinkModal,
    setShowStudyLinkModal,
    nextMissionInput,
    setNextMissionInput,
    pendingMission,
    betError,
    setBetError,
    shieldPercent,
    setShieldPercent,
    setActiveAlerts,
    isJoined,
    isExiting,
    isFocusMode,
    setIsFocusMode,
    sharedNotes,
    setSharedNotes,
    isEditingNotes,
    setIsEditingNotes,
    showAFKCheck,
    setShowAFKCheck,
    isWatchingClass,
    setIsWatchingClass,
    afkTimeLeft,
    showFuelLeak,
    setShowFuelLeak,
    leakedXP,
    showAlert,
    setShowAlert,
    currentBetRef,
    remainingShieldRef,
    studyLinkRef,
    safeUpdateRoom,
    performSafeExit,
    handleConfirmExit,
    toggleCall,
    triggerRedAlert,
    handleSendMessage,
    saveNotes,
    handleNextMissionSubmit,
    isHost,
    hasJoinedStation,
    setHasJoinedStation,
  };
}


