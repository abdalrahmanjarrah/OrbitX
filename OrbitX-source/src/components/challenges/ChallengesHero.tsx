import React, { useState, useEffect, useRef } from "react";
import { Swords, Users, Rocket, Flame, Target, Medal, Pencil, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../../context/LanguageContext";
import { db } from "../../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { showToast } from "../../lib/cosmicUI";

const HERO_GIF_DOC = doc(db, "system", "hero_gif");

interface ChallengesHeroProps {
  onStartChallengeClick: () => void;
  onInviteFriendClick: () => void;
  friendsCount: number;
  activeCount: number;
  invitesCount: number;
  winsCount: number;
  isAdmin: boolean;
}

export const ChallengesHero: React.FC<ChallengesHeroProps> = ({
  onStartChallengeClick,
  onInviteFriendClick,
  friendsCount,
  activeCount,
  invitesCount,
  winsCount,
  isAdmin,
}) => {
  const { isAr } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gifUrl, setGifUrl] = useState<string>("");
  const [loadingGif, setLoadingGif] = useState(true);
  const [uploadingGif, setUploadingGif] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getDoc(HERO_GIF_DOC)
      .then((snap) => {
        if (isMounted) setGifUrl(snap.exists() ? snap.data().url || "" : "");
      })
      .catch(() => {
        if (isMounted) setGifUrl("");
      })
      .finally(() => {
        if (isMounted) setLoadingGif(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleGifSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.includes("gif") && !file.type.startsWith("image/")) {
      showToast(
        isAr ? "اختر ملف صورة (GIF متحرك يفضل)." : "Choose an image file (animated GIF preferred).",
        "warning",
      );
      return;
    }
    const maxBytes = 8 * 1024 * 1024; // 8MB
    if (file.size > maxBytes) {
      showToast(
        isAr ? "الملف كبير جداً — خلي حجمه أقل من 8MB." : "File too large — keep it under 8MB.",
        "error",
      );
      return;
    }
    setUploadingGif(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await setDoc(HERO_GIF_DOC, {
        url: dataUrl,
        updatedBy: "admin",
        updatedAt: serverTimestamp(),
      });
      setGifUrl(dataUrl);
      showToast(
        isAr ? "تم حفظ GIF النزال بنجاح! 🎥" : "Battle GIF saved successfully! 🎥",
        "success",
      );
    } catch (err) {
      console.warn("Failed saving battle GIF:", err);
      showToast(
        isAr
          ? "فشل الحفظ — جرّب ملف أصغر."
          : "Save failed — try a smaller file.",
        "error",
      );
    } finally {
      setUploadingGif(false);
    }
  };
  const stats = [
    { label: "نزالات مشتعلة", value: activeCount, accent: "text-rose-400", dot: "bg-rose-500" },
    { label: "طلبات معلقة", value: invitesCount, accent: "text-amber-400", dot: "bg-amber-500" },
    { label: "انتصاراتك", value: winsCount, accent: "text-emerald-400", dot: "bg-emerald-500" },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-space-dark p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      {/* خلفية متوهجة - طاقة ساحة النزال */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-rose-600/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* أعمدة الضوء */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute -top-24 left-[18%] w-px h-64 bg-gradient-to-b from-rose-400/50 via-rose-400/10 to-transparent" />
        <div className="absolute -top-24 left-[46%] w-px h-64 bg-gradient-to-b from-amber-300/50 via-amber-300/10 to-transparent" />
        <div className="absolute -top-24 left-[72%] w-px h-64 bg-gradient-to-b from-rose-400/50 via-rose-400/10 to-transparent" />
      </div>

      {/* شرارات حية */}
      {Array.from({ length: 26 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-rose-300 opacity-25 animate-pulse"
          style={{
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${2 + Math.random() * 4}s`,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-8">
        {/* النص */}
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/12 text-rose-400 text-xs font-medium mb-4 border border-rose-500/25 tracking-wide"
          >
            <Swords size={12} className="animate-pulse" />
            قسم النزالات · OrbitX
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2"
          >
            حلبة{" "}
            <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-rose-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(244,63,94,0.35)]">
              نزالات التركيز
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-sm leading-relaxed max-w-lg mb-6"
          >
            خصمك بانتظارك في قلب الحلبة. كل دقيقة تركيز حقيقية تجمعها بأي محطة
            تتحول لنقطة في نزالك — ومين يجمع أكتر دقائق قبل نهاية المدة، يفوز
            بالنزال ويحصد الجوائز.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-3"
          >
            <button
              onClick={onStartChallengeClick}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-l from-rose-500 to-amber-600 border border-rose-400/40 text-white text-base font-bold shadow-[0_0_25px_rgba(244,63,94,0.3)] hover:from-rose-500/90 hover:to-amber-500/90 hover:shadow-[0_0_35px_rgba(244,63,94,0.45)] transition-all active:scale-95 cursor-pointer"
            >
              <Rocket size={16} />
              إطلاق نزال جديد
            </button>
            <button
              onClick={onInviteFriendClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
            >
              <Users size={14} />
              استدعاء مقاتل ({friendsCount})
            </button>
          </motion.div>
        </div>

        {/* لوحة العدادات */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-3 gap-3 lg:w-80 shrink-0"
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white/[0.03] border border-white/5 p-3.5 flex flex-col items-center gap-2 backdrop-blur-sm"
            >
              <span className={`relative flex h-2 w-2`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${s.dot}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${s.dot}`}></span>
              </span>
              <span className={`text-2xl font-black font-mono ${s.accent}`}>{s.value}</span>
              <span className="text-[10px] text-gray-400 font-semibold text-center leading-tight">{s.label}</span>
            </div>
          ))}
          <div className="lg:hidden col-span-3" />
        </motion.div>
      </div>

      {/* GIF ساحة النزال — شخصان يتبارزان (الأدمن قادر على تغييره بضغطة) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        onClick={() => {
          if (isAdmin && !uploadingGif) fileInputRef.current?.click();
        }}
        className={cn(
          "relative z-10 mt-6 rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(244,63,94,0.2)] aspect-video md:aspect-[21/9] bg-black",
          isAdmin && "cursor-pointer group/gif",
        )}
      >
        {loadingGif ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-950/40 via-[#12060e] to-amber-950/30">
            <Loader2 size={28} className="text-rose-400/70 animate-spin" />
          </div>
        ) : gifUrl ? (
          <img
            src={gifUrl}
            alt={isAr ? "شخصان يتبارزان في نزال التركيز" : "Two rivals in a focus duel"}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-rose-300/80 text-sm font-bold bg-gradient-to-br from-rose-950/40 via-[#12060e] to-amber-950/30">
            <span className="text-4xl">{isAdmin ? "🎥" : "⚔️"}</span>
            <span>
              {isAdmin
                ? isAr
                  ? "اضغط هنا لاختيار GIF النزال من جهازك"
                  : "Click here to pick the battle GIF from your device"
                : isAr
                  ? "GIF النزال في الطريق قريباً 🚀"
                  : "Battle GIF coming soon 🚀"}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />

        {isAdmin && (
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur border border-white/15 text-[11px] font-bold text-white group-hover/gif:bg-rose-600/80 group-hover/gif:border-rose-400/50 transition-all">
              {uploadingGif ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Pencil size={11} />
              )}
              {uploadingGif
                ? isAr
                  ? "جارٍ الحفظ…"
                  : "Saving…"
                : isAr
                  ? "تغيير الـ GIF"
                  : "Change GIF"}
            </span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/gif,image/webp,image/*"
          className="hidden"
          onChange={handleGifSelected}
        />
      </motion.div>

      {/* بطاقات شرح القسم - How it works */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        {[
          {
            icon: Target,
            step: "1",
            title: "اختر خصمك",
            desc: "أطلق نزالاً جديداً على صديق أو رائد فضاء آخر، وحدد مدة النزال التي تناسبكما.",
            accent: "text-rose-400 bg-rose-500/10 border-rose-500/20",
          },
          {
            icon: Flame,
            step: "2",
            title: "ركز واجمع النقاط",
            desc: "كل دقيقة تركيز حقيقية بأي محطة تضيف نقطة إلى رصيدك داخل النزال.",
            accent: "text-amber-400 bg-amber-500/10 border-amber-500/20",
          },
          {
            icon: Medal,
            step: "3",
            title: "اربح الجائزة",
            desc: "من يجمع أكبر عدد من النقاط قبل انتهاء المدة يفوز بالنزال ويكسب المكافآت.",
            accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
          },
        ].map((c) => (
          <motion.div
            key={c.step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 + Number(c.step) * 0.08 }}
            className={cn("rounded-2xl border p-4 flex items-start gap-3 backdrop-blur-sm", c.accent)}
          >
            <c.icon size={18} className={`mt-0.5 shrink-0`} />
            <div>
              <div className="text-[10px] font-black text-white/50 mb-0.5">الخطوة {c.step}</div>
              <div className="text-sm font-bold text-white mb-1">{c.title}</div>
              <div className="text-xs text-gray-400 leading-relaxed">{c.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* شريط "المجد" السفلي */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 flex items-center gap-2 mt-6 pt-4 border-t border-white/5 text-[10px] text-gray-500"
      >
        <Flame size={11} className="text-amber-400/70" />
        <span>الفائز يرفع راية النزال، يكسب شارة البطل الأسبوعية، ويغادر الحلبة أقوى.</span>
      </motion.div>
    </div>
  );
};
