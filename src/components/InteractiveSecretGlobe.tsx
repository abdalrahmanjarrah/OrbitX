import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, EyeOff, Lock, Sparkles, RefreshCw } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface SecretTip {
  id: number;
  title: string;
  category: string;
  desc: string;
  impactScore: string;
  securityLevel: string;
}

const CLASSIFIED_SECRETS: SecretTip[] = [
  {
    id: 0,
    title: "بروتوكول الدقائق العشر الأولى للتركيز",
    category: "عزل جاذبية المشتتات",
    desc: "عند أول نبضة للتايمر، ضع الهاتف خارج مدى رؤيتك بالكامل ولا تفتح أي علامة تبويب ترفيهية لأول 10 دقائق. تجاوز هذا الحاجز الأولي يحفز دماغك على إكمال الجلسة بسلاسة منقطعة النظير.",
    impactScore: "9.9 / 10",
    securityLevel: "سرّي للغاية",
  },
  {
    id: 1,
    title: "تكتيك التصفية القبلية للملاحة",
    category: "هندسة بيئة الطيران المداري",
    desc: "دقيقة واحدة ترتب فيها سطح مكتبك وتغلق فيها المحادثات الجانبية قبل الانطلاق، تمنع انهيار دفق التركيز لاحقاً وتوفر عليك تشتتاً يلتهم 15 دقيقة من طاقتك وعطائك الذهني.",
    impactScore: "9.5 / 10",
    securityLevel: "شديد السرّية",
  },
  {
    id: 2,
    title: "قانون الانضباط والبدء التلقائي",
    category: "الانتصار على جاذبية الكسل",
    desc: "التفكير المطول في حجم العمل يغذي كسل العقل. خذ القرار الفوري بالكبس على زر البدء والتحرك لتبهر نفسك بمعدل الإنجاز المتراكم الذي ستحققه دون تسويف.",
    impactScore: "9.0 / 10",
    securityLevel: "وثيقة أمنية خاصة",
  },
  {
    id: 3,
    title: "مفهوم المذاكرة المقطعية الذكية",
    category: "تحصين اللياقة العقلية",
    desc: "المذاكرة الذكية لفترات قصيرة بتركيز سائل وصافٍ، تفوق علمياً الجلوس الطويل والمشتت على مكاتب الدراسة. جودة التواجد والانقطاع هما سر التفوق وصناعة الفارق الأسبوعي للرواد.",
    impactScore: "9.4 / 10",
    securityLevel: "سرّي للغاية",
  },
  {
    id: 4,
    title: "طاقة العزم الجماعي الخفي",
    category: "التناغم ونبض الأساطيل",
    desc: "رؤية رفاقك وسفن التحالف تحلق وتكافح في المدار عند ساعات التعب هي مغناطيس صامت يسحب مركبتك للأعلى تلقائياً، لتستمد من همتهم طاقة لمواصلة المسير بكل شغف.",
    impactScore: "9.7 / 10",
    securityLevel: "أسرار الأسطول المقيد",
  },
];

export default function InteractiveSecretGlobe() {
  const [rotationX, setRotationX] = useState<number>(120);
  const [rotationY, setRotationY] = useState<number>(0);
  const [activeSecret, setActiveSecret] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rotationStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const globeRef = useRef<HTMLDivElement>(null);

  // Map horizontal rotationX to the 5 exact classified secrets
  useEffect(() => {
    const normalized = ((rotationX % 360) + 360) % 360;
    const size = CLASSIFIED_SECRETS.length;
    const index = Math.min(size - 1, Math.floor((normalized / 360) * size));
    setActiveSecret(index);
  }, [rotationX]);

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setHasInteracted(true);
    dragStartRef.current = { x: clientX, y: clientY };
    rotationStartRef.current = { x: rotationX, y: rotationY };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;

    const speed = 0.55;
    setRotationX(rotationStartRef.current.x - deltaX * speed);
    // Limit vertical rotation to prevent full flipping which ruins perspective
    setRotationY(
      Math.max(-45, Math.min(45, rotationStartRef.current.y + deltaY * speed)),
    );
  };

  const pendingMoveRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const scheduleMove = (x: number, y: number) => {
    pendingMoveRef.current = { x, y };
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const p = pendingMoveRef.current;
      pendingMoveRef.current = null;
      if (p) handleMove(p.x, p.y);
    });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) =>
      scheduleMove(e.clientX, e.clientY);
    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        scheduleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const handleWindowEnd = () => handleEnd();

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowEnd);
    window.addEventListener("touchmove", handleWindowTouchMove, {
      passive: true,
    });
    window.addEventListener("touchend", handleWindowEnd);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowEnd);
      window.removeEventListener("touchmove", handleWindowTouchMove);
      window.removeEventListener("touchend", handleWindowEnd);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isDragging]);

  const currentSecret = CLASSIFIED_SECRETS[activeSecret];
  const { isAr, t } = useLanguage();

  return (
    <div
      className={`mt-16 bg-gradient-to-b from-[#060714] via-[#030409] to-[#010104] border border-indigo-500/10 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden ${isAr ? "text-right" : "text-left"}`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Absolute futuristic decorative indicators and background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-40" />
      <div className="absolute -top-12 -left-12 w-64 h-64 bg-indigo-500/5 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-purple-500/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Secret Warning Banner - Highly Confidential human tone */}
      <div className="mb-14 p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-[#0d0712] to-red-950/40 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <div className="text-xs font-mono font-bold text-red-400 tracking-wider flex items-center gap-2">
                تصنيف أمني شديد الخطورة // CLASSIFIED INTEL
              </div>
              <h4 className="text-sm font-black text-white mt-1">
                وثيقة الأسرار المدارية وعقليات الانضباط للرواد الملتزمين
              </h4>
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[10px] font-mono font-black text-red-400 flex items-center gap-1.5 self-end md:self-auto select-none uppercase">
            <Lock className="w-3.5 h-3.5" /> SECURE UNLOCKED
          </div>
        </div>
        <p className="text-gray-300 text-xs mt-3 leading-relaxed border-t border-white/5 pt-3 font-normal">
          <span className="text-red-400 font-bold ml-1">
            [تحذير سري للغاية]:
          </span>
          هذه الملاحظات والمعلومات محمية ومصنّفة للرواد الملتزمين أصحاب الهمم
          العالية والركائز الفائقة فقط. يمنع تداولها أو مشاركتها خارج حدود
          الملاحة لتبقى سراً مصوناً لوقود إنتاجيتكم في الأسطول. تصفحك وتديرك
          للكرة هو فك التشفير الشخصي الآمن لك.
        </p>
      </div>

      {/* Unified Stage Area - Globe in center, bubble cloud bursting instantly out of Earth */}
      <div className="flex flex-col items-center justify-center relative min-h-[580px] py-6">
        {/* Dynamic Nebula Glowing Center Space behind Earth */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none z-0" />

        {/* Cinematic Ethereal Cloud - Bursts/Pops out directly from the Earth's Center upwards */}
        <div className="absolute top-2 z-20 w-full max-w-lg px-4 pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSecret.id}
              // Starts collapsed right at the earth core (scale: 0.1, blurry, offset down)
              initial={{ opacity: 0, scale: 0.1, y: 220, filter: "blur(20px)" }}
              // Snaps & expands instantly like an emerging cloud upward
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              // Recedes fast back to the core
              exit={{ opacity: 0, scale: 0.1, y: 180, filter: "blur(25px)" }}
              transition={{
                type: "spring",
                stiffness: 170, // Snappy & fast
                damping: 17,
                mass: 0.8,
              }}
              style={{ originX: 0.5, originY: 1 }}
              className="relative pointer-events-auto"
            >
              {/* Nebulous Soft Atmosphere Backglow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-indigo-500/10 to-purple-500/10 rounded-[2.5rem] blur-[30px] opacity-80 pointer-events-none" />

              {/* The Cloud Bubble Container - Highly Refined, glassy, deep shadow */}
              <div className="bg-[#040513]/85 backdrop-blur-xl border border-indigo-500/20 rounded-[2.5rem] p-6 md:p-8 text-center relative shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(99,102,241,0.12)] overflow-hidden">
                {/* Micro textures inside the cloud */}
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

                {/* Cloud top badge */}
                <div className="flex items-center justify-between mb-4.5 border-b border-white/5 pb-3">
                  <span className="text-[10px] font-mono font-black text-cyan-400 tracking-wider uppercase">
                    أرشيف الوعي الكوني
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] font-black bg-red-500/10 text-red-400 px-2.5 py-0.5 rounded-full border border-red-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    <span>{currentSecret.securityLevel}</span>
                  </div>
                </div>

                {/* Secret category */}
                <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-widest uppercase mb-1.5 block">
                  {currentSecret.category}
                </span>

                {/* Secret Title */}
                <h3 className="text-base md:text-lg font-black text-white leading-tight flex items-center justify-center gap-2">
                  <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-200 via-cyan-200 to-white">
                    {currentSecret.title}
                  </span>
                  <Sparkles className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
                </h3>

                {/* Tip Description */}
                <p className="text-gray-300 text-xs md:text-sm mt-3 leading-relaxed font-normal max-w-sm mx-auto">
                  {currentSecret.desc}
                </p>

                {/* Inner stats */}
                <div className="flex items-center justify-center gap-4 mt-5.5 pt-3 border-t border-white/5 font-mono text-[11px] text-gray-500">
                  <div>
                    <span>معدل الأثر: </span>
                    <span className="text-emerald-400 font-bold">
                      {currentSecret.impactScore}
                    </span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  <div>
                    <span>الحالة: </span>
                    <span className="text-cyan-400 font-bold">
                      مشفّر وآمن للأسطول
                    </span>
                  </div>
                </div>
              </div>

              {/* Pointed cloud bubble pointer looking super cohesive */}
              <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0 h-0 border-t-[10px] border-t-[#040513]/85 border-x-[10px] border-x-transparent filter drop-shadow-[0_4px_3px_rgba(99,102,241,0.08)] animate-pulse" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Outer orbital rings for astronomical aesthetic depth */}
        <div className="absolute w-[340px] h-[340px] md:w-[380px] md:h-[380px] rounded-full border border-indigo-500/5 pointer-events-none z-0 flex items-center justify-center transform scale-y-[0.3] rotate-[12deg]">
          <div className="w-[120%] h-[120%] rounded-full border border-dashed border-cyan-500/5 animate-[spin_80s_linear_infinite]" />
        </div>

        {/* Main Globe Area - positioned nicely under the cloud */}
        <div className="mt-60 md:mt-56 z-10">
          <div
            ref={globeRef}
            onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
            onTouchStart={(e) => {
              if (e.touches && e.touches[0]) {
                handleStart(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            className="w-52 h-52 md:w-56 md:h-56 rounded-full relative cursor-grab active:cursor-grabbing select-none group focus:outline-none"
            title="امسك واسحب لتدوير الأرض بكل الاتجاهات وفك الأسرار"
          >
            {/* Ambient atmospheric back glow */}
            <div className="absolute inset-[-12px] rounded-full bg-indigo-500/5 blur-xl group-hover:bg-indigo-500/10 transition-colors duration-700 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none shadow-[2px_10px_20px_rgba(0,0,0,0.8)]" />

            {/* Earth Sphere - Smooth, high-fidelity vector earth with 3D translation map inside and ZERO glowing nodes */}
            <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-tr from-[#010207] via-[#04081c] to-[#040d3a] relative shadow-[inset_0_4px_25px_rgba(0,0,0,0.95),_inset_0_-10px_35px_rgba(99,102,241,0.18)] flex items-center justify-center">
              {/* Cinematic glass highlights to look ultra realistic */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.06)_0%,transparent_50%)] pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(99,102,241,0.1)_0%,transparent_60%)] pointer-events-none" />

              {/* Multidirectional vector rendering shifting with both rotationX (horizontal) and rotationY (vertical) */}
              <svg
                className="absolute inset-x-[-100%] w-[300%] h-full pointer-events-none transition-transform duration-150 ease-out"
                viewBox="0 0 900 300"
                style={{
                  transform: `translateX(${-250 + (rotationX % 360) * 0.75}px) translateY(${8 + rotationY * 0.9}px) scaleY(0.95) rotate(${rotationY * 0.1}deg)`,
                  opacity: 0.8,
                }}
              >
                <g
                  fill="none"
                  stroke="rgba(99, 102, 241, 0.22)"
                  strokeWidth="1"
                >
                  {/* Grid Lines simulating 3D Latitude/Longitude mesh */}
                  <path
                    d="M 0,30 L 900,30 M 0,60 L 900,60 M 0,90 L 900,90 M 0,120 L 900,120 M 0,150 L 900,150 M 0,180 L 900,180 M 0,210 L 900,210 M 0,240 L 900,240 M 0,270 L 900,270"
                    strokeDasharray="3,3"
                  />
                  <path d="M 50,0 Q 150,150 50,300 M 150,0 Q 250,150 150,300 M 250,0 Q 350,150 250,300 M 350,0 Q 450,150 350,300 M 450,0 Q 550,150 450,300 M 550,0 Q 650,150 550,300 M 650,0 Q 750,150 650,300 M 750,0 Q 850,150 750,300 M 850,0 Q 950,150 850,300" />
                </g>

                {/* Soft, beautiful vector continents - highly refined and classic */}
                <g
                  fill="rgba(99, 102, 241, 0.12)"
                  stroke="rgba(99, 102, 241, 0.28)"
                  strokeWidth="1.2"
                >
                  {/* Continent Block 1 */}
                  <path d="M 80,80 Q 110,60 140,90 T 180,120 T 160,180 T 100,200 Z" />
                  <circle cx="210" cy="140" r="9" />
                  <circle cx="230" cy="180" r="5" />
                  <path d="M 90,210 Q 120,240 110,280 T 80,300 Z" />

                  {/* Continent Block 2 */}
                  <path d="M 370,60 Q 420,40 450,90 T 490,140 T 470,220 T 380,240 T 360,140 T 350,90 Z" />
                  <path d="M 380,40 Q 400,20 440,30 Z" />
                  <circle cx="510" cy="80" r="13" />
                  <circle cx="530" cy="100" r="6" />

                  {/* Continent Block 3 */}
                  <path d="M 680,80 Q 730,70 790,110 T 820,170 T 780,240 T 690,210 Z" />
                  <path d="M 720,250 Q 750,270 730,290 Z" />
                  <circle cx="630" cy="120" r="8" />

                  {/* Infinite Wrap Island */}
                  <path d="M 980,80 Q 1010,60 1040,90 T 1080,120 T 1060,180 T 1000,200 Z" />
                </g>
              </svg>

              {/* Atmospheric glass shading covering the top */}
              <div className="absolute inset-0 bg-radial from-transparent via-[#030612]/30 to-[#020205] pointer-events-none" />
            </div>

            {/* Earth Drag Ripple Assist Circle - subtle, clean line */}
            <div className="absolute inset-[-6px] rounded-full border border-dashed border-cyan-500/10 group-hover:border-cyan-500/25 group-hover:scale-105 transition-all duration-700 pointer-events-none" />

            {/* Small Drag Hint badge, bounces and fades out once the user starts interacting */}
            {!hasInteracted && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#04081c] border border-indigo-500/30 text-[8px] font-mono text-indigo-300 rounded-full px-3 py-1 animate-bounce select-none pointer-events-none tracking-widest whitespace-nowrap shadow-md">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> اسحب الأرض
                بكل الاتجاهات للملاحة
              </div>
            )}
          </div>
        </div>

        {/* Clean, classy dot indicators below Earth to navigate or track the secrets */}
        <div className="flex gap-2.5 mt-10 z-10">
          {CLASSIFIED_SECRETS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => {
                setRotationX(sec.id * 72 + 25);
                setRotationY(0); // Reset vertical angle back to horizontal stability
                setHasInteracted(true);
              }}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                activeSecret === sec.id
                  ? "bg-cyan-400 w-7 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                  : "bg-white/10 hover:bg-white/20"
              }`}
              title={`فك تشفير المحطة ${sec.id + 1}`}
            />
          ))}
        </div>

        {/* Minimalist tracker status text */}
        <div className="mt-3.5 text-center z-10 select-none">
          <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
            مستند سري مفكوك: {activeSecret + 1} من {CLASSIFIED_SECRETS.length} •
            الاتصال المداري آمن آلياً 🔐
          </p>
        </div>
      </div>
    </div>
  );
}
