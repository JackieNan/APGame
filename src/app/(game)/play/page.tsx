"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useDailyDeck } from "@/hooks/use-daily-deck";
import { PredictionCard } from "@/components/prediction-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";

export default function PlayPage() {
  const { deck, events, hasPlayed, isLoading } = useDailyDeck();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [reasonings, setReasonings] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse">✦</div>
          <p className="text-muted-foreground text-sm">
            Shuffling the deck...
          </p>
        </div>
      </div>
    );
  }

  if (!deck || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-4xl">🔮</div>
        <p className="text-slate-400">
          No deck available today. Check back later.
        </p>
      </div>
    );
  }

  if (hasPlayed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center space-y-3">
          <div className="text-4xl">✦</div>
          <h2 className="text-xl font-bold text-amber-400">
            Already Submitted
          </h2>
          <p className="text-slate-400 text-sm">
            You&apos;ve already made your predictions for today.
          </p>
        </div>
        <Link href="/results">
          <Button className="bg-amber-500 text-black hover:bg-amber-400">
            View Results
          </Button>
        </Link>
      </div>
    );
  }

  const allSelected = events.every((e) => selections[e.id]);

  async function handleSubmit() {
    if (!allSelected || !deck) return;
    setSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to submit predictions.");
        setSubmitting(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const predictions = events.map((event: any) => ({
        user_id: user.id,
        deck_id: deck.id,
        event_id: event.id,
        deck_date: today,
        predicted_outcome: selections[event.id],
        reasoning_text: reasonings[event.id] || null,
      }));

      const { data: inserted, error } = await supabase
        .from("predictions")
        .insert(predictions)
        .select();

      if (error) {
        toast.error("Failed to submit predictions: " + (error as any).message);
        setSubmitting(false);
        return;
      }

      // Trigger reasoning scoring for predictions with reasoning text (async, don't wait)
      if (inserted) {
        for (const pred of inserted as any[]) {
          if (pred.reasoning_text) {
            fetch("/api/reasoning", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prediction_id: pred.id }),
            }).catch(() => {}); // fire and forget
          }
        }
      }

      toast.success("Predictions submitted! The Oracle will judge soon.");
      router.push("/results");
    } catch {
      toast.error("Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h1 className="text-2xl font-bold text-amber-400">
          Today&apos;s Predictions
        </h1>
        <p className="text-sm text-slate-400">
          Select your outcome for each event. The Oracle is watching.
        </p>
      </motion.div>

      <div className="space-y-4">
        {events.map((event, i) => (
          <PredictionCard
            key={event.id}
            event={event}
            index={i}
            selectedOutcome={selections[event.id] ?? null}
            reasoning={reasonings[event.id] ?? ""}
            onSelect={(outcome) =>
              setSelections((prev) => ({ ...prev, [event.id]: outcome }))
            }
            onReasoningChange={(text) =>
              setReasonings((prev) => ({ ...prev, [event.id]: text }))
            }
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: events.length * 0.12 + 0.3 }}
        className="flex justify-center pt-2 pb-8"
      >
        <Button
          size="lg"
          disabled={!allSelected || submitting}
          onClick={handleSubmit}
          className="bg-amber-500 text-black hover:bg-amber-400 font-bold px-8 disabled:opacity-40"
        >
          {submitting
            ? "Submitting..."
            : allSelected
              ? "Submit Predictions"
              : `Select all ${events.length} predictions`}
        </Button>
      </motion.div>
    </div>
  );
}
