import { chatCompletion, ORACLE_MODEL } from './client';

export interface OraclePrediction {
  eventId: string;
  predictedProbability: number;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are a superforecaster AI oracle. For each event, provide your best probability estimate and concise reasoning.

Avoid defaulting to 50%. Commit to a directional lean when evidence supports it.

Respond with ONLY valid JSON:
{"predictions":[{"event_id":"...","predicted_probability":0.XX,"reasoning":"2-3 sentences"}]}`;

export async function generateOraclePredictions(events: any[]): Promise<OraclePrediction[]> {
  const summary = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description?.slice(0, 200),
    category: e.category,
    currentProbability: e.currentProbability,
  }));

  const text = await chatCompletion(
    ORACLE_MODEL,
    SYSTEM_PROMPT,
    `Predict:\n${JSON.stringify(summary)}`,
    1000
  );

  const parsed = JSON.parse(text);

  return parsed.predictions.map(
    (p: { event_id: string; predicted_probability: number; reasoning: string }) => ({
      eventId: p.event_id,
      predictedProbability: p.predicted_probability,
      reasoning: p.reasoning,
    })
  );
}
