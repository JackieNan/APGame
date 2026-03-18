export interface ScoreBreakdown {
  basePoints: number;
  contrarianBonus: number;
  goldenMultiplier: number;
  streakMultiplier: number;
  reasoningBonus: number;
  totalPoints: number;
}

export interface CalculateScoreParams {
  isCorrect: boolean;
  prediction: string;
  marketProbability: number;
  isGoldenCard: boolean;
  currentStreak: number;
  reasoningBonus: number;
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 15) return 3.0;
  if (streak >= 8) return 2.0;
  if (streak >= 4) return 1.5;
  return 1.0;
}

export function isContrarianPrediction(
  prediction: string,
  marketProbability: number
): boolean {
  const pred = prediction.toLowerCase();
  return (pred === "yes" && marketProbability < 0.3) ||
         (pred === "no" && marketProbability > 0.7);
}

export function calculateScore(params: CalculateScoreParams): ScoreBreakdown {
  const {
    isCorrect,
    prediction,
    marketProbability,
    isGoldenCard,
    currentStreak,
    reasoningBonus,
  } = params;

  const basePoints = isCorrect ? 50 : 0;

  let contrarianBonus = 0;
  if (isCorrect && isContrarianPrediction(prediction, marketProbability)) {
    const pred = prediction.toLowerCase();
    if (pred === "yes") {
      contrarianBonus = Math.round((1 - marketProbability) * 200);
    } else {
      contrarianBonus = Math.round(marketProbability * 200);
    }
  }

  const goldenMultiplier = isGoldenCard ? 3.0 : 1.0;
  const streakMultiplier = getStreakMultiplier(currentStreak);
  const clampedReasoningBonus = Math.max(0, Math.min(50, reasoningBonus));

  const totalPoints = Math.round(
    (basePoints + contrarianBonus + clampedReasoningBonus) *
      goldenMultiplier *
      streakMultiplier
  );

  return {
    basePoints,
    contrarianBonus,
    goldenMultiplier,
    streakMultiplier,
    reasoningBonus: clampedReasoningBonus,
    totalPoints,
  };
}
