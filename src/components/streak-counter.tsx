"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getStreakMultiplier } from "@/lib/scoring";

interface StreakCounterProps {
  streak: number;
  className?: string;
}

export function StreakCounter({ streak, className }: StreakCounterProps) {
  const multiplier = getStreakMultiplier(streak);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1">
        <span className="text-2xl" role="img" aria-label="fire">
          🔥
        </span>
        <span className="text-2xl font-bold text-amber-400 font-mono">
          {streak}
        </span>
      </div>
      {multiplier > 1 && (
        <Badge
          variant="secondary"
          className="bg-amber-500/20 text-amber-400 border-amber-500/30"
        >
          {multiplier}x
        </Badge>
      )}
      <span className="text-sm text-muted-foreground">day streak</span>
    </div>
  );
}
