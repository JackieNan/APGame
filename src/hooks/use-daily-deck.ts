"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface DeckEvent {
  id: string;
  event_id: string;
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
  deck_date: string;
  created_at: string;
}

export interface UserPrediction {
  id: string;
  event_id: string;
  selected_outcome: string;
  reasoning: string | null;
  is_correct: boolean | null;
  points_earned: number | null;
}

export function useDailyDeck() {
  const [deck, setDeck] = useState<DailyDeck | null>(null);
  const [events, setEvents] = useState<DeckEvent[]>([]);
  const [predictions, setPredictions] = useState<UserPrediction[]>([]);
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

        // Fetch today's deck
        const { data: deckData } = await supabase
          .from("daily_decks")
          .select("*")
          .eq("deck_date", today)
          .single();

        if (!deckData) {
          setIsLoading(false);
          return;
        }

        setDeck(deckData);

        // Fetch events for this deck
        const { data: deckEvents } = await supabase
          .from("deck_events")
          .select("*, events(*)")
          .eq("deck_id", deckData.id)
          .order("position", { ascending: true });

        if (deckEvents) {
          const mapped: DeckEvent[] = deckEvents.map((de: any) => ({
            id: de.id,
            event_id: de.event_id,
            title: de.events?.title ?? "Unknown Event",
            description: de.events?.description ?? "",
            hook_text: de.events?.hook_text ?? de.events?.title ?? "",
            category: de.events?.category ?? "general",
            market_probability: de.events?.market_probability ?? 0.5,
            outcomes: de.events?.outcomes ?? [
              { name: "Yes", probability: 0.5 },
              { name: "No", probability: 0.5 },
            ],
            is_golden: de.is_golden ?? false,
            source: de.events?.source ?? "unknown",
            source_id: de.events?.source_id ?? "",
          }));
          setEvents(mapped);
        }

        // Fetch user's predictions for today's deck
        if (user) {
          const { data: predData } = await supabase
            .from("predictions")
            .select("*")
            .eq("user_id", user.id)
            .eq("deck_id", deckData.id);

          if (predData && predData.length > 0) {
            setPredictions(predData);
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

  return { deck, events, predictions, isLoading, hasPlayed };
}
