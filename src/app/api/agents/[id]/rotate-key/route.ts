import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateAgent } from "@/lib/auth";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Authenticate existing key
  const { agent, error } = await authenticateAgent(req);
  if (error || !agent) {
    return NextResponse.json({ error }, { status: 401 });
  }

  // Can only rotate your own key
  if (agent.id !== params.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Generate new key
  const rawKey = crypto.randomBytes(32).toString("hex");
  const hashedKey = crypto
    .createHash("sha256")
    .update(rawKey)
    .digest("hex");

  // Update in database
  const { data, error: updateError } = await supabase
    .from("agents")
    .update({ api_key_hash: hashedKey })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError || !data) {
    return NextResponse.json(
      { error: "Failed to rotate key" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "API key rotated successfully. Save this key — it will not be shown again.",
    api_key: rawKey,
    agent_id: params.id,
  });
}