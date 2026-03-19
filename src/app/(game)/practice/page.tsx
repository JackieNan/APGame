"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { PredictionEvent } from "@/components/prediction-card";

interface ResolvedEvent {
  id: string;
  title: string;
  hook_text: string | null;
  category: string | null;
  market_probability: number | null;
  outcomes: Record<string, unknown> | null;
  resolution_outcome: string | null;
  description: string | null;
}

interface OraclePred {
  predicted_probability: number | null;
  claude_reasoning: string | null;
}

export default function PracticePage() {
  const [events, setEvents] = useState<ResolvedEvent[]>([]);
  const [oracleMap, setOracleMap] = useState<Record<string, OraclePred>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("events")
      .select("id, title, hook_text, category, market_probability, outcomes, resolution_outcome, description")
      .eq("resolution_status", "resolved")
      .not("resolution_outcome", "is", null)
      .limit(20);

    if (error || !data || data.length === 0) {
      setLoading(false);
      return;
    }

    // Shuffle
    const shuffled = data.sort(() => Math.random() - 0.5);
    setEvents(shuffled);

    // Fetch oracle predictions for these events
    const eventIds = shuffled.map((e) => e.id);
    const { data: oracleData } = await supabase
      .from("oracle_predictions")
      .select("event_id, predicted_probability, claude_reasoning")
      .in("event_id", eventIds);

    if (oracleData) {
      const map: Record<string, OraclePred> = {};
      for (const o of oracleData) {
        if (o.event_id) {
          map[o.event_id] = {
            predicted_probability: o.predicted_probability,
            claude_reasoning: o.claude_reasoning,
          };
        }
      }
      setOracleMap(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const currentEvent = events[currentIndex] ?? null;

  const outcomes =
    currentEvent?.outcomes && Array.isArray((currentEvent.outcomes as any))
      ? (currentEvent.outcomes as unknown as { name: string; probability: number }[])
      : [
          { name: "Yes", probability: currentEvent?.market_probability ?? 0.5 },
          { name: "No", probability: 1 - (currentEvent?.market_probability ?? 0.5) },
        ];

  function handleReveal() {
    if (!selectedOutcome || !currentEvent) return;
    const isCorrect =
      currentEvent.resolution_outcome?.toLowerCase() === selectedOutcome.toLowerCase();
    setScore((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
    }));
    setRevealed(true);
  }

  function handleNext() {
    setSelectedOutcome(null);
    setReasoning("");
    setRevealed(false);
    setCurrentIndex((i) => i + 1);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-slate-400 animate-pulse">Loading practice events...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-slate-400">No resolved events available for practice.</p>
      </div>
    );
  }

  if (currentIndex >= events.length) {
    return (
      <div className="space-y-6 text-center py-16">
        <h2 className="text-2xl font-bold text-amber-400">Practice Complete!</h2>
        <p className="text-slate-300 text-lg">
          You got{" "}
          <span className="text-amber-400 font-bold">{score.correct}</span> out of{" "}
          <span className="text-slate-100 font-bold">{score.total}</span> correct
        </p>
        <p className="text-slate-400">
          Accuracy: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
        </p>
        <Button
          onClick={() => {
            setCurrentIndex(0);
            setScore({ correct: 0, total: 0 });
            setRevealed(false);
            setSelectedOutcome(null);
            setReasoning("");
            fetchEvents();
          }}
          className="bg-amber-500 text-black hover:bg-amber-400"
        >
          Play Again
        </Button>
      </div>
    );
  }

  const oracle = currentEvent ? oracleMap[currentEvent.id] : null;
  const isCorrect =
    revealed && currentEvent
      ? currentEvent.resolution_outcome?.toLowerCase() === selectedOutcome?.toLowerCase()
      : null;

  return (
    <div className="space-y-6">
      {/* Session score bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Practice Mode</h1>
          <p className="text-sm text-slate-400">
            Question {currentIndex + 1} of {events.length}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="bg-slate-800 text-slate-200 text-sm px-3 py-1"
        >
          {score.correct} / {score.total} correct
        </Badge>
      </div>

      {/* Event card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentEvent.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-slate-800/50 bg-slate-900/80 backdrop-blur">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                {currentEvent.category && (
                  <Badge variant="secondary" className="bg-slate-800 text-slate-400 text-xs">
                    {currentEvent.category}
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-xs">
                  Practice
                </Badge>
              </div>
              <CardTitle className="text-lg text-slate-100">{currentEvent.title}</CardTitle>
              {currentEvent.hook_text && (
                <CardDescription className="text-slate-400 italic">
                  {currentEvent.hook_text}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Market probability */}
              {currentEvent.market_probability != null && (
                <div className="text-sm text-slate-400">
                  Market probability:{" "}
                  <span className="text-slate-200 font-medium">
                    {Math.round(currentEvent.market_probability * 100)}%
                  </span>
                </div>
              )}

              {/* Outcome buttons */}
              {!revealed && (
                <div className="flex gap-2 flex-wrap">
                  {outcomes.map((o) => (
                    <Button
                      key={o.name}
                      variant={selectedOutcome === o.name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedOutcome(o.name)}
                      className={cn(
                        "transition-all",
                        selectedOutcome === o.name
                          ? "bg-amber-500 text-black hover:bg-amber-400"
                          : "border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-400"
                      )}
                    >
                      {o.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* Reasoning input */}
              {!revealed && selectedOutcome && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.2 }}
                >
                  <Textarea
                    placeholder="Why do you think so? (optional)"
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500 resize-none"
                    rows={2}
                  />
                </motion.div>
              )}

              {/* Submit button */}
              {!revealed && selectedOutcome && (
                <Button
                  onClick={handleReveal}
                  className="w-full bg-amber-500 text-black hover:bg-amber-400 font-semibold"
                >
                  Reveal Answer
                </Button>
              )}

              {/* Reveal section */}
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4 pt-2"
                >
                  {/* Result banner */}
                  <div
                    className={cn(
                      "rounded-lg p-4 text-center font-semibold text-lg",
                      isCorrect
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-red-500/15 text-red-400 border border-red-500/30"
                    )}
                  >
                    {isCorrect ? "Correct!" : "Incorrect"}
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Your prediction:</span>
                      <span className="text-slate-200 font-medium">{selectedOutcome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Actual outcome:</span>
                      <span className="text-slate-200 font-medium">
                        {currentEvent.resolution_outcome ?? "Unknown"}
                      </span>
                    </div>
                    {oracle && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Oracle prediction:</span>
                          <span className="text-amber-400 font-medium">
                            {oracle.predicted_probability != null
                              ? `${Math.round(oracle.predicted_probability * 100)}% Yes`
                              : "N/A"}
                          </span>
                        </div>
                        {oracle.claude_reasoning && (
                          <div className="mt-2 rounded-md bg-slate-800/60 p-3 border border-slate-700/50">
                            <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">
                              Oracle Reasoning
                            </p>
                            <p className="text-slate-300 text-sm">{oracle.claude_reasoning}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Next button */}
                  <Button
                    onClick={handleNext}
                    className="w-full bg-slate-800 text-slate-200 hover:bg-slate-700 font-semibold"
                  >
                    {currentIndex + 1 < events.length ? "Next Question" : "See Results"}
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
