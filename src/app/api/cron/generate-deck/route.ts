import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { curateDailyDeck } from "@/lib/ai/curator";
import { generateOraclePredictions } from "@/lib/ai/oracle";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    // Get open events fetched recently
    const { data: candidates, error: fetchError } = await supabase
      .from("events")
      .select("*")
      .eq("resolution_status", "open")
      .order("fetched_at", { ascending: false })
      .limit(100);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!candidates || candidates.length < 5) {
      return NextResponse.json(
        { error: "Not enough candidate events", count: candidates?.length ?? 0 },
        { status: 400 }
      );
    }

    // Map DB rows to the format curator expects
    const curatorInput = candidates.map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      resolutionDate: e.resolved_at ?? "",
      currentProbability: e.market_probability,
      source: e.source,
    }));

    const curatedDeck = await curateDailyDeck(curatorInput);
    const goldenCardIndex = Math.floor(Math.random() * 5);

    const deckDate = new Date().toISOString().split("T")[0];

    const eventIds = curatedDeck.events.map((e) => e.eventId);

    // Delete existing deck for this date (allows regeneration)
    await supabase.from("daily_decks").delete().eq("date", deckDate);

    const { data: deck, error: deckError } = await supabase
      .from("daily_decks")
      .insert({
        date: deckDate,
        event_ids: eventIds,
        golden_card_index: goldenCardIndex,
      })
      .select()
      .single();

    if (deckError) {
      return NextResponse.json({ error: deckError.message }, { status: 500 });
    }

    // Update hook_text on events
    for (const ce of curatedDeck.events) {
      await supabase
        .from("events")
        .update({ hook_text: ce.hookText, time_horizon: ce.timeHorizon })
        .eq("id", ce.eventId);
    }

    // Generate oracle predictions
    const oracleInput = curatorInput.filter((e: any) => eventIds.includes(e.id));
    const oraclePredictions = await generateOraclePredictions(oracleInput);

    const oracleRows = oraclePredictions.map((pred) => ({
      deck_id: deck.id,
      event_id: pred.eventId,
      predicted_probability: pred.predictedProbability,
      claude_reasoning: pred.reasoning,
    }));

    await supabase.from("oracle_predictions").insert(oracleRows);

    return NextResponse.json({
      success: true,
      deck_id: deck.id,
      deck_date: deckDate,
      golden_card_index: goldenCardIndex,
      events: eventIds,
    });
  } catch (error) {
    console.error("generate-deck cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
