import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { agent, error } = await authenticateAgent(req);

  if (error || !agent) {
    return NextResponse.json({ error }, { status: 401 });
  }

  return NextResponse.json({
    message: "Authenticated successfully",
    agent: {
      id: agent.id,
      name: agent.name,
      framework: agent.framework,
      permissions: agent.permissions,
    },
  });
}