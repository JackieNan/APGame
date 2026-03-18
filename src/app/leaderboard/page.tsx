"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  LeaderboardTable,
  type LeaderboardEntry,
} from "@/components/leaderboard-table";

type Period = "daily" | "weekly" | "alltime";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Record<Period, LeaderboardEntry[]>>({
    daily: [],
    weekly: [],
    alltime: [],
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<Period>("daily");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard("daily");
  }, []);

  async function fetchLeaderboard(period: Period) {
    setIsLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    // Query scores table and aggregate
    let query = supabase.from("scores").select("user_id, total_points, created_at");

    if (period === "daily") {
      const today = new Date().toISOString().split("T")[0];
      query = query
        .gte("created_at", `${today}T00:00:00Z`)
        .lte("created_at", `${today}T23:59:59Z`);
    } else if (period === "weekly") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte("created_at", weekAgo.toISOString());
    }

    const { data: scores } = await query;

    if (!scores || scores.length === 0) {
      setEntries((prev) => ({ ...prev, [period]: [] }));
      setIsLoading(false);
      return;
    }

    // Aggregate by user
    const userScores = new Map<string, number>();
    for (const s of scores as any[]) {
      userScores.set(
        s.user_id,
        (userScores.get(s.user_id) ?? 0) + (s.total_points ?? 0)
      );
    }

    // Get user profiles
    const userIds = [...userScores.keys()];
    const { data: profiles } = await supabase
      .from("users")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p: any) => [p.id, p])
    );

    const ranked: LeaderboardEntry[] = [...userScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([userId, score], i) => {
        const profile = profileMap.get(userId) as any;
        return {
          rank: i + 1,
          userId,
          displayName: profile?.display_name ?? "Unknown",
          avatarUrl: profile?.avatar_url ?? null,
          score,
        };
      });

    setEntries((prev) => ({ ...prev, [period]: ranked }));
    setIsLoading(false);
  }

  function handleTabChange(period: string) {
    const p = period as Period;
    setActivePeriod(p);
    if (entries[p].length === 0) {
      fetchLeaderboard(p);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          The Oracle ranks all who dare to predict
        </p>
      </div>

      <Tabs defaultValue="daily" onValueChange={handleTabChange}>
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger
            value="daily"
            className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
          >
            Daily
          </TabsTrigger>
          <TabsTrigger
            value="weekly"
            className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
          >
            Weekly
          </TabsTrigger>
          <TabsTrigger
            value="alltime"
            className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
          >
            All Time
          </TabsTrigger>
        </TabsList>

        {(["daily", "weekly", "alltime"] as const).map((period) => (
          <TabsContent key={period} value={period}>
            <Card className="bg-slate-900/80 border-slate-800/50">
              <CardContent className="pt-4">
                {isLoading && activePeriod === period ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    Loading rankings...
                  </p>
                ) : entries[period].length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No scores yet for this period.
                  </p>
                ) : (
                  <LeaderboardTable
                    entries={entries[period]}
                    currentUserId={currentUserId}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
