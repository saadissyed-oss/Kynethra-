import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

export type DecisionOutcome = "ALLOW" | "HOLD" | "BLOCK";
export type BlastRadius = "none" | "limited" | "significant" | "catastrophic";
export type EvalPath = "fast-block" | "llm-eval" | "fail-safe";

export interface AuditEntry {
  agent_id: string;
  payload: string;
  action_type: string;
  decision: DecisionOutcome;
  risk_score?: number;
  blast_radius?: BlastRadius;
  reversible?: boolean;
  intent?: string;
  reason?: string;
  guardrail_hit?: string;
  eval_path: EvalPath;
  latency_ms: number;
}

function signRow(entry: AuditEntry & { id: string; created_at: string }): string {
  const hmacSecret = process.env.KYNETHRA_HMAC_SECRET || "dev-secret";
  const data = `${entry.id}${entry.payload}${entry.decision}${entry.created_at}`;
  return crypto.createHmac("sha256", hmacSecret).update(data).digest("hex");
}

export async function writeAuditLog(entry: AuditEntry) {
  const created_at = new Date().toISOString();
  const id = crypto.randomUUID();

  const row_signature = signRow({
    ...entry,
    id,
    created_at,
  });

  const { data, error } = await getSupabase()
    .from("decisions")
    .insert({
      id,
      ...entry,
      row_signature,
      created_at,
    } as any)
    .select()
    .single();

  if (error) {
    console.error("[Audit] Failed to write audit log:", error);
    throw error;
  }

  return data as any;
}

export function verifyRowSignature(
  row: any
): boolean {
  const hmacSecret = process.env.KYNETHRA_HMAC_SECRET || "dev-secret";
  const data = `${row.id}${row.payload}${row.decision}${row.created_at}`;
  const expected = crypto
    .createHmac("sha256", hmacSecret)
    .update(data)
    .digest("hex");
  return expected === row.row_signature;
}