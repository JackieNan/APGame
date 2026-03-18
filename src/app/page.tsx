"use client";

import { useUserStats } from "@/hooks/use-user-stats";
import { useDailyDeck } from "@/hooks/use-daily-deck";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StreakCounter } from "@/components/streak-counter";
import { getRankTitle } from "@/lib/progression";
import Link from "next/link";

export default function Dashboard() {
  const { stats, isLoading: statsLoading } = useUserStats();
  const { hasPlayed, isLoading: deckLoading } = useDailyDeck();

  if (statsLoading || deckLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse">✦</div>
          <p className="text-muted-foreground text-sm">
            Consulting the Oracle...
          </p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-amber-400">
            ✦ The Oracle Awaits
          </h1>
          <p className="text-slate-400 max-w-md">
            Predict real-world events. Compete against the Oracle AI. Climb the
            ranks.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/login">
            <Button
              variant="outline"
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              Sign In
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-amber-500 text-black hover:bg-amber-400">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const xpPercent = Math.round((stats.xp / stats.xpForNextLevel) * 100);
  const rankTitle = getRankTitle(stats.level);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-100">
          Welcome back, {stats.displayName}
        </h1>
        <p className="text-muted-foreground text-sm">
          The Oracle has prepared today&apos;s predictions for you.
        </p>
      </div>

      {/* Streak */}
      <StreakCounter streak={stats.streak} />

      {/* Level + XP */}
      <Card className="bg-slate-900/80 border-slate-800/50">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                Lv. {stats.level}
              </Badge>
              <span className="text-sm text-slate-300">{rankTitle}</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {stats.xp} / {stats.xpForNextLevel} XP
            </span>
          </div>
          <Progress
            value={xpPercent}
            className="h-2 bg-slate-800"
          />
        </CardContent>
      </Card>

      {/* Today's Deck Status */}
      <Card className="bg-slate-900/80 border-slate-800/50">
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s Deck</CardTitle>
        </CardHeader>
        <CardContent>
          {hasPlayed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-lg">&#10003;</span>
                <span className="text-slate-300 text-sm">
                  Predictions submitted
                </span>
              </div>
              <Link href="/results">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  View Results
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">
                5 events await your predictions
              </span>
              <Link href="/play">
                <Button
                  size="sm"
                  className="bg-amber-500 text-black hover:bg-amber-400"
                >
                  Play Now
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Scores */}
      {stats.recentScores.length > 0 && (
        <Card className="bg-slate-900/80 border-slate-800/50">
          <CardHeader>
            <CardTitle className="text-base">Recent Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentScores.map((s) => (
                <div
                  key={s.date}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{s.date}</span>
                  <span className="font-mono font-semibold text-amber-400">
                    {s.score} pts
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Rank", value: stats.rank ? `#${stats.rank}` : "—" },
          { label: "Accuracy", value: `${stats.accuracy}%` },
          { label: "Total Score", value: stats.totalScore.toLocaleString() },
        ].map((item) => (
          <Card key={item.label} className="bg-slate-900/80 border-slate-800/50">
            <CardContent className="pt-4 text-center">
              <p className="text-xl font-bold text-amber-400 font-mono">
                {item.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {item.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
