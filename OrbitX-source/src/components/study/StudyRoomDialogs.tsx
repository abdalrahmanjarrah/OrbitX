import React from "react";
import { useRenderLog } from "../../firebaseDebug";
import { AnimatePresence, motion } from "motion/react";
import {
  ShieldAlert,
  Rocket,
  Eye,
  Flame,
  X,
  Info,
  AlertTriangle,
  Square,
  Shield,
  Target,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { requestXpGrant } from "../../lib/xpSystem";
import { useLanguage } from "../../context/LanguageContext";
import {
  serverTimestamp,
  deleteField,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { UserData, Room } from "../../shared";

export interface StudyRoomDialogsProps {
  room: Room;
  user: UserData;
  stationId: string;
  safeUpdateRoom: (data: any) => Promise<void>;
  performSafeExit: (opts?: { skipFirebaseUpdate?: boolean }) => Promise<void>;
  handleConfirmExit: () => Promise<void>;
  isExiting: boolean;

  // Bet Modal
  showBetModal: boolean;
  setShowBetModal: (val: boolean) => void;
  betError: string | null;
  setBetError: (val: string | null) => void;
  currentBetRef: React.MutableRefObject<number>;
  remainingShieldRef: React.MutableRefObject<number>;
  setShieldPercent: (val: number) => void;

  // AFK Check
  showAFKCheck: boolean;
  setShowAFKCheck: (val: boolean) => void;
  afkTimeLeft: number;

  // Red Alert / Fuel Leak
  showFuelLeak: boolean;
  setShowFuelLeak: (val: boolean) => void;
  shieldPercent: number;
  leakedXP: number;
  showAlert: boolean;

  // Delete Conf
  showDeleteDialog: boolean;
  setShowDeleteDialog: (val: boolean) => void;

  // Exit Conf
  showExitDialog: boolean;
  setShowExitDialog: (val: boolean) => void;

  // Next Mission
  showNextMissionModal: boolean;
  setShowNextMissionModal: (val: boolean) => void;
  nextMissionInput: string;
  setNextMissionInput: (val: string) => void;
  handleNextMissionSubmit: () => void;

  // Study Link
  showStudyLinkModal: boolean;
  setShowStudyLinkModal: (val: boolean) => void;
  studyLink: string;
  setStudyLink: (val: string) => void;
  studyLinkRef: React.MutableRefObject<string>;
}

function StudyRoomDialogsComponent({
  room,
  user,
  stationId,
  safeUpdateRoom,
  performSafeExit,
  handleConfirmExit,
  isExiting,

  showBetModal,
  setShowBetModal,
  betError,
  setBetError,
  currentBetRef,
  remainingShieldRef,
  setShieldPercent,

  showAFKCheck,
  setShowAFKCheck,
  afkTimeLeft,

  showFuelLeak,
  setShowFuelLeak,
  shieldPercent,
  leakedXP,
  showAlert,

  showDeleteDialog,
  setShowDeleteDialog,

  showExitDialog,
  setShowExitDialog,

  showNextMissionModal,
  setShowNextMissionModal,
  nextMissionInput,
  setNextMissionInput,
  handleNextMissionSubmit,

  showStudyLinkModal,
  setShowStudyLinkModal,
  studyLink,
  setStudyLink,
  studyLinkRef,
}: StudyRoomDialogsProps) {
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const { isAr, t } = useLanguage();

  React.useEffect(() => {
    if (!showDeleteDialog) {
      setDeleteConfirmText("");
    }
  }, [showDeleteDialog]);

  useRenderLog("StudyRoomDialogs", {
    showBetModal,
    showAFKCheck,
    showFuelLeak,
    showAlert,
    showDeleteDialog,
    showExitDialog,
    showNextMissionModal,
    showStudyLinkModal,
  });
  return (
    <>
      {/* Cosmic Loss Aversion Bet Modal */}
      <AnimatePresence>
        {showBetModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xl bg-space-dark/80 text-white">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-space-dark border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-[0_0_80px_rgba(30,58,138,0.4)] text-center relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Rocket size={120} />
              </div>
              <h2 className="text-3xl font-black mb-2 text-sky-400">
                نظام الضياع الكوني 🌌
              </h2>
              <p className="text-gray-400 mb-6 font-medium text-sm leading-relaxed relative z-10">
                المبدأ النفسي: البشر يكرهون الخسارة أكثر بمرتين من حبهم للمكسب.
                <br />
                <br />
                ضع <span className="text-orange-400 font-bold">رهاناً</span> من
                نقاط الـ XP لبناء (درع السفينة). الخوف من خسارة نقاطك سيجبرك
                على البقاء مركزاً! إذا تشتت أو فتحت نافذة أخرى سيبدأ الدرع
                بالتضرر وتخسر نقاطك للأبد!
              </p>

              {betError && (
                <div className="bg-red-500/20 text-red-400 text-sm py-2 px-4 rounded-xl mb-6 font-bold">
                  {betError}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mb-8">
                {[50, 100, 200].map((amount) => (
                  <button
                    key={amount}
                    onClick={async () => {
                      if (user.xp < amount) {
                        setBetError(
                          "عذرًا، لا تملك نقاط خبرة كافية (XP) لهذا الرهان!",
                        );
                        return;
                      }

                      try {
                        requestXpGrant(
                          user.uid,
                          user.fleetId,
                          null,
                          false,
                          -amount,
                          "shield_bet_deduction",
                          true,
                        );
                        currentBetRef.current = amount;
                        remainingShieldRef.current = amount;
                        setShieldPercent(100);
                        setShowBetModal(false);
                        safeUpdateRoom({
                          timerStatus: "focus",
                          startTime: serverTimestamp(),
                        });
                      } catch (e) {
                        setBetError("حدث خطأ أثناء وضع الرهان!");
                      }
                    }}
                    className="relative group overflow-hidden rounded-2xl bg-[#090915] border border-sky-500/30 hover:border-sky-400 transition-all p-4 flex flex-col items-center justify-center gap-2 pointer-events-auto"
                  >
                    <div className="absolute inset-0 bg-sky-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <ShieldAlert className="w-8 h-8 text-sky-400 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-lg">{amount}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                      XP
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowBetModal(false)}
                className="text-gray-500 hover:text-white transition-colors text-sm font-bold"
              >
                إلغاء والعودة
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AFK Check Overlay */}
      <AnimatePresence>
        {showAFKCheck && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-space-dark/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-white"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-indigo-900/40 border-2 border-indigo-500 shadow-[0_0_80px_rgba(99,102,241,0.5)] rounded-3xl p-8 max-w-sm text-center w-full relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-transparent pointer-events-none" />
              <Eye className="w-20 h-20 mx-auto text-indigo-400 animate-pulse mb-6 relative z-10" />
              <h2 className="text-3xl font-black mb-4 text-white relative z-10">
                إثبات الانتباه! 👁️
              </h2>
              <p className="text-indigo-200 mb-6 text-sm relative z-10">
                هل لا زلت متواجداً وتركز معنا؟ يرجى تأكيد وجودك قبل انتهاء الوقت
                المتبقي لكي لا تخسر الجلسة التدريبية!
              </p>

              <div className="text-5xl font-black text-fuchsia-400 mb-8 font-mono animate-pulse relative z-10">
                {afkTimeLeft}ث
              </div>

              <div className="flex flex-col gap-3 w-full relative z-10">
                <button
                  onClick={() => {
                    setShowAFKCheck(false);
                    requestXpGrant(
                      user.uid,
                      user.fleetId,
                      null,
                      false,
                      5,
                      "afk_check",
                      true,
                    );
                  }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-fuchsia-500 hover:from-indigo-500 hover:to-fuchsia-400 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-lg"
                >
                  أنا هنا وأركز! 🚀
                </button>
                <button
                  onClick={() => setShowAFKCheck(false)}
                  className="w-full bg-white/5 hover:bg-white/10 text-indigo-300 font-bold py-3 px-8 rounded-xl transition-all border border-white/10 text-sm"
                >
                  أُشاهد حصة 📺 (أكمل بالكسب)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Red Alert Overlay */}
      <AnimatePresence>
        {showFuelLeak && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-red-900/40 backdrop-blur-md flex flex-col items-center justify-center p-4 text-white"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-space-dark border-2 border-red-500 shadow-[0_0_80px_rgba(239,68,68,0.3)] rounded-3xl p-8 max-w-lg text-center"
            >
              <ShieldAlert className="w-20 h-20 mx-auto text-orange-500 animate-pulse mb-6" />
              <h2 className="text-4xl font-black mb-4 text-orange-500">
                الإنذار الأحمر! 🚨
              </h2>
              <p className="text-gray-300 mb-6 text-lg">
                رائد الفضاء، لقد تضرر الدرع بسبب تشتت الانتباه! عد للمسار فوراً!
              </p>

              <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-6 mb-8 flex flex-col gap-4">
                {currentBetRef.current > 0 && (
                  <div className="w-full bg-[#090915] rounded-full h-4 relative overflow-hidden border border-red-500/30">
                    <div
                      className="absolute inset-y-0 right-0 bg-red-500 transition-all"
                      style={{ width: `${shieldPercent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                      صحة الدرع: {shieldPercent}%
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center px-4">
                  <span className="text-gray-400 font-bold">
                    الضرر المباشر (XP)
                  </span>
                  <span className="text-4xl font-black text-red-500 font-mono tracking-tighter">
                    -{leakedXP}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setShowFuelLeak(false)}
                  className="w-full py-4 rounded-xl font-bold text-lg bg-orange-600 hover:bg-orange-700 transition"
                >
                  تفعيل الدرع والعودة للتركيز
                </button>
                <button
                  onClick={() => setShowFuelLeak(false)}
                  className="w-full bg-white/5 hover:bg-white/10 text-orange-200 font-bold py-3 px-8 rounded-xl transition-all border border-white/10 text-sm"
                >
                  أُشاهد حصة 📺 (أكمل بالكسب)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-red-900/60 backdrop-blur-xl bg-space-dark/80 flex flex-col items-center justify-center text-white overflow-hidden"
          >
            {/* Meteor Animation */}
            <motion.div
              initial={{ x: -500, y: -500, scale: 0.5, opacity: 0 }}
              animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeIn" }}
              className="relative"
            >
              <Flame className="w-32 h-32 text-orange-500 animate-pulse rotate-[135deg]" />
              <div className="absolute inset-0 blur-2xl bg-orange-600/50 rounded-full animate-ping" />
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: "spring" }}
              className="text-center mt-8"
            >
              <ShieldAlert className="w-24 h-24 mx-auto mb-4 text-red-500" />
              <h2 className="text-6xl font-black mb-2">اصطدام نيزك!</h2>
              <p className="text-2xl font-bold text-red-200">
                لقد خرجت عن المدار وفقدت قلباً!
              </p>
            </motion.div>

            {/* Screen Shake Effect */}
            <motion.div
              animate={{
                x: [0, -20, 20, -20, 20, 0],
                y: [0, 10, -10, 10, -10, 0],
              }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="fixed inset-0 pointer-events-none border-[20px] border-red-600/50"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 shadow-2xl shadow-indigo-900/20 backdrop-blur-lg bg-space-dark/60"
          >
            <div
              className={cn("bg-space-dark border border-red-500/30 rounded-3xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl shadow-red-500/20", isAr ? "text-right" : "text-left")}
              dir={isAr ? "rtl" : "ltr"}
            >
              <h2 className="text-xl font-black mb-4 text-center text-red-500">
                {isAr ? "⚠️ تدمير المحطة المدارية" : "⚠️ Destruct Orbit Station"}
              </h2>
              <p className="text-gray-300 text-center text-xs mb-4 leading-relaxed">
                {isAr
                  ? "هل أنت متأكد من تدمير وحذف هذه المحطة نهائياً؟ هذا الإجراء فوري وسيطرد كافة الرواد المتواجدين ولا يمكن التراجع عنه."
                  : "Are you sure you want to completely destroy and delete this station? This action is immediate, will evict all active personnel, and cannot be undone."}
              </p>

              <div className="mb-5">
                <label className="block text-[11px] text-gray-400 font-bold mb-1">
                  {isAr ? (
                    <>
                      اكتب <span className="text-red-500 font-bold">"تدمير"</span> لتأكيد تدمير المحطة:
                    </>
                  ) : (
                    <>
                      Type <span className="text-red-500 font-bold">"destruct"</span> to confirm destruction:
                    </>
                  )}
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={isAr ? "اكتب لتأكيد الإجراء" : "Type to confirm action"}
                  className="w-full px-3 py-2 bg-slate-950 border border-red-500/25 rounded-xl text-center text-xs font-bold text-red-400 placeholder-gray-700 focus:outline-none focus:border-red-500 transition-all font-mono"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 px-4 py-2 bg-space-dark shadow-lg shadow-indigo-900/10 hover:bg-white/5 rounded-xl text-white font-bold transition-all text-sm border border-white/5"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={async () => {
                    const match = isAr ? "تدمير" : "destruct";
                    if (deleteConfirmText.trim().toLowerCase() !== match) return;
                    setShowDeleteDialog(false);
                    await deleteDoc(doc(db, "rooms", stationId));
                    performSafeExit({ skipFirebaseUpdate: true });
                  }}
                  disabled={isAr ? deleteConfirmText !== "تدمير" : deleteConfirmText.trim().toLowerCase() !== "destruct"}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-sm shadow-red-600/30 text-sm disabled:cursor-not-allowed"
                >
                  {isAr ? "تأكيد الحذف" : "Confirm Delete"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Confirmation Dialog */}
      <AnimatePresence>
        {showExitDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 shadow-2xl shadow-indigo-900/20 backdrop-blur-lg bg-space-dark/60"
          >
            <div className="bg-space-dark border border-indigo-500/20 rounded-3xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl shadow-indigo-950/40 text-right">
              <h2 className="text-xl font-black mb-4 text-center text-white flex items-center justify-center gap-2">
                <Rocket size={24} className="text-indigo-400" />
                مغادرة المحطة المدارية
              </h2>

              <div className="text-center mb-6">
                {room?.timerStatus === "focus" ? (
                  <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-300 text-xs leading-relaxed font-semibold">
                    ⚠️ تنبيه كوني: التايمر يعمل بوضع الدراسة حالياً. المغادرة
                    الآن ستكلفك خصم 10 XP من رصيدك كعقوبة انسحاب!
                  </div>
                ) : (
                  <div className="p-3 bg-green-500/15 border border-green-500/30 rounded-2xl text-green-300 text-xs leading-relaxed font-semibold">
                    ✨ يمكنك المغادرة بسلام ومشاركتها مع رفاقك الآن دون أي خصم
                    لنقاط الخبرة (XP).
                  </div>
                )}
              </div>

              <div className="flex gap-4 flex-col sm:flex-row">
                <button
                  onClick={() => setShowExitDialog(false)}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-bold transition-all text-sm shadow-sm shadow-indigo-500/20"
                >
                  البقاء والمتابعة
                </button>
                <button
                  onClick={handleConfirmExit}
                  disabled={isExiting}
                  className="px-4 py-3 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10 rounded-xl font-bold transition-all text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExiting ? "جاري المغادرة..." : "مغادرة الآن"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next Mission Modal */}
      <AnimatePresence>
        {showNextMissionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 shadow-2xl shadow-indigo-900/20 backdrop-blur-lg bg-space-dark/60"
          >
            <div className="bg-space-dark border border-orange-500/30 rounded-3xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl shadow-orange-900/20 text-center">
              <h2 className="text-2xl font-black mb-4 text-orange-400">
                مهمتك القادمة 🚀
              </h2>
              <p className="text-gray-300 text-sm mb-6">
                تبقى دقيقة واحدة! حدد مهمتك المعلقة للجلسة القادمة لتبدأ بقوة.
              </p>

              <input
                type="text"
                maxLength={60}
                placeholder="اكتب جملة واحدة عن مهمتك..."
                value={nextMissionInput}
                onChange={(e) => setNextMissionInput(e.target.value)}
                autoFocus
                className="w-full bg-space-dark shadow-lg shadow-indigo-900/10 border border-white/10 rounded-2xl p-4 text-white placeholder-gray-500 mb-6 focus:outline-none focus:border-orange-500 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNextMissionSubmit();
                }}
              />

              <div className="flex gap-4">
                <button
                  onClick={handleNextMissionSubmit}
                  disabled={!nextMissionInput.trim()}
                  className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-bold transition-all text-sm shadow-sm shadow-orange-600/30"
                >
                  تعيين المهمة
                </button>
                <button
                  onClick={() => setShowNextMissionModal(false)}
                  className="px-6 py-3 bg-space-dark shadow-lg shadow-indigo-900/10 hover:bg-white/5 border border-white/5 rounded-xl text-white font-bold transition-all text-sm"
                >
                  تخطي
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Study Link Modal */}
      <AnimatePresence>
        {showStudyLinkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div
              className={cn("bg-space-dark border border-indigo-500/30 rounded-3xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl shadow-indigo-900/20", isAr ? "text-right" : "text-left")}
              dir={isAr ? "rtl" : "ltr"}
            >
              <h2 className="text-2xl font-black mb-4 text-indigo-400">
                {isAr ? "الدراسة خارج المنصة 🌍" : "Study Outside Platform 🌍"}
              </h2>
              <p className="text-gray-300 text-sm mb-2">
                {isAr
                  ? "لأن المتصفحات الحديثة تحمي خصوصيتك، لا يمكننا تتبع المنصات الأخرى التي تدرس عليها."
                  : "Because modern browsers protect your privacy, we cannot track what external websites you are studying on."}
              </p>
              <p className="text-gray-400 text-xs mb-6">
                {isAr
                  ? "لكن إذا أضفت رابط المنصة هنا، سنقوم بتعطيل نظام الإنذار الصارم (تسرب الوقود) لكي تتمكن من الدراسة خارج علامة التبويب براحة."
                  : "However, if you paste the platform link here, we will temporarily disable the strict alarm system (Fuel Leak tracker) so you can study outside this active tab peacefully."}
              </p>

              <input
                type="url"
                dir="ltr"
                placeholder="https://example.com"
                value={studyLink}
                onChange={(e) => setStudyLink(e.target.value)}
                className="w-full bg-[#151624] border border-white/10 rounded-2xl p-4 text-white placeholder-gray-500 mb-6 focus:outline-none focus:border-indigo-500 transition-colors text-left"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    studyLinkRef.current = studyLink.trim();
                    localStorage.setItem("orbitx_study_link", studyLink.trim());
                    setShowStudyLinkModal(false);
                  }}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-bold transition-all text-sm shadow-sm shadow-indigo-600/30"
                >
                  {isAr ? "حفظ الرابط" : "Save Link"}
                </button>
                <button
                  onClick={() => {
                    setStudyLink("");
                    studyLinkRef.current = "";
                    localStorage.removeItem("orbitx_study_link");
                    setShowStudyLinkModal(false);
                  }}
                  className="px-6 py-3 bg-space-dark shadow-lg shadow-indigo-900/10 hover:bg-white/5 border border-white/5 rounded-xl text-white font-bold transition-all text-sm"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default React.memo(StudyRoomDialogsComponent);
