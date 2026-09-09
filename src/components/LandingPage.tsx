import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import {
  Play,
  Shield,
  Globe,
  Award,
  Target,
  Zap,
  Activity,
  Rocket,
  Clock,
  Volume2,
  VolumeX,
  X,
  Users,
  AlertTriangle,
  Atom,
  Flame,
  BookOpen,
  CheckCircle2,
  ShieldAlert,
  Swords,
  Calendar,
  MessageSquare,
  Timer,
  ChevronDown,
  Trophy,
  HelpCircle,
  Eye,
  Palette,
} from "lucide-react";
import StarBackground from "./StarBackground";
import GalaxyHero from "./GalaxyHero";
import InteractiveSecretGlobe from "./InteractiveSecretGlobe";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

// ── Magnetic Button Effect ────────────────────────────────────
function MagneticButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const onMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setOffset({ x: (e.clientX - rect.left - rect.width / 2) * 0.15, y: (e.clientY - rect.top - rect.height / 2) * 0.15 });
  };
  return (
    <button ref={ref} className={className} onMouseMove={onMouseMove} onMouseLeave={() => setOffset({ x: 0, y: 0 })} style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }} {...props}>
      {children}
    </button>
  );
}

// ── Custom Cursor ─────────────────────────────────────────────
function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dot = dotRef.current, ring = ringRef.current;
    if (!dot || !ring) return;
    let mx = 0, my = 0, rx = 0, ry = 0;
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx - 4}px, ${my - 4}px)`; };
    const anim = () => { rx += (mx - rx) * 0.15; ry += (my - ry) * 0.15; ring.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`; requestAnimationFrame(anim); };
    const raf = requestAnimationFrame(anim);
    const enter = () => ring.classList.add("hovering");
    const leave = () => ring.classList.remove("hovering");
    document.addEventListener("mousemove", onMove);
    document.querySelectorAll("a, button, [role='button']").forEach(el => { el.addEventListener("mouseenter", enter); el.addEventListener("mouseleave", leave); });
    return () => { document.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);
  return (<><div ref={dotRef} className="cursor-dot" /><div ref={ringRef} className="cursor-ring" /></>);
}

// Optimized CountUp Component using easing for zero frame drops with cleanup
function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      let active = true;
      const dur = 2000;
      let startTimestamp: number;
      const step = (ts: number) => {
        if (!active) return;
        if (!startTimestamp) startTimestamp = ts;
        const p = Math.min((ts - startTimestamp) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 4); // Quartic ease out
        setCount(Math.floor(ease * target));
        if (p < 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
      return () => {
        active = false;
      };
    }
  }, [isInView, target]);

  return (
    <span ref={ref} className="font-mono">
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// ---------------------------------------------------------------
// Shared visual block: consistent section headers
// ---------------------------------------------------------------
function SectionHead({
  kicker,
  kickerColor = "text-indigo-400",
  barColor = "bg-indigo-500/50",
  title,
  highlight,
  sub,
}: {
  kicker: string;
  kickerColor?: string;
  barColor?: string;
  title: string;
  highlight?: string;
  sub: string;
}) {
  const { isAr } = useLanguage();
  return (
    <div
      className="max-w-3xl mx-auto text-center mb-14 md:mb-16"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div
        className={`inline-flex items-center gap-2 font-mono text-xs ${kickerColor} tracking-[0.2em] mb-5 uppercase`}
      >
        <span className={`w-6 h-px ${barColor}`} />
        {kicker}
        <span className={`w-6 h-px ${barColor}`} />
      </div>
      <h2 className="text-[clamp(28px,4.4vw,46px)] font-black leading-tight mb-5">
        {title}
        {highlight && (
          <>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 via-fuchsia-400 to-cyan-400">
              {highlight}
            </span>
          </>
        )}
      </h2>
      <p className="text-gray-400 text-sm md:text-base leading-relaxed">
        {sub}
      </p>
    </div>
  );
}

export default function LandingPage({
  onLogin,
  onGuest,
  inviterName,
}: {
  onLogin: () => void;
  onGuest?: () => void;
  inviterName?: string;
}) {
  const { lang, isAr, t, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Spacecraft engine ambient — looped WAV source
  const toggleAmbientSound = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isSoundOn) {
      audio.pause();
      setIsSoundOn(false);
    } else {
      if (!audio.getAttribute("src")) {
        audio.src = `${import.meta.env.BASE_URL}sounds/spaceship.wav`;
      }
      audio.currentTime = 0;
      audio.play().catch(() => {
        setIsSoundOn(false);
      });
      setIsSoundOn(true);
    }
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // -------------------------------------------------------------
  // SIMULATOR STATE ENGINE (Live interactive cockpit)
  // -------------------------------------------------------------
  const [simActive, setSimActive] = useState(false);
  const [simTime, setSimTime] = useState(1500); // 25:00
  const [simXp, setSimXp] = useState(350);
  const [floatingXps, setFloatingXps] = useState<{ id: number; y: number }[]>(
    [],
  );
  const [simAlertActive, setSimAlertActive] = useState(false);
  const [simAlertCountdown, setSimAlertCountdown] = useState(15);
  const [selectedSimStation, setSelectedSimStation] =
    useState("سديم نبتون الهادئ");
  const [simSuccess, setSimSuccess] = useState(false);

  // Auto incremental XP & Ticking timer Simulator loop when active
  useEffect(() => {
    let timerId: any = null;
    if (simActive && simTime > 0 && !simAlertActive) {
      timerId = setInterval(() => {
        setSimTime((prev) => {
          if (prev <= 1) {
            setSimActive(false);
            setSimSuccess(true);
            return 0;
          }
          return prev - 1;
        });

        // Randomly add some XP to show active progression
        if (Math.random() < 0.25) {
          const newId = Date.now();
          setSimXp((prev) => prev + 15);
          setFloatingXps((prev) => [...prev, { id: newId, y: 0 }]);
          setTimeout(() => {
            setFloatingXps((prev) => prev.filter((x) => x.id !== newId));
          }, 1500);
        }
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [simActive, simTime, simAlertActive]);

  // Siren alert warning timer (Simulation step)
  useEffect(() => {
    let alertTimer: any = null;
    if (simAlertActive) {
      alertTimer = setInterval(() => {
        setSimAlertCountdown((prev) => {
          if (prev <= 1) {
            // Deduct XP to simulate fail penalization
            setSimXp((curr) => Math.max(0, curr - 50));
            setSimAlertActive(false);
            setSimActive(false);
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (alertTimer) clearInterval(alertTimer);
    };
  }, [simAlertActive]);

  const toggleSim = () => {
    if (simSuccess) {
      setSimSuccess(false);
      setSimTime(1500);
      setSimXp(350);
    }
    setSimActive(!simActive);
    setSimAlertActive(false);
  };

  const triggerMockDistraction = () => {
    if (!simActive) {
      setSimActive(true);
    }
    setSimAlertCountdown(15);
    setSimAlertActive(true);
  };

  const cancelMockDistraction = () => {
    setSimAlertActive(false);
    setSimAlertCountdown(15);
  };

  const formatSimTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  // -------------------------------------------------------------
  // Content data (bilingual)
  // -------------------------------------------------------------
  const navLinks = [
    { label: isAr ? "الميزات" : "Features", href: "#features" },
    { label: isAr ? "كيف نعمل" : "How it works", href: "#how-it-works" },
    { label: isAr ? "درع الحماية" : "Protection", href: "#anti-cheat" },
    { label: isAr ? "الأسئلة" : "FAQ", href: "#faq" },
  ];

  const pillars = [
    {
      icon: Shield,
      color: "text-indigo-400",
      border: "border-indigo-500/25",
      bg: "bg-indigo-500/10",
      title: isAr ? "إنفاذ حقيقي، لا وعود" : "Real enforcement, not promises",
      desc: isAr
        ? "رادار حضور حي يتحقق أنك فعلاً أمام شاشتك، يخصم XP عند الهروب، ويمنع النقر الآلي."
        : "A live presence radar verifies you're actually present, deducts XP on escape, and blocks auto-clickers.",
    },
    {
      icon: Users,
      color: "text-fuchsia-400",
      border: "border-fuchsia-500/25",
      bg: "bg-fuchsia-500/10",
      title: isAr ? "مجتمع فضائي حي" : "A live cosmic community",
      desc: isAr
        ? "غرف دراسة مشتركة، معارك تركيز 1v1، أساطيل متحالفة، ومتصدّرون عالميون بجلسة حية."
        : "Shared study rooms, 1v1 focus duels, allied fleets, and global live leaderboards.",
    },
    {
      icon: Trophy,
      color: "text-cyan-400",
      border: "border-cyan-500/25",
      bg: "bg-cyan-500/10",
      title: isAr ? "تحفيز عميق يقودك" : "Deep gamification drives you",
      desc: isAr
        ? "XP، 9 مستويات تقدم، شارات نادرة، وتحدي الثقب الأسود الأسبوعي."
        : "XP, 9 progression levels, rare badges, and the weekly Black Hole quest.",
    },
  ];

  const features = [
    {
      icon: Timer,
      color: "text-indigo-400",
      title: isAr ? "محطات التركيز" : "Focus Stations",
      desc: isAr
        ? "محطات تركيز مباشرة بموضوعك الخاص، خالية من أي إعلان، مع عدّاد ثابت يلتقط حضورك لحظة بلحظة."
        : "Live focus stations with your own topic, completely ad-free, with a steady timer tracking your presence in real time.",
    },
    {
      icon: Swords,
      color: "text-fuchsia-400",
      title: isAr ? "معارك التركيز 1v1" : "1v1 Focus Duels",
      desc: isAr
        ? "تحدٍ مباشر مع صديق: من يصمد أطول؟ الفائز يحصد وسام Battle Champion ويرتفع رصيده."
        : "A direct duel with a friend: who endures longest? The winner earns the Battle Champion badge.",
    },
    {
      icon: Calendar,
      color: "text-cyan-400",
      title: isAr ? "الجدول الأسبوعي" : "Weekly Schedule",
      desc: isAr
        ? "خطّط أسبوعك بالكامل: دروس، مراجعات، امتحانات ومشاريع، مع مؤشر سلسلة المواظبة اليومية."
        : "Plan your whole week: study, review, exams and projects, with a daily streak tracker.",
    },
    {
      icon: Rocket,
      color: "text-rose-400",
      title: isAr ? "الثقب الأسود الأسبوعي" : "Weekly Black Hole",
      desc: isAr
        ? "تحدٍ جماعي: كل الرواد يجمعون ساعات تركيز لاختراق هدف الأسبوع وسحب الجائزة السرية."
        : "A collective challenge: all astronauts pool focus hours to crack the weekly target and claim the secret bounty.",
    },
    {
      icon: Users,
      color: "text-amber-400",
      title: isAr ? "الأساطيل" : "Fleets",
      desc: isAr
        ? "تحالفات من حتى 10 رواد: سجلّ مشترك، ساعات جماعية، ورحلة تعاون تكسر وحدة الكسل."
        : "Alliances of up to 10 astronauts: shared records, collective hours, and teamwork that breaks procrastination.",
    },
    {
      icon: MessageSquare,
      color: "text-indigo-400",
      title: isAr ? "المجتمع والمناقشات" : "Community & Discussions",
      desc: isAr
        ? "ابحث عن رفاقك، تابع مستوياتهم، شارك في المناقشات، وتنافس على قائمة أفضل 50 رائداً."
        : "Find friends, follow their levels, join discussions, and compete for the Top 50 leaderboard.",
    },
    {
      icon: BookOpen,
      color: "text-purple-400",
      title: isAr ? "الوعي والقرآن" : "Awareness & Quran",
      desc: isAr
        ? "مستودع مقالات العقلية على كرة أرضية تفاعلية، ولاعب قرآن كامل: 114 سورة و8 قرّاء."
        : "Mindset articles on an interactive globe, plus a full Quran player: 114 surahs and 8 reciters.",
    },
    {
      icon: Award,
      color: "text-cyan-400",
      title: isAr ? "الهوية والشارات" : "Identity & Badges",
      desc: isAr
        ? "جواز رائد فضائي، مستويات تتدرج معك، شارات من الندرة إلى الأسطورية، ولوحة إنجازات شهرية."
        : "An astronaut passport, progressive levels, badges from common to legendary, and a monthly heatmap.",
    },
  ];

  const steps = [
    {
      icon: Rocket,
      title: isAr ? "أنشئ حسابك الفضائي" : "Create your space account",
      desc: isAr
        ? "سجّل الدخول بثانية عبر Google، اختر تخصصك وهدفك اليومي، واحصل على المستوى الأول."
        : "Sign in with Google in seconds, pick your specialty and daily goal, and earn your first level.",
    },
    {
      icon: Timer,
      title: isAr ? "انطلق بجلسة تركيز" : "Launch a focus session",
      desc: isAr
        ? "ادخل محطة أو غرفة دراسة حية وابدأ العدّاد. الـ XP يتصاعد مع كل دقيقة انضباط."
        : "Enter a station or live study room and start the timer. XP rises with every disciplined minute.",
    },
    {
      icon: Users,
      title: isAr ? "اربط مجتمعك" : "Connect your community",
      desc: isAr
        ? "تحدّى الأصدقاء، انضم لأسطول، وشارك في تحديات الأسبوع. المنافسة ترفع سقفك."
        : "Duel friends, join a fleet, and join weekly challenges. Competition raises your ceiling.",
    },
    {
      icon: Award,
      title: isAr ? "ارتقِ مستوى بمستوى" : "Climb level after level",
      desc: isAr
        ? "مع كل XP تفتح مستويات جديدة وشارات ومقتنيات — حتى تصبح أسطورة OrbitX."
        : "Every XP unlocks new levels, badges and items — until you become an OrbitX Legend.",
    },
  ];

  const shieldPoints = [
    {
      title: isAr ? "رادار الحضور التلقائي" : "Automatic presence radar",
      desc: isAr
        ? "ينذر فور مغادرتك للتبويب أو قفل الشاشة، ويفتح عدّاد عودة للـ cockpit خلال ثوانٍ."
        : "Alerts the moment you leave the tab or lock the screen, starting a cockpit return countdown.",
    },
    {
      title: isAr ? "خصم كتل الـ XP عند الاستهتار" : "Active XP penalty protocol",
      desc: isAr
        ? "تكرار الخروج يفعّل بروتوكول خصم XP لمنع اللامبالاة وضمان الانضباط الكامل."
        : "Repeated exits trigger an XP deduction protocol to enforce full discipline.",
    },
    {
      title: isAr ? "منع التحايل الميكانيكي" : "Mechanical cheat prevention",
      desc: isAr
        ? "رصد كامل لحركات الفأرة الوهمية ونقرات الـ Auto-Clicker حفاظاً على نزاهة المتصدّرين."
        : "Full detection of synthetic cursor movements and auto-clickers to protect leaderboard integrity.",
    },
  ];

  const faqs = [
    {
      q: isAr ? "هل يجب أن أبقى أمام الشاشة طوال الجلسة؟" : "Do I have to stay in front of the screen the whole session?",
      a: isAr
        ? "نعم — وهذا جوهر النظام. رادار الحضور يتحقق من وجودك، وعند هجر الشاشة يمنحك مهلة قصيرة للعودة قبل خصم XP. هذه الآلية تحوّل الجلسة من تايمر رمزي إلى التزام حقيقي."
        : "Yes — and that's the core of the system. The presence radar verifies you're there, and leaving the screen starts a short grace period before XP is deducted. This turns a session into a real commitment.",
    },
    {
      q: isAr ? "كيف أتقدم في المستويات والشارات؟" : "How do I progress in levels and badges?",
      a: isAr
        ? "كل ساعة تركيز تجلب لك XP. المستويات تتدرج من أول خطوة حتى أسطورة OrbitX عبر 9 مراحل، والشارات تُمنح عند إنجازات مثل الفوز بمعركة أو الوصول لـ 1000 XP."
        : "Every focus hour grants XP. Levels progress from First Step to OrbitX Legend across 9 stages, and badges unlock on achievements like winning a duel or reaching 1000 XP.",
    },
    {
      q: isAr ? "هل التطبيق متوفر بالعربية والإنجليزية؟" : "Is the app available in Arabic and English?",
      a: isAr
        ? "نعم، واجهة كاملة ثنائية اللغة مع تبديل فوري من زر اللغة أعلى الصفحة، مع دعم كامل لاتجاه RTL وLTR."
        : "Yes, a fully bilingual interface with instant switching from the language button, with full RTL and LTR support.",
    },
    {
      q: isAr ? "هل توجد إعلانات داخل المنصة؟" : "Are there ads inside the platform?",
      a: isAr
        ? "لا. بيئة التركيز خالية تماماً من الإعلانات والمشتتات. تركيزك هو الوقود الوحيد الذي يهمنا."
        : "No. The focus environment is completely free of ads and distractions. Your focus is the only fuel that matters.",
    },
    {
      q: isAr ? "هل يعمل OrbitX على الموبايل؟" : "Does OrbitX work on mobile?",
      a: isAr
        ? "نعم، التطبيق متجاوب بالكامل وهو PWA — يمكنك تثبيته على شاشتك الرئيسية والعمل منه كتطبيق أصلي."
        : "Yes, the app is fully responsive and a PWA — install it to your home screen and use it like a native app.",
    },
  ];

  const stats = [
    {
      icon: Users,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20",
      value: 14298,
      suffix: "",
      label: isAr ? "مستكشف على متن المنصة" : "Explorers onboard",
    },
    {
      icon: Clock,
      color: "text-fuchsia-400",
      bg: "bg-fuchsia-500/10 border-fuchsia-500/20",
      value: 329481,
      suffix: " H",
      label: isAr ? "ساعة تركيز مسجلة" : "Total focus hours",
    },
    {
      icon: Zap,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/20",
      value: 429,
      suffix: "M+",
      label: isAr ? "نقطة خبرة محصودة" : "Total harvested XP",
    },
    {
      icon: Rocket,
      color: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
      value: 89,
      suffix: " F",
      label: isAr ? "أسطول متحالف" : "Active fleets",
    },
  ];

  return (
    <div
      className="orbitx-cursor min-h-screen text-[#f1f3fd] font-sans selection:bg-indigo-600/50 overflow-x-hidden relative"
      dir={isAr ? "rtl" : "ltr"}
    >
      <CustomCursor />
      {/* Star Field Background Rendering Layer */}
      <StarBackground />

      <style>{`
        @keyframes subtle-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes cosmic-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.08); }
        }
        @keyframes warning-breathe {
          0%, 100% { background-color: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.2); }
          50% { background-color: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.5); }
        }
        @keyframes aura-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-subtle-float { animation: subtle-float 8s ease-in-out infinite; }
        .animate-cosmic-pulse { animation: cosmic-pulse 5s ease-in-out infinite; }
        .animate-warning-breathe { animation: warning-breathe 2s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 9px; }
      `}</style>

      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-space-dark/60 border-b border-indigo-500/10 transition-all select-none">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo Brand with animated ring */}
          <a href="#" className="flex items-center gap-3" dir="ltr">
            <div className="relative flex items-center justify-center w-9 h-9">
              <div className="absolute inset-0 border-[1.5px] border-indigo-500/30 rounded-full" />
              <div className="absolute inset-0 border-[1.5px] border-transparent border-t-indigo-500 border-l-fuchsia-500 rounded-full animate-[spin_4s_linear_infinite]" />
              <div className="absolute inset-1 border-[1.5px] border-transparent border-b-cyan-400 border-r-indigo-400 rounded-full animate-[spin_2.5s_linear_infinite_reverse]" />
              <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,1)] z-10" />
            </div>
            <div className="font-display font-black tracking-[0.2em] text-[19px] text-white">
              ORBIT
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                X
              </span>
            </div>
          </a>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                className="text-xs font-bold text-gray-400 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all tracking-wide"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Access Button and Volume Trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border bg-white/5 border-white/5 text-gray-400 hover:text-indigo-400 transition-all hover:scale-105 flex items-center justify-center"
              title={theme === "default" ? (isAr ? "التبديل للثيم الثاني" : "Switch theme") : (isAr ? "التبديل للثيم الأساسي" : "Switch theme")}
            >
              <Palette className="w-4 h-4" />
            </button>

            <button
              onClick={toggleLanguage}
              className="p-2.5 rounded-xl border bg-white/5 border-white/5 text-gray-400 hover:text-white hover:text-indigo-400 transition-all hover:scale-105 flex items-center justify-center gap-1.5"
              title={isAr ? "Switch to English" : "التحويل للعربية"}
            >
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-mono font-bold leading-none hidden sm:inline">
                {lang === "ar" ? "EN" : "AR"}
              </span>
            </button>

            <button
              onClick={toggleAmbientSound}
              className={cn(
                "p-2.5 rounded-xl border transition-all hover:scale-105",
                isSoundOn
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                  : "bg-white/5 border-white/5 text-gray-400 hover:text-white",
              )}
              title={isAr ? "مولد الترددات الكونية" : "Cosmic Frequency Soundwave"}
            >
              {isSoundOn ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
            <audio
              ref={audioRef}
              loop
              preload="none"
              className="hidden"
            />
            <button
              onClick={() => setShowLoginModal(true)}
              className="relative group bg-white hover:bg-white/95 text-black font-black px-6 py-2.5 rounded-xl text-xs tracking-wide transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center gap-2 font-sans"
            >
              <Rocket className="w-4 h-4 stroke-[2.5]" />
              <span>{t("common.login", "تسجيل دخول")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Invite welcome banner (shown when arriving through a friend's link) */}
      {inviterName && (
        <div className="fixed top-[74px] left-0 right-0 z-[60] flex justify-center px-4">
          <div className="w-full max-w-3xl bg-gradient-to-r from-indigo-600/80 via-fuchsia-600/80 to-indigo-600/80 backdrop-blur-md border border-white/10 text-white text-xs md:text-sm py-3 px-4 text-center font-semibold shadow-lg rounded-2xl">
            🚀 <strong>{inviterName}</strong>{" "}
            {isAr
              ? "دعاك إلى مجرة OrbitX — أنشئ حسابك، تبارزا في نزالات التركيز، واربح كلٌّ منكما 100 XP!"
              : "invited you to OrbitX — create your account, duel in focus battles, and you both earn 100 XP!"}
          </div>
        </div>
      )}

      {/* =============================================================
          HERO — Interactive Milky Way Galaxy (lazy-loaded)
         ============================================================= */}
      <GalaxyHero
        className="w-full"
        height="100vh"
      />

      {/* =============================================================
          HERO MESSAGE — value proposition below the galaxy
         ============================================================= */}
      <section className="relative flex items-center justify-center p-6 pt-24 pb-24 z-10 border-t border-white/5">
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center">
          <h1 className="text-[clamp(36px,6.5vw,80px)] font-black leading-[1.12] tracking-tight mb-8 drop-shadow-2xl">
            <span className="block text-white mb-3">
              {isAr ? "ليست مجرّد منصة دراسة..." : "Not Just Another Focus App..."}
            </span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 via-fuchsia-400 to-cyan-400 drop-shadow-[0_0_30px_rgba(99,102,241,0.1)]">
              {isAr ? "نظام تشغيل متكامل للتركيز العميق." : "An Immersive OS for Deep Focus."}
            </span>
          </h1>

          <p
            className="text-base md:text-xl text-gray-400 max-w-4xl leading-relaxed mb-12"
            dir={isAr ? "rtl" : "ltr"}
          >
            {isAr
              ? "OrbitX يحوّل ساعات التزامك الفعلي إلى وقود يحرّك مجرتك: غرف دراسة حية، معارك تركيز، أساطيل متحالفة، مستويات وشارات، ورادار حضور يمنع التشتت — كل ذلك في بيئة خالية تماماً من الإعلانات."
              : "OrbitX turns your real commitment hours into celestial fuel: live study rooms, focus duels, allied fleets, levels and badges, plus a presence radar that blocks distraction — all inside an ad-free environment."}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-5 justify-center w-full sm:w-auto relative z-10">
            <button
              onClick={() => setShowLoginModal(true)}
              className="group relative w-full sm:w-auto overflow-hidden bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600 rounded-2xl px-12 py-4.5 text-sm font-black text-white shadow-[0_0_50px_rgba(99,102,241,0.45)] hover:shadow-[0_0_70px_rgba(99,102,241,0.65)] transition-all hover:scale-[1.03]"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 flex items-center justify-center gap-3">
                <Rocket className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                {isAr ? "أطلق المركبة وابدأ الآن" : "Ignite Engine & Focus Now"}
              </span>
            </button>

            <button
              onClick={() =>
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
              }
              className="w-full sm:w-auto bg-black/40 backdrop-blur-xl border border-white/5 hover:border-white/10 rounded-2xl px-10 py-4.5 text-sm font-bold text-gray-300 hover:text-white transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              <ChevronDown className="w-4 h-4 text-cyan-400" />
              <span>{isAr ? "استكشف الميزات" : "Explore features"}</span>
            </button>
          </div>

          {onGuest && (
            <button
              onClick={onGuest}
              className="mt-6 text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-2 group"
            >
              <Eye className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              {isAr ? "جرّب كمشاهد بدون حساب" : "Try as a guest — no account needed"}
            </button>
          )}

          <div className="mt-14 text-[10px] md:text-xs font-mono tracking-widest text-[#a5b4fc]/40 uppercase flex items-center gap-4 flex-wrap justify-center">
            <span>🛡️ NO ADS IN CABIN</span>
            <span className="w-1.5 h-1.5 bg-indigo-500/20 rounded-full" />
            <span>🌌 REALTIME MULTIPLAYER</span>
            <span className="w-1.5 h-1.5 bg-indigo-500/20 rounded-full" />
            <span>🛸 PRESENCE RADAR</span>
          </div>
        </div>
      </section>

      {/* =============================================================
          STATS STRIP
         ============================================================= */}
      <section className="py-16 px-6 relative z-10 bg-gradient-to-b from-[#030308] to-[#040410] border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6 border border-indigo-500/10 rounded-[2.5rem] p-8 md:p-12 bg-space-dark/80 backdrop-blur-xl text-center shadow-[0_0_50px_rgba(99,102,241,0.1)]">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col items-center justify-center">
              <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center ${s.color} mb-4 shadow-[0_0_15px_rgba(99,102,241,0.1)]`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="text-4xl font-mono font-black text-white leading-none tracking-tight">
                <CountUp target={s.value} suffix={s.suffix} />
              </div>
              <span className="text-[10px] text-indigo-300/60 font-mono tracking-widest mt-2 block uppercase">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* =============================================================
          WHAT IS ORBITX (3 pillars)
         ============================================================= */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <SectionHead
            kicker={isAr ? "ما هو OrbitX؟" : "What is OrbitX?"}
            title={isAr ? "نظام تشغيل يحوّل ساعاتك" : "An operating system that converts your hours"}
            highlight={isAr ? "إلى إنتاج حقيقي محسوس." : "into real, tangible output."}
            sub={isAr
              ? "بثلاثة أركان تعمل معاً، يتحول التشتت إلى انضباط، والانضباط إلى إنجاز."
              : "Three pillars working together turn distraction into discipline, and discipline into achievement."}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pillars.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className={`rounded-3xl border ${p.border} bg-[#07081a]/60 p-8 text-center hover:bg-[#0a0c22]/70 transition-colors`}
              >
                <div className={`w-14 h-14 mx-auto rounded-2xl ${p.bg} border ${p.border} flex items-center justify-center ${p.color} mb-5`}>
                  <p.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white mb-2">{p.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =============================================================
          FEATURES
         ============================================================= */}
      <section id="features" className="py-24 px-6 relative z-10 bg-gradient-to-b from-[#030308] to-[#040410] border-t border-white/5 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <SectionHead
            kicker={isAr ? "الميزات" : "Features"}
            title={isAr ? "كل ما تحتاجه بيئة تركيز" : "Everything a focus environment needs"}
            highlight={isAr ? "في منصة واحدة." : "in one platform."}
            sub={isAr
              ? "تسع وحدات متكاملة تغطي التركيز والتحفيز والمجتمع — تعمل مع بعض بانسجام."
              : "Nine integrated modules covering focus, motivation and community — working together in harmony."}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: (i % 3) * 0.08 }}
                className="group rounded-3xl border border-white/5 bg-space-dark/70 p-7 hover:border-indigo-500/30 hover:bg-[#08091c]/80 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ${f.color} mb-5`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =============================================================
          HOW IT WORKS
         ============================================================= */}
      <section id="how-it-works" className="py-24 px-6 relative z-10 bg-gradient-to-b from-[#030308] to-[#040410] border-t border-white/5 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <SectionHead
            kicker={isAr ? "كيف نعمل" : "How it works"}
            title={isAr ? "من إنشاء الحساب" : "From signing up"}
            highlight={isAr ? "إلى أسطورة المجرة" : "to Galaxy Legend"}
            sub={isAr
              ? "أربع خطوات واضحة تبدأ بها رحلتك في مدار OrbitX."
              : "Four clear steps begin your journey in OrbitX's orbit."}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: i * 0.1 }}
                className="relative rounded-3xl border border-white/5 bg-space-dark/70 p-7"
              >
                <div className="text-[11px] font-mono text-indigo-400 tracking-widest mb-4">STEP_0{i + 1}</div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
                  <s.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-white mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =============================================================
          ANTI-CHEAT SHIELD
         ============================================================= */}
      <section id="anti-cheat" className="py-24 px-6 relative z-10 border-t border-white/5 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6" dir={isAr ? "rtl" : "ltr"}>
              <div className="inline-flex items-center gap-2 font-mono text-xs text-rose-500 tracking-[0.2em] mb-4 uppercase">
                <span className="w-6 h-px bg-rose-500/50" />
                {isAr ? "درع الحماية من التشتت" : "Anti-Distraction Shield"}
              </div>
              <h3 className="text-[clamp(28px,4vw,44px)] font-black leading-tight mb-6">
                {isAr ? "إنفاذ حقيقي لوجودك" : "Real enforcement of your presence"}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-l from-rose-400 to-amber-400">
                  {isAr ? "لا تايمر زائف ولا تحايل." : "No fake timers, no cheating."}
                </span>
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                {isAr
                  ? "في OrbitX لا يوجد تايمر يمكنك إغماض عينيك عنه والذهاب. النظام مصمم لضمان تفويض الوجود الكامل عبر آليات تتبع تفاعل لحظية:"
                  : "In OrbitX there is no timer you can turn away from and leave. The system is built to guarantee full presence through real-time interaction tracking:"}
              </p>
              <div className="space-y-5">
                {shieldPoints.map((sh, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 text-xs text-rose-400 mt-1 font-bold">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">{sh.title}</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{sh.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#090508]/80 border border-rose-500/20 rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col justify-between shadow-[0_0_60px_rgba(239,68,68,0.06)] min-h-[380px]">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent animate-pulse" />
              <div className="flex items-center justify-between border-b border-rose-500/10 pb-4 mb-6" dir="ltr">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <span className="font-mono text-[10px] text-rose-400 font-bold tracking-widest uppercase">
                    ANTI_DISTRACTION_SHIELD
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">STATUS: ARMED</span>
              </div>

              <div className="space-y-4 text-right">
                {[
                  { label: "BIOMETRIC PRESENCE PROXY", percent: "99.8%", color: "text-emerald-400", status: "STABLE" },
                  { label: "WINDOW FOCUS GUARANTOR", percent: "ACTIVE", color: "text-rose-500 animate-pulse", status: "LOCKDOWN" },
                  { label: "MECHANICAL CLICK DETECTOR", percent: "100%", color: "text-indigo-400", status: "ARMED" },
                ].map((guard, idx) => (
                  <div key={idx} className="bg-black/40 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className={cn("px-2 py-0.5 rounded border border-white/5 inline-block text-[11px] uppercase", guard.color)}>
                        {guard.status}
                      </span>
                      <span className="text-gray-400 font-bold">{guard.percent}</span>
                    </div>
                    <div>
                      <span className="text-xs text-white block font-bold">{guard.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-[10px] text-rose-400 font-mono tracking-wide uppercase">
                ⚠️ PENALTY OF ESCAPING THE CABIN: -50 XP PER LEAVE INTRUSION
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =============================================================
          INTERACTIVE SIMULATOR
         ============================================================= */}
      <section id="simulator" className="py-24 px-6 relative z-10 bg-gradient-to-b from-[#030308] to-[#040410] border-t border-white/5 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <SectionHead
            kicker={isAr ? "جربها الآن" : "Try it live"}
            title={isAr ? "جرّب كبينة القيادة 🛸" : "Test the cockpit 🛸"}
            sub={isAr
              ? "محاكاة حية لوحدة التحكم الحقيقية: شغّل المحرك، راقب تصاعد الـ XP، أو اضغط زر التشتت لترى كيف يحميك الرادار."
              : "A live simulation of the real control unit: start the engine, watch XP rise, or press the distraction button to see the radar protect you."}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Control Pad Left */}
            <div className="lg:col-span-4 flex flex-col gap-5 justify-between bg-[#060712]/90 border border-white/5 p-6 md:p-8 rounded-[2rem] text-right">
              <div>
                <h3 className="text-lg font-black text-white mb-2">{isAr ? "لوحة تفعيل المدارات" : "Orbit activation panel"}</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                  {isAr ? "اختر المحطة الصوتية والهيكلية التي تريد الطفو بداخلها. كل محطة تدعم ترددات عزل فريدة." : "Pick the station you want to float inside. Each station supports unique isolation frequencies."}
                </p>
                <div className="space-y-2.5 dropdown-list">
                  {[
                    {
                      name: "سديم نبتون الهادئ",
                      label: "🌌 سديم نبتون الهادئ (Cosmic Lofi)",
                      desc: isAr ? "ترددات كونية هادئة لعمق التركيز" : "Calm cosmic frequencies for deep focus",
                    },
                    {
                      name: "مكة المكرمة",
                      label: "🕌 رحاب مكة المكرمة (قراءة خاشعة)",
                      desc: isAr ? "تلاوات قرآنية عذبة ترتقي بروحك" : "Gentle Quran recitations that elevate you",
                    },
                  ].map((station) => (
                    <button
                      key={station.name}
                      onClick={() => {
                        setSelectedSimStation(station.name);
                        if (station.name === "مكة المكرمة") {
                          setSimTime(1800);
                        } else {
                          setSimTime(1500);
                        }
                        setSimSuccess(false);
                      }}
                      className={cn(
                        "w-full text-right p-4 rounded-xl border text-xs font-bold transition-all flex flex-col gap-1",
                        selectedSimStation === station.name
                          ? "bg-indigo-500/10 border-indigo-500/40 text-white shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                          : "bg-black/40 border-white/5 text-gray-400 hover:text-white",
                      )}
                    >
                      <span>{station.label}</span>
                      <span className="text-[10px] text-gray-500 font-normal">{station.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-indigo-500/10 bg-indigo-950/10 p-4.5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-500" />
                <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 mb-1.5">
                  <Activity size={13} />
                  <span>{isAr ? "بروتوكول تحصيل الـ XP" : "XP accumulation protocol"}</span>
                </h4>
                <p className="text-[11px] text-indigo-200/50 leading-relaxed">
                  {isAr ? "عند تشغيل الجلسة يزداد مخزون طاقة القيادة تلقائياً. المدار يضمن التزامك بعدم هجر الشاشة." : "When the session runs, your power bank rises automatically. The orbit ensures you never leave the screen."}
                </p>
              </div>
            </div>

            {/* Interactive Cabin Dashboard */}
            <div className="lg:col-span-8 bg-[#04040a] border-2 border-indigo-500/15 rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden flex flex-col justify-between shadow-[0_0_60px_rgba(99,102,241,0.1)]">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none opacity-30" />
              {simAlertActive && (
                <div className="absolute inset-0 bg-red-950/20 z-0 animate-warning-breathe pointer-events-none" />
              )}

              <div className="flex items-center justify-between border-b border-white/5 pb-4.5 mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Atom className="w-5 h-5 animate-[spin_6s_linear_infinite]" />
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-cyan-400 font-bold tracking-widest block uppercase">
                      ACTIVE SIMULATED SECTOR
                    </span>
                    <span className="text-sm font-black text-white">
                      {isAr ? "محطة:" : "Station:"} {selectedSimStation}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] text-gray-400 font-mono">1,480 PILOTS ONLINE</span>
                </div>
              </div>

              <div className="relative z-10 my-auto text-center py-6">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-20 w-40 pointer-events-none">
                  {floatingXps.map((fx) => (
                    <motion.div
                      key={fx.id}
                      initial={{ opacity: 1, y: 15 }}
                      animate={{ opacity: 0, y: -45 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="absolute left-1/2 -translate-x-1/2 text-emerald-400 text-xs font-mono font-black"
                    >
                      +15 XP ⚡ CAPTURED
                    </motion.div>
                  ))}
                </div>

                <div className="text-[clamp(45px,6vw,70px)] font-mono font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-200 to-indigo-400 mb-2 drop-shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  {formatSimTime(simTime)}
                </div>
                <div className="text-xs text-gray-400/70 font-mono tracking-widest uppercase mb-8">
                  CHRONONOMETER: REGISTRY ON TRACK
                </div>

                <div className="inline-flex items-center gap-6 bg-black/40 border border-white/5 p-4 rounded-2xl mb-8">
                  <div className="text-right">
                    <div className="text-[11px] text-[#818cf8] font-mono leading-none mb-1">XP ENERGY BANK</div>
                    <div className="text-lg font-black font-mono text-emerald-400">{simXp} XP</div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-right">
                    <div className="text-[11px] text-[#818cf8] font-mono leading-none mb-1">XP MULTIPLIER</div>
                    <div className="text-sm font-bold font-mono text-white">1.0x NORMAL</div>
                  </div>
                </div>

                <AnimatePresence>
                  {simAlertActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="max-w-md mx-auto p-4 border border-red-500/30 bg-red-950/20 rounded-xl text-right mb-8"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-bounce" />
                        <div>
                          <h4 className="text-xs font-black text-red-300">
                            {isAr ? "خرق الحضور! غادرت كبينة القيادة 🚨" : "Presence breach! You left the cockpit 🚨"}
                          </h4>
                          <p className="text-[11px] text-red-200/50 leading-relaxed mt-1">
                            {isAr ? "رصد النظام تغييراً في النشاط. العودة الفورية مطلوبة خلال" : "The system detected an activity change. Return immediately within"}{" "}
                            <b className="text-white font-mono text-xs">{simAlertCountdown}ث</b>{" "}
                            {isAr ? "لتجنب سحب كتل الطاقة." : "to avoid XP energy drain."}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2 justify-end">
                        <button
                          onClick={cancelMockDistraction}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg transition-colors"
                        >
                          {isAr ? "تأكيد الحضور (إلغاء الإنذار)" : "Confirm presence (cancel alert)"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {simSuccess && (
                  <div className="max-w-md mx-auto p-4 border border-emerald-500/30 bg-emerald-950/10 rounded-xl text-center mb-8">
                    <h4 className="text-xs font-black text-emerald-400">
                      {isAr ? "انتهت الرحلة المدارية بنجاح! 🎉" : "Orbital journey completed! 🎉"}
                    </h4>
                    <p className="text-[11px] text-emerald-200/50 mt-1">
                      {isAr ? "اكتملت جلسة التركيز وحصدت نقاط الخبرة. مستعد للمزيد؟" : "Your focus session completed and you earned XP. Ready for more?"}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6 relative z-10 select-none">
                <button
                  onClick={toggleSim}
                  className={cn(
                    "flex-1 min-w-[150px] font-black rounded-xl py-3.5 text-xs transition-all flex items-center justify-center gap-2",
                    simActive
                      ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                      : "bg-indigo-500 hover:bg-indigo-600 text-white",
                  )}
                >
                  <Rocket className="w-4 h-4" />
                  <span>
                    {simActive
                      ? isAr ? "إيقاف الجلسة التفاعلية" : "Stop simulation"
                      : isAr ? "إطلاق جلسة المحاكاة" : "Launch simulation"}
                  </span>
                </button>

                <button
                  onClick={triggerMockDistraction}
                  disabled={simAlertActive}
                  className="bg-black/40 hover:bg-white/5 border border-white/10 hover:border-red-500/40 text-xs font-bold font-sans text-gray-400 hover:text-red-400 rounded-xl px-5 py-3.5 transition-all text-center flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
                  <span>{isAr ? "محاكاة إنذار التشتت" : "Simulate distraction alert"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =============================================================
          BLACK HOLE
         ============================================================= */}
      <section className="py-24 px-6 relative z-10 overflow-hidden bg-black border-t border-white/5">
        <div className="absolute inset-0 z-0 pointer-events-none w-full h-full flex items-center justify-center">
          <div className="absolute w-[600px] h-[600px] rounded-full border border-fuchsia-600/10 bg-gradient-to-tr from-[#9d174d]/15 via-transparent to-[#1e1b4b]/20 filter blur-[80px] animate-cosmic-pulse" />
          <div className="absolute w-[420px] h-[420px] rounded-full border-[10px] border-amber-500/10 border-t-amber-400/50 border-b-indigo-500/40" style={{ filter: "blur(18px)", animation: "aura-rotate 16s linear infinite" }} />
          <div className="absolute w-[440px] h-[440px] rounded-full border-[2px] border-dashed border-rose-500/20" style={{ filter: "blur(4px)", animation: "aura-rotate 28s linear infinite reverse" }} />
          <div className="absolute w-44 h-44 rounded-full bg-black shadow-[0_0_120px_rgba(244,63,94,0.35),0_0_40px_rgba(0,0,0,1)] z-10" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center py-10 px-4">
          <div className="inline-flex items-center gap-2 bg-[#1c0812]/50 border border-rose-500/30 rounded-full px-4 py-1.5 text-[10px] text-rose-300 font-bold tracking-widest mb-8">
            <Flame className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
            {isAr ? "بروتوكول التركيز الجماعي الأسبوعي" : "Weekly Collective Focus Protocol"}
          </div>

          <h3 className="text-[clamp(32px,5vw,60px)] font-black leading-tight mb-8">
            {isAr ? "تحدي الثقب الأسود" : "The Black Hole Challenge"}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-amber-400 to-indigo-500">
              {isAr ? "ساعات جماعية وجوائز أسبوعية!" : "Pooled hours & weekly bounties!"}
            </span>
          </h3>

          <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-12 max-w-2xl mx-auto" dir={isAr ? "rtl" : "ltr"}>
            {isAr
              ? "يتعاون كل الرواد لجمع ساعات تركيز خارقة واختراق هدف الأسبوع قبل نهايته. إنجزتم المهمة؟ تُفتح جائزة سرية فريدة يستحقها الجميع."
              : "All astronauts collaborate to pool super focus hours and crack the weekly target before it ends. Completed the mission? A unique secret bounty unlocks for everyone."}
          </p>

          <button
            onClick={() => setShowLoginModal(true)}
            className="group relative overflow-hidden bg-[#2d020c] hover:bg-[#470313] border border-rose-500/50 rounded-2xl px-12 py-4.5 text-xs font-black text-rose-200 shadow-[0_0_35px_rgba(239,68,68,0.25)] hover:shadow-[0_0_55px_rgba(239,68,68,0.45)] transition-all"
          >
            <span className="relative z-10">{isAr ? "انضم للتحدي الآن" : "Join the challenge now"}</span>
          </button>
        </div>
      </section>

      {/* =============================================================
          AWARENESS / MINDSET
         ============================================================= */}
      <section id="awareness" className="py-24 px-6 relative z-10 bg-[#020207] border-t border-white/5 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12" dir={isAr ? "rtl" : "ltr"}>
            <div className="inline-flex items-center gap-2 font-mono text-xs text-purple-400 tracking-[0.2em] mb-4 uppercase">
              <span className="w-6 h-px bg-purple-500/50" />
              {isAr ? "الوعي وبناء العقلية" : "Awareness & Mindset"}
            </div>
            <h3 className="text-[clamp(28px,4vw,42px)] font-black leading-tight">
              {isAr ? "التركيز ليس ميكانيكياً فقط" : "Focus is not purely mechanical"}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-purple-400 via-indigo-400 to-cyan-400">
                {isAr ? "بل وعي سلوكي يُبنى." : "It is a built behavioral craft."}
              </span>
            </h3>
            <p className="text-gray-400 text-sm max-w-2xl mt-4 leading-relaxed">
              {isAr
                ? "مستودع الوعي يقدم لك مقالات وتدريبات على كرة أرضية تفاعلية، بالإضافة إلى لاعب قرآن كامل بـ 114 سورة و8 قرّاء — لتغذية العقل والروح معاً."
                : "The awareness repository offers articles and exercises on an interactive globe, plus a full Quran player with 114 surahs and 8 reciters — feeding both mind and soul."}
            </p>
          </div>
          <InteractiveSecretGlobe />
        </div>
      </section>

      {/* =============================================================
          FAQ
         ============================================================= */}
      <section id="faq" className="py-24 px-6 relative z-10 border-t border-white/5 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <SectionHead
            kicker={isAr ? "الأسئلة الشائعة" : "FAQ"}
            title={isAr ? "أسئلة يطرحها كل رائد" : "Questions every astronaut asks"}
            highlight={isAr ? "قبل الإقلاع" : "before liftoff"}
            sub={isAr
              ? "أجوبة صريحة مباشرة عن أهم ما يخطر ببالك قبل أن تبدأ."
              : "Honest, direct answers to the most important things on your mind before starting."}
          />
          <div className="space-y-4">
            {faqs.map((item, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-white/5 bg-space-dark/60 overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none p-5 md:p-6 text-sm md:text-base font-bold text-white hover:bg-white/[0.03] transition-colors">
                  {item.q}
                  <span className="text-indigo-400 shrink-0 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="px-5 md:px-6 pb-5 md:pb-6 text-sm text-gray-400 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* =============================================================
          FINAL CTA
         ============================================================= */}
      <section className="py-24 px-6 relative z-10 bg-gradient-to-b from-[#030308] to-[#040410] border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[700px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 font-mono text-xs text-cyan-400 tracking-[0.2em] mb-6 uppercase">
            <span className="w-6 h-px bg-cyan-500/50" />
            LAUNCH_WINDOW_OPEN
            <span className="w-6 h-px bg-cyan-500/50" />
          </div>
          <h2 className="text-[clamp(30px,5vw,54px)] font-black leading-tight mb-6">
            {isAr ? "جاهز تنطلق في المدار؟" : "Ready to launch into orbit?"}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 via-fuchsia-400 to-cyan-400">
              {isAr ? "مركبتك بانتظار قائدها." : "Your ship awaits its captain."}
            </span>
          </h2>
          <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto mb-10 leading-relaxed">
            {isAr
              ? "انضم الآن وابدأ أول جلسة تركيز لك. خلال ثوانٍ ستحصل على المستوى الأول وتبدأ بجمع الـ XP الذي يرفع مقامك بين المستكشفين."
              : "Join now and start your first focus session. Within seconds you'll earn your first level and start collecting XP to rise among explorers."}
          </p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="group relative inline-flex items-center gap-3 overflow-hidden bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600 rounded-2xl px-14 py-5 text-sm font-black text-white shadow-[0_0_50px_rgba(99,102,241,0.45)] hover:shadow-[0_0_70px_rgba(99,102,241,0.65)] transition-all hover:scale-[1.03]"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Rocket className="w-5 h-5 relative z-10 group-hover:-translate-y-1 transition-transform" />
            <span className="relative z-10">{isAr ? "أنشئ حسابك وابدأ الآن" : "Create your account & start now"}</span>
          </button>
        </div>
      </section>

      {/* =============================================================
          FOOTER
         ============================================================= */}
      <footer className={cn("bg-[#020205] border-t border-white/5 pt-20 pb-12 px-6 relative z-10", isAr ? "text-right" : "text-left")}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 mb-16" dir={isAr ? "rtl" : "ltr"}>
          <div className="md:col-span-5">
            <div className={cn("flex items-center gap-3 mb-6", isAr ? "" : "flex-row-reverse")}>
              <div className="relative flex items-center justify-center w-8 h-8">
                <div className="absolute inset-0 border-2 border-indigo-500 rounded-full" />
                <div className="absolute w-2.5 h-2.5 bg-indigo-400 rounded-full" />
              </div>
              <div className="font-display font-black tracking-[0.2em] text-[18px] text-white">
                ORBIT<span className="text-indigo-400">X</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm mb-6">
              "OrbitX isn't a timer. It's an operating system for focus."
            </p>
            <p className="text-xs text-gray-500">
              {isAr
                ? "نظام تشغيل حشد التركيز وإدارة الأداء البشري دون تشتيت. صُمم للمصممين والمهندسين وصنّاع العلم."
                : "A focus mobilization and human performance management system without distractions. Built for designers, developers, and makers."}
            </p>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-xs font-black text-white font-sans tracking-wide uppercase mb-5">
              {isAr ? "وحدات النظام" : "System Modules"}
            </h4>
            <ul className="space-y-3 text-[11px] text-gray-400">
              <li><a href="#features" className="hover:text-indigo-400 transition-colors">{isAr ? "الميزات" : "Features"}</a></li>
              <li><a href="#how-it-works" className="hover:text-indigo-400 transition-colors">{isAr ? "كيف نعمل" : "How It Works"}</a></li>
              <li><a href="#anti-cheat" className="hover:text-indigo-400 transition-colors">{isAr ? "درع الحماية" : "Protection Shield"}</a></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h4 className="text-xs font-black text-white font-sans tracking-wide uppercase mb-5">
              {isAr ? "مركز الإرشاد الكوني" : "Cosmic Command Support"}
            </h4>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
              {isAr
                ? "للاستشارات أو الإبلاغ عن اختلالات، تواصل مع القيادة:"
                : "For questions, troubleshooting, or anomalies, contact base camp:"}
            </p>
            <div className="bg-black/40 border border-white/5 p-4 rounded-xl text-left font-mono text-[10px]" dir="ltr">
              <span className="text-[#a5b4fc] block font-bold mb-1">PROPRIETARY OS TERMINAL</span>
              <span className="text-gray-400">{isAr ? "البريد:" : "Email:"} abdalrahmanjarrah1@gmail.com</span>
              <span className="text-gray-500 block mt-1">{isAr ? "المصمم:" : "Creator:"} abdalrahman nabeel Al jarrah</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-gray-400 font-mono" dir={isAr ? "rtl" : "ltr"}>
          <div>
            {isAr
              ? "بروتوكول الفضاء أوربت إكس © 2026. تصميم وتطوير"
              : "ORBITX SPACE PROTOCOL © 2026. Developed and Crafted by"}{" "}
            <span className="text-indigo-400 font-bold font-sans">abdalrahman nabeel Al jarrah</span>.
          </div>
          <div className="flex items-center gap-1.5" dir="ltr">
            <span>{isAr ? "بريد الدعم:" : "Ground Support Email:"}</span>
            <a href="mailto:abdalrahmanjarrah1@gmail.com" className="text-cyan-400 hover:underline">
              abdalrahmanjarrah1@gmail.com
            </a>
          </div>
        </div>
      </footer>

      {/* Futuristic Cosmic Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-[#020205]/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className={cn("relative bg-[#070814]/95 border border-indigo-500/40 rounded-[2.5rem] p-6 md:p-10 w-full max-w-lg shadow-[0_0_100px_rgba(99,102,241,0.25)] overflow-hidden", isAr ? "text-right" : "text-left")}
              dir={isAr ? "rtl" : "ltr"}
            >
              <div className="absolute -top-20 -left-20 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5 relative z-10">
                <div className={cn("flex items-center gap-3", isAr ? "" : "flex-row-reverse")}>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div className={isAr ? "text-right" : "text-left"}>
                    <h2 className="text-xl font-black text-white font-sans">
                      {isAr ? "بصمة العبور للـ OrbitX" : "OrbitX Transit Signature"}
                    </h2>
                    <p className="text-[11px] text-indigo-300/60 font-mono tracking-wider mt-0.5">
                      LAUNCH_CONTROL_GATEWAY
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="p-2 border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className={cn("relative border border-white/5 bg-space-dark/70 rounded-2xl p-5 flex items-center gap-4 mb-6 overflow-hidden group", isAr ? "" : "flex-row-reverse")}>
                <motion.div
                  animate={{ y: [0, 80, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="absolute left-0 right-0 h-[1.5px] bg-indigo-500/30 pointer-events-none"
                />
                <div className="w-14 h-14 rounded-2xl border border-indigo-500/30 bg-indigo-950/40 flex items-center justify-center overflow-hidden shrink-0">
                  <Rocket className="w-7 h-7 text-indigo-400 animate-pulse" />
                </div>
                <div className={cn("flex-1", isAr ? "text-right" : "text-left")}>
                  <div className="text-[10px] text-indigo-400 font-mono tracking-widest leading-none mb-1 uppercase">PILOT REGISTER STATUS</div>
                  <div className="text-sm font-bold text-white">{isAr ? "رائد فضاء مستكشف" : "Exploring Astronaut"}</div>
                  <div className="text-xs text-indigo-200/50 mt-1">{isAr ? "المدار: بانتظار الترشيح الشخصي" : "Orbit: Awaiting deployment status"}</div>
                </div>
              </div>

              <div className={cn("space-y-3 mb-8 text-xs text-gray-400 bg-black/40 p-5 rounded-2xl border border-white/5 font-sans leading-relaxed", isAr ? "text-right" : "text-left")}>
                <div className="font-black text-gray-200 text-sm mb-2">{isAr ? "رحلتك الإنجازية اليوم تشمل:" : "Your achievement journey today includes:"}</div>
                <div className="flex items-start gap-3">
                  <span className="text-indigo-400">🌌</span>
                  <span><strong>{isAr ? "غرف دراسة حية" : "Live Study Rooms"}</strong> {isAr ? "بلا تشتت أو مقاطعات إعلانية." : "without distractions or advertisement loops."}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-indigo-400">⚡</span>
                  <span>{isAr ? "كسب نقاط الخبرة (XP) وترقية الشارات الفضائية." : "Earning XP and upgrading custom space badges."}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(false);
                  onLogin();
                }}
                className="relative w-full group overflow-hidden bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600 rounded-2xl py-4.5 text-[16px] font-black text-white shadow-[0_0_35px_rgba(99,102,241,0.35)] hover:shadow-[0_0_55px_rgba(99,102,241,0.55)] transition-all hover:scale-[1.01] flex items-center justify-center gap-3 relative z-10"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <svg className="w-5 h-5 fill-white shrink-0" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.4h6.86c-.277 1.56-1.602 4.585-6.86 4.585-4.54 0-8.24-3.765-8.24-8.4s3.7-8.4 8.24-8.4c2.58 0 4.307 1.095 5.298 2.045l2.465-2.37C18.435 1.21 15.62 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.89 11.57-11.79 0-.795-.085-1.4-.195-1.925H12.24z" />
                </svg>
                <span>{isAr ? "التحليق الفوري الآمن باستخدام Google" : "Fly securely using Google"}</span>
              </button>

              <div className="text-center text-[10px] text-gray-500 font-mono tracking-wide mt-5 uppercase">
                SECURITY CLEARED BY ORBITX SPACE COMMAND PROTOCOL
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
