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

const SYSTEM_PROMPT = `You are an event curator for a prediction game. Your goal is to select events that will RESOLVE SOON so players get quick feedback.

CRITICAL RULES:
1. Select EXACTLY 5 events with this mix:
   - 2 SHORT-TERM: closing within 1-7 days (players see results this week!)
   - 2 MEDIUM-TERM: closing within 1-4 weeks
   - 1 LONG-TERM: closing within 1-3 months
2. NEVER select events closing more than 3 months from now
3. Prefer events where reasonable people disagree (probability between 20%-80%)
4. Prefer diverse categories
5. Each event must have a clear YES/NO outcome

For each, write a "hook_text" — one punchy line under 100 chars that makes players want to predict.

Use each candidate's "daysUntilClose" to pick the right time mix.

Respond with ONLY valid JSON:
{"selections":[{"event_id":"...","time_horizon":"short|medium|long","hook_text":"..."}]}`;

export async function curateDailyDeck(candidateEvents: any[]): Promise<CuratedDeck> {
  const now = new Date();
  const summary = candidateEvents.map((e) => {
    // Calculate days until close from raw data
    const closeTime = e.rawJson?.closeTime ?? e.raw_json?.closeTime;
    const closeDate = closeTime ? new Date(closeTime) : null;
    const daysUntilClose = closeDate
      ? Math.round((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      id: e.id,
      title: e.title,
      description: e.description?.slice(0, 150),
      category: e.category,
      probability: e.market_probability ?? e.currentProbability,
      time_horizon: e.time_horizon,
      daysUntilClose,
      source: e.source,
    };
  });

  const text = await chatCompletion(
    CURATOR_MODEL,
    SYSTEM_PROMPT,
    `Today is ${now.toISOString().split('T')[0]}. Select 5 events:\n${JSON.stringify(summary)}`,
    800
  );

  // Extract JSON from response (handle potential markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Curator returned no valid JSON');

  const parsed = JSON.parse(jsonMatch[0]);

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
