import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth";
import { evaluateGuardrails } from "@/lib/guardrails";
import { getActiveRules } from "@/lib/policy-cache";
import { writeAuditLog } from "@/lib/audit";

const VALID_ACTION_TYPES = ["email", "payment", "api", "database"];

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

  // 3. Validate inputs
  if (!payload || !action_type) {
    return NextResponse.json(
      { error: "payload and action_type are required" },
      { status: 400 }
    );
  }

  if (!VALID_ACTION_TYPES.includes(action_type)) {
    return NextResponse.json(
      { error: "Invalid action_type. Must be email, payment, api, or database" },
      { status: 400 }
    );
  }

  if (typeof payload !== "string" || payload.length > 10000) {
    return NextResponse.json(
      { error: "Payload must be a string under 10,000 characters" },
      { status: 400 }
    );
  }

  // 4. Sanitize payload
  const sanitizedPayload = payload
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();

  // 5. Scope mapping
  const scopeMap: Record<string, string> = {
    database: "db",
    email: "email",
    payment: "payment",
    api: "api",
  };
  const scope = scopeMap[action_type] || action_type;

  // 6. Fast guardrail check
  const rules = await getActiveRules();
  const guardrailResult = evaluateGuardrails(sanitizedPayload, scope as any, rules);

  if (guardrailResult.triggered && guardrailResult.action === "BLOCK") {
    const latency_ms = Date.now() - start;

    await writeAuditLog({
      agent_id: agent.id,
      payload: sanitizedPayload,
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
      payload: sanitizedPayload,
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

  // 7. LLM eval — placeholder until Anthropic key is added
  const latency_ms = Date.now() - start;

  await writeAuditLog({
    agent_id: agent.id,
    payload: sanitizedPayload,
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