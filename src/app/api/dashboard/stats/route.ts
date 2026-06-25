import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("[Stats] Missing env vars:", { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
      return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("decisions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Stats] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const decisions = data || [];

    const stats = {
      total: decisions.length,
      allowed: decisions.filter((d) => d.decision === "ALLOW").length,
      held: decisions.filter((d) => d.decision === "HOLD").length,
      blocked: decisions.filter((d) => d.decision === "BLOCK").length,
      approved: decisions.filter((d) => d.human_resolution === "approved").length,
      rejected: decisions.filter((d) => d.human_resolution === "rejected").length,
    };

    return NextResponse.json({ stats, feed: decisions });
  } catch (err) {
    console.error("[Stats] Unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}