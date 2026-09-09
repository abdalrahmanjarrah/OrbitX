/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GreetingConfig {
  text: string;
  subtext: string;
}

// Group greetings by time of day and vibe to provide rich, non-repetitive variety (Arabic)
export const MORNING_GREETINGS_AR: GreetingConfig[] = [
  { text: "أشرقت شمس مدارك الجديد.", subtext: "ابدأ يومك بجلسة تركيز لترسيخ إنتاجيتك." },
  { text: "جاهز لرحلة تركيز جديدة؟", subtext: "شروق مداري جديد يعني فرصاً لا حصر لها للإنجاز." },
  { text: "طاقتك الذهنية جاهزة للإقلاع.", subtext: "وجه تيار طاقتك الصباحية نحو مهمتك الكبرى اليوم." },
  { text: "مدارك الصباحي يبدأ بنشاط.", subtext: "خطوة واحدة دقيقة الآن ترسم ملامح يوم رائع." },
  { text: "صباح بنكهة الإنجاز الفضائي.", subtext: "قم بتهيئة بيئتك، واقفل باب التشتت، وانطلق." }
];

export const EVENING_GREETINGS_AR: GreetingConfig[] = [
  { text: "المجرة بانتظار إنجازك القادم.", subtext: "استغل هدوء المساء لخلق تقدم مميز في مشاريعك." },
  { text: "كل دقيقة تركيز تقربك من مدار أعلى.", subtext: "حافظ على زخم يومك واستمر بالتقدم بخطى ثابتة." },
  { text: "ابدأ جلسة جديدة واكسر حدود التشتت.", subtext: "التدفق الذهني الكامل هو رفيقك لتجاوز العقبات." },
  { text: "مستويات تركيزك في أوج نشاطها.", subtext: "تحدَّ نفسك اليوم لتصل لعمق تركيز لم تبلغه من قبل." },
  { text: "انقطع عن صخب العالم الخارجي.", subtext: "استمتع بالرحلة المدارية الهادئة داخل محطة التركيز." }
];

export const NIGHT_GREETINGS_AR: GreetingConfig[] = [
  { text: "هدوء الفضاء اللانهائي يحيط بك.", subtext: "أفضل الأفكار تولد في سكون الليل، ركّز بعمق." },
  { text: "أبحر في مدارات التركيز الهادئ.", subtext: "بينما ينام العالم، تصنع أنت نجاحك القادم بصمت." },
  { text: "سكون الليل هو وقود الإبداع.", subtext: "اختر مهمة واحدة، وركز كل مصابيح ذهنك عليها." },
  { text: "سفينة تركيزك تعبر العواصف بسلام.", subtext: "تقدمٌ هادئ ومستمر، خطوة بخطوة نحو نجومك." },
  { text: "الملاحة الليلية بدأت الآن.", subtext: "جلسة تركيز أخيرة تصنع فارقاً حقيقياً في إنجاز الغد." }
];

export const GENERAL_GREETINGS_AR: GreetingConfig[] = [
  { text: "أهلاً بك في فضاء الإنجاز.", subtext: "حافظ على انتظام تنفسك وادخل في حالة التدفق." },
  { text: "لا حدود لما يمكنك إتمامه هنا.", subtext: "اترك المشتتات في الأسفل، وحلّق بذهنك بحرية." },
  { text: "مستعد للصعود لمدار التركيز الأقصى؟", subtext: "كل دقيقة تقضيها بوعي كامل هي نصر شخصي لك." },
  { text: "إتقان الحاضر هو بوابة عبور المستقبل.", subtext: "اجعل هدفك اليوم التركيز الكامل والعميق بلا تشتت." },
  { text: "خطوتك التالية هي الأهم.", subtext: "صفِ ذهنك تماماً، واستمتع بصوت السكون والإنجاز." }
];

// Group greetings in English
export const MORNING_GREETINGS_EN: GreetingConfig[] = [
  { text: "The sun of your new orbit has risen.", subtext: "Start your day with a deep focus session to anchor your productivity." },
  { text: "Ready for a new focus voyage?", subtext: "A new orbital sunrise brings endless possibilities for daily progress." },
  { text: "Your mental cockpit is ready for liftoff.", subtext: "Direct the wave of your morning energy stream toward your major quest." },
  { text: "Your morning orbit initiates.", subtext: "One deliberate, highly deep action now frames an exceptional day." },
  { text: "Morning flavored with cosmic execution.", subtext: "Set up your workspace, disconnect surrounding noise, and elevate." }
];

export const EVENING_GREETINGS_EN: GreetingConfig[] = [
  { text: "The universe awaits your next milestone.", subtext: "Utilize the evening silence to forge outstanding momentum in your projects." },
  { text: "Every focused minute elevates your level.", subtext: "Keep your daily energetic loop active, advancing with elegant steps." },
  { text: "Engage another session and shatter distractions.", subtext: "A state of pure flow is your companion to transition past obstacles." },
  { text: "Your cognitive resources are in high-definition.", subtext: "Challenge yourself to reach deep attention levels never observed before." },
  { text: "Isolate seamlessly from the external noise.", subtext: "Enjoy a silent orbital cruise inside your personalized focus chamber." }
];

export const NIGHT_GREETINGS_EN: GreetingConfig[] = [
  { text: "The quiet of infinite cosmos surrounds you.", subtext: "The absolute brightest ideas crystallize in nightly tranquility. Breathe and focus." },
  { text: "Navigate through silent orbits of concentration.", subtext: "While the world sleeps, you quietly organize and manifest tomorrow's success." },
  { text: "Cosmic night hours act as creative fuel.", subtext: "Choose one single task, and highlight all cognitive lasers directly on it." },
  { text: "Your station is cruising smoothly.", subtext: "Consolidated, block-by-block study sessions take you closer to the stars." },
  { text: "Night navigation protocol is active.", subtext: "One last active turn makes a magnificent difference for tomorrow." }
];

export const GENERAL_GREETINGS_EN: GreetingConfig[] = [
  { text: "Welcome aboard the space of execution.", subtext: "Regulate your pacing, settle down, and enter a state of high flow." },
  { text: "There are no limits to your orbit.", subtext: "Leave chaotic noise behind, and let your absolute focus soar freely." },
  { text: "Ready to ascend to maximum focus?", subtext: "Every single minute spent with high clarity is an absolute victory." },
  { text: "Mastering the present is the key to the future.", subtext: "Make complete, uninterrupted attention your core scientific goal today." },
  { text: "Your next orbital block is the most precious.", subtext: "Clear your thoughts, and appreciate the sound of progress and silence." }
];

/**
 * Returns a stable dynamic greeting based on the current hour of the day.
 * Includes fallback logic to avoid any initial client/server rendering mismatch.
 */
export function getGreetingForTime(hour?: number, lang: "ar" | "en" = "ar"): GreetingConfig {
  const activeHour = hour !== undefined ? hour : new Date().getHours();
  
  let candidates: GreetingConfig[];
  
  if (lang === "ar") {
    if (activeHour >= 5 && activeHour < 12) {
      candidates = MORNING_GREETINGS_AR;
    } else if (activeHour >= 12 && activeHour < 18) {
      candidates = EVENING_GREETINGS_AR;
    } else if (activeHour >= 18 || activeHour < 5) {
      candidates = NIGHT_GREETINGS_AR;
    } else {
      candidates = GENERAL_GREETINGS_AR;
    }
  } else {
    if (activeHour >= 5 && activeHour < 12) {
      candidates = MORNING_GREETINGS_EN;
    } else if (activeHour >= 12 && activeHour < 18) {
      candidates = EVENING_GREETINGS_EN;
    } else if (activeHour >= 18 || activeHour < 5) {
      candidates = NIGHT_GREETINGS_EN;
    } else {
      candidates = GENERAL_GREETINGS_EN;
    }
  }

  // Pick a stable index depending on the minutes to keep it relatively stable yet refreshing
  const minutes = new Date().getMinutes();
  const index = minutes % candidates.length;
  return candidates[index] || (lang === "ar" ? GENERAL_GREETINGS_AR[0] : GENERAL_GREETINGS_EN[0]);
}
