"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { authedFetch } from "@/lib/client/api";
import { useToast } from "@/components/Toast";

export default function BulkScanUpload() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!busy || total === 0) return;
    const refresh = async () => {
      try {
        const response = await authedFetch("/api/history?page=1&pageSize=100", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || !data.success)
          throw new Error(data.error?.message || "Could not refresh scan status.");
        const scans = (data.scans as { status: string }[]).slice(0, total);
        setCompleted(
          scans.filter((scan) => ["COMPLETED", "FAILED", "BLOCKED"].includes(scan.status)).length,
        );
      } catch (error) {
        toast("error", error instanceof Error ? error.message : "Could not refresh scan status.");
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(timer);
  }, [busy, toast, total]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const urls = (await file.text())
        .split(/[,\n\r]+/)
        .map((url) => url.trim())
        .filter(Boolean)
        .slice(0, 10);
      setTotal(urls.length);
      setCompleted(0);
      const response = await authedFetch("/api/scan/bulk", {
        method: "POST",
        body: JSON.stringify({ urls }),
      });
      const data = await response.json();
      const queued = Array.isArray(data.scans)
        ? data.scans.filter((scan: { status: string }) => scan.status === "PENDING").length
        : 0;
      setMessage(
        response.ok ? `Queued ${queued} scan(s).` : data.error?.message || "Bulk scan failed.",
      );
      if (!response.ok) toast("error", data.error?.message || "Bulk scan failed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bulk scan failed.";
      setMessage(message);
      toast("error", message);
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Bulk scan
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Upload a CSV containing up to 10 public URLs.
      </p>
      <label className="mt-4 inline-flex cursor-pointer items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
        {busy ? "Uploading..." : "Choose CSV"}
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={upload}
          disabled={busy}
        />
      </label>
      {message && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{message}</p>}
      {total > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs font-semibold text-slate-500">
            <span>
              Processing {Math.min(completed + 1, total)} of {total}
            </span>
            <span>{Math.round((completed / total) * 100)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-primary-600 transition-all"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
