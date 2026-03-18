import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const supabase = createServerClient();

    const body = await request.json();
    const { user_id, event_id, deck_id, deck_date, predicted_outcome, reasoning_text } = body;

    if (!user_id || !event_id || !predicted_outcome) {
      return NextResponse.json(
        { error: "Missing required fields: user_id, event_id, predicted_outcome" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from("predictions")
      .select("id")
      .eq("user_id", user_id)
      .eq("event_id", event_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You have already predicted on this event" },
        { status: 409 }
      );
    }

    const { data: prediction, error } = await supabase
      .from("predictions")
      .insert({
        user_id,
        event_id,
        deck_id: deck_id ?? null,
        deck_date: deck_date ?? null,
        predicted_outcome,
        reasoning_text: reasoning_text ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, prediction }, { status: 201 });
  } catch (error) {
    console.error("POST /predictions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createServerClient();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const deckDate = searchParams.get("deck_date");

    if (!userId || !deckDate) {
      return NextResponse.json(
        { error: "Missing required params: user_id, deck_date" },
        { status: 400 }
      );
    }

    const { data: predictions, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("user_id", userId)
      .eq("deck_date", deckDate);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("GET /predictions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
