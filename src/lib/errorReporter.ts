// errorReporter.ts — نظام كشف الأخطاء التلقائي (كاميرا الأمان للتطبيق)
//
// يلتقط أي خطأ يقع عند أي مستخدم (أخطاء React، أخطاء الواجهة العامة،
// رفض الوعود) ويخزّنه في قاعدة البيانات بمجموعة `errors` ليراجعه الأدمن
// من لوحة الإدارة دون الحاجة إلى انتظار شكوى من المستخدم.
//
// احتياطات الأمان:
//  - لا يكسر التطبيق أبداً (كل الأخطاء الداخلية مقبوضة).
//  - يلخّص الأخطاء المتكررة (لا يغرق القاعدة بنفس الخطأ مئات المرات).
//  - لا يعمل في وضع التطوير إلا عند طلب صريح (?errlog=1).

import {
  db,
  addDoc,
  collection,
  updateDoc,
  doc,
  increment,
} from "../supabaseAdapter";
import { authClient } from "../supabaseAuth";

const ERRORS_COLLECTION = "errors";

// مفتاح داخل الجلسة: source + message => معرف آخر مستند سُجّل له
const recentReports = new Map<string, { docId: string; lastAt: number }>();
const DEDUPE_WINDOW_MS = 10 * 60 * 1000; // 10 دقائق

// معدل إرسال: حدّ أسبوعي للجلسة + حدّ زمني
const RATE_LIMIT_PER_MINUTE = 8;
let perMinuteCounter: { at: number; count: number } = { at: Date.now(), count: 0 };
let sessionTotal = 0;
const SESSION_MAX = 80;

let currentUser: { uid?: string; name?: string; email?: string } = {};
let captureInstalled = false;

function isDevEnabled(): boolean {
  if (import.meta.env.DEV) {
    return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("errlog");
  }
  return true;
}

function shouldSend(): boolean {
  const now = Date.now();
  if (now - perMinuteCounter.at > 60_000) {
    perMinuteCounter = { at: now, count: 0 };
  }
  if (perMinuteCounter.count >= RATE_LIMIT_PER_MINUTE) return false;
  if (sessionTotal >= SESSION_MAX) return false;
  perMinuteCounter.count++;
  sessionTotal++;
  return true;
}

function normalizeError(error: any): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message || String(error), stack: error.stack };
  }
  if (typeof error === "string") return { message: error };
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

/**
 * يسجّل خطأ في قاعدة البيانات. آمن للاستدعاء من أي مكان.
 */
export async function reportError(
  source: string,
  error: any,
  context?: Record<string, unknown>,
): Promise<void> {
  try {
    if (!isDevEnabled()) return;
    const { message, stack } = normalizeError(error);
    if (!message) return;
    if (!shouldSend()) return;

    const key = `${source}::${message}`;
    const existing = recentReports.get(key);
    const now = Date.now();

    // إذا تكرر نفس الخطأ خلال نافذة قصيرة: زد العدّاد بدل إنشاء مستند جديد.
    if (existing && now - existing.lastAt < DEDUPE_WINDOW_MS) {
      recentReports.set(key, { docId: existing.docId, lastAt: now });
      try {
        await updateDoc(doc(db, ERRORS_COLLECTION, existing.docId), {
          count: increment(1),
          lastAt: now,
        });
      } catch {
        /* تجاهل — لا نكسر التطبيق بسبب سجل الأخطاء */
      }
      return;
    }

    const report = {
      source,
      message,
      stack: stack || null,
      count: 1,
      ts: now,
      createdAt: new Date(now).toISOString(),
      url:
        typeof window !== "undefined"
          ? window.location.href.slice(0, 500)
          : null,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
      uid: currentUser.uid || null,
      userName: currentUser.name || null,
      context: context || null,
    };

    const ref = await addDoc(collection(db, ERRORS_COLLECTION), report);
    recentReports.set(key, { docId: ref.id, lastAt: now });
  } catch {
    /* مهما حدث، لا نرمي أخطاء في وجه التطبيق */
  }
}

/**
 * يثبّت التقاط الأخطاء العامة (window.error + الوعود المرفوضة)
 * ويتتبّع هوية المستخدم الحالية لربط الأخطاء به.
 */
export function installGlobalErrorCapture(): void {
  if (captureInstalled) return;
  captureInstalled = true;

  try {
    authClient.getUser().then(({ data }) => {
      currentUser = {
        uid: data.user?.id,
        name: data.user?.user_metadata?.full_name || data.user?.user_metadata?.name,
        email: data.user?.email,
      };
    });
    authClient.onAuthStateChange((_event, session) => {
      currentUser = {
        uid: session?.user?.id,
        name: session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name,
        email: session?.user?.email,
      };
    });
  } catch {
    /* تجاهل */
  }

  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    const err = event.error || event.message;
    void reportError("window-error", err, { lineno: event.lineno, colno: event.colno, file: event.filename });
  });

  window.addEventListener("unhandledrejection", (event) => {
    void reportError("unhandledrejection", event.reason);
  });

  // واجهة تصحيح: يمكن استدعاء reportError يدوياً من أي مكان
  (window as any).__reportError = reportError;
}

// إعادة تصدير للاستخدام المباشر من لوحة الأدمن في الاختبار اليدوي
export const TEST_ERROR_SOURCE = "manual-test";
