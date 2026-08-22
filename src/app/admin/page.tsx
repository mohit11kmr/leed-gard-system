"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiActivity, FiAlertOctagon, FiCheckCircle, FiClock, FiGlobe, FiMonitor, FiRefreshCw, FiUsers } from "react-icons/fi";
import { authedFetch, getStoredAuth } from "@/lib/client/api";

interface RuleHit {
  ruleId: string;
  hits: number;
}

interface Metrics {
  users: number;
  scansToday: number;
  uniqueDomainsToday: number | null;
  successRate24h: number | null;
  avgDurationMs: number | null;
  criticalFindingRate24h: number | null;
  monitors: number;
  activeMonitors: number;
  topBrokenRules: RuleHit[] | null;
}

function formatMetric(key: keyof Metrics, raw: number | null): string {
  if (raw == null) return "—";
  if (key === "avgDurationMs") return `${(raw / 1000).toFixed(1)}s`;
  if (key === "successRate24h" || key === "criticalFindingRate24h") return `${raw}%`;
  return String(raw);
}

const CARDS: { key: keyof Metrics; label: string; icon: typeof FiUsers }[] = [
  { key: "users", label: "Users", icon: FiUsers },
  { key: "scansToday", label: "Scans (24h)", icon: FiActivity },
  { key: "uniqueDomainsToday", label: "Unique domains (24h)", icon: FiGlobe },
  { key: "successRate24h", label: "Success rate", icon: FiCheckCircle },
  { key: "avgDurationMs", label: "Avg duration", icon: FiClock },
  { key: "criticalFindingRate24h", label: "Critical rate", icon: FiAlertOctagon },
  { key: "activeMonitors", label: "Active monitors", icon: FiMonitor },
];

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await authedFetch("/api/admin/metrics", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || "Failed to load metrics.");
      setMetrics(data.metrics as Metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) {
      setError("Log in with an admin account to view this page.");
      setLoading(false);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Admin · System health</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Operational overview — updated live.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              aria-label="Refresh metrics"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
            >
              <FiRefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/dashboard"
              className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-500"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <p className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}

        {metrics && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {CARDS.map(({ key, label, icon: Icon }) => {
              const raw = metrics[key];
              const value =
                typeof raw === "number" || raw === null ? formatMetric(key, raw) : String(raw?.length ?? 0);
              return (
                <div
                  key={key}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
                </div>
              );
            })}
          </div>
        )}

        {metrics?.topBrokenRules && metrics.topBrokenRules.length > 0 && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Most common broken rules (24h)
            </h2>
            <ul className="mt-3 space-y-2">
              {metrics.topBrokenRules.map(({ ruleId, hits }) => (
                <li key={ruleId} className="flex items-center gap-3">
                  <span className="w-full rounded-md bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {ruleId}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">×{hits}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
