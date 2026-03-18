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

export function ResultReveal({
  index,
  title,
  category,
  playerPrediction,
  actualOutcome,
  oraclePrediction,
  isCorrect,
  isGolden,
  points,
}: ResultRevealProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, rotateY: 90 }}
      animate={{ opacity: 1, rotateY: 0 }}
      transition={{
        delay: index * 0.3,
        duration: 0.5,
        ease: "easeOut",
      }}
      onAnimationComplete={() => setRevealed(true)}
      style={{ perspective: 1000 }}
    >
      <Card
        className={cn(
          "border-slate-800/50 bg-slate-900/80 backdrop-blur overflow-hidden",
          isCorrect && "border-green-500/30",
          !isCorrect && "border-red-500/30",
          isGolden &&
            "shadow-[0_0_30px_rgba(245,158,11,0.2)] border-amber-500/40"
        )}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-slate-800 text-slate-400 text-xs"
              >
                {category}
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
                isCorrect
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-red-500/20 text-red-400 border-red-500/30"
              )}
            >
              {isCorrect ? "Correct" : "Incorrect"}
            </Badge>
          </div>
          <CardTitle className="text-base text-slate-100">{title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-lg bg-slate-800/60 p-2">
              <p className="text-xs text-muted-foreground mb-1">You</p>
              <p className="font-semibold text-amber-400">{playerPrediction}</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-2">
              <p className="text-xs text-muted-foreground mb-1">Actual</p>
              <p className="font-semibold text-white">{actualOutcome}</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-2">
              <p className="text-xs text-muted-foreground mb-1">Oracle</p>
              <p className="font-semibold text-purple-400">
                {oraclePrediction}
              </p>
            </div>
          </div>

          {revealed && (
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
                    <span className="text-purple-400">
                      +{points.contrarian}
                    </span>
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
