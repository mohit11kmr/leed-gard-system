"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiAlertTriangle,
  FiBell,
  FiCheckCircle,
  FiCopy,
  FiEye,
  FiEyeOff,
  FiKey,
  FiPause,
  FiPlay,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";
import { authedFetch, getStoredAuth } from "@/lib/client/api";

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface ScanRow {
  id: string;
  url: string;
  status: string;
  score: number | null;
  totalLinks: number | null;
  workingLinks: number | null;
  brokenLinks: number | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface WebhookRow {
  id: string;
  url: string;
  isActive: boolean;
  events: string[];
  lastTriggered: string | null;
  createdAt: string;
}

interface MonitorSiteRow {
  id: string;
  url: string;
  frequency: string;
  isActive: boolean;
  lastScore: number | null;
  lastBroken: number | null;
  lastCheckedAt: string | null;
  nextScanAt: string | null;
  createdAt: string;
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [showKey, setShowKey] = useState(false);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [sites, setSites] = useState<MonitorSiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [whUrl, setWhUrl] = useState("");
  const [whSecret, setWhSecret] = useState("");
  const [whBusy, setWhBusy] = useState(false);
  const [whError, setWhError] = useState<string | null>(null);

  const [monUrl, setMonUrl] = useState("");
  const [monFreq, setMonFreq] = useState("DAILY");
  const [monEmail, setMonEmail] = useState("");
  const [monBusy, setMonBusy] = useState(false);
  const [monError, setMonError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth?.apiKey || auth.guest) {
      router.replace("/login");
      return;
    }
    setApiKey(auth.apiKey);
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [meRes, scanRes, whRes, monRes] = await Promise.all([
          authedFetch("/api/auth/me", { cache: "no-store" }),
          authedFetch("/api/scan", { cache: "no-store" }),
          authedFetch("/api/webhooks", { cache: "no-store" }),
          authedFetch("/api/monitor", { cache: "no-store" }),
        ]);
        if (meRes.status === 401 || scanRes.status === 401) {
          router.replace("/login");
          return;
        }
        const meData = await meRes.json();
        const scanData = await scanRes.json();
        const whData = await whRes.json();
        const monData = await monRes.json();
        if (!cancelled) {
          if (meData.success) setProfile(meData.user as Profile);
          if (scanData.success) setScans(scanData.scans as ScanRow[]);
          if (whData.success) setWebhooks(whData.webhooks as WebhookRow[]);
          if (monData.success) setSites(monData.sites as MonitorSiteRow[]);
        }
      } catch {
        /* network errors leave lists empty */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, router]);

  function copyKey() {
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function refreshScans() {
    try {
      const res = await authedFetch("/api/scan", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setScans(data.scans as ScanRow[]);
    } catch {
      /* ignore */
    }
  }

  async function addWebhook(e: FormEvent) {
    e.preventDefault();
    if (whBusy) return;
    setWhError(null);
    setWhBusy(true);
    try {
      const res = await authedFetch("/api/webhooks", {
        method: "POST",
        body: JSON.stringify({ url: whUrl, secret: whSecret || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Could not add webhook.");
      }
      setWebhooks((prev) => [data.webhook as WebhookRow, ...prev]);
      setWhUrl("");
      setWhSecret("");
    } catch (err) {
      setWhError(err instanceof Error ? err.message : "Could not add webhook.");
    } finally {
      setWhBusy(false);
    }
  }

  async function deleteWebhook(id: string) {
    const res = await authedFetch(`/api/webhooks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    }
  }

  async function addSite(e: FormEvent) {
    e.preventDefault();
    if (monBusy) return;
    setMonError(null);
    setMonBusy(true);
    try {
      const res = await authedFetch("/api/monitor", {
        method: "POST",
        body: JSON.stringify({
          url: monUrl,
          frequency: monFreq,
          alertEmail: monEmail || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Could not add site.");
      }
      setSites((prev) => [
        data.site as MonitorSiteRow,
        ...prev.filter((s) => s.id !== (data.site as MonitorSiteRow).id),
      ]);
      setMonUrl("");
      setMonEmail("");
    } catch (err) {
      setMonError(err instanceof Error ? err.message : "Could not add site.");
    } finally {
      setMonBusy(false);
    }
  }

  async function toggleSite(id: string, isActive: boolean) {
    setSites((prev) => prev.map((s) => (s.id === id ? { ...s, isActive } : s)));
    await authedFetch(`/api/monitor/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
  }

  async function runSiteNow(id: string) {
    const res = await fetch(`/api/monitor/${id}/run`, { method: "POST" });
    if (res.ok) {
      setSites((prev) =>
        prev.map((s) => (s.id === id ? { ...s, nextScanAt: new Date().toISOString() } : s))
      );
    }
  }

  async function deleteSite(id: string) {
    const res = await authedFetch(`/api/monitor/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSites((prev) => prev.filter((s) => s.id !== id));
    }
  }

  if (!ready) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Manage your account, scans and webhooks.
      </p>

      {(() => {
        const criticalIssues = sites.filter((st) => st.lastBroken != null && st.lastBroken > 0).length;
        const activeAlerts = sites.filter(
          (st) => st.isActive && st.lastBroken != null && st.lastBroken > 0
        ).length;
        const stats = [
          { label: "Total scans", value: scans.length },
          { label: "Critical issues", value: criticalIssues, warn: criticalIssues > 0 },
          { label: "Sites monitored", value: sites.length },
          { label: "Active alerts", value: activeAlerts, warn: activeAlerts > 0 },
        ];
        return (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((st) => (
              <div
                key={st.label}
                className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${
                  st.warn
                    ? "border-rose-300 dark:border-rose-500/40"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {st.label}
                </p>
                <p
                  className={`mt-1 text-2xl font-bold tabular-nums ${
                    st.warn ? "text-rose-600 dark:text-rose-400" : "text-navy-900 dark:text-white"
                  }`}
                >
                  {st.value}
                </p>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Account
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Name</dt>
              <dd className="font-medium text-navy-900 dark:text-white">
                {profile?.name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Email</dt>
              <dd className="font-medium break-all text-navy-900 dark:text-white">
                {profile?.email ?? "—"}
              </dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <FiKey className="h-4 w-4" />
              <span className="text-sm font-semibold">API key</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                {apiKey ? (showKey ? apiKey : `${apiKey.slice(0, 8)}${"•".repeat(18)}`) : "—"}
              </code>
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300"
              >
                {showKey ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={copyKey}
                aria-label="Copy API key"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300"
              >
                {copied ? (
                  <FiCheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <FiCopy className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Use header <code>x-api-key</code> with this key to call the scan API.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Recent scans
            </h2>
            <button
              type="button"
              onClick={refreshScans}
              aria-label="Refresh scans"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300"
            >
              <FiRefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-slate-400">Loading…</p>
          ) : scans.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No scans yet. Run your first scan from the{" "}
                <Link href="/" className="font-semibold text-primary-600 hover:text-primary-500">
                  home page
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                    <th className="pb-2 pr-4 font-medium">Website</th>
                    <th className="pb-2 pr-4 font-medium">Score</th>
                    <th className="pb-2 pr-4 font-medium">Broken</th>
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 font-medium">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800/50"
                    >
                      <td className="max-w-[220px] truncate py-2.5 pr-4 font-medium text-navy-900 dark:text-white">
                        {s.url.replace(/^https?:\/\//, "")}
                      </td>
                      <td className={`py-2.5 pr-4 font-bold ${s.score !== null ? scoreColor(s.score) : "text-slate-400"}`}>
                        {s.score !== null ? s.score : s.status === "FAILED" ? "—" : "…"}
                      </td>
                      <td className="py-2.5 pr-4">
                        {s.brokenLinks === null ? (
                          <span className="text-slate-400">—</span>
                        ) : s.brokenLinks > 0 ? (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                            <FiAlertTriangle className="h-3.5 w-3.5" />
                            {s.brokenLinks}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <FiCheckCircle className="h-3.5 w-3.5" />
                            0
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                        {new Date(s.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="py-2.5">
                        {s.status === "COMPLETED" ? (
                          <Link
                            href={`/report/${s.id}`}
                            className="font-semibold text-primary-600 hover:text-primary-500"
                          >
                            View
                          </Link>
                        ) : (
                          <span className="text-slate-400">{s.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <FiBell className="h-4 w-4 text-primary-600" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            24/7 Monitoring
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Re-scans your sites on a schedule and alerts you the moment a contact link breaks.
        </p>

        {monError && (
          <div role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {monError}
          </div>
        )}

        <form onSubmit={addSite} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            required
            value={monUrl}
            onChange={(e) => setMonUrl(e.target.value)}
            placeholder="yourbusiness.com"
            aria-label="Site URL to monitor"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <select
            value={monFreq}
            onChange={(e) => setMonFreq(e.target.value)}
            aria-label="Scan frequency"
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>
          <input
            type="email"
            value={monEmail}
            onChange={(e) => setMonEmail(e.target.value)}
            placeholder="Alert email (optional)"
            aria-label="Alert email"
            className="min-w-0 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:w-52"
          />
          <button
            type="submit"
            disabled={monBusy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            <FiPlus className="h-4 w-4" />
            {monBusy ? "Adding…" : "Monitor"}
          </button>
        </form>

        {sites.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {sites.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy-900 dark:text-white">
                    {s.url.replace(/^https?:\/\//, "")}
                    {!s.isActive && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        paused
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {s.frequency.toLowerCase()} ·{" "}
                    {s.lastScore !== null ? (
                      <>
                        last score{" "}
                        <span className={`font-bold ${scoreColor(s.lastScore)}`}>{s.lastScore}</span>
                        {s.lastBroken !== null && s.lastBroken > 0
                          ? ` · ${s.lastBroken} broken`
                          : " · all links working"}
                      </>
                    ) : (
                      "first scan pending"
                    )}
                    {s.nextScanAt &&
                      ` · next check ${new Date(s.nextScanAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void runSiteNow(s.id)}
                    aria-label={`Run scan now for ${s.url}`}
                    title="Run now"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-400 transition hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:hover:text-primary-400"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleSite(s.id, !s.isActive)}
                    aria-label={s.isActive ? `Pause monitoring ${s.url}` : `Resume monitoring ${s.url}`}
                    title={s.isActive ? "Pause" : "Resume"}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-400 transition hover:border-amber-400 hover:text-amber-500 dark:border-slate-700"
                  >
                    {s.isActive ? <FiPause className="h-4 w-4" /> : <FiPlay className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSite(s.id)}
                    aria-label={`Stop monitoring ${s.url}`}
                    title="Delete"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-400 transition hover:border-red-400 hover:text-red-500 dark:border-slate-700"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Webhooks
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Get a POST on your URL whenever a scan completes or fails.
        </p>

        {whError && (
          <div role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {whError}
          </div>
        )}

        <form onSubmit={addWebhook} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            required
            value={whUrl}
            onChange={(e) => setWhUrl(e.target.value)}
            placeholder="https://your-app.com/hooks/leadguard"
            aria-label="Webhook URL"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <input
            type="text"
            value={whSecret}
            onChange={(e) => setWhSecret(e.target.value)}
            placeholder="Secret (optional)"
            aria-label="Webhook secret"
            className="min-w-0 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:w-44"
          />
          <button
            type="submit"
            disabled={whBusy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            <FiPlus className="h-4 w-4" />
            {whBusy ? "Adding…" : "Add"}
          </button>
        </form>

        {webhooks.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {webhooks.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy-900 dark:text-white">{w.url}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {w.events.join(", ")}
                    {w.lastTriggered
                      ? ` · last fired ${new Date(w.lastTriggered).toLocaleDateString("en-IN")}`
                      : " · never fired"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteWebhook(w.id)}
                  aria-label={`Delete webhook ${w.url}`}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-400 transition hover:border-red-400 hover:text-red-500 dark:border-slate-700"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
