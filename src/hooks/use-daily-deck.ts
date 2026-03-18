"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface DeckEvent {
  id: string;
  title: string;
  description: string;
  hook_text: string;
  category: string;
  market_probability: number;
  outcomes: { name: string; probability: number }[];
  is_golden: boolean;
  source: string;
  source_id: string;
}

export interface DailyDeck {
  id: string;
  date: string;
  golden_card_index: number;
}

export function useDailyDeck() {
  const [deck, setDeck] = useState<DailyDeck | null>(null);
  const [events, setEvents] = useState<DeckEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    async function fetchDeck() {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Fetch today's deck (or most recent available)
        const { data: deckData } = await supabase
          .from("daily_decks")
          .select("*")
          .lte("date", today)
          .order("date", { ascending: false })
          .limit(1)
          .single();

        if (!deckData) {
          setIsLoading(false);
          return;
        }

        const deckRow = deckData as any;
        setDeck({
          id: deckRow.id,
          date: deckRow.date,
          golden_card_index: deckRow.golden_card_index,
        });

        // Fetch events by IDs stored in deck
        const eventIds = deckRow.event_ids as string[];
        if (eventIds && eventIds.length > 0) {
          const { data: eventsData } = await supabase
            .from("events")
            .select("*")
            .in("id", eventIds);

          if (eventsData) {
            // Maintain the order from event_ids
            const eventsMap = new Map(
              eventsData.map((e: any) => [e.id, e])
            );
            const mapped: DeckEvent[] = eventIds
              .map((id, index) => {
                const e = eventsMap.get(id) as any;
                if (!e) return null;
                return {
                  id: e.id,
                  title: e.title ?? "Unknown Event",
                  description: e.description ?? "",
                  hook_text: e.hook_text ?? e.title ?? "",
                  category: e.category ?? "general",
                  market_probability: e.market_probability ?? 0.5,
                  outcomes: e.outcomes ?? [
                    { name: "Yes", probability: 0.5 },
                    { name: "No", probability: 0.5 },
                  ],
                  is_golden: index === deckRow.golden_card_index,
                  source: e.source ?? "unknown",
                  source_id: e.source_id ?? "",
                };
              })
              .filter(Boolean) as DeckEvent[];
            setEvents(mapped);
          }
        }

        // Check if user already played
        if (user) {
          const { data: predData } = await supabase
            .from("predictions")
            .select("id")
            .eq("user_id", user.id)
            .eq("deck_id", deckRow.id)
            .limit(1);

          if (predData && predData.length > 0) {
            setHasPlayed(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch daily deck:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDeck();
  }, []);

  return { deck, events, isLoading, hasPlayed };
}
