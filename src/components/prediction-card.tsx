"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ProbabilityGauge } from "@/components/probability-gauge";

export interface PredictionEvent {
  id: string;
  event_id: string;
  title: string;
  hook_text: string;
  category: string;
  market_probability: number;
  outcomes: { name: string; probability: number }[];
  is_golden: boolean;
}

interface PredictionCardProps {
  event: PredictionEvent;
  index: number;
  selectedOutcome: string | null;
  reasoning: string;
  onSelect: (outcome: string) => void;
  onReasoningChange: (reasoning: string) => void;
}

export function PredictionCard({
  event,
  index,
  selectedOutcome,
  reasoning,
  onSelect,
  onReasoningChange,
}: PredictionCardProps) {
  const [showReasoning, setShowReasoning] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.4, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "relative border-slate-800/50 bg-slate-900/80 backdrop-blur transition-all",
          event.is_golden &&
            "border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
          selectedOutcome && "ring-1 ring-amber-500/30"
        )}
      >
        {event.is_golden && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/5 via-yellow-500/10 to-amber-500/5 animate-pulse pointer-events-none" />
        )}

        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="secondary"
              className="bg-slate-800 text-slate-400 text-xs"
            >
              {event.category}
            </Badge>
            {event.is_golden && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                ✦ Golden Card ✦
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg text-slate-100">
            {event.title}
          </CardTitle>
          <CardDescription className="text-slate-400 italic">
            {event.hook_text}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <ProbabilityGauge
            probability={event.market_probability}
            playerPrediction={
              selectedOutcome === "Yes" || selectedOutcome === "No"
                ? (selectedOutcome as "Yes" | "No")
                : null
            }
          />

          <div className="flex gap-2 flex-wrap">
            {event.outcomes.map((outcome) => (
              <Button
                key={outcome.name}
                variant={
                  selectedOutcome === outcome.name ? "default" : "outline"
                }
                size="sm"
                onClick={() => {
                  onSelect(outcome.name);
                  if (!showReasoning) setShowReasoning(true);
                }}
                className={cn(
                  "transition-all",
                  selectedOutcome === outcome.name
                    ? "bg-amber-500 text-black hover:bg-amber-400"
                    : "border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-400"
                )}
              >
                {outcome.name}
              </Button>
            ))}
          </div>

          {showReasoning && selectedOutcome && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.2 }}
            >
              <Textarea
                placeholder="Why do you think so? (optional, earns bonus points)"
                value={reasoning}
                onChange={(e) => onReasoningChange(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500 resize-none"
                rows={2}
              />
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
