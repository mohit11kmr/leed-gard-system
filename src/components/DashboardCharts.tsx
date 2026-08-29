"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { authedFetch } from "@/lib/client/api";

interface DayPoint {
  date: string;
  brokenLinks: number;
  criticalFindings: number;
}

interface SeverityPoint {
  name: string;
  value: number;
}

interface RiskyUrl {
  url: string;
  avgScore: number;
  issueCount: number;
  scanCount: number;
}

interface Stats {
  daily: DayPoint[];
  severity: SeverityPoint[];
  riskiestUrls: RiskyUrl[];
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#e11d48",
  HIGH: "#f59e0b",
  MEDIUM: "#3b82f6",
  LOW: "#64748b",
};

export default function DashboardCharts() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authedFetch("/api/dashboard/stats", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error?.message || "Failed");
        if (!cancelled) setStats(data.stats as Stats);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return null;

  if (!stats) {
    return (
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          />
        ))}
      </div>
    );
  }

  const totalSeverity = stats.severity.reduce((n, s) => n + s.value, 0);

  return (
    <section className="mt-10" aria-label="Executive charts">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
        Trends &amp; risk overview
      </h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Issues found — last 7 days
          </p>
          <div className="mt-3 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.daily} margin={{ top: 4, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    color: "#f1f5f9",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="brokenLinks"
                  name="Broken links"
                  stroke="#e11d48"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="criticalFindings"
                  name="Critical findings"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Findings by severity — 30 days
          </p>
          {totalSeverity === 0 ? (
            <p className="mt-16 text-center text-sm text-slate-500 dark:text-slate-400">
              No findings in the last 30 days.
            </p>
          ) : (
            <div className="mt-3 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.severity.filter((s) => s.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {stats.severity
                      .filter((s) => s.value > 0)
                      .map((entry) => (
                        <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? "#64748b"} />
                      ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      color: "#f1f5f9",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Top riskiest URLs — last 30 days
        </p>
        {stats.riskiestUrls.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
            No completed scans this month yet. Run a scan to populate this table.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th scope="col" className="px-4 py-2 font-semibold">
                  URL
                </th>
                <th scope="col" className="px-4 py-2 font-semibold">
                  Avg score
                </th>
                <th scope="col" className="px-4 py-2 font-semibold">
                  Issues
                </th>
                <th scope="col" className="px-4 py-2 font-semibold">
                  Scans
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.riskiestUrls.map((r) => (
                <tr key={r.url} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="max-w-[220px] truncate px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">
                    {r.url.replace(/^https?:\/\//, "")}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        r.avgScore >= 80
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : r.avgScore >= 50
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                      }`}
                    >
                      {r.avgScore}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">
                    {r.issueCount}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">
                    {r.scanCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
