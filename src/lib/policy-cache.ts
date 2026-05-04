import { createClient } from "@supabase/supabase-js";
import { GuardrailRule, DEFAULT_RULES } from "./guardrails";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PolicyCache {
  rules: GuardrailRule[];
  lastUpdated: number;
}

let cache: PolicyCache = {
  rules: DEFAULT_RULES,
  lastUpdated: 0,
};

const POLL_INTERVAL_MS = 50;

export async function getActiveRules(): Promise<GuardrailRule[]> {
  const now = Date.now();

  if (now - cache.lastUpdated < POLL_INTERVAL_MS) {
    return cache.rules;
  }

  try {
    const { data, error } = await supabase
      .from("policies")
      .select("*")
      .order("id");

    if (error || !data) {
      console.warn("[PolicyCache] Failed to fetch policies, using cache");
      return cache.rules;
    }

    const rules: GuardrailRule[] = data.map((row) => ({
      id: row.id,
      name: row.name,
      pattern: new RegExp(row.pattern, "i"),
      scope: row.scope,
      action: row.action,
      severity: row.severity,
      enabled: row.enabled,
    }));

    cache = { rules, lastUpdated: now };
    return rules;
  } catch (err) {
    console.warn("[PolicyCache] Error fetching policies:", err);
    return cache.rules;
  }
}
