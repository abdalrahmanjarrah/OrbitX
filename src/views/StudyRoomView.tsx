import { useSessionEngine } from "../lib/sessionEngine";
import { useRenderLog } from "../firebaseDebug";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  Flame,
  Info,
  Lock,
  Play,
  Rocket,
  Square,
  Swords,
  Target,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import StarBackground from "../components/StarBackground";

import { cn } from "../lib/utils";
import { showToast } from "../lib/cosmicUI";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";

import StudyRoomHeader from "../components/study/StudyRoomHeader";
import StudyRoomParticipants from "../components/study/StudyRoomParticipants";
import StudyRoomChat from "../components/study/StudyRoomChat";
import StudyRoomDialogs from "../components/study/StudyRoomDialogs";
import { useSessionCompletion } from "../hooks/useSessionCompletion";
import { SessionCompletionModal } from "../components/sessionCompletion/SessionCompletionModal";

import { UserData, Room } from "../shared";
import PersonalTasks from "./PersonalTasks";
import { useLanguage } from "../context/LanguageContext";

export default function StudyRoomView(props: {
  user: UserData;
  stationId: string;
  onExit: () => void;
  onSelectUser: (id: string) => void;
}) {
  const { isAr, t } = useLanguage();
  useRenderLog("StudyRoomView", props);
  const [authStatus, setAuthStatus] = useState<
    "loading" | "authorized" | "spectator" | "rejected"
  >("loading");

  useEffect(() => {
    let active = true;
    const checkAuth = async () => {
      try {
        const snap = await getDoc(doc(db, "rooms", props.stationId));
        if (!snap.exists()) {
          setAuthStatus("rejected");
          props.onExit();
          return;
        }

        const data = snap.data() as Room;
        let allowed = true;
        let spectator = false;

        // 0. Guest (viewer) access: public stations only, always as spectator.
        if (props.user.isGuest) {
          if (data.isPrivate || data.isChallenge) {
            showToast(
              data.isPrivate
                ? "الغرف الخاصة تتطلب حساباً مسجلاً. سجّل الدخول للانضمام."
                : "التحديات تتطلب حساباً مسجلاً. سجّل الدخول للمشاركة.",
              "warning",
            );
            setAuthStatus("rejected");
            props.onExit();
            return;
          }
          spectator = true;
          allowed = true;
          if (active) setAuthStatus("spectator");
          return;
        }

        // 1. Participant Eligibility (Private Challenge)
        if (data.isChallenge) {
          allowed =
            props.user.uid === data.creatorId ||
            (data.participants && data.participants.includes(props.user.uid));
        }

        // 1b. Private (Invite-Only) Station
        if (data.isPrivate) {
          allowed =
            props.user.uid === data.creatorId ||
            (data.participants && data.participants.includes(props.user.uid));
        }

        if (!allowed) {
          if (props.user.role === "admin") {
            spectator = true;
            allowed = true;
          } else {
            showToast(
              data.isPrivate
                ? "هذه المحطة خاصة برمز سري. ادخل عبر رمز الانضمام."
                : "هذا التحدي خاص. لا يمكنك الدخول.",
              "warning",
            );
            setAuthStatus("rejected");
            props.onExit();
            return;
          }
        }

        // 2. Capacity Validation
        if (
          allowed &&
          !spectator &&
          data.maxParticipants &&
          data.maxParticipants > 0
        ) {
          const currentCount = data.participants ? data.participants.length : 0;
          if (
            currentCount >= data.maxParticipants &&
            (!data.participants || !data.participants.includes(props.user.uid))
          ) {
            if (props.user.role === "admin") {
              spectator = true;
            } else {
              showToast("المحطة ممتلئة! لا يمكنك الدخول.", "warning");
              setAuthStatus("rejected");
              props.onExit();
              return;
            }
          }
        }

        if (active) setAuthStatus(spectator ? "spectator" : "authorized");
      } catch (err) {
        if (active) {
          setAuthStatus("rejected");
          props.onExit();
        }
      }
    };
    checkAuth();
    return () => {
      active = false;
    };
  }, [props.stationId, props.user.uid, props.user.role, props.user.isGuest, props.onExit]);

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-white relative z-50">
        <div className="flex flex-col items-center space-y-4">
          <Rocket className="w-12 h-12 animate-bounce text-blue-500" />
          <p className="font-mono text-blue-300">يتم التحقق من التصريح...</p>
        </div>
      </div>
    );
  }

  if (authStatus === "rejected") return null;

  return (
    <StudyRoomContent {...props} isSpectator={authStatus === "spectator"} />
  );
}

function StudyRoomContent({
  user,
  stationId,
  onExit,
  onSelectUser,
  isSpectator,
}: {
  user: UserData;
  stationId: string;
  onExit: () => void;
  onSelectUser: (id: string) => void;
  isSpectator: boolean;
}) {
  const { isAr, t } = useLanguage();
  const {
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
    sessionXpAccumRef,
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
  } = useSessionEngine(stationId, user, isSpectator, onExit);

  const {
    isOpen: isCompletionOpen,
    completionData,
    closeCompletion,
  } = useSessionCompletion(stationId, room, user, isJoined, sessionXpAccumRef);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [studyLink, setStudyLink] = useState("");
  const typingNames = Object.values(typingMap).map((p: any) => p.name);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSharedNotes(e.target.value);
    setIsEditingNotes(true);
  };

  if (!room) return null;

  return (
    <div
      className="min-h-screen relative flex flex-col overflow-x-hidden"
      dir={isAr ? "rtl" : "ltr"}
    >
      <StarBackground />
      <div className="atmosphere-bg" />

      {isSpectator && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-950/80 backdrop-blur-xl border border-indigo-500/30 text-indigo-200 text-xs font-bold shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <Eye size={14} className="text-indigo-400" />
            {isAr
              ? "وضع المشاهدة — أنت تشاهد المحطة فقط، لا تُسجَّل أي نقاط"
              : "Spectator mode — you're just watching; no XP is recorded"}
          </div>
        </div>
      )}

      {/* Grouped Dialogs & Modals */}
      <StudyRoomDialogs
        room={room}
        user={user}
        stationId={stationId}
        safeUpdateRoom={safeUpdateRoom}
        performSafeExit={performSafeExit}
        handleConfirmExit={handleConfirmExit}
        isExiting={isExiting}
        showBetModal={showBetModal}
        setShowBetModal={setShowBetModal}
        betError={betError}
        setBetError={setBetError}
        currentBetRef={currentBetRef}
        remainingShieldRef={remainingShieldRef}
        setShieldPercent={setShieldPercent}
        showAFKCheck={showAFKCheck}
        setShowAFKCheck={setShowAFKCheck}
        afkTimeLeft={afkTimeLeft}
        showFuelLeak={showFuelLeak}
        setShowFuelLeak={setShowFuelLeak}
        shieldPercent={shieldPercent}
        leakedXP={leakedXP}
        showAlert={showAlert}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        showExitDialog={showExitDialog}
        setShowExitDialog={setShowExitDialog}
        showNextMissionModal={showNextMissionModal}
        setShowNextMissionModal={setShowNextMissionModal}
        nextMissionInput={nextMissionInput}
        setNextMissionInput={setNextMissionInput}
        handleNextMissionSubmit={handleNextMissionSubmit}
        showStudyLinkModal={showStudyLinkModal}
        setShowStudyLinkModal={setShowStudyLinkModal}
        studyLink={studyLink}
        setStudyLink={setStudyLink}
        studyLinkRef={studyLinkRef}
      />

      <SessionCompletionModal
        isOpen={isCompletionOpen}
        completionData={completionData}
        user={user}
        onClose={closeCompletion}
        onContinue={() => {
          closeCompletion();
        }}
        onExitToStations={() => {
          closeCompletion();
          performSafeExit();
        }}
      />

      {/* Floating Pill Room Header */}
      <StudyRoomHeader
        room={room}
        isJoined={isJoined}
        isHost={isHost}
        isFocusMode={isFocusMode}
        setIsFocusMode={setIsFocusMode}
        setShowDeleteDialog={setShowDeleteDialog}
        setShowExitDialog={setShowExitDialog}
        handleConfirmExit={handleConfirmExit}
        isExiting={isExiting}
      />

      {/* Challenge UI Panel */}
      {room?.isChallenge &&
        challengeData &&
        (() => {
          const start =
            challengeData.startTime || challengeData.createdAt || Date.now();
          const totalMs = (challengeData.durationMinutes || 60) * 60000;
          const elapsedMs = Date.now() - start;
          const remainingMs = Math.max(0, totalMs - elapsedMs);
          const totalSecs = Math.floor(remainingMs / 1000);
          const days = Math.floor(totalSecs / 86400);
          const hrs = Math.floor((totalSecs % 86400) / 3600);
          const mins = Math.floor((totalSecs % 3600) / 60);
          const secs = totalSecs % 60;
          const countdownStr =
            remainingMs <= 0
              ? "انتهت مدة السباق"
              : days > 0
                ? `${days}ي و ${hrs}س و ${mins}د`
                : hrs > 0
                  ? `${hrs}س و ${mins}د و ${secs}ث`
                  : `${mins}د و ${secs}ث`;

          const p1 = challengeData.progressPlayer1 || 0;
          const p2 = challengeData.progressPlayer2 || 0;
          const sum = p1 + p2 || 1;
          const p1Pct = Math.round((p1 / sum) * 100);
          const p2Pct = 100 - p1Pct;

          return (
            <div className="z-20 px-8 pt-4 w-full max-w-5xl mx-auto">
              <div className="bg-[#131526]/90 backdrop-blur-md rounded-3xl p-6 border border-fuchsia-500/20 shadow-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-fuchsia-400 flex items-center gap-2 text-sm mb-1">
                      <Swords size={16} className="animate-pulse" /> نزاع المدار
                      المشترك
                    </h3>
                    <p className="text-xs text-gray-400">
                      {challengeData.status === "completed"
                        ? `مكتمل (${challengeData.durationMinutes} دقيقة)`
                        : `المدة الكلية: ${challengeData.durationMinutes} دقيقة / الوقت المتبقي: ${countdownStr}`}
                    </p>
                  </div>
                  {challengeData.status === "completed" ? (
                    <div className="text-sm font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 flex items-center gap-1.5">
                      🏆 انتهى السباق! البطل الفائز:{" "}
                      {challengeData.winnerId === challengeData.challengerId
                        ? challengeData.challengerName
                        : challengeData.winnerId === challengeData.challengedId
                          ? challengeData.challengedName
                          : "تعادل"}
                    </div>
                  ) : (
                    <div className="flex gap-8">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-indigo-300 font-bold mb-1">
                          {challengeData.challengerName}
                        </span>
                        <span className="font-black text-xl text-white font-mono">
                          {p1} د
                        </span>
                      </div>
                      <div className="flex items-center justify-center text-rose-500 font-mono font-bold text-xs px-2">
                        VS
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-fuchsia-300 font-bold mb-1">
                          {challengeData.challengedName}
                        </span>
                        <span className="font-black text-xl text-white font-mono">
                          {p2} د
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {challengeData.status !== "completed" && (
                  <div className="space-y-1.5">
                    <div className="h-2 rounded-full bg-white/5 flex overflow-hidden border border-white/5">
                      <div
                        style={{ width: `${p1Pct}%` }}
                        className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full transition-all duration-500"
                      />
                      <div
                        style={{ width: `${p2Pct}%` }}
                        className="bg-gradient-to-r from-fuchsia-400 to-fuchsia-600 h-full transition-all duration-500"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono font-bold text-gray-500">
                      <span>
                        قوة {challengeData.challengerName}: {p1Pct}%
                      </span>
                      <span>
                        قوة {challengeData.challengedName}: {p2Pct}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* Active Alerts Banner */}
      <AnimatePresence>
        {activeAlerts.length > 0 && (
          <div className="z-20 px-8 py-2 max-w-5xl mx-auto space-y-2 w-full mt-2">
            {activeAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "w-full backdrop-blur-xl border rounded-full px-6 py-3 flex items-center justify-between shadow-lg",
                  alert.type === "distraction"
                    ? "bg-red-500/20 border-red-500/40 text-red-200"
                    : "bg-indigo-500/20 border-indigo-500/40 text-indigo-200",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-full",
                      alert.type === "distraction"
                        ? "bg-red-500/20"
                        : "bg-indigo-500/20",
                    )}
                  >
                    {alert.type === "distraction" ? (
                      <AlertTriangle size={18} className="text-red-400" />
                    ) : (
                      <Info size={18} className="text-indigo-400" />
                    )}
                  </div>
                  <span className="text-sm font-bold tracking-wide">
                    {alert.text}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setActiveAlerts((prev) =>
                      prev.filter((a) => a.id !== alert.id),
                    )
                  }
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Task Bar / Info Badge */}
      <div className="z-10 px-8 py-2 max-w-5xl mx-auto -mt-2 space-y-2">
        <div className="w-full bg-space-dark/80 backdrop-blur-xl border border-white/5 rounded-full px-6 py-2 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
          <div className={cn("flex items-center gap-3", room.timerStatus === "focus" ? "text-cyan-400" : room.timerStatus === "break" ? "text-teal-400" : "text-gray-500")}>
            <div className={cn("p-1 rounded-full", room.timerStatus === "focus" ? "bg-cyan-500/20" : room.timerStatus === "break" ? "bg-teal-500/20" : "bg-white/10")}>
              <CheckCircle size={16} />
            </div>
            <span className="text-xs font-bold tracking-wide">
              {room.timerStatus === "focus"
                ? "التركيز مستمر"
                : room.timerStatus === "break"
                  ? "استراحة"
                  : "المحطة جاهزة"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors cursor-pointer">
            <span className="text-[10px] font-medium uppercase tracking-widest hidden md:block">
              معلومات المحطة
            </span>
            <Info size={16} />
          </div>
        </div>

        <AnimatePresence>
          {room.timerStatus === "focus" && pendingMission && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full bg-orange-500/10 backdrop-blur-xl border border-orange-500/30 rounded-full px-6 py-3 flex items-center justify-center shadow-[0_4px_30px_rgba(249,115,22,0.2)]"
            >
              <div className="flex flex-col items-center gap-1 text-orange-400">
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">
                  مهمتك المعلقة في المدار
                </span>
                <span className="text-sm font-black text-white">
                  {pendingMission}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <main className="flex-1 p-4 md:p-8 z-10 w-full max-w-5xl mx-auto pb-48">
        {/* Center Column: Sun Timer & Orbit */}
        <div
          className={cn(
            "flex flex-col items-center justify-center relative min-h-[500px] transition-all duration-1000 py-10 lg:py-20",
            isFocusMode
              ? "scale-[1.05] lg:scale-[1.25]"
              : "scale-100 lg:scale-[1.3]",
          )}
        >
          <div className="relative w-full max-w-[600px] aspect-square flex items-center justify-center">
            <StudyRoomParticipants
              participantsData={participantsData}
              user={user}
              onSelectUser={onSelectUser}
            />

            {/* Sun Timer */}
            <div className="relative w-40 h-40 md:w-56 md:h-56 flex items-center justify-center z-10">
              {room.timerStatus === "focus" && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] bg-yellow-400/10 mix-blend-screen rounded-full animate-bio-pulse blur-[30px] pointer-events-none -z-10" />
              )}
              {/* Fuel Gauge Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="48%"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r="48%"
                  fill="none"
                  stroke={room.timerStatus === "focus" ? "#fde047" : "#2dd4bf"}
                  strokeWidth="8"
                  strokeDasharray="100 100"
                  animate={{
                    strokeDashoffset:
                      100 -
                      (timeLeft /
                        ((room.timerStatus === "focus"
                          ? room.timerDuration
                          : room.breakDuration) *
                          60)) *
                        100,
                  }}
                  transition={{ duration: 1, ease: "linear" }}
                  strokeLinecap="round"
                />
              </svg>

              {(() => {
                const isFocus = room.timerStatus === "focus";
                const progress =
                  isFocus && room.timerDuration
                    ? Math.min(
                        1,
                        Math.max(0, timeLeft / (room.timerDuration * 60)),
                      )
                    : 1;
                const invProgress = 1 - progress;

                return (
                  <motion.div
                    animate={
                      isFocus
                        ? {
                            scale: [1, 1 + (0.02 + invProgress * 0.05), 1],
                            opacity: [0.95, 1, 0.95],
                          }
                        : room.timerStatus === "break"
                          ? { scale: [1, 1.02, 1] }
                          : {}
                    }
                    transition={{
                      duration: isFocus ? Math.max(0.8, 4 * progress) : 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className={cn(
                      "w-[85%] h-[85%] rounded-full flex items-center justify-center transition-all duration-1000",
                      room.timerStatus === "break"
                        ? "bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-emerald-600 shadow-[0_0_120px_rgba(45,212,191,0.5)] border-4 border-indigo-400/50"
                        : room.timerStatus === "idle"
                          ? "bg-[#090915] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                          : "",
                    )}
                    style={
                      isFocus
                        ? {
                            background: `radial-gradient(circle at center, rgb(253, 224, 71) 0%, rgb(${251 - invProgress * 50}, ${191 - invProgress * 120}, ${36 - invProgress * 36}) 100%)`,
                            boxShadow: `0 0 ${80 + invProgress * 60}px rgba(251, 146, 60, ${0.4 + invProgress * 0.4})`,
                            border: `4px solid rgba(253, 224, 71, ${0.6 - invProgress * 0.3})`,
                          }
                        : {}
                    }
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span
                        className={cn(
                          "text-4xl md:text-6xl font-black tracking-tighter drop-shadow-sm flex items-center gap-2",
                          room.timerStatus === "idle"
                            ? "text-gray-600"
                            : "text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]",
                        )}
                      >
                        {formatTime(timeLeft)}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] md:text-sm font-bold uppercase tracking-widest text-center",
                          room.timerStatus === "idle"
                            ? "text-white/10"
                            : "text-black/60",
                        )}
                      >
                        {room.timerStatus === "focus"
                          ? "مرحلة التركيز"
                          : room.timerStatus === "break"
                            ? "استراحة"
                            : "جاهز"}
                      </span>
                    </div>
                  </motion.div>
                );
              })()}
            </div>

            {/* Orbit Rings */}
            <div className="absolute w-[280px] h-[280px] md:w-[400px] md:h-[400px] border border-white/5 rounded-full" />
            <div className="absolute w-[320px] h-[320px] md:w-[450px] md:h-[450px] border border-white/10 rounded-full" />
          </div>

          {/* Timer Controls */}
          {isHost && (
            <div className="mt-12 flex flex-col items-center gap-6">
              {room.timerStatus === "idle" && (
                <div className="flex gap-4 mb-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500 font-bold">
                      وقت التركيز
                    </span>
                    <input
                      type="number"
                      value={room.timerDuration}
                      onChange={(e) =>
                        safeUpdateRoom({
                          timerDuration: parseInt(e.target.value) || 25,
                        })
                      }
                      className="w-16 p-2 rounded-xl bg-space-dark shadow-lg shadow-indigo-900/10 border border-white/10 text-center text-sm focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500 font-bold">
                      وقت الاستراحة
                    </span>
                    <input
                      type="number"
                      value={room.breakDuration}
                      onChange={(e) =>
                        safeUpdateRoom({
                          breakDuration: parseInt(e.target.value) || 5,
                        })
                      }
                      className="w-16 p-2 rounded-xl bg-space-dark shadow-lg shadow-indigo-900/10 border border-white/10 text-center text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                {room.timerStatus === "idle" ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() =>
                        safeUpdateRoom({
                          timerStatus: "focus",
                          startTime: serverTimestamp(),
                        })
                      }
                      className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xl font-bold text-xl flex items-center justify-center gap-3"
                    >
                      <Play size={24} fill="currentColor" />
                      بدء التركيز
                    </button>
                    <button
                      onClick={() => setShowBetModal(true)}
                      className="px-8 py-3 outline-none border border-transparent rounded-2xl bg-space-dark hover:bg-white/5 transition-all text-orange-500 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-black/20 group"
                    >
                      <Flame size={18} className="group-hover:animate-pulse" />
                      التركيز بنظام الرهان (الضياع الكوني)
                    </button>
                    <button
                      onClick={() => {
                        setStudyLink(studyLinkRef.current);
                        setShowStudyLinkModal(true);
                      }}
                      className="px-8 py-3 outline-none border border-white/10 rounded-2xl bg-space-dark hover:bg-white/5 transition-all text-indigo-400 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-black/20 group"
                    >
                      <Target size={18} />
                      {studyLinkRef.current &&
                      studyLinkRef.current.trim() !== ""
                        ? "تم ربط منصة خارجية"
                        : "الدراسة خارج المنصة؟ (أضف رابط)"}
                    </button>
                  </div>
                ) : (
                  <div className="px-8 py-4 rounded-2xl bg-space-dark shadow-lg shadow-indigo-900/10 border border-white/10 flex items-center gap-3 font-bold text-xl text-gray-500 cursor-not-allowed">
                    <Lock size={24} />
                    المحطة في المدار
                  </div>
                )}
              </div>

              {room.timerStatus !== "idle" && (
                <div className="flex gap-4">
                  <button
                    onClick={async () => {
                      await safeUpdateRoom({
                        timerStatus: "idle",
                        startTime: deleteField(),
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-space-dark border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all text-xs font-bold flex items-center gap-2"
                  >
                    <Square size={14} fill="currentColor" />
                    إيقاف العداد
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tools */}
        {!isSpectator && <PersonalTasks />}
      </main>

      {/* Floating Station Chat (Available in break and idle) */}
      <AnimatePresence>
        {(room?.timerStatus === "break" || room?.timerStatus === "idle") && (
          <StudyRoomChat
            room={room}
            messages={messages}
            typingNames={typingNames}
            user={user}
            stationId={stationId}
            isHost={isHost}
            isSpectator={isSpectator}
            handleSendMessage={handleSendMessage}
            onSelectUser={onSelectUser}
            isChatDrawerOpen={isChatDrawerOpen}
            setIsChatDrawerOpen={setIsChatDrawerOpen}
            safeUpdateRoom={safeUpdateRoom}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
