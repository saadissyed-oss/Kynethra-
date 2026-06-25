import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function authenticateOperator(req: NextRequest): boolean {
  const key = req.headers.get("X-Kynethra-Operator-Key");
  const expected = process.env.NEXT_PUBLIC_OPERATOR_KEY;
  return !!(expected && key && key === expected);
}

export async function authenticateAgent(req: NextRequest) {
  const apiKey = req.headers.get("X-Kynethra-Key");

  if (!apiKey) {
    return { agent: null, error: "Missing X-Kynethra-Key header" };
  }

  // Hash the incoming key
  const { createHash } = await import("crypto");
  const hashedKey = createHash("sha256").update(apiKey).digest("hex");

  // Look up agent by hashed key
  const { data: agent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("api_key_hash", hashedKey)
    .eq("status", "active")
    .single();

  if (error || !agent) {
    return { agent: null, error: "Invalid or inactive API key" };
  }

  return { agent, error: null };
}