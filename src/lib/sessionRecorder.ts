// sessionRecorder.ts — "الكاميرا الواحدة"
//
// بدل طبقة لكل خطأ، هاد نظام واحد بيراقب كل شي مرة وحدة:
//  - كل كبسة (حتى لو ما عملت شي — الكاميرا سمعتها)
//  - كل تنقل بالموقع (صفحة/هاش)
//  - رسايل الكونسول المهمة (via consoleCapture في errorReporter)
//  - أي ملاحظة يدوية (يستدعيها الكود بـ recordEvent)
//
// هو "كاميرا تصوّر"، مش "قاضي يحكم" — بيخزّن آخر الأحداث (شريط مسجل)
// وبيقفل اللقطة على كل خطأ يروح للفلتر، فتصير المستخدم/المساعد يرجع الخطوة
// بخطوة. آمن: ما يكسر أبداً، يشتغل حتى بدون إنترنت (localStorage).

export interface SessionEvent {
  at: number;
  kind: "click" | "key" | "nav" | "console" | "note" | string;
  detail: string;
}

const KEY = "orbitx_session_recorder_v1";
const MAX_EVENTS = 120;

let events: SessionEvent[] = [];
let listeners = new Set<() => void>();
let installed = false;

function load(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) events = parsed.slice(-MAX_EVENTS);
    }
  } catch {
    events = [];
  }
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* التخزين ممتلئ أو محجوب — لا نكسر */
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

/** يسجّل حدثاً في الشريط. آمن من أي مكان. */
export function recordEvent(kind: string, detail: string): void {
  try {
    events.push({ at: Date.now(), kind, detail: String(detail).slice(0, 200) });
    if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);
    save();
    notify();
  } catch {
    /* تجاهل */
  }
}

/** يعيد آخر n حدث مسجّل (للعرض أو للتصاقه بالخطأ). */
export function getRecentSession(n = 60): SessionEvent[] {
  return events.slice(-n);
}

export function clearSessionTape(): void {
  events = [];
  save();
  notify();
}

export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function elementLabel(el: Element | null): string {
  if (!el) return "?";
  const text = ((el as HTMLElement).innerText || "").trim().slice(0, 60);
  const label =
    el.getAttribute("aria-label") ||
    el.getAttribute("data-testid") ||
    el.getAttribute("name") ||
    el.getAttribute("placeholder") ||
    el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  return text ? `${label}${id}: "${text}"` : `${label}${id}`;
}

function shouldRecordKey(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  const keys = new Set([
    "Enter", "Escape", "Tab", "Backspace", "Delete",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End",
  ]);
  return keys.has(e.key);
}

/** يثبّت المصادر التلقائية (كبسات، تنقل، حالة) — تُستدعى مرة واحدة. */
export function installSessionRecorder(): void {
  if (typeof window === "undefined" || installed) return;
  installed = true;
  load();

  // مرحلة الالتقاط: نسمع الكبسة حتى لو React ما نفذ شي أو بلعها
  document.addEventListener(
    "click",
    (e) => {
      try {
        const t = e.target as Element | null;
        const btn =
          (t?.closest?.(
            "button, a, [role=button], input[type=submit], select, [onclick]",
          ) as HTMLElement | null) || (t as HTMLElement | null);
        recordEvent("click", btn ? elementLabel(btn) : "document");
      } catch {
        /* تجاهل */
      }
    },
    true,
  );

  window.addEventListener("keydown", (e) => {
    if (!shouldRecordKey(e)) return; // الكتابة العادية مزعجة بالشريط
    try {
      recordEvent("key", `key=${e.key}`);
    } catch {
      /* تجاهل */
    }
  });

  const recordNav = () => {
    try {
      recordEvent(
        "nav",
        location.hash ? `hash=${location.hash.slice(0, 80)}` : location.pathname,
      );
    } catch {
      /* تجاهل */
    }
  };
  window.addEventListener("popstate", recordNav);
  window.addEventListener("hashchange", recordNav);
  recordNav();

  // واجهة تصحيح للاستخدام اليدوي/البرمجي من كل الموقع
  (window as any).__sessionRecorder = {
    recordEvent,
    getRecentSession,
    clear: clearSessionTape,
  };
}