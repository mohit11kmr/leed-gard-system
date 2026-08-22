"use client";

import { ChangeEvent, useState } from "react";
import { authedFetch } from "@/lib/client/api";

export default function BulkScanUpload() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

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
    } catch {
      setMessage("Bulk scan failed.");
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
    </section>
  );
}
