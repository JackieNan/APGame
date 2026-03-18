"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ResultReveal } from "@/components/result-reveal";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ResultData {
  title: string;
  category: string;
  playerPrediction: string;
  actualOutcome: string;
  oraclePrediction: string;
  isCorrect: boolean;
  isGolden: boolean;
  points: {
    base: number;
    contrarian: number;
    golden: number;
    streak: number;
    reasoning: number;
    total: number;
  };
}

export default function ResultsPage() {
  const [results, setResults] = useState<ResultData[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [noResults, setNoResults] = useState(false);

  useEffect(() => {
    async function fetchResults() {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        setNoResults(true);
        return;
      }

      // Get today's deck
      const { data: deck } = await supabase
        .from("daily_decks")
        .select("*")
        .eq("date", today)
        .single();

      if (!deck) {
        setIsLoading(false);
        setNoResults(true);
        return;
      }

      const deckData = deck as any;

      // Get user predictions for today
      const { data: predictions } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", user.id)
        .eq("deck_id", deckData.id);

      if (!predictions || predictions.length === 0) {
        setIsLoading(false);
        setNoResults(true);
        return;
      }

      // Get events for this deck
      const eventIds = deckData.event_ids as string[];
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .in("id", eventIds);

      // Get oracle predictions
      const { data: oraclePreds } = await supabase
        .from("oracle_predictions")
        .select("*")
        .eq("deck_id", deckData.id);

      // Get scores
      const predictionIds = predictions.map((p: any) => p.id);
      const { data: scores } = await supabase
        .from("scores")
        .select("*")
        .in("prediction_id", predictionIds);

      const eventsMap = new Map((events ?? []).map((e: any) => [e.id, e]));
      const oracleMap = new Map((oraclePreds ?? []).map((o: any) => [o.event_id, o]));
      const scoresMap = new Map((scores ?? []).map((s: any) => [s.prediction_id, s]));

      const mapped: ResultData[] = predictions.map((pred: any) => {
        const event = eventsMap.get(pred.event_id) as any;
        const oracle = oracleMap.get(pred.event_id) as any;
        const score = scoresMap.get(pred.id) as any;
        const eventIndex = eventIds.indexOf(pred.event_id);
        const isGolden = eventIndex === deckData.golden_card_index;
        const resolved = event?.resolution_status === "resolved";
        const actualOutcome = event?.resolution_outcome ?? "Pending";
        const isCorrect = resolved && pred.predicted_outcome?.toLowerCase() === actualOutcome?.toLowerCase();

        return {
          title: event?.title ?? "Unknown Event",
          category: event?.category ?? "general",
          playerPrediction: pred.predicted_outcome,
          actualOutcome,
          oraclePrediction: oracle
            ? `${(oracle.predicted_probability * 100).toFixed(0)}% Yes`
            : "—",
          isCorrect: isCorrect ?? false,
          isGolden,
          points: {
            base: score?.base_points ?? 0,
            contrarian: score?.contrarian_bonus ?? 0,
            golden: score?.golden_multiplier ?? 1,
            streak: score?.streak_multiplier ?? 1,
            reasoning: score?.reasoning_bonus ?? 0,
            total: score?.total_points ?? 0,
          },
        };
      });

      setResults(mapped);
      setTotalScore(mapped.reduce((sum, r) => sum + r.points.total, 0));
      setIsLoading(false);
    }

    fetchResults();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse">🔮</div>
          <p className="text-muted-foreground text-sm">Revealing fates...</p>
        </div>
      </div>
    );
  }

  if (noResults) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-slate-400">No results available yet.</p>
        <Link href="/play">
          <Button className="bg-amber-500 text-black hover:bg-amber-400">
            Make Predictions
          </Button>
        </Link>
      </div>
    );
  }

  const anyPending = results.some((r) => r.actualOutcome === "Pending");

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-amber-400">
          {anyPending ? "Awaiting the Oracle's Judgment" : "Results Revealed"}
        </h1>
        <p className="text-sm text-slate-400">
          {anyPending
            ? "Some events haven't resolved yet. Check back later."
            : "See how your predictions fared against reality."}
        </p>
      </div>

      <div className="space-y-4">
        {results.map((result, i) => (
          <ResultReveal key={i} index={i} {...result} />
        ))}
      </div>

      {!anyPending && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: results.length * 0.3 + 0.5, duration: 0.4 }}
        >
          <Card className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-amber-500/30">
            <CardContent className="pt-6 text-center space-y-2">
              <p className="text-sm text-slate-400">Total Score</p>
              <p className="text-4xl font-bold text-amber-400 font-mono">
                {totalScore}
              </p>
              <p className="text-xs text-muted-foreground">points earned</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
