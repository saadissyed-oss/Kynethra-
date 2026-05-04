export type GuardrailAction = "BLOCK" | "HOLD";
export type GuardrailSeverity = "critical" | "high" | "medium";
export type ActionScope = "db" | "email" | "payment" | "api" | "*";

export interface GuardrailRule {
  id: string;
  name: string;
  pattern: RegExp;
  scope: ActionScope;
  action: GuardrailAction;
  severity: GuardrailSeverity;
  enabled: boolean;
}

export interface GuardrailResult {
  triggered: boolean;
  ruleId?: string;
  action?: GuardrailAction;
  severity?: GuardrailSeverity;
  ruleName?: string;
}

export const DEFAULT_RULES: GuardrailRule[] = [
  {
    id: "GR-01",
    name: "DDL Guard",
    pattern: /\b(DROP|TRUNCATE)\b/i,
    scope: "db",
    action: "BLOCK",
    severity: "critical",
    enabled: true,
  },
  {
    id: "GR-02",
    name: "Bulk Delete",
    pattern: /DELETE\s+FROM/i,
    scope: "db",
    action: "HOLD",
    severity: "high",
    enabled: true,
  },
  {
    id: "GR-03",
    name: "PII Export",
    pattern: /pii=true|include_pii|export.*email/i,
    scope: "api",
    action: "BLOCK",
    severity: "critical",
    enabled: true,
  },
  {
    id: "GR-04",
    name: "Credential Leak",
    pattern: /(password|api_key|secret)=\S+/i,
    scope: "*",
    action: "BLOCK",
    severity: "critical",
    enabled: true,
  },
  {
    id: "GR-05",
    name: "Large Payment",
    pattern: /\$\d{2,},|\b\d{5,}\b/,
    scope: "payment",
    action: "HOLD",
    severity: "high",
    enabled: true,
  },
  {
    id: "GR-06",
    name: "Mass Email",
    pattern: /\d{3,}\s+(users|customers|recipients)/i,
    scope: "email",
    action: "HOLD",
    severity: "high",
    enabled: true,
  },
  {
    id: "GR-07",
    name: "Privilege Escalation",
    pattern: /\b(sudo|root|admin access)\b/i,
    scope: "*",
    action: "HOLD",
    severity: "high",
    enabled: true,
  },
  {
    id: "GR-08",
    name: "External Write",
    pattern: /\b(POST|PUT|PATCH)\b/,
    scope: "api",
    action: "HOLD",
    severity: "medium",
    enabled: true,
  },
];

export function evaluateGuardrails(
  payload: string,
  scope: ActionScope,
  rules: GuardrailRule[] = DEFAULT_RULES
): GuardrailResult {
  const start = Date.now();

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.scope !== "*" && rule.scope !== scope) continue;

    if (rule.pattern.test(payload)) {
      const elapsed = Date.now() - start;
      console.log(`[Guardrail] ${rule.id} triggered in ${elapsed}ms`);
      return {
        triggered: true,
        ruleId: rule.id,
        action: rule.action,
        severity: rule.severity,
        ruleName: rule.name,
      };
    }
  }

  return { triggered: false };
}