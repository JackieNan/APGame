"use client";

import { useUserStats } from "@/hooks/use-user-stats";
import { getRankTitle, ACHIEVEMENTS } from "@/lib/progression";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { stats, isLoading } = useUserStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-4xl animate-pulse">✦</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">
          Sign in to view your profile.
        </p>
      </div>
    );
  }

  const rankTitle = getRankTitle(stats.level);
  const xpPercent = Math.round((stats.xp / stats.xpForNextLevel) * 100);

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="bg-slate-900/80 border-slate-800/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-amber-500/20 text-amber-400 text-xl font-bold">
                {stats.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-100">
                {stats.displayName}
              </h1>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Lv. {stats.level}
                </Badge>
                <span className="text-sm text-slate-400">{rankTitle}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>XP Progress</span>
              <span className="font-mono">
                {stats.xp} / {stats.xpForNextLevel}
              </span>
            </div>
            <Progress value={xpPercent} className="h-2 bg-slate-800" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Total Predictions",
            value: stats.totalPredictions.toLocaleString(),
          },
          { label: "Accuracy", value: `${stats.accuracy}%` },
          { label: "Best Streak", value: `🔥 ${stats.bestStreak}` },
          { label: "Current Streak", value: `🔥 ${stats.streak}` },
          {
            label: "Total Score",
            value: stats.totalScore.toLocaleString(),
          },
          {
            label: "Rank",
            value: stats.rank ? `#${stats.rank}` : "—",
          },
        ].map((item) => (
          <Card
            key={item.label}
            className="bg-slate-900/80 border-slate-800/50"
          >
            <CardContent className="pt-4 text-center">
              <p className="text-lg font-bold text-amber-400 font-mono">
                {item.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {item.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Achievements */}
      <Card className="bg-slate-900/80 border-slate-800/50">
        <CardHeader>
          <CardTitle className="text-base text-amber-400">
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {ACHIEVEMENTS.map((ach) => {
              const unlocked = stats.unlockedAchievements.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className={cn(
                    "rounded-lg border p-3 transition-all",
                    unlocked
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-slate-800 bg-slate-800/30 opacity-50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">
                      {unlocked ? "🏆" : "🔒"}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        unlocked ? "text-amber-400" : "text-slate-500"
                      )}
                    >
                      {ach.name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ach.description}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
