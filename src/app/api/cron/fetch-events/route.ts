import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { fetchActiveEvents as fetchPolymarketEvents } from "@/lib/polymarket";
import { fetchActiveEvents as fetchManifoldEvents } from "@/lib/manifold";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    // Fetch with graceful fallback — if one source fails, use the other
    const results = await Promise.allSettled([
      fetchPolymarketEvents(),
      fetchManifoldEvents(),
    ]);

    const polymarketEvents = results[0].status === "fulfilled" ? results[0].value : [];
    const manifoldEvents = results[1].status === "fulfilled" ? results[1].value : [];

    if (results[0].status === "rejected") console.warn("Polymarket fetch failed:", results[0].reason);
    if (results[1].status === "rejected") console.warn("Manifold fetch failed:", results[1].reason);

    const allEvents = [...polymarketEvents, ...manifoldEvents];
    let upsertedCount = 0;

    for (const event of allEvents) {
      const { error } = await supabase.from("events").upsert(
        {
          source: event.source,
          source_id: event.sourceId,
          title: event.title,
          description: event.description,
          category: event.category,
          market_probability: event.marketProbability,
          outcomes: event.outcomes,
          time_horizon: event.timeHorizon,
          raw_json: event.rawJson,
          resolution_status: "open",
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "source,source_id" }
      );

      if (error) {
        console.error("Upsert error for event:", event.sourceId, error);
        continue;
      }
      upsertedCount++;
    }

    return NextResponse.json({
      success: true,
      upserted: upsertedCount,
      total: allEvents.length,
    });
  } catch (error) {
    console.error("fetch-events cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
