import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateAgent } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  // Authenticate
  const { agent, error } = await authenticateAgent(req);
  if (error || !agent) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { id } = params;

  let body: { resolution: string; resolved_by: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { resolution, resolved_by } = body;

  if (!resolution || !["approved", "rejected"].includes(resolution)) {
    return NextResponse.json(
      { error: "resolution must be 'approved' or 'rejected'" },
      { status: 400 }
    );
  }

  const { data, error: updateError } = await supabase
    .from("decisions")
    .update({
      human_resolution: resolution,
      resolved_by,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("decision", "HOLD")
    .select()
    .single();

  if (updateError || !data) {
    return NextResponse.json(
      { error: "Decision not found or not in HOLD state" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    message: `Decision ${resolution} successfully`,
    decision: data,
  });
}