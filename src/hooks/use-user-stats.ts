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

        const p = profile as any;

        // Count predictions
        const { count: totalPredictions } = await supabase
          .from("predictions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        // Count correct predictions (scores with base_points > 0)
        const { count: correctCount } = await supabase
          .from("scores")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gt("base_points", 0);

        // Sum total score
        const { data: scoreSum } = await supabase
          .from("scores")
          .select("total_points")
          .eq("user_id", user.id);

        const totalScore = (scoreSum ?? []).reduce(
          (sum: number, s: any) => sum + (s.total_points ?? 0),
          0
        );

        // Recent scores by date
        const { data: recentScores } = await supabase
          .from("scores")
          .select("total_points, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(7);

        // Fetch achievements
        const { data: achievements } = await supabase
          .from("achievements")
          .select("achievement_type")
          .eq("user_id", user.id);

        const { xpForLevel } = await import("@/lib/progression");

        const total = totalPredictions ?? 0;
        const correct = correctCount ?? 0;

        setStats({
          userId: user.id,
          displayName: p.display_name ?? "Oracle Seeker",
          avatarUrl: p.avatar_url ?? null,
          level: p.level ?? 1,
          xp: p.xp ?? 0,
          xpForNextLevel: xpForLevel(p.level ?? 1),
          streak: p.current_streak ?? 0,
          rank: null,
          totalPredictions: total,
          accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
          bestStreak: p.longest_streak ?? 0,
          totalScore,
          recentScores:
            recentScores?.map((s: any) => ({
              date: new Date(s.created_at).toLocaleDateString(),
              score: s.total_points ?? 0,
            })) ?? [],
          unlockedAchievements:
            achievements?.map((a: any) => a.achievement_type) ?? [],
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
