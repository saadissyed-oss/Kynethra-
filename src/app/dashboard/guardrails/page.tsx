"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Policy {
  id: string;
  name: string;
  pattern: string;
  scope: string;
  action: string;
  severity: string;
  enabled: boolean;
}

export default function GuardrailsPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPolicies() {
    try {
      const res = await fetch("/api/guardrails");
      const data = await res.json();
      if (Array.isArray(data)) {
        setPolicies(data);
      }
    } catch (err) {
      console.error("Failed to fetch guardrails:", err);
    } finally {
      setLoading(false);
    }
  }

  async function togglePolicy(id: string, enabled: boolean) {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled } : p))
    );
    await fetch(`/api/guardrails/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
  }

  useEffect(() => {
    fetchPolicies();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading guardrails...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Guardrails Manager</h1>
            <p className="text-gray-400 text-sm mt-1">
              Toggle rules without redeployment. Changes take effect in under 50ms.
            </p>
          </div>
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">
            Back to Dashboard
          </Link>
        </div>

        <div className="space-y-3">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="border border-gray-800 rounded-lg p-5 bg-gray-900 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-gray-500 w-12">{policy.id}</span>
                <div>
                  <p className="font-medium text-sm">{policy.name}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1">{policy.pattern}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">{policy.scope.toUpperCase()}</span>
                <span
                  className={`text-xs font-mono px-2 py-1 rounded ${
                    policy.action === "BLOCK"
                      ? "text-red-400 bg-red-400/10"
                      : "text-yellow-400 bg-yellow-400/10"
                  }`}
                >
                  {policy.action}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    policy.severity === "critical"
                      ? "text-red-300 bg-red-900/30"
                      : policy.severity === "high"
                      ? "text-orange-300 bg-orange-900/30"
                      : "text-yellow-300 bg-yellow-900/30"
                  }`}
                >
                  {policy.severity}
                </span>

                <button
                  onClick={() => togglePolicy(policy.id, !policy.enabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    policy.enabled ? "bg-green-600" : "bg-gray-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      policy.enabled ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}