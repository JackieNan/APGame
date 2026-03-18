import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { scoreReasoning } from "@/lib/ai/reasoning-scorer";

export async function POST(request: Request) {
  try {
    const supabase = createServerClient();

    const body = await request.json();
    const { prediction_id } = body;

    if (!prediction_id) {
      return NextResponse.json(
        { error: "Missing required field: prediction_id" },
        { status: 400 }
      );
    }

    // Get prediction with event details
    const { data: prediction, error: fetchError } = await supabase
      .from("predictions")
      .select("*")
      .eq("id", prediction_id)
      .single();

    if (fetchError || !prediction) {
      return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
    }

    const pred = prediction as any;

    if (!pred.reasoning_text) {
      return NextResponse.json({ error: "No reasoning text to score" }, { status: 400 });
    }

    // Get event details
    const { data: event } = await supabase
      .from("events")
      .select("title, description, market_probability")
      .eq("id", pred.event_id)
      .single();

    const evt = event as any;

    const result = await scoreReasoning(
      evt?.title ?? "",
      evt?.description ?? "",
      evt?.market_probability ?? 0.5,
      pred.predicted_outcome,
      pred.reasoning_text
    );

    await supabase
      .from("predictions")
      .update({
        reasoning_score: result.score,
        reasoning_feedback: result.feedback,
      })
      .eq("id", prediction_id);

    return NextResponse.json({
      success: true,
      reasoning_score: result.score,
      reasoning_feedback: result.feedback,
    });
  } catch (error) {
    console.error("POST /reasoning error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
