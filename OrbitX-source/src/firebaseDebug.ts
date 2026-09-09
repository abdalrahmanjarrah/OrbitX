// Real-time Observability, Diagnostics and Fault-Tolerance Engineering Engine
// Provides high-fidelity trace analysis, database latent monitoring, clock skews, and listener stethoscopes.
// Press Alt+Shift+D or click the small debug beacon at the bottom right to toggle the panel in dev mode.

import React, { useRef, useEffect } from "react";

export interface DiagnosticTrace {
  id: string;
  timestamp: string;
  category: "state" | "io" | "latency" | "xp" | "security" | "error" | "lifecycle" | "reconnect";
  severity: "info" | "success" | "warning" | "error" | "critical";
  message: string;
  details?: any;
}

const traceBuffer: DiagnosticTrace[] = [];
const maxTracesCount = 200;

const listenerTracker: Record<string, { count: number; createdAt: number; lastModified: number; dupesDetected: number }> = {};
const duplicateCheckTimeouts: Record<string, any> = {};
let latencyHistory: { duration: number; timestamp: number; success: boolean; operation: string }[] = [];
let listenerLatencyHistory: { duration: number; timestamp: number; operation: string }[] = [];
let writeLatencyHistory: { duration: number; timestamp: number; operation: string }[] = [];
let websocketReconnectHistory: { duration: number; timestamp: number; operation: string }[] = [];
let failedRequestHistory: { duration: number; timestamp: number; operation: string }[] = [];
let averageLatency = 0;
let latencySpikesCount = 0;
const clockSkewValue = { offset: 0, checkedAt: 0 };
let tabOpenCount = 1;
const tabInstanceId = Math.random().toString(36).substring(2, 10);
let multiTabConflictDetected = false;

// Diagnostics watcher is only active in development or when explicitly enabled,
// so production builds carry zero background monitoring overhead.
const diagnosticsEnabled =
  import.meta.env.DEV || import.meta.env.VITE_DEBUG_DIAGNOSTICS === "1";

let isAuthorizedUser = false;
let isInitialized = false;
let diagnosticChannel: BroadcastChannel | null = null;

export function authorizeDebugger(isAuthorized: boolean) {
  if (!diagnosticsEnabled) return;
  isAuthorizedUser = diagnosticsEnabled && isAuthorized;
  if (isAuthorizedUser) {
    initializeDiagnostics();
  }

  if (typeof document !== "undefined") {
    const beacon = document.querySelector(".diag-toggle-beacon") as HTMLElement | null;
    const panel = document.querySelector(".diag-hud-overlay") as HTMLElement | null;
    if (beacon) {
      beacon.style.display = isAuthorized ? "flex" : "none";
    }
    if (panel) {
      if (!isAuthorized) {
        panel.classList.remove("is-open");
      }
      panel.style.display = isAuthorized ? "flex" : "none";
    }
  }
}

// 1. React Render Diagnostics structure
const renderTracker: Record<string, { count: number; lastRender: number; history: string[] }> = {};

// 2. Firestore Operation Counters (Usage Monitor)
const dbCounters = {
  getDoc: 0,
  getDocs: 0,
  addDoc: 0,
  updateDoc: 0,
  deleteDoc: 0,
  setDoc: 0,
  runTransaction: 0,
  onSnapshot: 0,
  estimatedReads: 0,
  estimatedWrites: 0
};

// 3. XP Transaction Logs
interface XPTransactionLog {
  timestamp: number;
  amount: number;
  source: string;
  status: "success" | "blocked" | "cooldown";
  details?: string;
}
const xpHistory: XPTransactionLog[] = [];

// 4. Global Intercepted Interval tracker
const trackedIntervals = new Map<any, { name: string; timeout: number; createdAt: number }>();
let activeWorkerCount = 0;
let maxDriftDetected = 0;
const driftHistory: { timestamp: number; driftMs: number; deltaMs: number }[] = [];

// Intercept window.setInterval and window.clearInterval
function initializeDiagnostics() {
  if (!diagnosticsEnabled) return;
  if (typeof window === "undefined" || isInitialized) return;
  isInitialized = true;

  const originalSetInterval = window.setInterval;
  const originalClearInterval = window.clearInterval;

  window.setInterval = function (handler: TimerHandler, timeout?: number, ...arguments_: any[]) {
    const stack = new Error().stack || "";
    let name = "anonymous";
    const stackLines = stack.split("\n");
    if (stackLines[2]) {
      const match = stackLines[2].match(/at\s+([^\s]+)/);
      if (match && match[1]) name = match[1];
    }
    const timerId = originalSetInterval(handler, timeout, ...arguments_);
    trackedIntervals.set(timerId, { name, timeout: timeout || 0, createdAt: Date.now() });
    
    // Broadcast of intervals to HUD trace
    pushTrace({
      category: "state",
      severity: "info",
      message: `⏱️ setInterval registered: ${name} (ID: ${timerId}, delay: ${timeout}ms)`
    });

    return timerId;
  } as any;

  window.clearInterval = function (id: any) {
    if (trackedIntervals.has(id)) {
      const info = trackedIntervals.get(id);
      trackedIntervals.delete(id);
      pushTrace({
        category: "state",
        severity: "info",
        message: `⏱️ clearInterval executed: ${info?.name} (ID: ${id})`
      });
    }
    originalClearInterval(id);
  };

  // Intercept window.Worker globally
  const originalWorker = window.Worker;
  window.Worker = function (stringUrl: string | URL, options?: WorkerOptions) {
    const w = new originalWorker(stringUrl, options);
    activeWorkerCount++;
    pushTrace({
      category: "state",
      severity: "info",
      message: `⚙️ Web Worker created: ${String(stringUrl).substring(0, 50)}`,
    });

    let prevTick = Date.now();
    w.addEventListener("message", (event) => {
      if (event.data === "tick") {
        const now = Date.now();
        const delta = now - prevTick;
        prevTick = now;
        const drift = Math.abs(delta - 1000);
        if (drift > maxDriftDetected) {
          maxDriftDetected = drift;
        }
        driftHistory.unshift({ timestamp: Date.now(), driftMs: drift, deltaMs: delta });
        if (driftHistory.length > 30) driftHistory.pop();
        if (drift > 150) {
          Debugger.logDrift(drift, delta);
        }
      }
    });

    const originalTerminate = w.terminate;
    w.terminate = function () {
      if (activeWorkerCount > 0) activeWorkerCount--;
      pushTrace({
        category: "state",
        severity: "info",
        message: `⚙️ Web Worker terminated`,
      });
      originalTerminate.call(w);
    };

    return w;
  } as any;

  // BroadcastChannel to check multi-tab conflicts safely and gracefully
  if ("BroadcastChannel" in window) {
    diagnosticChannel = new BroadcastChannel("astro_realtime_diagnostic_net");
    diagnosticChannel.onmessage = (event) => {
      if (event.data?.type === "ping_tabs") {
        tabOpenCount++;
        diagnosticChannel?.postMessage({ type: "pong_tabs", senderId: tabInstanceId });
        Debugger.logSuspicious(`Multi-tab conflict warning! Other tab pinged us. Total tabs: ${tabOpenCount}`);
        multiTabConflictDetected = true;
        triggerUIRefresh();
      } else if (event.data?.type === "pong_tabs" && event.data?.senderId !== tabInstanceId) {
        tabOpenCount++;
        multiTabConflictDetected = true;
        triggerUIRefresh();
      }
    };

    // Initial tab discovery check
    setTimeout(() => {
      diagnosticChannel?.postMessage({ type: "ping_tabs", senderId: tabInstanceId });
    }, 1000);
  }

  // Global window event watchers
  window.addEventListener("online", () => {
    Debugger.logLifecycle("internet_reconnect", "✅ Network recovered. Restoring connection.");
    if (lastOfflineTime > 0) {
      const reconnectDuration = Date.now() - lastOfflineTime;
      Debugger.logLatency("websocket_reconnect", performance.now() - reconnectDuration, true);
      lastOfflineTime = 0;
    }
  });
  window.addEventListener("offline", () => {
    lastOfflineTime = Date.now();
    Debugger.logLifecycle("internet_disconnect", "❌ Network offline. Queuing local mutations.");
  });

  // Hotkey binding and visual layout creation
  createVisualDiagnosticsPanel();
}

let lastOfflineTime = 0;

function pushTrace(trace: Omit<DiagnosticTrace, "id" | "timestamp">) {
  if (!diagnosticsEnabled) return;
  if (!isAuthorizedUser) return;
  const completeTrace: DiagnosticTrace = {
    ...trace,
    id: Math.random().toString(36).substring(3, 9),
    timestamp: new Date().toLocaleTimeString(),
  };
  traceBuffer.push(completeTrace);
  if (traceBuffer.length > maxTracesCount) {
    traceBuffer.shift();
  }
  triggerUIRefresh();
}

function triggerUIRefresh() {
  if (!diagnosticsEnabled) return;
  if (!isAuthorizedUser) return;
  if (typeof window !== "undefined" && (window as any).__onDiagnosticUpdate) {
    try {
      (window as any).__onDiagnosticUpdate();
    } catch {}
  }
}

export function shouldAllowNewListener(path: string): boolean {
  const existing = listenerTracker[path];
  if (existing && existing.count >= 1) {
    existing.dupesDetected++;
    pushTrace({
      category: "io",
      severity: "warning",
      message: `🔴 Duplicate listener BLOCKED: ${path} (already has ${existing.count} instance)`
    });
    return false;
  }
  return true;
}

export const Debugger = {
  shouldAllowNewListener: (path: string): boolean => {
    return shouldAllowNewListener(path);
  },
  // Renders tracking
  trackRender: (componentName: string, reason?: string) => {
    if (!diagnosticsEnabled) return;
    if (!isAuthorizedUser) return;
    if (!renderTracker[componentName]) {
      renderTracker[componentName] = { count: 0, lastRender: Date.now(), history: [] };
    }
    renderTracker[componentName].count++;
    renderTracker[componentName].lastRender = Date.now();
    if (reason) {
      renderTracker[componentName].history.unshift(reason);
      if (renderTracker[componentName].history.length > 3) renderTracker[componentName].history.pop();
    }
    triggerUIRefresh();
  },

  // Firestore DB Usage Monitor
  trackGetDoc: (path: string) => {
    if (!diagnosticsEnabled) return;
    dbCounters.getDoc++;
    dbCounters.estimatedReads++;
    pushTrace({ category: "io", severity: "info", message: `getDoc call: ${path}` });
  },
  trackGetDocs: (path: string) => {
    if (!diagnosticsEnabled) return;
    dbCounters.getDocs++;
    dbCounters.estimatedReads += 5; // projected bulk size estimate
    pushTrace({ category: "io", severity: "info", message: `getDocs call: ${path}` });
  },
  trackAddDoc: (path: string) => {
    if (!diagnosticsEnabled) return;
    dbCounters.addDoc++;
    dbCounters.estimatedWrites++;
    pushTrace({ category: "io", severity: "info", message: `addDoc call: ${path}` });
  },
  trackUpdateDoc: (path: string) => {
    if (!diagnosticsEnabled) return;
    dbCounters.updateDoc++;
    dbCounters.estimatedWrites++;
    pushTrace({ category: "io", severity: "info", message: `updateDoc call: ${path}` });
  },
  trackDeleteDoc: (path: string) => {
    if (!diagnosticsEnabled) return;
    dbCounters.deleteDoc++;
    dbCounters.estimatedWrites++;
    pushTrace({ category: "io", severity: "info", message: `deleteDoc call: ${path}` });
  },
  trackSetDoc: (path: string) => {
    if (!diagnosticsEnabled) return;
    dbCounters.setDoc++;
    dbCounters.estimatedWrites++;
    pushTrace({ category: "io", severity: "info", message: `setDoc call: ${path}` });
  },
  trackTransaction: (origin: string) => {
    if (!diagnosticsEnabled) return;
    dbCounters.runTransaction++;
    dbCounters.estimatedReads++;
    dbCounters.estimatedWrites++;
    pushTrace({ category: "io", severity: "info", message: `runTransaction: ${origin}` });
  },
  trackOnSnapshotTrigger: (path: string, numDocs: number = 1) => {
    if (!diagnosticsEnabled) return;
    dbCounters.onSnapshot++;
    dbCounters.estimatedReads += numDocs;
    triggerUIRefresh();
  },

  // XP systems telemetry
  logInterval: (name: string, id: any) => {
    if (!diagnosticsEnabled) return;
    // Legacy support
    pushTrace({
      category: "state",
      severity: "info",
      message: `Interval active: ${name}`,
      details: { intervalId: String(id) }
    });
  },

  logClearInterval: (name: string, id: any) => {
    if (!diagnosticsEnabled) return;
    // Legacy support
    pushTrace({
      category: "state",
      severity: "info",
      message: `Interval cleared: ${name}`,
      details: { intervalId: String(id) }
    });
  },

  logXP: (amount: number, reason: string, oldXp?: number, newXp?: number) => {
    if (!diagnosticsEnabled) return;
    xpHistory.unshift({
      timestamp: Date.now(),
      amount,
      source: reason,
      status: "success",
      details: `Prev: ${oldXp} -> Current: ${newXp}`
    });
    if (xpHistory.length > 30) xpHistory.pop();

    pushTrace({
      category: "xp",
      severity: amount >= 0 ? "success" : "warning",
      message: `XP Granted: ${amount > 0 ? "+" : ""}${amount} XP (${reason})`,
      details: { amount, reason, oldXp, newXp }
    });
  },

  logXPBlocked: (amount: number, reason: string, details?: string) => {
    if (!diagnosticsEnabled) return;
    xpHistory.unshift({
      timestamp: Date.now(),
      amount,
      source: reason,
      status: "blocked",
      details
    });
    if (xpHistory.length > 30) xpHistory.pop();

    pushTrace({
      category: "xp",
      severity: "warning",
      message: `XP Grant Blocked! ${amount} XP (${reason})`,
      details
    });
  },

  logDrift: (driftMs: number, deltaMs: number) => {
    if (!diagnosticsEnabled) return;
    pushTrace({
      category: "state",
      severity: driftMs > 300 ? "warning" : "info",
      message: `⏱️ Significant timer drift: +${Math.round(driftMs)}ms (interval latency ${deltaMs}ms)`,
      details: { driftMs, deltaMs }
    });
  },

  logWrite: (collectionName: string, docId: string, action: string) => {
    if (!diagnosticsEnabled) return;
    pushTrace({
      category: "io",
      severity: "info",
      message: `Firestore Write: [${collectionName}/${docId}] - ${action}`,
      details: { collectionName, docId, action }
    });
  },

  logCleanupError: (message: string) => {
    if (!diagnosticsEnabled) return;
    pushTrace({
      category: "lifecycle",
      severity: "critical",
      message: `Cleanup failure: ${message}`
    });
  },

  logSuspicious: (message: string) => {
    if (!diagnosticsEnabled) return;
    pushTrace({
      category: "security",
      severity: "warning",
      message: `Security anomaly: ${message}`,
    });
  },

  logLatency: (operation: string, startMs: number, successPlan: boolean, errorSnippet?: string) => {
    if (!diagnosticsEnabled) return;
    const elapsed = performance.now() - startMs;
    
    // Ensure quota-exhausted fallback mode does not continue inflating RTT metrics
    const isQuotaExceeded = typeof window !== "undefined" && !!(window as any).__firestoreQuotaExceeded;
    if (isQuotaExceeded) {
      return;
    }

    const isSpike = elapsed > 2000;
    if (isSpike && successPlan) {
      latencySpikesCount++;
    }

    const now = Date.now();
    let categoryType: "listener" | "write" | "websocket" | "unknown" = "unknown";
    const opLower = operation.toLowerCase();
    
    if (opLower.startsWith("snapshot_load") || opLower.startsWith("safeonsnapshot")) {
      categoryType = "listener";
    } else if (
      opLower.startsWith("updatedoc") ||
      opLower.startsWith("adddoc") ||
      opLower.startsWith("deletedoc") ||
      opLower.startsWith("setdoc") ||
      opLower.startsWith("runtransaction") ||
      opLower.startsWith("updateroom") ||
      opLower.startsWith("challenge_completion_tx") ||
      opLower.includes("write")
    ) {
      categoryType = "write";
    } else if (
      opLower.includes("reconnect") ||
      opLower.includes("websocket") ||
      opLower.includes("socket") ||
      opLower.includes("network_reconnect")
    ) {
      categoryType = "websocket";
    }

    if (!successPlan) {
      failedRequestHistory.push({ duration: elapsed, timestamp: now, operation });
      if (failedRequestHistory.length > 50) failedRequestHistory.shift();
    } else {
      if (categoryType === "listener") {
        listenerLatencyHistory.push({ duration: elapsed, timestamp: now, operation });
        if (listenerLatencyHistory.length > 50) listenerLatencyHistory.shift();
      } else if (categoryType === "write") {
        writeLatencyHistory.push({ duration: elapsed, timestamp: now, operation });
        if (writeLatencyHistory.length > 50) writeLatencyHistory.shift();
      } else if (categoryType === "websocket") {
        websocketReconnectHistory.push({ duration: elapsed, timestamp: now, operation });
        if (websocketReconnectHistory.length > 50) websocketReconnectHistory.shift();
      }

      latencyHistory.push({
        duration: elapsed,
        timestamp: now,
        success: true,
        operation
      });
      if (latencyHistory.length > 50) {
        latencyHistory.shift();
      }
    }

    // rolling-window logic: ignore stale requests older than 10 seconds
    const recentSuccess = latencyHistory.filter(x => x.success && (now - x.timestamp) < 10000);
    if (recentSuccess.length > 0) {
      averageLatency = Math.round(recentSuccess.reduce((acc, curr) => acc + curr.duration, 0) / recentSuccess.length);
    } else {
      // Fallback to absolute last successful request to prevent sudden drop to 0 when idle
      const allSuccess = latencyHistory.filter(x => x.success);
      if (allSuccess.length > 0) {
        averageLatency = Math.round(allSuccess[allSuccess.length - 1].duration);
      } else {
        averageLatency = 0;
      }
    }

    pushTrace({
      category: "latency",
      severity: isSpike ? "warning" : (successPlan ? "info" : "error"),
      message: `API latency [${operation}]: ${Math.round(elapsed)}ms`,
      details: { elapsed, successPlan, errorSnippet }
    });
  },

  logError: (origin: string, error: any) => {
    if (!diagnosticsEnabled) return;
    const message = error instanceof Error ? error.message : String(error);
    pushTrace({
      category: "error",
      severity: "error",
      message: `Failure [${origin}]: ${message}`,
    });
  },

  logLifecycle: (event: string, msg: string) => {
    if (!diagnosticsEnabled) return;
    pushTrace({
      category: "lifecycle",
      severity: "info",
      message: msg,
      details: { event }
    });
  },

  getConnectionState: () => {
    if (!diagnosticsEnabled) return "Healthy";
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    if (!isOnline) return "Offline";

    const isQuotaExceeded = typeof window !== "undefined" && !!(window as any).__firestoreQuotaExceeded;
    if (isQuotaExceeded) return "Offline";

    const now = Date.now();
    const recentSuccess = latencyHistory.filter(x => x.success && (now - x.timestamp) < 10000);
    const recentFailed = failedRequestHistory.filter(x => (now - x.timestamp) < 10000);

    if (recentFailed.length > 0) {
      return "Degraded";
    }

    let avg = 0;
    if (recentSuccess.length > 0) {
      avg = recentSuccess.reduce((acc, curr) => acc + curr.duration, 0) / recentSuccess.length;
    } else if (latencyHistory.length > 0) {
      avg = latencyHistory[latencyHistory.length - 1].duration;
    }

    if (avg === 0) {
      return "Healthy";
    }

    if (avg < 300) {
      return "Healthy";
    } else if (avg < 1000) {
      return "Slow";
    } else {
      return "Degraded";
    }
  },

  // Stethoscope functions to trace stream leakage
  trackListenerStart: (path: string) => {
    const now = Date.now();
    if (!listenerTracker[path]) {
      listenerTracker[path] = { count: 0, createdAt: now, lastModified: now, dupesDetected: 0 };
    }
    listenerTracker[path].count++;
    listenerTracker[path].lastModified = now;

    if (listenerTracker[path].count > 1) {
      // Clear any pending duplicate check timeout
      if (duplicateCheckTimeouts[path]) {
        clearTimeout(duplicateCheckTimeouts[path]);
      }
      // Debounce the duplicate warning check by 500ms to allow React StrictMode/Concurrent Mode cleanup of old snapshot mounts
      duplicateCheckTimeouts[path] = setTimeout(() => {
        if (listenerTracker[path] && listenerTracker[path].count > 1) {
          listenerTracker[path].dupesDetected++;
          pushTrace({
            category: "state",
            severity: "warning",
            message: `⚠️ DUPLICATED snap listener detected! Path: ${path}`,
          });
        }
      }, 500);
    } else {
      pushTrace({
        category: "state",
        severity: "info",
        message: `🔑 Snapshot listener open: ${path}`,
      });
    }
  },

  trackListenerStop: (path: string) => {
    if (listenerTracker[path] && listenerTracker[path].count > 0) {
      listenerTracker[path].count--;
      listenerTracker[path].lastModified = Date.now();
      
      // If the count fell back to a safe level, cancel any duplicate check timeouts
      if (listenerTracker[path].count <= 1) {
        if (duplicateCheckTimeouts[path]) {
          clearTimeout(duplicateCheckTimeouts[path]);
          delete duplicateCheckTimeouts[path];
        }
      }

      pushTrace({
        category: "state",
        severity: "info",
        message: `🔒 Disposed snapshot listener: ${path}`,
      });
    }
  },

  setClockSkew: (skewMs: number) => {
    clockSkewValue.offset = skewMs;
    clockSkewValue.checkedAt = Date.now();
    pushTrace({
      category: "state",
      severity: Math.abs(skewMs) > 5000 ? "warning" : "success",
      message: `Server clock offset calculated: ${skewMs}ms`,
    });
  },

  getClockOffset: () => {
    return clockSkewValue.offset;
  },

  getDiagnosticsMetrics: () => {
    if (!diagnosticsEnabled) return { tabInstanceId, averageLatencyMs: 0, connectionState: "Healthy" };
    const activeListeners = Object.entries(listenerTracker)
      .filter(([_, data]) => data.count > 0)
      .map(([path, data]) => ({ path, count: data.count, age: Math.round((Date.now() - data.createdAt) / 1000) }));

    const leakedListeners = Object.entries(listenerTracker)
      .filter(([path, data]) => data.count > 0 && (Date.now() - data.lastModified) > 600000) // 10 minutes inactive
      .map(([path, data]) => ({ path, count: data.count }));

    // Helper to get rolling averages
    const getRollingAverage = (history: { duration: number; timestamp: number }[]) => {
      const now = Date.now();
      const recent = history.filter(x => (now - x.timestamp) < 10000);
      if (recent.length > 0) {
        return Math.round(recent.reduce((acc, curr) => acc + curr.duration, 0) / recent.length);
      }
      if (history.length > 0) {
        return Math.round(history[history.length - 1].duration);
      }
      return 0;
    };

    return {
      tabInstanceId,
      tabOpenCount,
      multiTabConflictDetected,
      clockSkewMs: clockSkewValue.offset,
      averageLatencyMs: averageLatency,
      listenerLatencyMs: getRollingAverage(listenerLatencyHistory),
      writeLatencyMs: getRollingAverage(writeLatencyHistory),
      websocketReconnectMs: getRollingAverage(websocketReconnectHistory),
      failedRequestMs: getRollingAverage(failedRequestHistory),
      connectionState: Debugger.getConnectionState(),
      latencySpikesCount,
      activeListenersCount: activeListeners.reduce((a, b) => a + b.count, 0),
      activeListeners,
      leakedListeners,
      recentTraces: [...traceBuffer].reverse(),
      renderTracker,
      dbCounters,
      xpHistory,
      maxDriftDetected,
      driftHistory,
      activeWorkerCount,
      trackedIntervals: Array.from(trackedIntervals.values())
    };
  }
};

// React render logging hook
export function useRenderLog(componentName: string, props: any = {}) {
  if (!diagnosticsEnabled) return;
  const renderCountRef = useRef(0);
  const prevPropsRef = useRef<any>(props);
  renderCountRef.current++;

  const changedProps: string[] = [];
  Object.keys(props).forEach((key) => {
    if (props[key] !== prevPropsRef.current[key]) {
      changedProps.push(`${key} changed`);
    }
  });

  useEffect(() => {
    prevPropsRef.current = props;
  });

  const reason = changedProps.length > 0 ? changedProps.join(", ") : "State / parent change";
  Debugger.trackRender(componentName, reason);
}

// Global hook registration
if (typeof window !== "undefined") {
  (window as any).__realtimeDiagnostics = Debugger;
  if (isAuthorizedUser) {
    initializeDiagnostics();
  }
}

function createVisualDiagnosticsPanel() {
  if (!diagnosticsEnabled) return;
  if (typeof document === "undefined") return;

  const styleId = "astro-diagnostic-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      .diag-hud-overlay {
        position: fixed;
        right: -480px;
        top: 0;
        width: 480px;
        height: 100vh;
        z-index: 100000;
        background: #06070d;
        border-left: 1px solid #141829;
        color: #d1d5db;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        box-shadow: -10px 0 35px rgba(0, 0, 0, 0.7);
        transition: right 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        flex-direction: column;
        direction: ltr;
        text-align: left;
      }
      .diag-hud-overlay.is-open {
        right: 0;
      }
      .diag-hud-header {
        padding: 14px 18px;
        background: #090b14;
        border-bottom: 1px solid #141829;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .diag-hud-tabs {
        display: flex;
        background: #0b0e1a;
        border-bottom: 1px solid #141829;
      }
      .diag-hud-tab-btn {
        flex: 1;
        background: none;
        border: none;
        color: #6b7280;
        padding: 10px 6px;
        cursor: pointer;
        font-family: inherit;
        font-size: 9.5px;
        font-weight: bold;
        text-align: center;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        text-transform: uppercase;
      }
      .diag-hud-tab-btn:hover {
        color: #9ca3af;
      }
      .diag-hud-tab-btn.is-active {
        color: #818cf8;
        border-bottom-color: #818cf8;
        background: rgba(129, 140, 248, 0.04);
      }
      .diag-hud-tab-content {
        display: none;
        padding: 16px;
        flex: 1;
        overflow-y: auto;
      }
      .diag-hud-tab-content.is-active {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .diag-metric-card {
        background: #0a0d17;
        border: 1px solid #141a30;
        border-radius: 6px;
        padding: 12px;
      }
      .diag-metric-group {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 16px;
      }
      .diag-metric-title {
        color: #6366f1;
        font-size: 9px;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 8px;
        letter-spacing: 0.5px;
        border-bottom: 1px solid rgba(99, 102, 241, 0.15);
        padding-bottom: 2px;
      }
      .diag-stat-label {
        color: #9cb3c9;
      }
      .diag-stat-val {
        font-weight: bold;
        color: #f3f4f6;
      }
      .diag-warning-tag {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #ef4444;
        border-radius: 4px;
        padding: 8px 12px;
        font-size: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .diag-trace-row {
        padding: 6px 8px;
        border-radius: 4px;
        margin-bottom: 4px;
        line-height: 1.4;
        font-size: 10px;
      }
      .diag-trace-row-info { background: rgba(59, 130, 246, 0.05); color: #93c5fd; }
      .diag-trace-row-success { background: rgba(16, 185, 129, 0.05); color: #6ee7b7; }
      .diag-trace-row-warning { background: rgba(245, 158, 11, 0.06); color: #fde047; }
      .diag-trace-row-error { background: rgba(239, 68, 68, 0.06); color: #fca5a5; }
      .diag-trace-row-critical { background: rgba(220, 38, 38, 0.15); color: #f87171; border-left: 2px solid #ef4444; }
      
      .diag-toggle-beacon {
        position: fixed;
        bottom: 12px;
        right: 12px;
        width: 16px;
        height: 16px;
        background: rgba(99, 102, 241, 0.15);
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 50%;
        cursor: pointer;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.25s ease;
      }
      .diag-toggle-beacon:hover {
        background: rgba(99, 102, 241, 0.5);
        transform: scale(1.15);
      }
      .diag-toggle-beacon-pulse {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #818cf8;
      }
      .diag-toggle-beacon.has-issue {
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.6);
      }
      .diag-toggle-beacon.has-issue .diag-toggle-beacon-pulse {
        background: #f87171;
        animation: diag-pulse 0.8s infinite alternate;
      }
      @keyframes diag-pulse {
        from { transform: scale(0.75); opacity: 0.5; }
        to { transform: scale(1.3); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // Create Beacon Button
  const beacon = document.createElement("div");
  beacon.className = "diag-toggle-beacon";
  beacon.title = "Astro DEV Diagnostics Console (Alt+Shift+D)";
  const pulse = document.createElement("div");
  pulse.className = "diag-toggle-beacon-pulse";
  beacon.appendChild(pulse);
  document.body.appendChild(beacon);

  // Create Main Panel
  const panel = document.createElement("div");
  panel.className = "diag-hud-overlay";
  panel.innerHTML = `
    <div class="diag-hud-header">
      <div style="font-weight: bold; color: #818cf8; font-size: 11.5px; display: flex; align-items: center; gap: 8px;">
        <span>🛸 METRIC OBSERVABILITY HUD</span>
      </div>
      <button id="diag-close-btn" style="background:none; border:none; color: #6b7280; cursor: pointer; font-size: 18px; hover:color:white;">&times;</button>
    </div>
    
    <!-- Collapsible Tabs Navigation -->
    <div class="diag-hud-tabs">
      <button class="diag-hud-tab-btn is-active" data-tab="summary">General</button>
      <button class="diag-hud-tab-btn" data-tab="firestore">Firestore</button>
      <button class="diag-hud-tab-btn" data-tab="renders">Renders</button>
      <button class="diag-hud-tab-btn" data-tab="ops">XP & Timers</button>
    </div>

    <!-- TAB 1: SUMMARY -->
    <div id="tab-summary" class="diag-hud-tab-content is-active">
      <div class="diag-warning-tag" id="tab-summary-status-conflict" style="display:none;">
        ⚠️ MULTI-TAB DRIFT WARNING: Multiple tab locks exist! Closing secondary tabs is recommended.
      </div>
      <div class="diag-metric-card">
        <div class="diag-metric-title">Diagnostic Metrics</div>
        <div class="diag-metric-group">
          <div><span class="diag-stat-label">Instance ID:</span> <span class="diag-stat-val" style="color: #6366f1;" id="field-instance-id">-</span></div>
          <div><span class="diag-stat-label">Multi-tab Active:</span> <span class="diag-stat-val" id="field-multi-tab" style="color:#10b981;">No</span></div>
          <div><span class="diag-stat-label">Network RTT:</span> <span class="diag-stat-val" id="field-rtt">-</span></div>
          <div><span class="diag-stat-label">Conn State:</span> <span class="diag-stat-val" id="field-conn-state">-</span></div>
          <div><span class="diag-stat-label">System Skew:</span> <span class="diag-stat-val" id="field-skew">-</span></div>
          <div><span class="diag-stat-label">Active Listeners:</span> <span class="diag-stat-val" id="field-readers">-</span></div>
          <div><span class="diag-stat-label">Active Worker:</span> <span class="diag-stat-val" id="field-workers">-</span></div>
        </div>
      </div>

      <div class="diag-metric-card">
        <div class="diag-metric-title">Segmented Latencies (10s rolling)</div>
        <div class="diag-metric-group">
          <div><span class="diag-stat-label">Listener RTT:</span> <span class="diag-stat-val" id="field-listener-rtt">-</span></div>
          <div><span class="diag-stat-label">Write RTT:</span> <span class="diag-stat-val" id="field-write-rtt">-</span></div>
          <div><span class="diag-stat-label">WS Reconnect:</span> <span class="diag-stat-val" id="field-ws-reconnect">-</span></div>
          <div><span class="diag-stat-label">Failed Duration:</span> <span class="diag-stat-val" id="field-failed-dur">-</span></div>
        </div>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
        <span class="diag-metric-title" style="margin: 0; border: none; padding: 0;">Stream Debug Trace</span>
        <button id="diag-clear-logs" style="background: none; border: none; font-size: 9px; color: #6366f1; cursor: pointer; text-decoration: underline;">Clear</button>
      </div>
      <div id="diag-stream-pane" style="overflow-y: auto; flex: 1; border: 1px solid #141829; border-radius: 4px; padding: 8px; background: #030408; height: 220px;">
        Trace engine initialized. Waiting...
      </div>
    </div>

    <!-- TAB 2: FIRESTORE -->
    <div id="tab-firestore" class="diag-hud-tab-content">
      <div class="diag-metric-card">
        <div class="diag-metric-title">Projected API Volume Estimator</div>
        <div class="diag-metric-group">
          <div><span class="diag-stat-label">Est. Reads:</span> <span class="diag-stat-val" style="color: #6ee7b7;" id="f-reads">0</span></div>
          <div><span class="diag-stat-label">Est. Writes:</span> <span class="diag-stat-val" style="color: #fb7185;" id="f-writes">0</span></div>
          <div><span class="diag-stat-label">getDoc calls:</span> <span class="diag-stat-val" id="f-getDoc">0</span></div>
          <div><span class="diag-stat-label">getDocs calls:</span> <span class="diag-stat-val" id="f-getDocs">0</span></div>
          <div><span class="diag-stat-label">updateDoc:</span> <span class="diag-stat-val" id="f-updateDoc">0</span></div>
          <div><span class="diag-stat-label">addDoc:</span> <span class="diag-stat-val" id="f-addDoc">0</span></div>
          <div><span class="diag-stat-label">setDoc:</span> <span class="diag-stat-val" id="f-setDoc">0</span></div>
          <div><span class="diag-stat-label">deleteDoc:</span> <span class="diag-stat-val" id="f-deleteDoc">0</span></div>
          <div><span class="diag-stat-label">Transactions:</span> <span class="diag-stat-val" style="color:#c084fc;" id="f-transactions">0</span></div>
          <div><span class="diag-stat-label">onSnapshot refs:</span> <span class="diag-stat-val" style="color:#fbbf24;" id="f-snaps">0</span></div>
        </div>
      </div>

      <div class="diag-metric-card">
        <div class="diag-metric-title">Snapshot Stethoscope Observers</div>
        <div id="diag-fs-listeners" style="display: flex; flex-direction: column; gap: 8px; font-size: 10px; color: #9ca3af; max-height: 250px; overflow-y: auto;">
          No listeners active currently.
        </div>
      </div>
    </div>

    <!-- TAB 3: RENDERS -->
    <div id="tab-renders" class="diag-hud-tab-content">
      <div class="diag-metric-card" style="flex: 1; display:flex; flex-direction:column;">
        <div class="diag-metric-title">Component Lifecycle Rendering Frequency</div>
        <div style="flex:1; overflow-y:auto; max-height: 400px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="border-bottom: 1px solid #141829; text-align: left; color:#818cf8;">
                <th style="padding: 6px 4px;">Component</th>
                <th style="padding: 6px 4px;">Renders</th>
                <th style="padding: 6px 4px;">Last Reason</th>
              </tr>
            </thead>
            <tbody id="diag-render-table-body">
              <tr><td colspan="3" style="padding:10px; text-align:center; color:#4b5563;">No component logs recorded.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 4: XP & TIMERS -->
    <div id="tab-ops" class="diag-hud-tab-content">
      <div class="diag-metric-card">
        <div class="diag-metric-title">Time Engine & Drift Analyzer</div>
        <div class="diag-metric-group">
          <div><span class="diag-stat-label">Active Worker:</span> <span class="diag-stat-val" id="clk-worker">0</span></div>
          <div><span class="diag-stat-label">Max Drift Spike:</span> <span class="diag-stat-val" style="color:#fb7185;" id="clk-drift">0ms</span></div>
          <div><span class="diag-stat-label">Intervals Active:</span> <span class="diag-stat-val" style="color:#fde047;" id="clk-intervals">0</span></div>
        </div>
      </div>

      <div class="diag-metric-card">
        <div class="diag-metric-title">Active Global Intervals</div>
        <div id="diag-intervals-list" style="max-height: 120px; overflow-y:auto; font-size:9.5px; color:#9ca3af; display:flex; flex-direction:column; gap:4px;">
          No active global interval registrations.
        </div>
      </div>

      <div class="diag-metric-card" style="flex:1; display:flex; flex-direction:column;">
        <div class="diag-metric-title">XP Transaction Verification Loop</div>
        <div id="diag-xp-history" style="overflow-y:auto; flex:1; max-height: 200px; display:flex; flex-direction:column; gap:4px;">
          Waiting for transaction allocations...
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // Tab Switching logic
  const tabs = panel.querySelectorAll(".diag-hud-tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("is-active"));
      panel.querySelectorAll(".diag-hud-tab-content").forEach(c => c.classList.remove("is-active"));
      
      tab.classList.add("is-active");
      const tabId = tab.getAttribute("data-tab");
      const content = panel.querySelector(`#tab-${tabId}`);
      if (content) content.classList.add("is-active");
      
      renderDiagnostics();
    });
  });

  // Toggle Panel
  const togglePanel = () => {
    panel.classList.toggle("is-open");
    renderDiagnostics();
  };

  beacon.addEventListener("click", togglePanel);
  document.getElementById("diag-close-btn")?.addEventListener("click", togglePanel);
  document.getElementById("diag-clear-logs")?.addEventListener("click", () => {
    traceBuffer.length = 0;
    renderDiagnostics();
  });

  // Hotkey binding Alt+Shift+D
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && e.key.toUpperCase() === "D") {
      e.preventDefault();
      togglePanel();
    }
  });

  // Connection point for window telemetry
  (window as any).__onDiagnosticUpdate = () => {
    if (panel.classList.contains("is-open") || multiTabConflictDetected) {
      renderDiagnostics();
    }
    if (multiTabConflictDetected || latencySpikesCount > 0) {
      beacon.classList.add("has-issue");
    } else {
      beacon.classList.remove("has-issue");
    }
  };

  function renderDiagnostics() {
    const data = Debugger.getDiagnosticsMetrics();

    // 1. UPDATE TAB 1: SUMMARY
    const inst = document.getElementById("field-instance-id");
    if (inst) inst.textContent = data.tabInstanceId;

    const rtt = document.getElementById("field-rtt");
    if (rtt) {
      rtt.textContent = `${data.averageLatencyMs}ms${data.latencySpikesCount > 0 ? ` (Spikes: ${data.latencySpikesCount})` : ''}`;
      rtt.style.color = data.averageLatencyMs > 2000 ? "#ef4444" : "#10b981";
    }

    const connState = document.getElementById("field-conn-state");
    if (connState) {
      connState.textContent = data.connectionState;
      if (data.connectionState === "Healthy") {
        connState.style.color = "#10b981";
      } else if (data.connectionState === "Slow") {
        connState.style.color = "#fbbf24";
      } else {
        connState.style.color = "#ef4444";
      }
    }

    const skew = document.getElementById("field-skew");
    if (skew) {
      skew.textContent = `${data.clockSkewMs}ms`;
      skew.style.color = Math.abs(data.clockSkewMs) > 5000 ? "#fbbf24" : "#38bdf8";
    }

    const readF = document.getElementById("field-readers");
    if (readF) readF.textContent = String(data.activeListenersCount);

    const mt = document.getElementById("field-multi-tab");
    if (mt) {
      mt.textContent = data.tabOpenCount > 1 ? `Open (${data.tabOpenCount} tabs)` : 'No';
      mt.style.color = data.tabOpenCount > 1 ? "#ef4444" : "#10b981";
    }

    const cw = document.getElementById("field-workers");
    if (cw) cw.textContent = String(data.activeWorkerCount);

    const conflictBanner = document.getElementById("tab-summary-status-conflict");
    if (conflictBanner) {
      conflictBanner.style.display = data.multiTabConflictDetected ? "block" : "none";
    }

    // Segmented latencies bindings
    const listenerRtt = document.getElementById("field-listener-rtt");
    if (listenerRtt) listenerRtt.textContent = data.listenerLatencyMs > 0 ? `${data.listenerLatencyMs}ms` : "N/A";

    const writeRtt = document.getElementById("field-write-rtt");
    if (writeRtt) writeRtt.textContent = data.writeLatencyMs > 0 ? `${data.writeLatencyMs}ms` : "N/A";

    const wsReconnect = document.getElementById("field-ws-reconnect");
    if (wsReconnect) wsReconnect.textContent = data.websocketReconnectMs > 0 ? `${data.websocketReconnectMs}ms` : "N/A";

    const failedDur = document.getElementById("field-failed-dur");
    if (failedDur) failedDur.textContent = data.failedRequestMs > 0 ? `${data.failedRequestMs}ms` : "N/A";

    // Trace block rendering
    const streamContainer = document.getElementById("diag-stream-pane");
    if (streamContainer) {
      if (data.recentTraces.length === 0) {
        streamContainer.textContent = "Listening for diagnostic broadcast events...";
      } else {
        streamContainer.innerHTML = data.recentTraces.map(t => `
          <div class="diag-trace-row diag-trace-row-${t.severity}">
            <span style="opacity: 0.6; font-size: 8px; float: right;">${t.timestamp}</span>
            <span style="font-weight: bold;">[${t.category.toUpperCase()}]</span> ${t.message}
          </div>
        `).join("");
      }
    }

    // 2. UPDATE TAB 2: FIRESTORE Estimator
    const dReads = document.getElementById("f-reads");
    if (dReads) dReads.textContent = String(data.dbCounters.estimatedReads);

    const dWrites = document.getElementById("f-writes");
    if (dWrites) dWrites.textContent = String(data.dbCounters.estimatedWrites);

    const getD = document.getElementById("f-getDoc");
    if (getD) getD.textContent = String(data.dbCounters.getDoc);

    const getDs = document.getElementById("f-getDocs");
    if (getDs) getDs.textContent = String(data.dbCounters.getDocs);

    const updD = document.getElementById("f-updateDoc");
    if (updD) updD.textContent = String(data.dbCounters.updateDoc);

    const addD = document.getElementById("f-addDoc");
    if (addD) addD.textContent = String(data.dbCounters.addDoc);

    const setD = document.getElementById("f-setDoc");
    if (setD) setD.textContent = String(data.dbCounters.setDoc);

    const delD = document.getElementById("f-deleteDoc");
    if (delD) delD.textContent = String(data.dbCounters.deleteDoc);

    const txnD = document.getElementById("f-transactions");
    if (txnD) txnD.textContent = String(data.dbCounters.runTransaction);

    const snapD = document.getElementById("f-snaps");
    if (snapD) snapD.textContent = String(data.dbCounters.onSnapshot);

    const listenersContainer = document.getElementById("diag-fs-listeners");
    if (listenersContainer) {
      if (data.activeListeners.length === 0) {
        listenersContainer.textContent = "No listeners active currently.";
      } else {
        listenersContainer.innerHTML = data.activeListeners.map(l => {
          const isDupe = l.count > 1;
          return `
            <div style="display: flex; justify-content: space-between; padding: 4px 6px; background: ${isDupe ? 'rgba(239, 68, 68, 0.08)' : '#0d101d'}; border: 1px solid ${isDupe ? 'rgba(239,68,68,0.2)' : 'transparent'}; border-radius: 4px;">
              <span style="color: ${isDupe ? '#f87171' : '#e2e8f0'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320px;" title="${l.path}">${l.path}</span>
              <span style="font-weight: bold; color: ${isDupe ? '#ef4444' : '#818cf8'};">${l.count} inst (${l.age}s)</span>
            </div>
          `;
        }).join("");
      }
    }

    // 3. UPDATE TAB 3: RENDERS Table
    const renderTable = document.getElementById("diag-render-table-body");
    if (renderTable) {
      const renderEntries = Object.entries(data.renderTracker);
      if (renderEntries.length === 0) {
        renderTable.innerHTML = `<tr><td colspan="3" style="padding:10px; text-align:center; color:#4b5563;">No component logs recorded.</td></tr>`;
      } else {
        renderTable.innerHTML = renderEntries.map(([comp, val]) => {
          const elapsedSecs = Math.round((Date.now() - val.lastRender) / 1000);
          return `
            <tr style="border-bottom: 1px solid #141829; hover:bg-white/5;">
              <td style="padding: 6px 4px; font-weight: bold; color: #fff;">${comp}</td>
              <td style="padding: 6px 4px; color: #10b981;">${val.count} <span style="font-size:8px; opacity:0.65;">(${elapsedSecs}s ago)</span></td>
              <td style="padding: 6px 4px; color: #9ca3af; max-width: 200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${val.history[0] || '-'}">${val.history[0] || "-"}</td>
            </tr>
          `;
        }).join("");
      }
    }

    // 4. UPDATE TAB 4: XP & TIMERS
    const clkWrk = document.getElementById("clk-worker");
    if (clkWrk) clkWrk.textContent = String(data.activeWorkerCount);

    const clkDrift = document.getElementById("clk-drift");
    if (clkDrift) {
      clkDrift.textContent = `${Math.round(data.maxDriftDetected)}ms`;
      clkDrift.style.color = data.maxDriftDetected > 300 ? "#ef4444" : "#10b981";
    }

    const clkIntervals = document.getElementById("clk-intervals");
    if (clkIntervals) clkIntervals.textContent = String(data.trackedIntervals.length);

    const intList = document.getElementById("diag-intervals-list");
    if (intList) {
      if (data.trackedIntervals.length === 0) {
        intList.textContent = "No active global registrations.";
      } else {
        intList.innerHTML = data.trackedIntervals.map(i => `
          <div style="display: flex; justify-content: space-between; padding: 2px 4px; background:#0d101d; border-radius:3px;">
            <span style="overflow:hidden; text-overflow:ellipsis; max-width:320px;">${i.name}</span>
            <span style="color:#fde047;">${i.timeout}ms</span>
          </div>
        `).join("");
      }
    }

    const xpH = document.getElementById("diag-xp-history");
    if (xpH) {
      if (data.xpHistory.length === 0) {
        xpH.innerHTML = `<div style="padding:10px; text-align:center; color:#4b5563;">Waiting for transactions...</div>`;
      } else {
        xpH.innerHTML = data.xpHistory.map(h => {
          let color = "#10b981"; // success
          if (h.status === "blocked") color = "#fde047";
          if (h.status === "cooldown") color = "#6b7280";
          return `
            <div style="font-size:9px; padding: 4px 6px; background: #0d101d; border-radius: 4px; border-left: 2px solid ${color};">
              <span style="opacity: 0.6; float:right;">${new Date(h.timestamp).toLocaleTimeString()}</span>
              <span style="font-weight:bold; color:${color};">[${h.status.toUpperCase()}]</span> 
              <span style="color: #fff;">${h.amount > 0 ? '+' : ''}${h.amount} XP</span> (${h.source})
              ${h.details ? `<div style="opacity:0.75; font-size:8px; margin-top:2px;">${h.details}</div>` : ''}
            </div>
          `;
        }).join("");
      }
    }
  }
}
