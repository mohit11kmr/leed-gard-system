"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiClock, FiExternalLink, FiRefreshCw } from "react-icons/fi";
import { authedFetch } from "@/lib/client/api";
import { useToast } from "@/components/Toast";

type Scan = { id: string; url: string; status: string; score: number | null; createdAt: string };
type PageData = { scans: Scan[]; pagination: { page: number; pages: number; total: number } };

export default function HistoryPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    authedFetch(`/api/history?page=${page}&pageSize=10`, { cache: "no-store" })
      .then((response) => response.json())
      .then((value) => {
        if (!cancelled && value.success) setData(value);
      })
      .catch((error) =>
        toast("error", error instanceof Error ? error.message : "Could not load history."),
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, toast]);

  async function rerun(scan: Scan) {
    setRerunning(scan.id);
    try {
      const response = await authedFetch("/api/scan", {
        method: "POST",
        body: JSON.stringify({ url: scan.url }),
      });
      const value = await response.json();
      if (!response.ok || !value.success)
        throw new Error(value.error?.message || "Could not re-trigger scan.");
      toast("success", "Scan re-triggered");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Could not re-trigger scan.");
    } finally {
      setRerunning(null);
    }
  }

  return (
    <main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600">Archive</p>
          <h1 className="mt-2 text-3xl font-extrabold text-navy-900 dark:text-white">
            Scan history
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Every audit, available wherever you work.
          </p>
        </div>
        <Link
          href="/"
          className="hidden items-center gap-2 text-sm font-semibold text-primary-600 sm:flex"
        >
          <FiArrowLeft /> New scan
        </Link>
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : data?.scans.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.scans.map((scan) => (
              <div
                key={scan.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FiClock className="shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                      {scan.url}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(scan.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${scan.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : scan.status === "FAILED" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}
                  >
                    {scan.status}
                  </span>
                  {scan.score !== null && (
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {scan.score}/100
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={rerunning === scan.id}
                    onClick={() => void rerun(scan)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-primary-600 hover:border-primary-400 disabled:opacity-50 dark:border-slate-700"
                  >
                    <FiRefreshCw className={rerunning === scan.id ? "animate-spin" : ""} /> Re-scan
                  </button>
                  <Link
                    href={`/report/${scan.id}`}
                    aria-label={`View report for ${scan.url}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-primary-600 hover:border-primary-400 dark:border-slate-700"
                  >
                    <FiExternalLink />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="font-semibold text-slate-800 dark:text-white">No scans yet.</p>
            <Link
              href="/"
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary-600"
            >
              Start scanning now <FiArrowRight />
            </Link>
          </div>
        )}
      </section>
      {data?.pagination && data.pagination.pages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <button
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700"
          >
            <FiArrowLeft /> Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {data.pagination.pages}
          </span>
          <button
            disabled={page === data.pagination.pages}
            onClick={() => setPage((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700"
          >
            Next <FiArrowRight />
          </button>
        </div>
      )}
    </main>
  );
}
