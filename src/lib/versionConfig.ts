export const APP_VERSION = "1.4.0";
export const VERSION_STORAGE_KEY = "orbitx_version_seen";

export const WHATS_NEW_ITEMS = [
  { icon: "📦", text: "صناديق الوقت — افتح مكافآت كل فترة" },
  { icon: "🚀", text: "بطاقة الدعوة — ادعُ أصدقاء واكسب 100 XP" },
  { icon: "👤", text: "بروفايل محسّن — شريط التقدم بالمستوى" },
  { icon: "✨", text: "خط Cairo الجديد للنصوص العربية" },
];

export function shouldShowWhatsNew(): boolean {
  try {
    return localStorage.getItem(VERSION_STORAGE_KEY) !== APP_VERSION;
  } catch {
    return false;
  }
}

export function markWhatsNewSeen(): void {
  try {
    localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);
  } catch {}
}
