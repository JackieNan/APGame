export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

export interface AddXPResult {
  newXP: number;
  newLevel: number;
  leveledUp: boolean;
}

export function addXP(
  currentXP: number,
  currentLevel: number,
  earnedXP: number
): AddXPResult {
  let xp = currentXP + earnedXP;
  let level = currentLevel;
  let leveledUp = false;

  while (level < 50) {
    const needed = xpForLevel(level);
    if (xp >= needed) {
      xp -= needed;
      level++;
      leveledUp = true;
    } else {
      break;
    }
  }

  return { newXP: xp, newLevel: level, leveledUp };
}

export function getRankTitle(level: number): string {
  if (level >= 50) return "Grandmaster";
  if (level >= 41) return "Sage";
  if (level >= 31) return "Oracle";
  if (level >= 21) return "Strategist";
  if (level >= 11) return "Analyst";
  if (level >= 6) return "Apprentice";
  return "Novice";
}

export interface StreakResult {
  newStreak: number;
  streakBroken: boolean;
}

export function updateStreak(
  lastPlayedDate: string | null,
  currentStreak: number
): StreakResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!lastPlayedDate) {
    return { newStreak: 1, streakBroken: false };
  }

  const last = new Date(lastPlayedDate);
  last.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - last.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { newStreak: currentStreak, streakBroken: false };
  }
  if (diffDays === 1) {
    return { newStreak: currentStreak + 1, streakBroken: false };
  }
  return { newStreak: 1, streakBroken: true };
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  check: (stats: UserStats) => boolean;
}

export interface UserStats {
  totalPredictions: number;
  correctToday: number;
  predictionsToday: number;
  contrarianWins: number;
  currentStreak: number;
  oracleBeats: number;
  level: number;
  unlockedAchievements: string[];
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_prediction",
    name: "First Prediction",
    description: "Make your first prediction",
    check: (s) => s.totalPredictions >= 1,
  },
  {
    id: "perfect_day",
    name: "Perfect Day",
    description: "Get all 5 correct in a day",
    check: (s) => s.predictionsToday >= 5 && s.correctToday >= 5,
  },
  {
    id: "contrarian_king",
    name: "Contrarian King",
    description: "Win 10 contrarian bonuses",
    check: (s) => s.contrarianWins >= 10,
  },
  {
    id: "hot_streak_7",
    name: "Hot Streak (7)",
    description: "Reach a 7-day streak",
    check: (s) => s.currentStreak >= 7,
  },
  {
    id: "hot_streak_14",
    name: "Hot Streak (14)",
    description: "Reach a 14-day streak",
    check: (s) => s.currentStreak >= 14,
  },
  {
    id: "hot_streak_30",
    name: "Hot Streak (30)",
    description: "Reach a 30-day streak",
    check: (s) => s.currentStreak >= 30,
  },
  {
    id: "oracle_beater",
    name: "Oracle Beater",
    description: "Beat Oracle on 10 predictions",
    check: (s) => s.oracleBeats >= 10,
  },
  {
    id: "level_10",
    name: "Level 10",
    description: "Reach level 10",
    check: (s) => s.level >= 10,
  },
  {
    id: "level_25",
    name: "Level 25",
    description: "Reach level 25",
    check: (s) => s.level >= 25,
  },
  {
    id: "level_50",
    name: "Level 50",
    description: "Reach level 50",
    check: (s) => s.level >= 50,
  },
];

export function checkAchievements(userStats: UserStats): AchievementDef[] {
  return ACHIEVEMENTS.filter(
    (a) =>
      !userStats.unlockedAchievements.includes(a.id) && a.check(userStats)
  );
}
