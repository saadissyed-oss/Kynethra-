import { validateEnv } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth";
import { evaluateGuardrails, ActionScope } from "@/lib/guardrails";
import { getActiveRules } from "@/lib/policy-cache";
import { writeAuditLog } from "@/lib/audit";
import { sendSlackNotification } from "@/lib/notify";
import { checkRateLimit } from "@/lib/rate-limit";
import { evaluateLLM } from "@/lib/llm-eval";

validateEnv();

const VALID_ACTION_TYPES = ["email", "payment", "api", "database"];

export async function POST(req: NextRequest) {
  const start = Date.now();

  // 1. Authenticate
  const { agent, error } = await authenticateAgent(req);
  if (error || !agent) {
    return NextResponse.json({ error }, { status: 401 });
  }

  // 2. Rate limiting
  const apiKey = req.headers.get("X-Kynethra-Key") || "";
  const rateLimit = checkRateLimit(apiKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 100 requests per minute per agent key." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetAt),
        },
      }
    );
  }

  // 3. Parse body
  let body: { payload: string; action_type: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { payload, action_type } = body;

  // 4. Validate inputs
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

  // 5. Sanitize payload
  const sanitizedPayload = payload
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();

  // 6. Scope mapping
  const scopeMap: Record<string, string> = {
    database: "db",
    email: "email",
    payment: "payment",
    api: "api",
  };
  const scope = scopeMap[action_type] || action_type;

  // 7. Fast guardrail check
  const rules = await getActiveRules();
  const guardrailResult = evaluateGuardrails(sanitizedPayload, scope as ActionScope, rules);

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

  // 8. LLM risk evaluation
  const llmResult = await evaluateLLM(sanitizedPayload, action_type);

  // 9. Conservative merge — stricter of guardrail + LLM wins
  let finalDecision = llmResult.decision;
  if (guardrailResult.triggered && guardrailResult.action === "HOLD") {
    finalDecision = "HOLD";
  }

  const latency_ms = Date.now() - start;

  // 10. Write audit log
  const auditRow = await writeAuditLog({
    agent_id: agent.id,
    payload: sanitizedPayload,
    action_type,
    decision: finalDecision,
    risk_score: llmResult.risk_score,
    blast_radius: llmResult.blast_radius as ActionScope,
    reversible: llmResult.reversible,
    intent: llmResult.intent,
    reason: llmResult.reason,
    guardrail_hit: guardrailResult.ruleId,
    eval_path: "llm-eval",
    latency_ms,
  });

  // 11. Slack notification on HOLD
  if (finalDecision === "HOLD") {
    sendSlackNotification({
      agent_id: agent.id,
      action_type,
      payload: sanitizedPayload,
      decision: "HOLD",
      guardrail_hit: guardrailResult.ruleId,
      reason: llmResult.reason,
      risk_score: llmResult.risk_score,
      blast_radius: llmResult.blast_radius,
      decision_id: auditRow.id,
      latency_ms,
    });
  }

  return NextResponse.json({
    decision: finalDecision,
    intent: llmResult.intent,
    risk_score: llmResult.risk_score,
    blast_radius: llmResult.blast_radius,
    reversible: llmResult.reversible,
    reason: llmResult.reason,
    latency_ms,
  });
}