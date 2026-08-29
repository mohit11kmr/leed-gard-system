"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FiCopy, FiKey, FiPlus, FiTrash2 } from "react-icons/fi";
import { authedFetch, getStoredAuth } from "@/lib/client/api";
import { useToast } from "@/components/Toast";

interface TokenRow {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function TokensPage() {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<TokenRow[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [freshSecret, setFreshSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authedFetch("/api/auth/token", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || "Failed to load.");
      setTokens(data.tokens as TokenRow[]);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tokens.");
    }
  }, []);

  useEffect(() => {
    if (!getStoredAuth()) {
      setError("Log in to manage API tokens.");
      setTokens([]);
      return;
    }
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await authedFetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "CI token" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error?.message || "Failed to create token.");
      setFreshSecret(data.secret as string);
      setName("");
      toast("success", "Token created — copy it now, shown once");
      await load();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Failed to create token.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(t: TokenRow) {
    const res = await authedFetch(`/api/auth/token?id=${t.id}`, { method: "DELETE" }).catch(
      () => null,
    );
    if (!res || !res.ok) {
      toast("error", "Could not revoke token.");
      return;
    }
    toast("success", "Token revoked");
    await load();
  }

  async function copySecret() {
    if (!freshSecret) return;
    try {
      await navigator.clipboard.writeText(freshSecret);
      toast("success", "Copied to clipboard");
    } catch {
      toast("error", "Clipboard blocked — copy manually.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-3">
          <FiKey className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">API tokens</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              For CI/CD pipelines and the scan API.{" "}
              <Link href="/dashboard" className="font-semibold underline">
                Back to dashboard
              </Link>
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
            <FiPlus className="h-4 w-4" /> New CI token
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="Token name (e.g. GitHub Actions)"
              aria-label="Token name"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-60"
            >
              {busy ? "Generating…" : "Generate token"}
            </button>
          </div>

          {freshSecret && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Copy this token now — it will never be shown again.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1.5 font-mono text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {freshSecret}
                </code>
                <button
                  type="button"
                  onClick={() => void copySecret()}
                  aria-label="Copy token to clipboard"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400 dark:border-slate-600 dark:text-slate-300"
                >
                  <FiCopy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
              <p className="mt-2 font-mono text-[11px] text-amber-700 dark:text-amber-400">
                curl -X POST …/api/scan/ci -H &quot;Authorization: Bearer $TOKEN&quot; -d &apos;
                {"{"}&quot;url&quot;:&quot;https://example.com&quot;{"}"}&apos; -H
                &quot;Content-Type: application/json&quot;
              </p>
            </div>
          )}
        </form>

        {tokens && tokens.length > 0 && (
          <ul className="mt-6 space-y-3">
            {tokens.map((t) => {
              const active = !t.revokedAt;
              return (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <p
                      className={`text-sm font-semibold ${active ? "text-slate-800 dark:text-slate-100" : "text-slate-400 line-through dark:text-slate-500"}`}
                    >
                      {t.name}{" "}
                      <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {t.prefix}…
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Created {formatDate(t.createdAt)} · Last used {formatDate(t.lastUsedAt)}
                      {!active && " · REVOKED"}
                    </p>
                  </div>
                  {active && (
                    <button
                      type="button"
                      onClick={() => void revoke(t)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" /> Revoke
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {tokens?.length === 0 && !error && (
          <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No tokens yet. Generate one to use the CI scan API.
          </p>
        )}
      </div>
    </main>
  );
}
