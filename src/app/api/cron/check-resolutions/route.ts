import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { checkResolutions as checkPolymarketResolutions } from "@/lib/polymarket";
import { checkResolutions as checkManifoldResolutions } from "@/lib/manifold";
import { calculateScore, getStreakMultiplier } from "@/lib/scoring";
import { addXP } from "@/lib/progression";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    // Get all daily_decks event_ids
    const { data: decks } = await supabase.from("daily_decks").select("id, event_ids, golden_card_index");
    if (!decks || decks.length === 0) {
      return NextResponse.json({ success: true, resolved: 0 });
    }

    const allEventIds = [...new Set(decks.flatMap((d: any) => d.event_ids as string[]))];

    // Get open events in decks
    const { data: openEvents } = await supabase
      .from("events")
      .select("*")
      .eq("resolution_status", "open")
      .in("id", allEventIds);

    if (!openEvents || openEvents.length === 0) {
      return NextResponse.json({ success: true, resolved: 0 });
    }

    // Split by source and check resolutions
    const polyIds = openEvents.filter((e: any) => e.source === "polymarket").map((e: any) => e.source_id);
    const manifoldIds = openEvents.filter((e: any) => e.source === "manifold").map((e: any) => e.source_id);

    const [polyRes, manifoldRes] = await Promise.all([
      polyIds.length > 0 ? checkPolymarketResolutions(polyIds) : [],
      manifoldIds.length > 0 ? checkManifoldResolutions(manifoldIds) : [],
    ]);

    const allResolutions = [...polyRes, ...manifoldRes].filter((r) => r.resolved);
    let resolvedCount = 0;

    // Map sourceId back to event DB id
    const sourceIdToEvent = new Map(openEvents.map((e: any) => [e.source_id, e]));

    for (const res of allResolutions) {
      const dbEvent = sourceIdToEvent.get(res.sourceId) as any;
      if (!dbEvent) continue;

      // Update event
      await supabase
        .from("events")
        .update({
          resolution_status: "resolved",
          resolution_outcome: res.winningOutcome ?? res.outcome,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", dbEvent.id);

      resolvedCount++;

      // Find which deck(s) contain this event and what index it is
      const relevantDecks = decks.filter((d: any) => (d.event_ids as string[]).includes(dbEvent.id));

      // Get all predictions for this event
      const { data: predictions } = await supabase
        .from("predictions")
        .select("*")
        .eq("event_id", dbEvent.id);

      if (!predictions) continue;

      const resolvedOutcome = res.winningOutcome ?? res.outcome ?? "";

      for (const pred of predictions as any[]) {
        // Check if this prediction's card was golden
        const deck = relevantDecks.find((d: any) => d.id === pred.deck_id);
        const eventIndex = deck ? (deck.event_ids as string[]).indexOf(dbEvent.id) : -1;
        const isGolden = deck ? eventIndex === deck.golden_card_index : false;

        // Get user streak
        const { data: user } = await supabase
          .from("users")
          .select("current_streak")
          .eq("id", pred.user_id)
          .single();

        const isCorrect = pred.predicted_outcome.toLowerCase() === resolvedOutcome.toLowerCase();

        const score = calculateScore({
          isCorrect,
          prediction: pred.predicted_outcome,
          marketProbability: dbEvent.market_probability ?? 0.5,
          isGoldenCard: isGolden,
          currentStreak: user?.current_streak ?? 0,
          reasoningBonus: pred.reasoning_score ?? 0,
        });

        await supabase.from("scores").insert({
          prediction_id: pred.id,
          user_id: pred.user_id,
          base_points: score.basePoints,
          contrarian_bonus: score.contrarianBonus,
          golden_multiplier: score.goldenMultiplier,
          streak_multiplier: score.streakMultiplier,
          reasoning_bonus: score.reasoningBonus,
          total_points: score.totalPoints,
        });

        // Update user XP
        const { data: fullUser } = await supabase
          .from("users")
          .select("xp, level")
          .eq("id", pred.user_id)
          .single();

        if (fullUser) {
          const xpResult = addXP(fullUser.xp, fullUser.level, score.totalPoints);
          await supabase
            .from("users")
            .update({ xp: xpResult.newXP, level: xpResult.newLevel })
            .eq("id", pred.user_id);
        }
      }
    }

    return NextResponse.json({ success: true, resolved: resolvedCount });
  } catch (error) {
    console.error("check-resolutions cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
