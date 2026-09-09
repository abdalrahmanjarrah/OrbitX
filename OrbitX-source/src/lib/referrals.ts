import {
  db,
  getDocs,
  updateDoc,
  doc,
  collection,
  query,
  where,
  limit,
} from "../firebase";
import { requestXpGrant } from "./xpSystem";
import type { UserData } from "../shared";

export const REFERRAL_REWARD_XP = 100;

/**
 * Pays the inviter 100 XP for each friend who signed up through their invite
 * link (?invite=UID). Runs once per app open on the inviter's own client.
 *
 * Why from the inviter's client:
 *  - grant_xp only lets a session award XP to itself, so the invitee's
 *    session cannot credit the inviter.
 *  - We scan profiles carrying `invitedBy == myUid` and grant once per pair,
 *    tracking payouts in `users/{uid}.referralsRewarded`.
 *
 * Guards:
 *  - Self-invites are skipped (invitedBy === own uid).
 *  - Guest accounts are never counted.
 *  - The grant goes through requestXpGrant(..., force=true) which routes to the
 *    server-side grant_xp RPC, so the server cooldown caps farming.
 */
export async function checkAndRewardReferrals(
  user: UserData,
  onRewarded?: (count: number) => void,
): Promise<void> {
  if (!user?.uid || user.isGuest) return;

  const already = new Set(user.referralsRewarded || []);
  const profilesRef = collection(db, "profiles");
  const q = query(
    profilesRef,
    where("invitedBy", "==", user.uid),
    limit(50),
  );

  let snap;
  try {
    snap = await getDocs(q);
  } catch {
    return;
  }

  let rewarded = 0;
  for (const ds of snap.docs) {
    const profile = ds.data() as Partial<UserData>;
    const inviteeUid = profile.uid || ds.id;
    if (!inviteeUid || inviteeUid === user.uid) continue;
    if (profile.isGuest) continue;
    if (already.has(inviteeUid)) continue;

    const granted = await requestXpGrant(
      user.uid,
      user.fleetId || null,
      null,
      false,
      REFERRAL_REWARD_XP,
      "invite_referral",
      true,
    );
    if (granted > 0) {
      already.add(inviteeUid);
      rewarded++;
    }
  }

  if (rewarded > 0) {
    await updateDoc(doc(db, "users", user.uid), {
      referralsRewarded: Array.from(already),
    }).catch(() => {});
    onRewarded?.(rewarded);
  }
}
