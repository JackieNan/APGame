import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// Called after signup to create user profile (bypasses RLS)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, email, display_name } = body;

    if (!user_id || !email) {
      return NextResponse.json({ error: "Missing user_id or email" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase.from("users").upsert({
      id: user_id,
      email,
      display_name: display_name || "Oracle Seeker",
    }, { onConflict: "id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/create-profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
