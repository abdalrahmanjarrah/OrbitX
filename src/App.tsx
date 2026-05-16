// Note: I need the actual file content to make the fix
// Please provide the full src/App.tsx file so I can resolve the merge conflict properly

// The fix will:
// 1. Remove lines 4191, 4193, 4204-4205 (conflicting code)
// 2. Keep the safer version using safeXpEarned
// 3. Ensure consistent logic throughout

// Expected corrected section around line 4188-4212:
/*
function StudyRoomView({...}) {
  // lastXpUpdateTimeRef already handles this by being null
  
  // Return remaining shield to user
  const refund = 
    remainingShieldRef.current > 0 ? remainingShieldRef.current : 0;
  
  const safeXpEarned = Math.min(refund, Math.max(0, MAX_XP_PER_SESSION - sessionXpCountRef.current));
  
  currentBetRef.current = 0;
  remainingShieldRef.current = 0;
  
  if (safeXpEarned > 0) {
    updates.xp = increment(safeXpEarned);
  }
  
  // Daily Quest Reward
  if ((user.totalFocusSessions || 0) + 1) % 3 === 0) {
    const questBonus = 50;
    updates.xp = increment((safeXpEarned > 0 ? safeXpEarned : 0) + 50);
    updates.completedTasks = increment(1); // Keep track of completed tasks if we want
  }
  
  if ((user.totalFocusSessions || 0) + 1) % 5 === 0) {
    updates.seeds = increment(1);
  }
}
*/