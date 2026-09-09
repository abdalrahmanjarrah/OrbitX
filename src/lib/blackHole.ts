import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { UserData } from "../shared";
import { getWeekStartISO } from "./utils";

// Black hole collective challenge resolution: 1000 hours of focus per week.
export const BLACK_HOLE_TARGET_MINUTES = 1000 * 60;
// Weekly bounty paid to every contributor once the target is reached.
export const BLACK_HOLE_PRIZE_XP = 1000;

export interface BlackHoleData {
  weekMinutes: number;
  contributors: UserData[];
  prizeAlreadyClaimed: boolean;
}

/**
 * Real weekly progress: sums weekFocusMinutes of every astronaut whose weekStart
 * matches the current week. Auto-resets every Monday because each user's
 * weekStart/weekFocusMinutes already roll on the first session of a new week.
 */
export async function fetchBlackHoleData(user: UserData): Promise<BlackHoleData> {
  const weekKey = getWeekStartISO();
  const q = query(
    collection(db, "users"),
    where("weekStart", "==", weekKey),
    orderBy("weekFocusMinutes", "desc"),
    limit(100)
  );
  const snap = await getDocs(q);

  let weekMinutes = 0;
  const contributors: UserData[] = [];
  snap.forEach((d) => {
    const data = d.data() as UserData;
    const mins = data.weekFocusMinutes || 0;
    if (mins > 0) {
      weekMinutes += mins;
      contributors.push({ ...data, uid: d.id });
    }
  });

  return {
    weekMinutes,
    contributors: contributors.slice(0, 5),
    prizeAlreadyClaimed: user.blackHoleClaimedWeek === weekKey,
  };
}

/**
 * Weekly bounty: once the collective target is reached, every astronaut who
 * contributed focus this week receives BLACK_HOLE_PRIZE_XP once.
 * Guarded by blackHoleClaimedWeek so nobody can double-claim across sessions/week.
 */
export async function claimBlackHolePrize(user: UserData): Promise<boolean> {
  const weekKey = getWeekStartISO();
  if (user.blackHoleClaimedWeek === weekKey) return false;

  const current = await fetchBlackHoleData(user);
  if (current.weekMinutes < BLACK_HOLE_TARGET_MINUTES) return false;

  const uid = user.uid ?? "";
  if (!uid) return false;

  // Reserve the claim first to prevent double-grant on concurrent calls.
  await updateDoc(doc(db, "users", uid), { blackHoleClaimedWeek: weekKey }).catch(() => {});

  const { requestXpGrant } = await import("./xpSystem");
  const granted = await requestXpGrant(
    uid,
    user.fleetId || undefined,
    null,
    true,
    BLACK_HOLE_PRIZE_XP,
    "black_hole_weekly_bounty",
    true
  );

  if (granted <= 0) {
    // Rollback reservation so the user can retry on next render.
    await updateDoc(doc(db, "users", uid), { blackHoleClaimedWeek: user.blackHoleClaimedWeek || null }).catch(() => {});
    return false;
  }

  await addDoc(collection(db, "users", uid, "notifications"), {
    type: "black_hole_bounty",
    content: `🕳️🏆 تم فك شفرة الثقب الأسود هذا الأسبوع! حصلت على ${BLACK_HOLE_PRIZE_XP} XP كمكافأة جماعية لمساهمتك.`,
    read: false,
    timestamp: serverTimestamp(),
  }).catch(() => {});

  return true;
}