import { chatCompletion, CURATOR_MODEL } from './client';

export interface CuratedEvent {
  eventId: string;
  hookText: string;
  timeHorizon: 'short' | 'medium' | 'long';
}

export interface CuratedDeck {
  events: CuratedEvent[];
  curatedAt: string;
}

const SYSTEM_PROMPT = `You are an event curator for a prediction game. Select the 5 most compelling events from candidates.

Selection criteria:
1. Clear binary outcomes (YES/NO)
2. Interesting to predict - events where reasonable people disagree
3. Diverse categories
4. Enough context for reasoning
5. Engaging and timely

Select exactly 5: 2 short-term (<2 weeks), 2 medium-term (1-3 months), 1 long-term (3+ months).

For each, write a "hook_text" - one punchy line under 100 chars.

Respond with ONLY valid JSON:
{"selections":[{"event_id":"...","time_horizon":"short|medium|long","hook_text":"..."}]}`;

export async function curateDailyDeck(candidateEvents: any[]): Promise<CuratedDeck> {
  const summary = candidateEvents.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description?.slice(0, 200),
    category: e.category,
    currentProbability: e.currentProbability,
    source: e.source,
  }));

  const text = await chatCompletion(
    CURATOR_MODEL,
    SYSTEM_PROMPT,
    `Select 5 best events:\n${JSON.stringify(summary)}`,
    800
  );

  const parsed = JSON.parse(text);

  return {
    events: parsed.selections.map(
      (s: { event_id: string; time_horizon: 'short' | 'medium' | 'long'; hook_text: string }) => ({
        eventId: s.event_id,
        hookText: s.hook_text,
        timeHorizon: s.time_horizon,
      })
    ),
    curatedAt: new Date().toISOString(),
  };
}
