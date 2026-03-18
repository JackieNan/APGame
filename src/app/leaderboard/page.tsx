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

    let data: any[] | null = null;

    if (period === "alltime") {
      const res = await supabase
        .from("users")
        .select("id, display_name, avatar_url, total_score")
        .order("total_score", { ascending: false })
        .limit(50);
      data = res.data;
    } else {
      // daily or weekly - query daily_results aggregated
      const today = new Date();
      let startDate: string;

      if (period === "daily") {
        startDate = today.toISOString().split("T")[0];
      } else {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split("T")[0];
      }

      const res = await supabase
        .from("daily_results")
        .select("user_id, total_score, users(display_name, avatar_url)")
        .gte("deck_date", startDate)
        .order("total_score", { ascending: false })
        .limit(50);

      if (res.data) {
        // Aggregate scores per user
        const userScores = new Map<
          string,
          { displayName: string; avatarUrl: string | null; score: number }
        >();

        for (const row of res.data as any[]) {
          const uid = row.user_id;
          const existing = userScores.get(uid);
          if (existing) {
            existing.score += row.total_score ?? 0;
          } else {
            userScores.set(uid, {
              displayName: row.users?.display_name ?? "Unknown",
              avatarUrl: row.users?.avatar_url ?? null,
              score: row.total_score ?? 0,
            });
          }
        }

        const sorted = [...userScores.entries()]
          .sort((a, b) => b[1].score - a[1].score)
          .map(([userId, info], i) => ({
            rank: i + 1,
            userId,
            displayName: info.displayName,
            avatarUrl: info.avatarUrl,
            score: info.score,
          }));

        setEntries((prev) => ({ ...prev, [period]: sorted }));
        setIsLoading(false);
        return;
      }
    }

    if (data) {
      const mapped: LeaderboardEntry[] = data.map((row: any, i: number) => ({
        rank: i + 1,
        userId: row.id,
        displayName: row.display_name ?? "Unknown",
        avatarUrl: row.avatar_url ?? null,
        score: row.total_score ?? 0,
      }));
      setEntries((prev) => ({ ...prev, [period]: mapped }));
    }

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
