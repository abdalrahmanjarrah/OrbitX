export const ChallengeDebugger = {
  logCreation: (challengeId: string, duration: number) => {
    console.log(`[CHALLENGE] Created: ${challengeId} for ${duration} mins`);
  },
  logJoin: (challengeId: string, userId: string) => {
    console.log(`[CHALLENGE] User ${userId} joined room ${challengeId}`);
  },
  logLeave: (challengeId: string, userId: string) => {
    console.log(`[CHALLENGE] User ${userId} left room ${challengeId}`);
  },
  logProgress: (challengeId: string, userId: string, mins: number) => {
    console.log(`[CHALLENGE] Progress Update: ${userId} reached ${mins} mins in ${challengeId}`);
  },
  logWinner: (challengeId: string, winnerId: string) => {
    console.log(`[CHALLENGE] Winner Calculated: ${winnerId} won ${challengeId}`);
  },
  logReward: (challengeId: string, userId: string, amount: number) => {
    console.log(`[CHALLENGE] Reward Claimed: ${userId} claimed +${amount} in ${challengeId}`);
  },
  logSyncError: (message: string) => {
    console.warn(`[CHALLENGE ERROR] Sync Failed: ${message}`);
  },
  logAntiCheat: (message: string) => {
    console.warn(`[CHALLENGE ANTI-CHEAT] ${message}`);
  }
};
