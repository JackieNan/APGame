"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ResultRevealProps {
  index: number;
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

export function ResultReveal({
  index,
  title,
  category,
  timeHorizon,
  playerPrediction,
  actualOutcome,
  isPending,
  oracleProbability,
  oracleReasoning,
  isCorrect,
  isGolden,
  reasoningFeedback,
  reasoningScore,
  points,
}: ResultRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const [showOracle, setShowOracle] = useState(false);

  const horizonLabels: Record<string, string> = {
    short: "This Week",
    medium: "This Month",
    long: "This Quarter",
  };

  return (
    <motion.div
      initial={{ opacity: 0, rotateY: 90 }}
      animate={{ opacity: 1, rotateY: 0 }}
      transition={{ delay: index * 0.2, duration: 0.5, ease: "easeOut" }}
      onAnimationComplete={() => setRevealed(true)}
      style={{ perspective: 1000 }}
    >
      <Card
        className={cn(
          "border-slate-800/50 bg-slate-900/80 backdrop-blur overflow-hidden",
          isPending && "border-slate-700/50",
          !isPending && isCorrect && "border-green-500/30",
          !isPending && !isCorrect && "border-red-500/30",
          isGolden && "shadow-[0_0_30px_rgba(245,158,11,0.2)] border-amber-500/40"
        )}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-slate-800 text-slate-400 text-xs">
                {category}
              </Badge>
              <Badge variant="secondary" className="bg-slate-800 text-slate-500 text-xs">
                {horizonLabels[timeHorizon] ?? timeHorizon}
              </Badge>
              {isGolden && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                  ✦ Golden
                </Badge>
              )}
            </div>
            <Badge
              className={cn(
                "text-sm font-bold",
                isPending
                  ? "bg-slate-700/50 text-slate-400 border-slate-600/30"
                  : isCorrect
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
              )}
            >
              {isPending ? "Pending" : isCorrect ? "Correct" : "Incorrect"}
            </Badge>
          </div>
          <CardTitle className="text-base text-slate-100">{title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* You vs Oracle vs Actual */}
          <div className={cn("grid gap-3 text-center text-sm", isPending ? "grid-cols-2" : "grid-cols-3")}>
            <div className="rounded-lg bg-slate-800/60 p-2">
              <p className="text-xs text-muted-foreground mb-1">Your Pick</p>
              <p className="font-semibold text-amber-400">{playerPrediction}</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-2">
              <p className="text-xs text-muted-foreground mb-1">Oracle Says</p>
              <p className="font-semibold text-purple-400">{oracleProbability}</p>
            </div>
            {!isPending && (
              <div className="rounded-lg bg-slate-800/60 p-2">
                <p className="text-xs text-muted-foreground mb-1">Actual</p>
                <p className="font-semibold text-white">{actualOutcome}</p>
              </div>
            )}
          </div>

          {/* Oracle reasoning toggle */}
          {oracleReasoning && (
            <button
              onClick={() => setShowOracle(!showOracle)}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              {showOracle ? "Hide" : "Show"} Oracle&apos;s reasoning
            </button>
          )}
          {showOracle && oracleReasoning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-3"
            >
              <p className="text-xs text-purple-300/80 italic">{oracleReasoning}</p>
            </motion.div>
          )}

          {/* Reasoning feedback */}
          {reasoningFeedback && (
            <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-blue-400">
                  Reasoning Score: {reasoningScore}/50
                </span>
              </div>
              <p className="text-xs text-blue-300/80">{reasoningFeedback}</p>
            </div>
          )}

          {/* Points breakdown (only when resolved) */}
          {revealed && !isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Separator className="bg-slate-800" />
              <div className="pt-2 space-y-1 text-xs">
                {points.base > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Base Points</span>
                    <span className="text-slate-200">+{points.base}</span>
                  </div>
                )}
                {points.contrarian > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Contrarian Bonus</span>
                    <span className="text-purple-400">+{points.contrarian}</span>
                  </div>
                )}
                {points.golden > 1 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Golden Multiplier</span>
                    <span className="text-amber-400">x{points.golden}</span>
                  </div>
                )}
                {points.streak > 1 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Streak Multiplier</span>
                    <span className="text-orange-400">x{points.streak}</span>
                  </div>
                )}
                {points.reasoning > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Reasoning Bonus</span>
                    <span className="text-blue-400">+{points.reasoning}</span>
                  </div>
                )}
                <Separator className="bg-slate-800" />
                <div className="flex justify-between font-bold text-sm pt-1">
                  <span className="text-slate-200">Total</span>
                  <span className="text-amber-400">{points.total}</span>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
