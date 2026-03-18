"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface UserStatsData {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  xpForNextLevel: number;
  streak: number;
  rank: number | null;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  bestStreak: number;
  totalScore: number;
  recentScores: { date: string; score: number }[];
  unlockedAchievements: string[];
}

export function useUserStats() {
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsLoading(false);
          return;
        }

        // Fetch user profile
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!profile) {
          setIsLoading(false);
          return;
        }

        // Fetch recent daily scores
        const { data: recentResults } = await supabase
          .from("daily_results")
          .select("deck_date, total_score")
          .eq("user_id", user.id)
          .order("deck_date", { ascending: false })
          .limit(7);

        // Fetch rank (count users with higher total score)
        const { count: higherCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .gt("total_score", profile.total_score ?? 0);

        const { xpForLevel } = await import("@/lib/progression");

        setStats({
          userId: user.id,
          displayName: profile.display_name ?? "Oracle Seeker",
          avatarUrl: profile.avatar_url ?? null,
          level: profile.level ?? 1,
          xp: profile.xp ?? 0,
          xpForNextLevel: xpForLevel(profile.level ?? 1),
          streak: profile.current_streak ?? 0,
          rank: higherCount != null ? higherCount + 1 : null,
          totalPredictions: profile.total_predictions ?? 0,
          correctPredictions: profile.correct_predictions ?? 0,
          accuracy:
            profile.total_predictions > 0
              ? Math.round(
                  ((profile.correct_predictions ?? 0) /
                    profile.total_predictions) *
                    100
                )
              : 0,
          bestStreak: profile.best_streak ?? 0,
          totalScore: profile.total_score ?? 0,
          recentScores:
            recentResults?.map((r: any) => ({
              date: r.deck_date,
              score: r.total_score,
            })) ?? [],
          unlockedAchievements: profile.unlocked_achievements ?? [],
        });
      } catch (err) {
        console.error("Failed to fetch user stats:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  return { stats, isLoading };
}
