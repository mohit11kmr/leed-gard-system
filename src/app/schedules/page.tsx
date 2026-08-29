"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FiCalendar, FiPlus, FiTrash2 } from "react-icons/fi";
import { authedFetch, getStoredAuth } from "@/lib/client/api";
import { useToast } from "@/components/Toast";

interface Schedule {
  id: string;
  url: string;
  schedule: string;
  enabled: boolean;
  lastRun: string | null;
  createdAt: string;
}

const PRESETS = [
  { value: "DAILY", label: "Daily (9 AM)" },
  { value: "WEEKLY", label: "Weekly (Mon 9 AM)" },
  { value: "CUSTOM", label: "Custom cron…" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function SchedulesPage() {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [preset, setPreset] = useState("DAILY");
  const [cron, setCron] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await authedFetch("/api/schedules", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || "Failed to load.");
      setSchedules(data.schedules as Schedule[]);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedules.");
    }
  }, []);

  useEffect(() => {
    if (!getStoredAuth()) {
      setError("Log in to manage scheduled scans.");
      setSchedules([]);
      return;
    }
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const body = preset === "CUSTOM" ? { url, cron } : { url, preset };
      const res = await authedFetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error?.message || "Failed to create schedule.");
      toast("success", "Schedule created");
      setUrl("");
      setCron("");
      await load();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Failed to create schedule.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(s: Schedule) {
    setSchedules((prev) =>
      prev ? prev.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)) : prev,
    );
    const res = await authedFetch("/api/schedules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, enabled: !s.enabled }),
    }).catch(() => null);
    if (!res || !res.ok) {
      toast("error", "Could not update schedule.");
      void load();
      return;
    }
    toast("success", s.enabled ? "Schedule paused" : "Schedule resumed");
  }

  async function remove(s: Schedule) {
    const res = await authedFetch(`/api/schedules?id=${s.id}`, { method: "DELETE" }).catch(
      () => null,
    );
    if (!res || !res.ok) {
      toast("error", "Could not delete schedule.");
      return;
    }
    toast("success", "Schedule deleted");
    await load();
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-3">
          <FiCalendar className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Scheduled scans
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Run scans automatically on a cron schedule — no browser needed.
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {error}{" "}
            <Link href="/login" className="font-semibold underline">
              Log in
            </Link>
          </p>
        )}

        <form
          onSubmit={create}
          className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <FiPlus className="h-4 w-4" /> New schedule
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
            <input
              required
              type="text"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              aria-label="Website URL"
              className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              aria-label="Scan frequency"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            >
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
          {preset === "CUSTOM" && (
            <input
              required
              type="text"
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="Cron expression, e.g. 0 9 * * *"
              aria-label="Cron expression"
              className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white sm:w-64"
            />
          )}
        </form>

        {schedules && schedules.length > 0 && (
          <ul className="mt-6 space-y-3">
            {schedules.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {s.url.replace(/^https?:\/\//, "")}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                    <code>{s.schedule}</code> · last run {formatDate(s.lastRun)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span>{s.enabled ? "Enabled" : "Paused"}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={s.enabled}
                      aria-label={`Toggle scan schedule for ${s.url}`}
                      onClick={() => void toggle(s)}
                      className={`relative h-5 w-9 rounded-full transition ${
                        s.enabled ? "bg-primary-600" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                          s.enabled ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </label>
                  <button
                    type="button"
                    onClick={() => void remove(s)}
                    aria-label={`Delete schedule for ${s.url}`}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {schedules?.length === 0 && !error && (
          <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No schedules yet. Create one above to run scans automatically.
          </p>
        )}
      </div>
    </main>
  );
}
