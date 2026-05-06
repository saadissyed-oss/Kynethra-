import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
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
}