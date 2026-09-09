#!/usr/bin/env node
/**
 * OrbitX Automated Audit Script
 * 
 * 1) TypeScript static analysis (tsc --noEmit)
 * 2) Puppeteer: Guest mode — opens site, clicks "guest", audits all reachable pages
 * 3) Puppeteer: Auth mode — creates/injects a test session, audits dashboard pages
 * 
 * Output: audit-report.json
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const REPORT_PATH = resolve(ROOT, "audit-report.json");

// ── Config ──────────────────────────────────────────────────────
// Read .env first so values are available even without shell sourcing
const envFile = resolve(ROOT, ".env");
const envVars = {};
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (m) envVars[m[1]] = m[2].trim();
  }
}
const getEnv = (key, fallback = "") => process.env[key] || envVars[key] || fallback;

const SUPABASE_URL = getEnv("VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY = getEnv("VITE_SUPABASE_ANON_KEY");
const BASE_PATH = getEnv("VITE_BASE_PATH", "/");
const SITE_URL = getEnv("AUDIT_SITE_URL");

// Resolve site URL: prefer env var, fallback to GitHub Pages pattern
function getSiteUrl() {
  if (SITE_URL) return SITE_URL.replace(/\/$/, "");
  // Try to read from .env for the base path
  const envPath = resolve(ROOT, ".env");
  let basePath = BASE_PATH;
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf8");
    const baseMatch = envContent.match(/VITE_BASE_PATH=(.+)/);
    if (baseMatch) basePath = baseMatch[1].trim();
  }
  // If still default "/", use known GitHub Pages base path
  if (basePath === "/") basePath = "/OrbitX../";
  // GitHub Pages — the repo deploys with a base path
  const ghPages = `https://abdalrahmanjarrah.github.io${basePath}`;
  return ghPages.replace(/\/+$/, "");
}

const BASE_URL = getSiteUrl();

// Pages to audit (path segments)
const PUBLIC_PAGES = [""];
const AUTH_PAGES = ["dashboard", "focus", "leaderboard", "badges", "fleets", "challenges", "settings", "profile"];

// ── Helpers ─────────────────────────────────────────────────────
function log(msg) {
  console.log(`\x1b[36m[audit]\x1b[0m ${msg}`);
}

function logWarn(msg) {
  console.log(`\x1b[33m[audit]\x1b[0m ${msg}`);
}

function logError(msg) {
  console.log(`\x1b[31m[audit]\x1b[0m ${msg}`);
}

// ── Phase 1: TypeScript Check ───────────────────────────────────
function runTypeScriptCheck() {
  log("Phase 1: TypeScript static analysis...");
  const results = [];
  try {
    const output = execSync("npx tsc --noEmit 2>&1", {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120000,
      maxBuffer: 5 * 1024 * 1024,
    });
    log("  TypeScript: no errors found");
  } catch (err) {
    const output = err.stdout || err.stderr || "";
    const lines = output.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      // Parse "file(line,col): error TSxxxx: message"
      const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)/);
      if (match) {
        results.push({
          type: "typescript",
          severity: "error",
          file: match[1].replace(ROOT + "/", ""),
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          code: match[4],
          message: match[5],
        });
      } else if (line.includes("error")) {
        results.push({
          type: "typescript",
          severity: "error",
          message: line.trim(),
        });
      }
    }
    log(`  TypeScript: ${results.length} error(s) found`);
  }
  return results;
}

// ── Phase 2 & 3: Puppeteer Live Site Audit ──────────────────────
async function runBrowserAudit(mode, pages, setupFn) {
  const { default: puppeteer } = await import("puppeteer-core");
  
  log(`Phase ${mode === "guest" ? "2" : "3"}: Browser audit (${mode} mode)...`);
  
  const browser = await puppeteer.launch({
    executablePath: "/opt/google/chrome/chrome",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1280,800",
    ],
  });

  const results = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Collect console errors
    // Setup (guest login or auth injection)
    if (setupFn) {
      await setupFn(page);
    }

    // Navigate to each page and collect errors per page
    for (const pagePath of pages) {
      const url = pagePath === "" ? BASE_URL : `${BASE_URL}/${pagePath}`;
      log(`  Visiting: ${url}`);

      // Reset per-page collectors
      const pageConsoleErrors = [];
      const pageErrorsList = [];
      const pageFailedReqs = [];
      const pageBadResp = [];

      const consoleHandler = (msg) => {
        if (msg.type() === "error") {
          pageConsoleErrors.push({ text: msg.text(), location: msg.location() });
        }
      };
      const errorHandler = (err) => {
        pageErrorsList.push({ message: err.message, stack: err.stack?.split("\n").slice(0, 5).join("\n") });
      };
      const failHandler = (req) => {
        pageFailedReqs.push({ url: req.url(), method: req.method(), failure: req.failure()?.errorText || "unknown" });
      };
      const respHandler = (resp) => {
        if (resp.status() >= 400) {
          pageBadResp.push({ url: resp.url(), status: resp.status(), statusText: resp.statusText() });
        }
      };

      page.on("console", consoleHandler);
      page.on("pageerror", errorHandler);
      page.on("requestfailed", failHandler);
      page.on("response", respHandler);

      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
        // Wait a bit for dynamic content
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        results.push({
          type: "navigation",
          severity: "warning",
          page: pagePath,
          url,
          message: err.message?.substring(0, 200),
        });
      }

      page.off("console", consoleHandler);
      page.off("pageerror", errorHandler);
      page.off("requestfailed", failHandler);
      page.off("response", respHandler);

      // Attach results
      for (const e of pageConsoleErrors) {
        results.push({
          type: "console_error",
          severity: "error",
          mode,
          page: pagePath,
          url,
          message: e.text?.substring(0, 500),
          location: e.location,
        });
      }
      for (const e of pageErrorsList) {
        results.push({
          type: "page_error",
          severity: "error",
          mode,
          page: pagePath,
          url,
          message: e.message?.substring(0, 500),
          stack: e.stack,
        });
      }
      for (const e of pageFailedReqs) {
        results.push({
          type: "failed_request",
          severity: "warning",
          mode,
          page: pagePath,
          url: e.url,
          method: e.method,
          failure: e.failure,
        });
      }
      for (const e of pageBadResp) {
        // Skip favicon/manifest 404s
        if (e.url.includes("favicon") || e.url.includes("manifest") || e.url.includes("robots.txt")) continue;
        results.push({
          type: "bad_response",
          severity: e.status >= 500 ? "error" : "warning",
          mode,
          page: pagePath,
          url: e.url,
          status: e.status,
          statusText: e.statusText,
        });
      }

      log(`    → ${pageConsoleErrors.length} console errors, ${pageErrorsList.length} page errors, ${pageFailedReqs.length} failed reqs, ${pageBadResp.length} bad responses`);
    }

  } finally {
    await browser.close();
  }

  log(`  Browser audit (${mode}): ${results.length} issue(s) found`);
  return results;
}

// ── Guest Setup ─────────────────────────────────────────────────
async function setupGuest(page) {
  log("  Setting up guest session...");
  await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3000));

  // Try to find and click "guest" or "زائر" button
  try {
    const clicked = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("button, a, [role='button']")];
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || "";
        if (text.includes("guest") || text.includes("زائر") || text.includes("مشاهد") || text.includes("try as")) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    if (clicked) {
      log("  Guest button clicked, waiting for navigation...");
      await new Promise((r) => setTimeout(r, 5000));
    } else {
      logWarn("  Could not find guest button — continuing without auth");
    }
  } catch (err) {
    logWarn(`  Guest setup failed: ${err.message?.substring(0, 100)}`);
  }
}

// ── Auth Setup ──────────────────────────────────────────────────
async function setupAuth(page) {
  log("  Setting up authenticated session (anonymous)...");
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    logWarn("  Missing Supabase credentials — skipping auth setup");
    return false;
  }

  try {
    // Create anonymous user via Supabase GoTrue API
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ data: { is_anonymous: true } }),
    });
    const data = await resp.json();
    const accessToken = data.access_token || data.session?.access_token;
    
    if (!accessToken) {
      logWarn(`  Anonymous signup failed: ${JSON.stringify(data).substring(0, 200)}`);
      return false;
    }

    log("  Anonymous session obtained, injecting into browser...");

    // Navigate to site first
    await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Inject the session into localStorage in the format Supabase expects
    const sessionPayload = {
      current_session: {
        access_token: accessToken,
        token_type: "bearer",
        expires_in: data.session?.expires_in || 3600,
        expires_at: data.session?.expires_at || Math.floor(Date.now() / 1000) + 3600,
        refresh_token: data.session?.refresh_token || "",
      },
      current_user: data.user || { id: "audit-anon", aud: "authenticated" },
    };

    await page.evaluate(({ supUrl, payload }) => {
      const host = new URL(supUrl).host;
      const key = `sb-${host.replace(/\./g, "-")}-auth-token`;
      localStorage.setItem(key, JSON.stringify(payload));
      window.dispatchEvent(new Event("storage"));
    }, { supUrl: SUPABASE_URL, payload: sessionPayload });

    log("  Auth session injected — reloading page...");
    await page.reload({ waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 3000));
    return true;
  } catch (err) {
    logWarn(`  Auth setup error: ${err.message?.substring(0, 200)}`);
    return false;
  }
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  log("═══════════════════════════════════════════════════");
  log("  OrbitX Automated Audit");
  log(`  Target: ${BASE_URL}`);
  log("═══════════════════════════════════════════════════");

  const report = {
    timestamp: new Date().toISOString(),
    siteUrl: BASE_URL,
    typescript: [],
    guest: [],
    auth: [],
    summary: {},
  };

  // Phase 1
  report.typescript = runTypeScriptCheck();

  // Phase 2: Guest
  report.guest = await runBrowserAudit("guest", PUBLIC_PAGES, setupGuest);

  // Phase 3: Auth — use anonymous sign-in (the app supports it natively)
  let authOk = false;
  let authSessionData = null;
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      log("  Creating anonymous Supabase session...");
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ data: { is_anonymous: true } }),
      });
      const data = await resp.json();
      if (data.access_token || data.session?.access_token) {
        authSessionData = data.session || data;
        authOk = true;
        log("  Anonymous session created OK");
      } else {
        logWarn(`  Anonymous signup failed — ${JSON.stringify(data).substring(0, 200)}`);
      }
    } catch (e) {
      logWarn(`  Supabase auth: API check failed — ${e.message}`);
    }
  } else {
    logWarn("  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — skipping auth audit");
  }

  if (authOk) {
    report.auth = await runBrowserAudit("auth", AUTH_PAGES, setupAuth);
  } else {
    logWarn("Skipping auth audit (Supabase not configured or signup failed)");
  }

  // Deduplicate issues across pages
  function dedup(arr) {
    const seen = new Set();
    return arr.filter((e) => {
      const key = `${e.type}|${e.location?.url || ""}|${e.url || ""}|${e.message?.substring(0, 120)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  report.guest = dedup(report.guest);
  report.auth = dedup(report.auth);

  // Summary
  const tsErrors = report.typescript.filter((e) => e.severity === "error").length;
  const guestErrors = report.guest.filter((e) => e.severity === "error").length;
  const guestWarnings = report.guest.filter((e) => e.severity === "warning").length;
  const authErrors = report.auth.filter((e) => e.severity === "error").length;
  const authWarnings = report.auth.filter((e) => e.severity === "warning").length;

  report.summary = {
    typescript: { errors: tsErrors },
    guest: { errors: guestErrors, warnings: guestWarnings },
    auth: { errors: authErrors, warnings: authWarnings },
    total: {
      errors: tsErrors + guestErrors + authErrors,
      warnings: guestWarnings + authWarnings,
    },
  };

  // Write report
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  log(`\n═══════════════════════════════════════════════════`);
  log(`  Report saved: ${REPORT_PATH}`);
  log(`  TypeScript errors:  ${tsErrors}`);
  log(`  Guest errors:       ${guestErrors} (${guestWarnings} warnings)`);
  log(`  Auth errors:        ${authErrors} (${authWarnings} warnings)`);
  log(`  TOTAL:              ${report.summary.total.errors} errors, ${report.summary.total.warnings} warnings`);
  log(`═══════════════════════════════════════════════════\n`);
}

main().catch((err) => {
  logError(`Fatal: ${err.message}`);
  console.error(err);
  process.exit(1);
});
