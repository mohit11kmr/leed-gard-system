"use client";

import { FormEvent, useState } from "react";
import { FiArrowRight, FiLoader } from "react-icons/fi";

export default function ScanForm({
  scanning,
  onScan,
}: {
  scanning: boolean;
  onScan: (url: string) => Promise<void>;
}) {
  const [url, setUrl] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || scanning) return;
    await onScan(url.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter your website URL (e.g. example.com)"
            aria-label="Website URL"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 pr-12 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <FiArrowRight className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        </div>
        <button
          type="submit"
          disabled={scanning || !url.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 font-semibold text-white shadow-md transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {scanning ? (
            <>
              <FiLoader className="h-5 w-5 animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              Scan
              <FiArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}