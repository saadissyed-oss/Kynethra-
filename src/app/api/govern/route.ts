import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth";
import { evaluateGuardrails } from "@/lib/guardrails";
import { getActiveRules } from "@/lib/policy-cache";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const start = Date.now();

  // 1. Authenticate
  const { agent, error } = await authenticateAgent(req);
  if (error || !agent) {
    return NextResponse.json({ error }, { status: 401 });
  }

  // 2. Parse body
  let body: { payload: string; action_type: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { payload, action_type } = body;

  if (!payload || !action_type) {
    return NextResponse.json(
      { error: "payload and action_type are required" },
      { status: 400 }
    );
  }

  // 3. Scope mapping
  const scopeMap: Record<string, string> = {
    database: "db",
    email: "email",
    payment: "payment",
    api: "api",
  };
  const scope = scopeMap[action_type] || action_type;

  // 4. Fast guardrail check
  const rules = await getActiveRules();
  const guardrailResult = evaluateGuardrails(payload, scope as any, rules);

  if (guardrailResult.triggered && guardrailResult.action === "BLOCK") {
    const latency_ms = Date.now() - start;

    await writeAuditLog({
      agent_id: agent.id,
      payload,
      action_type,
      decision: "BLOCK",
      guardrail_hit: guardrailResult.ruleId,
      eval_path: "fast-block",
      reason: `Blocked by ${guardrailResult.ruleName}`,
      latency_ms,
    });

    return NextResponse.json({
      decision: "BLOCK",
      reason: `Blocked by guardrail ${guardrailResult.ruleId}: ${guardrailResult.ruleName}`,
      latency_ms,
    });
  }

  if (guardrailResult.triggered && guardrailResult.action === "HOLD") {
    const latency_ms = Date.now() - start;

    await writeAuditLog({
      agent_id: agent.id,
      payload,
      action_type,
      decision: "HOLD",
      guardrail_hit: guardrailResult.ruleId,
      eval_path: "fast-block",
      reason: `Held by ${guardrailResult.ruleName}`,
      latency_ms,
    });

    return NextResponse.json({
      decision: "HOLD",
      reason: `Held by guardrail ${guardrailResult.ruleId}: ${guardrailResult.ruleName}`,
      latency_ms,
    });
  }

  // 5. LLM eval — placeholder until Anthropic key is added
  const latency_ms = Date.now() - start;

  await writeAuditLog({
    agent_id: agent.id,
    payload,
    action_type,
    decision: "ALLOW",
    eval_path: "llm-eval",
    reason: "Passed guardrails — LLM eval pending",
    latency_ms,
  });

  return NextResponse.json({
    decision: "ALLOW",
    reason: "Passed all guardrails",
    latency_ms,
  });
}