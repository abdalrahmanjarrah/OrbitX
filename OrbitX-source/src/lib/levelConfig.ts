/**
 * Level Configuration — 100 Levels
 *
 * Each level has a cumulative XP threshold (in minutes of focus time).
 * XP is accumulated from focus sessions, time chests, challenges, etc.
 */

export const MAX_LEVEL = 100;

// Cumulative XP required to reach each level (index 0 = level 1)
// Derived from the user-specified table with interpolated values.
const LEVEL_XP_TABLE: readonly number[] = [
  0,        // Level 1
  500,      // Level 2
  1200,     // Level 3
  2100,     // Level 4
  3200,     // Level 5
  4500,     // Level 6
  6000,     // Level 7
  7700,     // Level 8
  9600,     // Level 9
  12000,    // Level 10
  14800,    // Level 11
  17800,    // Level 12
  21000,    // Level 13
  24400,    // Level 14
  28000,    // Level 15
  32000,    // Level 16
  36200,    // Level 17
  40600,    // Level 18
  45200,    // Level 19
  50000,    // Level 20
  55600,    // Level 21
  61200,    // Level 22
  66800,    // Level 23
  72400,    // Level 24
  78000,    // Level 25
  84400,    // Level 26
  90800,    // Level 27
  97200,    // Level 28
  103600,   // Level 29
  110000,   // Level 30
  117600,   // Level 31
  125200,   // Level 32
  132800,   // Level 33
  140400,   // Level 34
  148000,   // Level 35
  156400,   // Level 36
  164800,   // Level 37
  173200,   // Level 38
  181600,   // Level 39
  190000,   // Level 40
  198600,   // Level 41
  207200,   // Level 42
  215800,   // Level 43
  224400,   // Level 44
  233000,   // Level 45
  242400,   // Level 46
  251800,   // Level 47
  261200,   // Level 48
  270600,   // Level 49
  280000,   // Level 50
  289800,   // Level 51
  299600,   // Level 52
  309400,   // Level 53
  319200,   // Level 54
  329000,   // Level 55
  339200,   // Level 56
  349400,   // Level 57
  359600,   // Level 58
  369800,   // Level 59
  380000,   // Level 60
  389800,   // Level 61
  399600,   // Level 62
  409400,   // Level 63
  419200,   // Level 64
  429000,   // Level 65
  439200,   // Level 66
  449400,   // Level 67
  459600,   // Level 68
  469800,   // Level 69
  480000,   // Level 70
  489800,   // Level 71
  499600,   // Level 72
  509400,   // Level 73
  519200,   // Level 74
  529000,   // Level 75
  539200,   // Level 76
  549400,   // Level 77
  559600,   // Level 78
  569800,   // Level 79
  580000,   // Level 80
  589800,   // Level 81
  599600,   // Level 82
  609400,   // Level 83
  619200,   // Level 84
  629000,   // Level 85
  639200,   // Level 86
  649400,   // Level 87
  659600,   // Level 88
  669800,   // Level 89
  680000,   // Level 90
  691800,   // Level 91
  703600,   // Level 92
  715400,   // Level 93
  727200,   // Level 94
  739000,   // Level 95
  751200,   // Level 96
  763400,   // Level 97
  775600,   // Level 98
  787800,   // Level 99
  800000,   // Level 100
] as const;

/**
 * Get the user's current level from their total XP.
 * XP = cumulative focus minutes (1 XP = 1 minute).
 */
export function getLevelFromXp(xp: number): number {
  for (let i = LEVEL_XP_TABLE.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP_TABLE[i]) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Get the cumulative XP threshold for a given level (1-indexed).
 */
export function getXpForLevel(level: number): number {
  if (level < 1) return 0;
  if (level > MAX_LEVEL) return LEVEL_XP_TABLE[LEVEL_XP_TABLE.length - 1];
  return LEVEL_XP_TABLE[level - 1];
}

/**
 * Get the XP needed to go from the current level to the next.
 * Returns 0 if already at max level.
 */
export function getXpToNextLevel(currentLevel: number): number {
  if (currentLevel >= MAX_LEVEL) return 0;
  return getXpForLevel(currentLevel + 1) - getXpForLevel(currentLevel);
}

/**
 * Get the user's XP progress within the current level (0–100 percentage).
 */
export function getLevelProgress(xp: number, currentLevel: number): number {
  if (currentLevel >= MAX_LEVEL) return 100;
  const currentLevelXp = getXpForLevel(currentLevel);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  const xpInLevel = xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  return Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100));
}

/**
 * Level-up reward XP (bonus XP granted when leveling up).
 * Scales with level for motivation.
 */
export function getLevelUpReward(level: number): number {
  if (level <= 10) return 25;
  if (level <= 25) return 50;
  if (level <= 50) return 100;
  if (level <= 75) return 200;
  return 500;
}

/**
 * Milestone levels that get special celebrations.
 */
export const MILESTONE_LEVELS = new Set([
  5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100,
]);

/**
 * Color scheme for level badges based on level tier.
 */
export function getLevelColor(level: number): { bg: string; text: string; glow: string; border: string } {
  if (level >= 100) return { bg: "bg-gradient-to-r from-amber-500 to-yellow-400", text: "text-yellow-900", glow: "shadow-[0_0_30px_rgba(251,191,36,0.6)]", border: "border-amber-400" };
  if (level >= 75) return { bg: "bg-gradient-to-r from-fuchsia-500 to-purple-500", text: "text-white", glow: "shadow-[0_0_20px_rgba(192,132,252,0.5)]", border: "border-fuchsia-400" };
  if (level >= 50) return { bg: "bg-gradient-to-r from-indigo-500 to-blue-500", text: "text-white", glow: "shadow-[0_0_16px_rgba(99,102,241,0.4)]", border: "border-indigo-400" };
  if (level >= 25) return { bg: "bg-gradient-to-r from-emerald-500 to-teal-400", text: "text-white", glow: "shadow-[0_0_12px_rgba(16,185,129,0.4)]", border: "border-emerald-400" };
  if (level >= 10) return { bg: "bg-gradient-to-r from-blue-500 to-cyan-400", text: "text-white", glow: "shadow-[0_0_10px_rgba(59,130,246,0.3)]", border: "border-blue-400" };
  return { bg: "bg-gradient-to-r from-gray-500 to-gray-400", text: "text-white", glow: "", border: "border-gray-400" };
}

/**
 * Arabic rank name for a level tier — used in the profile's
 * "upcoming milestones" ladder.
 */
export function getLevelRankName(level: number): string {
  if (level >= 100) return "أسطورة OrbitX";
  if (level >= 75) return "أميرال المجرة";
  if (level >= 50) return "قائد أسطول";
  if (level >= 25) return "رائد الفضاء";
  if (level >= 10) return "مستكشف";
  return "متدرب فضائي";
}
