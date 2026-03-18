import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { updateStreak } from "@/lib/progression";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Find users who played yesterday
    const { data: activePredictions } = await supabase
      .from("predictions")
      .select("user_id")
      .eq("deck_date", yesterdayStr);

    const activeUserIds = new Set(
      (activePredictions ?? []).map((p: any) => p.user_id as string)
    );

    // Get all users and update streaks
    const { data: allUsers } = await supabase
      .from("users")
      .select("id, current_streak, longest_streak");

    let streaksReset = 0;
    if (allUsers) {
      for (const user of allUsers as any[]) {
        if (!activeUserIds.has(user.id)) {
          // User didn't play yesterday — reset streak
          const { newStreak, streakBroken } = updateStreak(null, 0);
          if (streakBroken || user.current_streak > 0) {
            await supabase
              .from("users")
              .update({ current_streak: 0 })
              .eq("id", user.id);
            streaksReset++;
          }
        } else {
          // User played — increment streak
          const result = updateStreak(yesterdayStr, user.current_streak);
          const longestStreak = Math.max(user.longest_streak ?? 0, result.newStreak);
          await supabase
            .from("users")
            .update({
              current_streak: result.newStreak,
              longest_streak: longestStreak,
            })
            .eq("id", user.id);
        }
      }
    }

    // Snapshot leaderboards
    const periods = ["daily", "weekly", "alltime"] as const;

    for (const period of periods) {
      let query = supabase.from("scores").select("user_id, total_points");

      if (period === "daily") {
        query = query
          .gte("created_at", `${yesterdayStr}T00:00:00Z`)
          .lte("created_at", `${yesterdayStr}T23:59:59Z`);
      } else if (period === "weekly") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte("created_at", weekAgo.toISOString());
      }

      const { data: scores } = await query;
      if (!scores || scores.length === 0) continue;

      // Aggregate by user
      const userTotals = new Map<string, number>();
      for (const s of scores as any[]) {
        userTotals.set(s.user_id, (userTotals.get(s.user_id) ?? 0) + (s.total_points ?? 0));
      }

      const ranked = [...userTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([userId, totalScore], i) => ({
          user_id: userId,
          period,
          rank: i + 1,
          total_score: totalScore,
          snapshot_at: new Date().toISOString(),
        }));

      if (ranked.length > 0) {
        await supabase.from("leaderboards").insert(ranked);
      }
    }

    return NextResponse.json({
      success: true,
      streaks_reset: streaksReset,
    });
  } catch (error) {
    console.error("daily-maintenance cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
