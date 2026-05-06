"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Decision {
  id: string;
  agent_id: string;
  payload: string;
  action_type: string;
  decision: string;
  risk_score: number | null;
  blast_radius: string | null;
  reversible: boolean | null;
  guardrail_hit: string | null;
  eval_path: string;
  latency_ms: number;
  human_resolution: string | null;
  resolved_by: string | null;
  created_at: string;
}

export default function AuditPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  async function fetchAudit() {
    const res = await fetch("/api/dashboard/stats");
    const data = await res.json();
    setDecisions(data.feed || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchAudit();
  }, []);

  const filtered = filter === "ALL"
    ? decisions
    : decisions.filter((d) => d.decision === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading audit log...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Audit Log</h1>
            <p className="text-gray-400 text-sm mt-1">{filtered.length} records</p>
          </div>
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {["ALL", "ALLOW", "HOLD", "BLOCK"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-gray-700 text-white"
                  : "bg-gray-900 text-gray-400 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Decision</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Payload</th>
                <th className="px-4 py-3 text-left">Guardrail</th>
                <th className="px-4 py-3 text-left">Latency</th>
                <th className="px-4 py-3 text-left">Resolution</th>
                <th className="px-4 py-3 text-left">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((decision) => (
                <tr key={decision.id} className="bg-gray-950 hover:bg-gray-900 transition-colors">
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-mono px-2 py-1 rounded ${
                        decision.decision === "ALLOW"
                          ? "text-green-400 bg-green-400/10"
                          : decision.decision === "HOLD"
                          ? "text-yellow-400 bg-yellow-400/10"
                          : "text-red-400 bg-red-400/10"
                      }`}
                    >
                      {decision.decision}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {decision.action_type.toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs truncate font-mono text-xs">
                    {decision.payload}
                  </td>
                  <td className="px-4 py-3 text-orange-400 text-xs">
                    {decision.guardrail_hit || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {decision.latency_ms}ms
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {decision.human_resolution ? (
                      <span className={decision.human_resolution === "approved" ? "text-green-400" : "text-red-400"}>
                        {decision.human_resolution}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(decision.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}