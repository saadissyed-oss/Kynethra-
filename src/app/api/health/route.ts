import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const start = Date.now();

  const checks: Record<string, string> = {
    supabase: "unknown",
    anthropic: "unknown",
    slack: "unknown",
  };

  // Check Supabase
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { error } = await supabase.from("agents").select("id").limit(1);
    checks.supabase = error ? "error" : "ok";
  } catch {
    checks.supabase = "error";
  }

  // Check Anthropic key exists
  checks.anthropic = process.env.ANTHROPIC_API_KEY ? "configured" : "missing";

  // Check Slack webhook exists
  checks.slack = process.env.SLACK_WEBHOOK_URL ? "configured" : "missing";

  const allOk = checks.supabase === "ok";
  const latency = Date.now() - start;

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      latency_ms: latency,
      checks,
      version: "1.0.0",
    },
    { status: allOk ? 200 : 503 }
  );
}