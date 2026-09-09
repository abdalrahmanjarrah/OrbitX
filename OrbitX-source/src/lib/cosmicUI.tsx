import React from "react";
import { createRoot, Root } from "react-dom/client";
import { CheckCircle2, AlertTriangle, Info, XCircle, ShieldAlert } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toasts: ToastItem[] = [];
let toastRoot: Root | null = null;
let toastContainer: HTMLDivElement | null = null;
let nextId = 1;

const toastStyles: Record<ToastType, { icon: React.ReactNode; ring: string; glow: string }> = {
  success: {
    icon: <CheckCircle2 size={18} className="text-emerald-400" />,
    ring: "border-emerald-500/30",
    glow: "shadow-[0_0_25px_rgba(52,211,153,0.15)]",
  },
  error: {
    icon: <XCircle size={18} className="text-rose-400" />,
    ring: "border-rose-500/30",
    glow: "shadow-[0_0_25px_rgba(244,63,94,0.15)]",
  },
  warning: {
    icon: <AlertTriangle size={18} className="text-amber-400" />,
    ring: "border-amber-500/30",
    glow: "shadow-[0_0_25px_rgba(251,191,36,0.15)]",
  },
  info: {
    icon: <Info size={18} className="text-indigo-400" />,
    ring: "border-indigo-500/30",
    glow: "shadow-[0_0_25px_rgba(129,140,248,0.15)]",
  },
};

function ensureToastMounted() {
  if (toastRoot && toastContainer) return;
  toastContainer = document.createElement("div");
  toastContainer.className =
    "fixed top-4 left-1/2 -translate-x-1/2 z-[990] flex flex-col items-center gap-2 pointer-events-none w-[calc(100vw-2rem)] max-w-sm";
  document.body.appendChild(toastContainer);
  toastRoot = createRoot(toastContainer);
}

function renderToasts() {
  if (!toastRoot || !toastContainer) return;
  toastRoot.render(
    <React.StrictMode>
      {toasts.map((t) => {
        const s = toastStyles[t.type];
        return (
          <div
            key={t.id}
            className={`w-full pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#101223]/95 backdrop-blur-xl border ${s.ring} ${s.glow} shadow-xl`}
          >
            <span className="shrink-0">{s.icon}</span>
            <p className="text-sm font-bold text-gray-100 leading-snug flex-1 min-w-0">{t.message}</p>
          </div>
        );
      })}
    </React.StrictMode>,
  );
}

export function showToast(message: string, type: ToastType = "info", duration = 3500) {
  if (typeof document === "undefined") return;
  ensureToastMounted();
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  renderToasts();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    renderToasts();
  }, duration);
}

interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export function confirmDialog(message: string, opts: ConfirmOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(false);
    const el = document.createElement("div");
    el.className = "fixed inset-0 z-[980]";
    document.body.appendChild(el);
    const root = createRoot(el);

    const close = (val: boolean) => {
      root.unmount();
      el.remove();
      resolve(val);
    };

    root.render(
      <React.StrictMode>
        <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-space-dark border border-indigo-500/20 shadow-[0_0_60px_rgba(99,102,241,0.2)] p-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-center gap-3 mb-4 relative">
              <span className={`w-10 h-10 rounded-2xl flex items-center justify-center ${opts.danger ? "bg-rose-500/15 text-rose-400" : "bg-indigo-500/15 text-indigo-400"}`}>
                <ShieldAlert size={20} />
              </span>
              <h3 className="text-lg font-black text-white">{opts.title || "تأكيد"}</h3>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed mb-6 relative">{message}</p>
            <div className="flex gap-3 relative">
              <button
                onClick={() => close(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-gray-300 hover:bg-white/10 transition-all"
              >
                {opts.cancelText || "إلغاء"}
              </button>
              <button
                onClick={() => close(true)}
                className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${opts.danger ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"}`}
              >
                {opts.confirmText || "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      </React.StrictMode>,
    );
  });
}
