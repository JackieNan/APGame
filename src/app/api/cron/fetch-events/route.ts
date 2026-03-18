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

    const [polymarketEvents, manifoldEvents] = await Promise.all([
      fetchPolymarketEvents(),
      fetchManifoldEvents(),
    ]);

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
