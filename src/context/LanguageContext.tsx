import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "ar" | "en";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, arabicFallback: string) => string;
  isAr: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const dictionary: Record<string, Record<string, string>> = {
  en: {
    // Dock Categories
    "cat.focus": "Focus Mode",
    "cat.community": "Galaxy Portal",
    "cat.profile": "Passport Info",

    // Navigation Pills
    "nav.home": "Stations",
    "nav.schedule": "Schedule",
    "nav.challenges": "Races",
    "nav.blackholes": "Black Holes",
    "nav.search": "Search",
    "nav.discussions": "Discussions",
    "nav.fleets": "Fleets",
    "nav.leaderboard": "Leaderboard",
    "nav.awareness": "Awareness Stream",
    "nav.profile": "Passport",
    "nav.support": "Help Desk",
    "nav.admin": "System Deck",

    // Onboarding Wizard
    "onboarding.welcome": "Welcome aboard the Orbit, Commander 🚀",
    "onboarding.desc": "Your authorization has been detected successfully. The orbital protocol is preparing your central control unit and isolating surrounding kinetic movement for maximum human focus.",
    "onboarding.identity_id": "ASTRONAUT REGISTRY ID",
    "onboarding.identity_sub": "Your journey begins now at Level 1 and 0 XP. Prepare to rise through levels and collections!",
    "onboarding.prev": "Previous",
    "onboarding.identity_btn": "Define Identity & Self-Bios",
    "onboarding.specialty_title": "Choose Specialty and Focus Role 🔬",
    "onboarding.specialty_sub": "Select your scientific or academic path. This will appear on your passport and public orbital leaderboards.",
    "onboarding.custom_placeholder": "Or write a custom specialty yourself...",
    "onboarding.fuel": "Commitment & Daily Fuel Goal",
    "onboarding.commit_title": "Daily Fuel Generator Charge 🔋",
    "onboarding.commit_sub": "Set your daily active focus targets. The system depends on this to award badges, coins, and rewards.",
    "onboarding.launch": "Activate Launch Protocol & Isolate Distractions 👨‍🚀",

    // Top Bar
    "top.tour": "Quick Tour",
    "top.tour_sub": "🧭 Guide",
    "top.edit_id": "Edit Identity",

    // Landing Page
    "landing.login": "Enter OrbitX Cockpit",
    "landing.tag": "COSMIC DEEP FOCUS PROTOCOL · ORBITX",
    "landing.hero_title": "Isolate Distractions, Elevate Your Intelligence",
    "landing.hero_sub": "OrbitX is a stylized cosmic workspace for scholars, developers, and writers. Immerse yourself in quiet chambers, participate in focus duels, and track your telemetry safely.",
    "landing.cockpit_btn": "Launch Astronaut Passport",

    // Home View Stations Directory
    "home.create_station": "Deploy New Focus Chamber",
    "home.focus_hours": "Focus Time",
    "home.hour_unit": "hrs",
    "home.space_rank": "Astronaut Level",
    "home.active_stations": "Active Orbital Chambers",
    "home.silent_orbit": "The Orbit is Entirely Silent",
    "home.silent_orbit_desc": "No crew members are currently active in any station. Be the pioneer to spawn a new chamber and initiate a deep focus session.",
    "home.system_tasks": "Core System Tasks",
    "home.create.title": "Deploy New Focus Station Space",
    "home.create.name": "Station Identifier Name",
    "home.create.name_placeholder": "e.g., Quantum Mechanics Lab, Deep Coding, Study Oasis...",
    "home.create.image": "Background Canopy Style",
    "home.create.submit": "Launch Station Setup 🚀",

    // Study Room View
    "study.station": "Station",
    "study.task": "Current Mission",
    "study.timer_gate": "Pomodoro Focus Gateway",
    "study.start_session": "Initiate Focus Timer",
    "study.pause": "Pause Ignition",
    "study.resume": "Resume Ignition",
    "study.stop": "Abort Session",
    "study.focus_time": "Focus Duration",
    "study.break_time": "Break Duration",
    "study.minutes_label": "minutes",
    "study.music_deck": "Galactic Audio Receiver",
    "study.music_ambient": "Ambient White Noises",
    "study.audio_quran": "Quran Receiver Interface",
    "study.crew": "Active Station Crew",
    "study.leave": "Leave Station",
    "study.completed_ok": "Focus cycle completed! Good job, pilot. XP and coins added to your stash.",

    // Challenges Arena Hero
    "hero.tag": "Rangers Battle · OrbitX",
    "hero.title": "Cosmic Battle Arena",
    "hero.desc": "Challenge your crew to live real-time focus duels. Minutes accumulate only when inside a station with your timer running — whoever studies more under the limit takes the victory crown.",
    "hero.launch": "Launch New Battle",
    "hero.find": "Find Peers ({count})",

    // Active Battles
    "battle.active": "Active Duel",
    "battle.pending_calc": "Awaiting Results",
    "battle.completed": "Completed & Settled",
    "battle.remaining": "Remaining",
    "battle.min_left": "Remaining: {minutes} mins",
    "battle.completed_time": "Time Completed",
    "battle.warning": "Your opponent is leading by {diff} mins! Fire up those boosters 🚀",
    "battle.you": "You (Pilot)",
    "battle.opponent": "Opponent",
    "battle.lead": "Leading ↑",
    "battle.power_hero": "Hero Power",
    "battle.power_opp": "Challenger Power",
    "battle.enter": "Enter Chamber Menu",
    "battle.claim": "🏆 Claim Rewards & Calculate",
    "battle.finish": "Settle Early & Count",

    // General / Common
    "common.hours": "hours",
    "common.mins": "mins",
    "common.secs": "secs",
    "common.xp": "XP",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.logout": "Disconnect",
    "common.rank": "Astronaut Level",
    "common.banned": "Your account has been restricted",
    "common.banned_desc": "Your access to the platform has been suspended due to policy violations. Contact staff if you think this is a mistake.",
    "common.quota": "🛡️ Auxiliary Space System: Firebase database limit reached for today. We are routing all operations successfully locally to keep your focus uninterrupted.",
    "common.hide": "Dismiss",
    "common.login": "Log In",

    // Level Up
    "level_up.title": "New Level Reached! 🚀",
    "level_up.msg": "You have been promoted to Level {level}.",
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("orbitx_lang") as Language;
      if (stored === "ar" || stored === "en") return stored;
    }
    return "ar";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("orbitx_lang", newLang);
  };

  const toggleLanguage = () => {
    setLang(lang === "ar" ? "en" : "ar");
  };

  useEffect(() => {
    // Set HTML direction and lang attribute dynamically
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: string, arabicFallback: string): string => {
    if (lang === "ar") return arabicFallback;
    const translation = dictionary[lang]?.[key];
    if (translation !== undefined) {
      return translation;
    }
    return arabicFallback;
  };

  const isAr = lang === "ar";

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t, isAr }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
