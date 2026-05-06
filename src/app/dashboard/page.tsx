"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  total: number;
  allowed: number;
  held: number;
  blocked: number;
  approved: number;
  rejected: number;
}

interface Decision {
  id: string;
  payload: string;
  action_type: string;
  decision: string;
  guardrail_hit: string | null;
  latency_ms: number;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    allowed: 0,
    held: 0,
    blocked: 0,
    approved: 0,
    rejected: 0,
  });
  const [feed, setFeed] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    const res = await fetch("/api/dashboard/stats");
    const data = await res.json();
    setStats(data.stats);
    setFeed(data.feed);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: "Total Intercepted", value: stats.total, color: "text-white" },
    { label: "Allowed", value: stats.allowed, color: "text-green-400" },
    { label: "Held", value: stats.held, color: "text-yellow-400" },
    { label: "Blocked", value: stats.blocked, color: "text-red-400" },
    { label: "Approved", value: stats.approved, color: "text-green-300" },
    { label: "Rejected", value: stats.rejected, color: "text-red-300" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Kynethra Dashboard</h1>
          <div className="flex gap-4 text-sm">
            <Link href="/dashboard/approvals" className="text-yellow-400 hover:text-yellow-300">
              Approval Queue
            </Link>
            <Link href="/dashboard/audit" className="text-gray-400 hover:text-white">
              Audit Log
            </Link>
            <Link href="/dashboard/guardrails" className="text-gray-400 hover:text-white">
              Guardrails
            </Link>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-8">
          {statCards.map((card) => (
            <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Live Feed */}
        <h2 className="text-lg font-semibold mb-4">Live Decision Feed</h2>
        <div className="space-y-2">
          {feed.map((decision) => (
            <div
              key={decision.id}
              className="border border-gray-800 rounded-lg p-4 bg-gray-900 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
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
                <span className="text-xs text-gray-500">{decision.action_type.toUpperCase()}</span>
                <span className="text-sm text-gray-300 truncate max-w-xs">{decision.payload}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {decision.guardrail_hit && (
                  <span className="text-orange-400">{decision.guardrail_hit}</span>
                )}
                <span>{decision.latency_ms}ms</span>
                <span>{new Date(decision.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
