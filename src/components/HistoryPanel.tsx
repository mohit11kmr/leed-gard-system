"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FiTrash2, FiX } from "react-icons/fi";
import { HistoryEntry } from "@/types/scan";

function statusColor(status: HistoryEntry["status"]) {
  if (status === "COMPLETED") return "#10b981";
  if (status === "FAILED") return "#ef4444";
  return "#f59e0b";
}

export default function HistoryPanel({
  open,
  onClose,
  history,
  onClear,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  onClear: () => void;
  onSelect: (entry: HistoryEntry) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/60"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Scan History
            </h3>
            <div className="flex items-center gap-1">
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={onClear}
                  className="rounded-md p-1.5 text-slate-400 transition hover:text-rose-500"
                  aria-label="Clear history"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close history"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          </div>

          {history.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              No scans yet. Scan a website to see it here.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700">
              {history.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(entry)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  >
                    <span
                      className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: statusColor(entry.status) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                        {entry.url}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {new Date(entry.scannedAt).toLocaleString()}
                        {entry.result
                          ? ` · ${entry.result.scanStats.totalLinks} links`
                          : ""}
                      </span>
                    </span>
                    {entry.score !== null && (
                      <span
                        className="text-sm font-bold"
                        style={{ color: statusColor(entry.status) }}
                      >
                        {entry.score}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}