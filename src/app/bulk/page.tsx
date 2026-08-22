"use client";

import Link from "next/link";
import { FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import BulkScanUpload from "@/components/BulkScanUpload";

export default function BulkPage() {
  return (
    <main className="mx-auto min-h-[70vh] max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600"
      >
        <FiArrowLeft /> Dashboard
      </Link>
      <div className="mt-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600">
          Batch workspace
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-navy-900 dark:text-white">
          Scan many sites at once
        </h1>
        <p className="mt-2 max-w-xl text-slate-500 dark:text-slate-400">
          Drop a CSV with up to ten URLs. Each site is queued independently so one failure never
          blocks the batch.
        </p>
        <BulkScanUpload />
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <FiCheckCircle className="text-emerald-500" /> Results appear in{" "}
          <Link href="/history" className="font-bold text-primary-600">
            History
          </Link>{" "}
          as they complete.
        </div>
      </div>
    </main>
  );
}
