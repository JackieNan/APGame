import { chatCompletion, SCORER_MODEL } from './client';

export interface ReasoningScore {
  score: number;
  feedback: string;
}

const SYSTEM_PROMPT = `You evaluate prediction reasoning quality. Score 0-50. Be tough but fair.

Consider: logical coherence, evidence awareness, originality, calibration awareness.
Be somewhat unpredictable in what you reward. Feedback should be 1-3 sentences, conversational.

Respond with ONLY valid JSON:
{"score":<0-50>,"feedback":"..."}`;

export async function scoreReasoning(
  eventTitle: string,
  eventDescription: string,
  marketProbability: number,
  playerPrediction: string,
  playerReasoning: string
): Promise<ReasoningScore> {
  const text = await chatCompletion(
    SCORER_MODEL,
    SYSTEM_PROMPT,
    `Event: ${eventTitle}
Description: ${eventDescription?.slice(0, 300)}
Market probability: ${(marketProbability * 100).toFixed(1)}%
Prediction: ${playerPrediction}
Reasoning: ${playerReasoning}

Score this.`,
    300
  );

  const parsed = JSON.parse(text);

  return {
    score: Math.max(0, Math.min(50, Math.round(parsed.score))),
    feedback: parsed.feedback,
  };
}
