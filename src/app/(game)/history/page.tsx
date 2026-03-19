"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface HistoryEntry {
  deckId: string;
  date: string;
  predictionCount: number;
  resolvedCount: number;
  totalScore: number;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Fetch all user predictions
      const { data: predictions } = await supabase
        .from("predictions")
        .select("id, deck_id, event_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!predictions || predictions.length === 0) {
        setIsLoading(false);
        return;
      }

      // Group predictions by deck_id
      const deckMap = new Map<string, { predIds: string[]; eventIds: string[]; createdAt: string }>();
      for (const p of predictions as any[]) {
        if (!deckMap.has(p.deck_id)) {
          deckMap.set(p.deck_id, { predIds: [], eventIds: [], createdAt: p.created_at });
        }
        const entry = deckMap.get(p.deck_id)!;
        entry.predIds.push(p.id);
        entry.eventIds.push(p.event_id);
      }

      const deckIds = Array.from(deckMap.keys());

      // Fetch decks for dates
      const { data: decks } = await supabase
        .from("daily_decks")
        .select("id, date")
        .in("id", deckIds);

      const deckDateMap = new Map((decks ?? []).map((d: any) => [d.id, d.date]));

      // Fetch all relevant events to check resolution status
      const allEventIds = Array.from(new Set(
        Array.from(deckMap.values()).flatMap((d) => d.eventIds)
      ));
      const { data: events } = await supabase
        .from("events")
        .select("id, resolution_status")
        .in("id", allEventIds);

      const eventStatusMap = new Map((events ?? []).map((e: any) => [e.id, e.resolution_status]));

      // Fetch scores for all predictions
      const allPredIds = Array.from(deckMap.values()).flatMap((d) => d.predIds);
      const { data: scores } = await supabase
        .from("scores")
        .select("prediction_id, total_points")
        .in("prediction_id", allPredIds);

      const scoreMap = new Map((scores ?? []).map((s: any) => [s.prediction_id, s.total_points ?? 0]));

      // Build entries sorted by date descending
      const mapped: HistoryEntry[] = deckIds.map((deckId) => {
        const info = deckMap.get(deckId)!;
        const date = deckDateMap.get(deckId) ?? "Unknown";
        const resolvedCount = info.eventIds.filter(
          (eid) => eventStatusMap.get(eid) === "resolved"
        ).length;
        const totalScore = info.predIds.reduce(
          (sum, pid) => sum + (scoreMap.get(pid) ?? 0),
          0
        );

        return {
          deckId,
          date,
          predictionCount: info.predIds.length,
          resolvedCount,
          totalScore,
        };
      });

      // Sort by date descending
      mapped.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

      setEntries(mapped);
      setIsLoading(false);
    }

    fetchHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-sm animate-pulse">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">
          Prediction History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your journey through the Oracle&apos;s trials
        </p>
      </div>

      {entries.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No history yet. Start playing to build your record.
        </p>
      )}

      <div className="space-y-3">
        {entries.map((entry) => (
          <Link key={entry.deckId} href={`/results?deck_id=${entry.deckId}`}>
            <Card className="bg-slate-900/80 border-slate-800/50 hover:border-amber-500/30 transition-colors cursor-pointer mb-3">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-200">
                      {entry.date}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-slate-800 text-slate-400 text-xs"
                      >
                        {entry.predictionCount} predictions
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-slate-800 text-slate-400 text-xs"
                      >
                        {entry.resolvedCount}/{entry.predictionCount} resolved
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-lg text-amber-400">
                      {entry.totalScore}
                    </span>
                    <p className="text-xs text-slate-500">pts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
