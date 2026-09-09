import { getRecentSession } from "./sessionRecorder";

// errorQueue.ts — فلتر الأخطاء المركزي (نظام التجميع والفرز)
//
// الفكرة: بدل أن يكسر أي خطأ الموقع أو يختفي بصمت، كل خطأ يدخل "الفلتر".
// الفلتر يجمّعهم كلهم بكتالوج واحد (in-memory + localStorage)، يلخّص المتكرر،
// ويفرزهم حسب الخطورة والكمية — فتصير المشاكل "متجمعات" مرتبة، والأدمن
// يكتشفها ويحلّها بسهولة من لوحة الإدارة دون أن تتأثر واجهة المستخدم.
//
// مبادئ الصرامة:
//  - لا يكسر التطبيق أبداً (كل внутренние الأخطاء مقبوضة).
//  - لا يُغرق — يدمج الأخطاء المتشابهة ويعدّ العدّاد.
//  - يعمل حتى بدون إنترنت (يعتمد localStorage كنسخة احتياطية).

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface QueuedError {
  id: string;
  source: string;
  message: string;
  stack?: string | null;
  severity: ErrorSeverity;
  count: number;
  firstAt: number;
  lastAt: number;
  url?: string | null;
  context?: Record<string, unknown> | null;
  dismissed?: boolean;
}

export interface ErrorQueueSnapshot {
  errors: QueuedError[];
  totalCount: number;
  bySeverity: Record<ErrorSeverity, number>;
  bySource: Record<string, number>;
}

const STORAGE_KEY = "orbitx_error_queue_v1";
const FLUSHED_KEY = "orbitx_error_queue_flushed_v1";
const NOTIFY_KEY = "orbitx_error_notify_v1";
const MAX_QUEUED = 200;

// مستويات الخطورة تُستنتج من المصدر/النوع تلقائياً
const SEVERITY_HINTS: Array<{ re: RegExp; severity: ErrorSeverity }> = [
  { re: /quota|permission|forbidden|not-allow|denied/i, severity: "critical" },
  { re: /network|offline|fetch|timeout|abort|ECONN/i, severity: "high" },
  { re: /react-boundary|boundary|render|hydration/i, severity: "high" },
  { re: /onSnapshot|listener|subscription|firestore/i, severity: "medium" },
  { re: /warn|debug|analytics|cosmetic|ui/i, severity: "low" },
];

export function inferSeverity(source: string, message: string): ErrorSeverity {
  const haystack = `${source} ${message}`;
  for (const hint of SEVERITY_HINTS) {
    if (hint.re.test(haystack)) return hint.severity;
  }
  return "medium";
}

// --- الذاكرة المؤقتة ---
let queue: QueuedError[] = [];
let listeners = new Set<() => void>();
let flushedIds = new Set<string>();

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(0, MAX_QUEUED)));
  } catch {
    /* تجاهل — لا نكسر بسبب التخزين */
  }
}

function loadFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) queue = JSON.parse(raw) as QueuedError[];
  } catch {
    queue = [];
  }
}

function loadFlushedIds(): void {
  try {
    const raw = localStorage.getItem(FLUSHED_KEY);
    if (raw) flushedIds = new Set(JSON.parse(raw) as string[]);
  } catch {
    flushedIds = new Set();
  }
}

function saveFlushedIds(): void {
  try {
    localStorage.setItem(FLUSHED_KEY, JSON.stringify([...flushedIds].slice(-2000)));
  } catch {
    /* تجاهل */
  }
}

function notify(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* تجاهل */
    }
  });
}

// --- الواجهة العامة ---

/** يضع الخطأ في الفلتر. لا يرمي أبداً ولا يكسر الموقع. */
export function enqueueError(
  source: string,
  error: any,
  context?: Record<string, unknown> | null,
): QueuedError | null {
  try {
    const message =
      error instanceof Error
        ? error.message || String(error)
        : typeof error === "string"
          ? error
          : (() => {
              try {
                return JSON.stringify(error);
              } catch {
                return String(error);
              }
            })();
    if (!message) return null;

    const key = `${source}::${message}`;
    const existing = queue.find((q) => `${q.source}::${q.message}` === key);
    const now = Date.now();

    if (existing) {
      existing.count++;
      existing.lastAt = now;
      existing.dismissed = false;
      persist();
      notify();
      return existing;
    }

    const entry: QueuedError = {
      id: `err_${now}_${Math.random().toString(36).slice(2, 8)}`,
      source,
      message,
      stack: error instanceof Error ? error.stack : null,
      severity: inferSeverity(source, message),
      count: 1,
      firstAt: now,
      lastAt: now,
      url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : null,
      context: {
        ...(context || {}),
        // "الكاميرا الواحدة": كل خطأ تروح معه آخر خطوات المستخدم، فنقدر
        // نرجع للخطوة بخطوة حتى لو ما كسر الكود.
        session: getRecentSession(40),
      },
    };

    queue.unshift(entry);
    if (queue.length > MAX_QUEUED) queue = queue.slice(0, MAX_QUEUED);
    persist();
    notify();
    maybeNotify(entry);
    scheduleFlush();
    return entry;
  } catch {
    return null;
  }
}

/** يدمج خطأً من التقاط window.error / unhandledrejection في الفلتر. */
export function captureGlobalError(error: any, source = "global"): void {
  enqueueError(source, error);
}

/** يعيد كل الأخطاء مفروزة (الأخطر أولاً ثم الأكثر تكراراً ثم الأحدث). */
export function getSortedErrors(): QueuedError[] {
  const order: Record<ErrorSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...queue].sort((a, b) => {
    if (a.dismissed !== b.dismissed) return a.dismissed ? 1 : -1;
    const s = order[a.severity] - order[b.severity];
    if (s !== 0) return s;
    const c = b.count - a.count;
    if (c !== 0) return c;
    return b.lastAt - a.lastAt;
  });
}

/** لقطة ملخّصة (عدّادات لكل مستوى/مصدر) تعرض في لوحة الأدمن. */
export function getQueueSnapshot(): ErrorQueueSnapshot {
  const errors = getSortedErrors();
  const bySeverity: Record<ErrorSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const bySource: Record<string, number> = {};
  let totalCount = 0;
  for (const e of errors) {
    bySeverity[e.severity]++;
    bySource[e.source] = (bySource[e.source] || 0) + e.count;
    totalCount += e.count;
  }
  return { errors, totalCount, bySeverity, bySource };
}

/** يخفي خطأً من العرض (لا يمسحه) ليتمكن الأدمن من التركيز على الباقي. */
export function dismissError(id: string): void {
  const e = queue.find((q) => q.id === id);
  if (e) {
    e.dismissed = true;
    persist();
    notify();
  }
}

/** يمسح كل الأخطاء من الفلتر. */
export function clearQueue(): void {
  queue = [];
  persist();
  notify();
}

/** يعدّ للاستماع لأي تغيير في الفلتر (لتحديث الواجهة لحظياً). */
export function subscribeToErrorQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ── الإشعارات الفورية ─────────────────────────────────────────────
// إذا فعّل المستخدم إشعارات النظام، أي خطأ حرج/عالٍ جديد بينبّه لحظياً.

export function areErrorNotificationsEnabled(): boolean {
  try {
    return localStorage.getItem(NOTIFY_KEY) === "1";
  } catch {
    return false;
  }
}

export function setErrorNotificationsEnabled(on: boolean): boolean {
  try {
    if (on && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    localStorage.setItem(NOTIFY_KEY, on ? "1" : "0");
    return true;
  } catch {
    return false;
  }
}

function maybeNotify(entry: QueuedError): void {
  try {
    if (entry.severity !== "critical" && entry.severity !== "high") return;
    if (!areErrorNotificationsEnabled()) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    const n = new Notification(`[${entry.severity}] ${entry.source}`, {
      body: entry.message.slice(0, 160),
      tag: `orbitx-${entry.id}`,
    });
    n.onclick = () => {
      try {
        window.focus();
        n.close();
      } catch {
        /* تجاهل */
      }
    };
  } catch {
    /* لا نكسر أبداً عند تعطل الإشعار */
  }
}

/** ينزّل تقرير الأخطاء الحالي كملف JSON على الجهاز. */
export function downloadQueue(): void {
  try {
    const snapshot = getQueueSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orbitx-errors-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    /* تجاهل */
  }
}

// ── التنسيب للسيرفر (الملف اللي يراجعه مساعد الكود كل جلسة) ──────
let flushing = false;

/** يرسل الأخطاء غير المسبوقة لـ /api/errors/ingest بلا تكرار. */
export async function flushToServer(): Promise<void> {
  try {
    if (flushing) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    flushing = true;
    loadFlushedIds();
    const pending = getSortedErrors().filter((e) => e && !e.dismissed && !flushedIds.has(e.id));
    if (pending.length === 0) return;
    const res = await fetch(`${location.origin}/api/errors/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ errors: pending }),
    });
    if (res.ok) {
      pending.forEach((e) => flushedIds.add(e.id));
      saveFlushedIds();
    }
  } catch {
    /* السيرفر مو شغّال أو لا إنترنت — نكمل بعدين */
  } finally {
    flushing = false;
  }
}

function scheduleFlush(): void {
  if (typeof window === "undefined") return;
  window.clearTimeout((window as any).__orbitxFlushTimer);
  (window as any).__orbitxFlushTimer = window.setTimeout(() => {
    void flushToServer().catch(() => {});
  }, 5000);
}

// تهيئة عند الاستيراد
if (typeof window !== "undefined") {
  loadFromStorage();
  loadFlushedIds();

  // مجدول: كل 30 ثانية نرسل أي أخطاء جديدة للسيرفر
  setInterval(() => void flushToServer().catch(() => {}), 30_000);

  // عند إغلاق التبويب — beacon يضمن وصول الأخطاء ولو ما لحق الإرسال
  window.addEventListener("pagehide", () => {
    try {
      const pending = getSortedErrors().filter((e) => e && !e.dismissed);
      if (pending.length === 0) return;
      navigator.sendBeacon(
        `${location.origin}/api/errors/ingest`,
        new Blob([JSON.stringify({ errors: pending })], { type: "application/json" }),
      );
    } catch {
      /* تجاهل */
    }
  });
}

// رابط تصحيح للاستخدام اليدوي من الكونسول
if (typeof window !== "undefined") {
  (window as any).__errorQueue = {
    enqueue: enqueueError,
    snapshot: getQueueSnapshot,
    clear: clearQueue,
    dismiss: dismissError,
  };
}