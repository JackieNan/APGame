"use client";

import { cn } from "@/lib/utils";

interface ProbabilityGaugeProps {
  probability: number; // 0-1
  playerPrediction?: "Yes" | "No" | null;
  className?: string;
}

export function ProbabilityGauge({
  probability,
  playerPrediction,
  className,
}: ProbabilityGaugeProps) {
  const pct = Math.round(probability * 100);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Market Probability</span>
        <span className="font-mono font-semibold text-amber-400">{pct}%</span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%)`,
          }}
        />
        {playerPrediction && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]"
            style={{ left: `${playerPrediction === "Yes" ? pct : 100 - pct}%` }}
          />
        )}
      </div>
    </div>
  );
}
