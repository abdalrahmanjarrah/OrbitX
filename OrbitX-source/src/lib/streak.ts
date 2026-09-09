/**
 * Daily habits: consecutive-day streak + once-per-day login reward.
 *
 * Architecture:
 * - computeStreak is pure (see streakCore.ts).
 * - applyDailyStreak is idempotent: it only writes to the DB when a new
 *   calendar day is detected, so re-mounting the home tab never causes
 *   extra writes (important for our Firestore quota headroom).
 * - The reward is granted through requestXpGrant -> grant_xp RPC, so it is
 *   capped (≤120) and anti-cheat safe. Guests may claim it too, but do not
 *   get a public profile.
 */
import { db, updateDoc } from "../firebase";
import { doc } from "firebase/firestore";
import { requestXpGrant } from "./xpSystem";
import { todayDateString, computeStreak } from "./streakCore";

export { todayDateString } from "./streakCore";

export const DAILY_REWARD_XP = 15;

export interface DailyStreakResult {
  streak: number;
  isNewDay: boolean;
  rewardDue: boolean;
}

export interface StreakUser {
  uid: string;
  streak?: number;
  lastActiveDate?: string;
  lastDailyReward?: string;
  fleetId?: string;
  isGuest?: boolean;
}

export async function applyDailyStreak(
  user: StreakUser,
): Promise<DailyStreakResult> {
  const today = todayDateString();
  const last = user.lastActiveDate || "";
  const currentStreak = user.streak || 0;
  const streak = computeStreak(last, currentStreak, today);
  const isNewDay = last !== today;

  if (isNewDay) {
    const updates: Record<string, string | number> = {
      streak,
      lastActiveDate: today,
    };
    await updateDoc(doc(db, "users", user.uid), updates).catch(() => {});
    if (!user.isGuest) {
      await updateDoc(doc(db, "profiles", user.uid), {
        streak,
        lastActiveDate: today,
      }).catch(() => {});
    }
  }

  const rewardDue = user.lastDailyReward !== today;
  return { streak, isNewDay, rewardDue };
}

export async function claimDailyReward(user: StreakUser): Promise<boolean> {
  const granted = await requestXpGrant(
    user.uid,
    user.fleetId,
    null,
    false,
    DAILY_REWARD_XP,
    "daily_reward",
    true,
  );
  if (!granted) return false;
  await updateDoc(doc(db, "users", user.uid), {
    lastDailyReward: todayDateString(),
  }).catch(() => {});
  return true;
}
