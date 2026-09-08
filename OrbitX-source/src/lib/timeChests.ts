import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { requestXpGrant } from "./xpSystem";
import type { UserData } from "../shared";

export interface ChestConfig {
  delayMs: number;
  xp: number;
  icon: string;
}

export const CHEST_CONFIG: ChestConfig[] = [
  { delayMs: 5 * 60 * 1000, xp: 5, icon: "📦" },
  { delayMs: 15 * 60 * 1000, xp: 15, icon: "📦" },
  { delayMs: 30 * 60 * 1000, xp: 30, icon: "🎁" },
  { delayMs: 60 * 60 * 1000, xp: 60, icon: "🎁" },
  { delayMs: 120 * 60 * 1000, xp: 120, icon: "💎" },
];

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getStoredCycleStart(): number {
  try {
    return Number(localStorage.getItem("chest_cycle_start")) || 0;
  } catch {
    return 0;
  }
}

function getStoredClaimed(): number[] {
  try {
    return JSON.parse(localStorage.getItem("chest_claimed") || "[]");
  } catch {
    return [];
  }
}

function getStoredDate(): string {
  try {
    return localStorage.getItem("chest_last_date") || "";
  } catch {
    return "";
  }
}

function saveCycle(start: number, claimed: number[], date: string) {
  try {
    localStorage.setItem("chest_cycle_start", String(start));
    localStorage.setItem("chest_claimed", JSON.stringify(claimed));
    localStorage.setItem("chest_last_date", date);
  } catch {}
}

export type ChestStatus = "locked" | "ready" | "claimed";

export interface ChestState {
  cycleStart: number;
  statuses: ChestStatus[];
  timeUntilNext: number;
  allClaimed: boolean;
}

export function getChestState(user?: UserData | null): ChestState {
  const today = todayDate();
  const storedDate = getStoredDate();

  let cycleStart = getStoredCycleStart();
  let claimed = getStoredClaimed();

  if (storedDate !== today || !cycleStart) {
    cycleStart = Date.now();
    claimed = [];
    saveCycle(cycleStart, claimed, today);

    if (user?.uid && !user.isGuest) {
      updateDoc(doc(db, "users", user.uid), {
        timeChests: { cycleStart, claimedChests: [], lastCycleDate: today },
      }).catch(() => {});
    }
  } else {
    claimed = getStoredClaimed();
  }

  const elapsed = Date.now() - cycleStart;
  const statuses: ChestStatus[] = CHEST_CONFIG.map((chest, i) => {
    if (claimed.includes(i)) return "claimed";
    if (elapsed >= chest.delayMs) return "ready";
    return "locked";
  });

  const firstLockedIdx = statuses.findIndex((s) => s === "locked");
  const timeUntilNext =
    firstLockedIdx >= 0
      ? Math.max(0, CHEST_CONFIG[firstLockedIdx].delayMs - elapsed)
      : 0;

  const allClaimed = statuses.every((s) => s === "claimed");

  return { cycleStart, statuses, timeUntilNext, allClaimed };
}

export async function claimChest(
  chestIndex: number,
  user: UserData,
): Promise<number> {
  const state = getChestState(user);
  if (state.statuses[chestIndex] !== "ready") return 0;

  const chest = CHEST_CONFIG[chestIndex];
  const claimed = getStoredClaimed();
  if (claimed.includes(chestIndex)) return 0;

  const granted = await requestXpGrant(
    user.uid,
    user.fleetId || undefined,
    null,
    false,
    chest.xp,
    "time_chest",
    true,
  );

  // Only mark the chest as claimed once the server actually granted the XP.
  // Otherwise a denied grant (e.g. no user row yet) would lock it forever.
  if (granted > 0) {
    claimed.push(chestIndex);
    saveCycle(state.cycleStart, claimed, todayDate());

    updateDoc(doc(db, "users", user.uid), {
      timeChests: {
        cycleStart: state.cycleStart,
        claimedChests: claimed,
        lastCycleDate: todayDate(),
      },
    }).catch(() => {});
  }

  return granted;
}
