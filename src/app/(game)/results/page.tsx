"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ResultReveal } from "@/components/result-reveal";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ResultData {
  title: string;
  category: string;
  timeHorizon: string;
  playerPrediction: string;
  actualOutcome: string;
  isPending: boolean;
  oracleProbability: string;
  oracleReasoning: string;
  isCorrect: boolean;
  isGolden: boolean;
  reasoningFeedback: string | null;
  reasoningScore: number | null;
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
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-4xl animate-pulse">🔮</div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [results, setResults] = useState<ResultData[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [noResults, setNoResults] = useState(false);
  const [allDeckIds, setAllDeckIds] = useState<string[]>([]);
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(null);
  const [deckDate, setDeckDate] = useState<string | null>(null);

  const paramDeckId = searchParams.get("deck_id");

  useEffect(() => {
    async function fetchResults() {
      setIsLoading(true);
      setNoResults(false);
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        setNoResults(true);
        return;
      }

      // Fetch all deck_ids the user has played, ordered by creation time desc
      const { data: allPreds } = await supabase
        .from("predictions")
        .select("deck_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Dedupe deck_ids preserving order
      const seenDeckIds = new Set<string>();
      const orderedDeckIds: string[] = [];
      for (const p of allPreds ?? []) {
        const did = (p as any).deck_id as string;
        if (!seenDeckIds.has(did)) {
          seenDeckIds.add(did);
          orderedDeckIds.push(did);
        }
      }
      setAllDeckIds(orderedDeckIds);

      if (orderedDeckIds.length === 0) {
        setIsLoading(false);
        setNoResults(true);
        return;
      }

      // Determine which deck to show
      const deckId = paramDeckId && seenDeckIds.has(paramDeckId)
        ? paramDeckId
        : orderedDeckIds[0];
      setCurrentDeckId(deckId);

      // Get deck info
      const { data: deck } = await supabase
        .from("daily_decks")
        .select("*")
        .eq("id", deckId)
        .single();

      if (!deck) {
        setIsLoading(false);
        setNoResults(true);
        return;
      }

      const deckData = deck as any;
      setDeckDate(deckData.date);

      // Get all user predictions for this deck
      const { data: predictions } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", user.id)
        .eq("deck_id", deckId);

      if (!predictions || predictions.length === 0) {
        setIsLoading(false);
        setNoResults(true);
        return;
      }

      // Get events
      const eventIds = deckData.event_ids as string[];
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .in("id", eventIds);

      // Get oracle predictions
      const { data: oraclePreds } = await supabase
        .from("oracle_predictions")
        .select("*")
        .eq("deck_id", deckId);

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
        const isPending = event?.resolution_status !== "resolved";
        const actualOutcome = event?.resolution_outcome ?? "Pending";
        const isCorrect =
          !isPending &&
          pred.predicted_outcome?.toLowerCase() === actualOutcome?.toLowerCase();

        return {
          title: event?.title ?? "Unknown Event",
          category: event?.category ?? "general",
          timeHorizon: event?.time_horizon ?? "medium",
          playerPrediction: pred.predicted_outcome,
          actualOutcome,
          isPending,
          oracleProbability: oracle
            ? `${(oracle.predicted_probability * 100).toFixed(0)}% Yes`
            : "\u2014",
          oracleReasoning: oracle?.claude_reasoning ?? "",
          isCorrect,
          isGolden,
          reasoningFeedback: pred.reasoning_feedback ?? null,
          reasoningScore: pred.reasoning_score ?? null,
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
      setTotalScore(
        mapped
          .filter((r) => !r.isPending)
          .reduce((sum, r) => sum + r.points.total, 0)
      );
      setIsLoading(false);
    }

    fetchResults();
  }, [paramDeckId]);

  const currentIndex = currentDeckId ? allDeckIds.indexOf(currentDeckId) : -1;
  const hasPrev = currentIndex >= 0 && currentIndex < allDeckIds.length - 1;
  const hasNext = currentIndex > 0;

  function navigateDeck(direction: "prev" | "next") {
    const newIndex = direction === "prev" ? currentIndex + 1 : currentIndex - 1;
    const newDeckId = allDeckIds[newIndex];
    router.push(`/results?deck_id=${newDeckId}`);
  }

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

  const pendingCount = results.filter((r) => r.isPending).length;
  const resolvedCount = results.length - pendingCount;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-amber-400">
          {pendingCount === results.length
            ? "Predictions Submitted"
            : resolvedCount === results.length
              ? "Results Revealed"
              : "Partial Results"}
        </h1>
        {deckDate && (
          <p className="text-xs text-slate-500">{deckDate}</p>
        )}
        <p className="text-sm text-slate-400">
          {pendingCount > 0
            ? `${pendingCount} event${pendingCount > 1 ? "s" : ""} awaiting resolution. Oracle's analysis is below.`
            : "See how your predictions fared against reality and the Oracle."}
        </p>
      </div>

      {/* Day navigation */}
      {allDeckIds.length > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasPrev}
            onClick={() => navigateDeck("prev")}
            className="text-slate-400 hover:text-slate-200"
          >
            &larr; Previous Day
          </Button>
          <span className="text-xs text-slate-500">
            {allDeckIds.length - currentIndex} / {allDeckIds.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasNext}
            onClick={() => navigateDeck("next")}
            className="text-slate-400 hover:text-slate-200"
          >
            Next Day &rarr;
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {results.map((result, i) => (
          <ResultReveal key={i} index={i} {...result} />
        ))}
      </div>

      {resolvedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: results.length * 0.2 + 0.5, duration: 0.4 }}
        >
          <Card className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-amber-500/30">
            <CardContent className="pt-6 text-center space-y-2">
              <p className="text-sm text-slate-400">Score So Far</p>
              <p className="text-4xl font-bold text-amber-400 font-mono">
                {totalScore}
              </p>
              <p className="text-xs text-muted-foreground">
                {resolvedCount}/{results.length} events resolved
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
