"use client";

import { useEffect, useRef, useState } from "react";

interface Decision {
  id: string;
  agent_id: string;
  payload: string;
  action_type: string;
  decision: string;
  risk_score: number | null;
  blast_radius: string | null;
  reversible: boolean | null;
  intent: string | null;
  reason: string | null;
  guardrail_hit: string | null;
  latency_ms: number;
  human_resolution: string | null;
  created_at: string;
}

export default function ApprovalsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const resolvedIds = useRef<Set<string>>(new Set());

  async function fetchHoldDecisions() {
    try {
      const res = await fetch("/api/decisions/pending");
      const data = await res.json();
      if (Array.isArray(data)) {
        setDecisions(data.filter((d: Decision) => !resolvedIds.current.has(d.id)));
      }
    } catch (err) {
      console.error("Failed to fetch decisions:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHoldDecisions();
    const interval = setInterval(fetchHoldDecisions, 3000);
    return () => clearInterval(interval);
  }, []);

  async function resolveDecision(id: string, resolution: "approved" | "rejected") {
    // Mark as resolved so polls don't re-surface it
    resolvedIds.current.add(id);
    setDecisions((prev) => prev.filter((d) => d.id !== id));

    try {
      const res = await fetch(`/api/decisions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Kynethra-Key": "8d5fc1a9638b815fbd795d3e45c30187c1dafa64ba93f05e55bdbbc27d5aa667",
        },
        body: JSON.stringify({
          resolution,
          resolved_by: "operator@kynethra.com",
        }),
      });
      if (!res.ok) {
        resolvedIds.current.delete(id);
        await fetchHoldDecisions();
      }
    } catch (err) {
      console.error("Resolution error:", err);
      resolvedIds.current.delete(id);
      await fetchHoldDecisions();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading decisions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Approval Queue</h1>
        <p className="text-gray-400 mb-8">
          {decisions.length} decision{decisions.length !== 1 ? "s" : ""} pending review
        </p>

        {decisions.length === 0 ? (
          <div className="border border-gray-800 rounded-lg p-8 text-center text-gray-500">
            No pending decisions
          </div>
        ) : (
          <div className="space-y-4">
            {decisions.map((decision) => (
              <div key={decision.id} className="border border-gray-800 rounded-lg p-6 bg-gray-900">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-xs font-mono text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                      HOLD
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      {decision.action_type.toUpperCase()}
                    </span>
                    {decision.guardrail_hit && (
                      <span className="ml-2 text-xs text-orange-400">
                        {decision.guardrail_hit}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(decision.created_at).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-sm font-mono bg-gray-800 rounded p-3 mb-4 break-all">
                  {decision.payload}
                </p>

                {decision.reason && (
                  <p className="text-sm text-gray-400 mb-4">{decision.reason}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => resolveDecision(decision.id, "approved")}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-sm font-medium transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => resolveDecision(decision.id, "rejected")}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-sm font-medium transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}