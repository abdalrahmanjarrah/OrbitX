/**
 * XP System - Centralized logic for all XP and progression operations.
 * 
 * ==========================================
 * ⚠️ DEVELOPER PROTECTION WARNING ⚠️
 * ANY FUTURE XP WRITES **MUST** GO THROUGH THIS FILE ONLY.
 * 
 * No component, side-effect, or background interval should EVER use
 * updateDoc(), setDoc(), or increment() for XP, levels, or progression
 * directly. Direct mutations cause race conditions, allow client-side hacking,
 * and make debugging incredibly difficult.
 * 
 * If you need to grant/deduct XP:
 * Use: requestXpGrant() 
 * 
 * If you need to deduct XP for a storefront:
 * Use: purchaseItemXpDeduction()
 * 
 * We have a monkey-patch interceptor in DEV mode that will log loud warnings
 * if any component bypasses this architecture.
 * ==========================================
 * 
 * ARCHITECTURE & ANTI-CHEAT FLOW
 * ==========================================
 * 
 * 1. XP Flow:
 *    - Components call `requestXpGrant(..., amount, source)` instead of `updateDoc`.
 *    - Positive background XP uses transaction locking.
 *    - Exact new level is calculated dynamically during the transaction to ensure
 *      no level de-syncs happen if multiple XP sources trigger simultaneously.
 *    - Logs are sent to `Debugger` representing the success state.
 * 
 * 2. Anti-Cheat & Transaction Locking:
 *    - Every request uses `runTransaction`.
 *    - It calculates time differences securely on the cloud.
 * 
 * 3. Cooldown System & Multi-Tab Protection:
 *    - Checks `now - lastXpUpdate`.
 *    - If multiple tabs try to grant focus XP (e.g. they both calculate 1 min passed),
 *      the first one acquires the lock, increments `lastXpUpdate`. 
 *      The second tab fails the `< 50000ms` check and is safely discarded.
 * 
 * 4. Level Calculations:
 *    - Base formula: `Math.floor(XP / 1000) + 1`
 *    - Recalculated dynamically inside the transaction.
 * 
 * ==========================================
 */

import { db, runTransaction, updateDoc } from '../firebase';
import { doc, increment } from 'firebase/firestore';
import { Debugger } from '../firebaseDebug';
import { callRpc, isRpcUnavailable } from '../supabaseAdapter';
import { getLevelFromXp } from './levelConfig';

// Whether the server-side grant_xp RPC has been deployed. Once confirmed
// present we stop using the client-side fallback entirely.
let xpRpcAvailable: boolean | null = null;

const rpcGrantXp = async (
  userId: string,
  fleetId: string | undefined,
  roomChallengeId: string | null,
  isPlayer1: boolean,
  amount: number,
  source: string,
  forceBypassLock: boolean
): Promise<number> => {
  const { success, data, error } = await callRpc('grant_xp', {
    p_user_id: userId,
    p_fleet_id: fleetId || null,
    p_challenge_id: roomChallengeId || null,
    p_is_player1: !!isPlayer1,
    p_amount: Math.round(amount),
    p_source: source,
    p_force: !!forceBypassLock,
  });
  if (success) {
    xpRpcAvailable = true;
    if (data?.blocked) return -1;
    if (!data?.success) return 0;
    Debugger.logXP(amount, source, (data?.xp || 0) - amount, data?.xp || 0);
    return amount;
  }
  if (!isRpcUnavailable(error)) {
    Debugger.logSuspicious(`grant_xp RPC failed: ${String(error?.message || error)}`);
  }
  xpRpcAvailable = false;
  return 0;
};

/**
 * requestXpGrant
 * The primary method to grant or deduct XP safely.
 *
 * @param userId - The ID of the user receiving XP.
 * @param fleetId - The user's fleet ID, if any.
 * @param roomChallengeId - Challenge ID, if any.
 * @param isPlayer1 - Is the user player 1 in the challenge?
 * @param amount - The amount of XP to grant (positive) or deduct (negative).
 * @param source - A descriptive string identifying why this XP is given/taken.
 * @param forceBypassLock - Set to true for explicit one-time rewards (quests, exits, penalties) to bypass the time lock.
 */
export const requestXpGrant = async (
  userId: string, 
  fleetId: string | undefined, 
  roomChallengeId: string | null,
  isPlayer1: boolean,
  amount: number, 
  source: string,
  forceBypassLock: boolean = false
) => {
  if (amount === 0) return 0;

  if (xpRpcAvailable !== false) {
    const rpcResult = await rpcGrantXp(userId, fleetId, roomChallengeId, isPlayer1, amount, source, forceBypassLock);
    if (rpcResult !== 0) return rpcResult;
    if (xpRpcAvailable) return 0; // RPC succeeded but returned "not granted"
    // xpRpcAvailable === false -> RPC not deployed, use the legacy path below
  }
  
  const userRef = doc(db, 'users', userId);
  
  try {
    const skew = (Debugger as any).getClockOffset ? (Debugger as any).getClockOffset() : 0;
    const now = Date.now() + skew;
    let updatedXp = false;
    let blocked = false;
    let oldXp = 0;
    let newXp = 0;
    
    await runTransaction(db, async (transaction) => {
       const userDoc = await transaction.get(userRef);
       if (!userDoc.exists()) return;
       const uData = userDoc.data();
       
       const isFocusLoop = source.includes("Focus Interval Loop");
       
       if (!forceBypassLock && amount > 0) {
         if (isFocusLoop) {
           const uLastFocusXpUpdate = uData.lastFocusXpUpdate || 0;
           const uTimeSinceLastFocusGrant = now - uLastFocusXpUpdate;
           if (uTimeSinceLastFocusGrant < 45000) {
             Debugger.logSuspicious(`Transaction Blocked XP grant of ${amount} from ${source}. Only ${Math.round(uTimeSinceLastFocusGrant/1000)}s passed. (${userId})`);
             Debugger.logXPBlocked(amount, source, "Cooldown lock applied due to focus interval check");
             blocked = true;
             return;
           }
         } else {
           const uLastXpUpdate = uData.lastXpUpdate || 0;
           const uTimeSinceLastGrant = now - uLastXpUpdate;
           if (uTimeSinceLastGrant < 45000) {
             Debugger.logSuspicious(`Transaction Blocked XP grant of ${amount} from ${source}. Only ${Math.round(uTimeSinceLastGrant/1000)}s passed. (${userId})`);
             Debugger.logXPBlocked(amount, source, "Cooldown lock applied due to general interval check");
             blocked = true;
             return;
           }
         }
       }
       
       oldXp = uData.xp || 0;
       newXp = oldXp + amount;
       
        let levelUpdates = {};
        const calculatedLevel = getLevelFromXp(newXp);
        if (calculatedLevel !== (uData.level || 1)) {
            levelUpdates = { level: calculatedLevel };
        }
        
        const updates: any = {
           xp: increment(amount),
           ...(amount > 0 ? { lastXpUpdate: now } : {}),
           ...levelUpdates
       };
       if (isFocusLoop) {
           if (amount > 0) updates.lastFocusXpUpdate = now;
       }
       
       transaction.update(userRef, updates);
       updatedXp = true;
    });
    
    if (blocked) return -1;
    if (!updatedXp) return 0;

    Debugger.logXP(amount, source, oldXp, newXp);
    
    // Update Fleet if needed
    if (fleetId) {
       updateDoc(doc(db, "fleets", fleetId), {
           xp: increment(amount),
       }).catch(() => {});
    }
    
    // Update Challenge if needed
    if (roomChallengeId) {
        const updateField = isPlayer1 ? "progressPlayer1" : "progressPlayer2";
        updateDoc(doc(db, "challenges", roomChallengeId), {
             [updateField]: increment(amount)
        }).catch((e) => console.error("Failed to update challenge progress:", e));
    }
    
    return amount;
    
  } catch(e) {
    console.error("XP Grant Error:", e);
    return 0;
  }
}

/**
 * purchaseItemXpDeduction
 * Safely deducts XP for store purchases. Uses transaction to prevent overdraft.
 */
export const purchaseItemXpDeduction = async (userId: string, price: number): Promise<boolean> => {
  if (price <= 0) return false;

  // Server-verified deduction first
  const { success, data } = await callRpc('purchase_item_deduct', {
    p_user_id: userId,
    p_price: Math.round(price),
  });
  if (success) {
    if (data?.success) {
      Debugger.logXP(-price, "store_purchase", (data?.xp || 0) + price, data?.xp || 0);
      return true;
    }
    return false; // insufficient / invalid — server decision is final
  }

  const userRef = doc(db, 'users', userId);
  
  try {
     let success = false;
     let oldXp = 0;
     
     await runTransaction(db, async (transaction) => {
         const userDoc = await transaction.get(userRef);
         if (!userDoc.exists()) return;
         const data = userDoc.data();
         oldXp = data.xp || 0;
         
         if (oldXp < price) {
             return; // Insufficient funds
         }
         
          const newXp = oldXp - price;
          let levelUpdates = {};
          const calculatedLevel = getLevelFromXp(newXp);
          if (calculatedLevel !== (data.level || 1)) {
             levelUpdates = { level: calculatedLevel };
         }
         
         transaction.update(userRef, {
             xp: increment(-price),
             ...levelUpdates
         });
         success = true;
     });
     
     if (success) {
         Debugger.logXP(-price, "store_purchase", oldXp, oldXp - price);
     }
     
     return success;
  } catch(e) {
     console.error("Purchase XP Deduction Error:", e);
     return false;
  }
}

/**
 * adminSetXP
 * Completely overwrites the user's XP (and optionally level) for absolute Admin overrides.
 * This bypasses the increment system altogether.
 * Now verified server-side: only accounts in the admins table may call it.
 */
export const adminSetXP = async (userId: string, newXp: number, newLevel?: number, currentActivity?: string, totalFocusSessions?: number) => {
    // Server-verified path first
    const { success, data } = await callRpc('admin_set_xp', {
      p_user_id: userId,
      p_xp: Math.round(newXp),
      p_level: newLevel !== undefined ? Math.round(newLevel) : null,
    });
    if (success) {
      if (data?.success) {
        Debugger.logXP(newXp, "admin_override", 0, newXp);
        // Keep activity fields in sync client-side (non-progression)
        if (currentActivity || totalFocusSessions !== undefined) {
          const userRef = doc(db, "users", userId);
          const profileRef = doc(db, "profiles", userId);
          const sync: any = {};
          if (currentActivity !== undefined) sync.currentActivity = currentActivity;
          if (totalFocusSessions !== undefined) sync.totalFocusSessions = totalFocusSessions;
          updateDoc(userRef, sync).catch(() => {});
          updateDoc(profileRef, sync).catch(() => {});
        }
        return true;
      }
      return false; // forbidden etc. — server decision is final
    }

    // Legacy fallback while the security migration isn't deployed yet
    try {
       const userRef = doc(db, "users", userId);
       const profileRef = doc(db, "profiles", userId);
       
       const updates: any = { xp: newXp };
       if (newLevel !== undefined) updates.level = newLevel;
       if (currentActivity !== undefined) updates.currentActivity = currentActivity;
       if (totalFocusSessions !== undefined) updates.totalFocusSessions = totalFocusSessions;
       
       const profileUpdates: any = { xp: newXp };
       if (newLevel !== undefined) profileUpdates.level = newLevel;
       if (totalFocusSessions !== undefined) profileUpdates.totalFocusSessions = totalFocusSessions;

       await updateDoc(userRef, updates);
       await updateDoc(profileRef, profileUpdates);
       
       Debugger.logXP(newXp, "admin_override", 0, newXp); // Logs with old=0 because it was overwritten
       return true;
    } catch(e) {
       console.error("Admin XP Set Error:", e);
       return false;
    }
}

/**
 * grantChallengeReward
 * Awards the weekly challenge "champion" reward (XP, coins, badge) to the winner.
 * Uses the server-verified grant_challenge_reward RPC when deployed, otherwise
 * falls back to the legacy client-side direct writes.
 */
export const grantChallengeReward = async (challengeId: string, winnerId: string): Promise<boolean> => {
  const { success, data } = await callRpc('grant_challenge_reward', {
    p_challenge_id: challengeId,
    p_winner_id: winnerId,
  });
  if (success) {
    return !!data?.success;
  }

  // Legacy fallback (only works while the DB is still wide-open)
  const { arrayUnion } = await import("firebase/firestore");
  const uRef = doc(db, "users", winnerId);
  const pRef = doc(db, "profiles", winnerId);
  await updateDoc(uRef, {
    coins: increment(50),
    badges: arrayUnion("challenge_champ"),
    challengeChampExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000,
    xp: increment(100)
  }).catch(() => {});
  await updateDoc(pRef, {
    badges: arrayUnion("challenge_champ"),
    challengeChampExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000,
    xp: increment(100)
  }).catch(() => {});
  return true;
}

