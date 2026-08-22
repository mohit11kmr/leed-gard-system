"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { FiCopy, FiExternalLink, FiZap } from "react-icons/fi";
import { useState } from "react";
import { useToast } from "./Toast";
import AiFixModal from "./AiFixModal";

type StatusColor = "green" | "yellow" | "red" | "blue";

const STATUS_BADGE: Record<string, { label: string; cls: string; color: StatusColor }> = {
  WORKING: { label: "Working", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400", color: "green" },
  BROKEN: { label: "Broken", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400", color: "red" },
  MISSING: { label: "Missing", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400", color: "yellow" },
  DETECTED: { label: "Detected", cls: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400", color: "blue" },
};

function StatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.DETECTED;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>
      {badge.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast("success", "Copied to clipboard");
        } catch {
          toast("error", "Copy failed");
        }
      }}
      aria-label="Copy link"
      className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-700 dark:hover:text-primary-400"
    >
      <FiCopy className="h-4 w-4" />
    </button>
  );
}

function LinkRow({
  url,
  display,
  status,
  sub,
  badge,
  issue,
  fix,
}: {
  url: string;
  display: string;
  status?: string;
  sub?: string;
  badge?: ReactNode;
  issue?: string | null;
  fix?: string | null;
}) {
  const isProblem = issue != null;
  const [aiOpen, setAiOpen] = useState(false);
  return (
    <>
    {aiOpen && (
      <AiFixModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        linkType={display}
        linkUrl={url.startsWith("(") ? undefined : url}
        issue={issue ?? undefined}
        suggestedFix={fix ?? undefined}
      />
    )}
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border px-3 py-2 ${
        isProblem
          ? "border-rose-200 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/5"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60"
      }`}
    >
      <div className="flex items-center gap-2">
        {badge ?? (status ? <StatusBadge status={status} /> : null)}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200" title={display}>
            {display}
          </p>
          {sub ? (
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{sub}</p>
          ) : null}
        </div>
        {isProblem && (
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="inline-flex items-center gap-1 rounded-md bg-primary-600/10 px-2 py-1 text-xs font-semibold text-primary-700 transition hover:bg-primary-600/20 dark:text-primary-300"
            aria-label="Get AI fix"
          >
            <FiZap className="h-3.5 w-3.5" />
            AI Fix
          </button>
        )}
        {url && !url.startsWith("(") && <CopyButton text={url} />}
        {url && !url.startsWith("(") && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open link"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-700 dark:hover:text-primary-400"
          >
            <FiExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      {issue ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-rose-600 dark:text-rose-400">
          <span aria-hidden>⚠</span>
          <span>{issue}</span>
        </p>
      ) : null}
      {fix ? (
        <p className="mt-1 flex items-start gap-1.5 text-xs font-medium leading-relaxed text-emerald-700 dark:text-emerald-400">
          <span aria-hidden>🛠</span>
          <span>{fix}</span>
        </p>
      ) : null}
    </motion.li>
    </>
  );
}

function LinkSection({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: ReactNode;
  count: number;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {title}
        </h3>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-400 dark:border-slate-700">
          None detected
        </p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </section>
  );
}

export { LinkRow, LinkSection, StatusBadge };