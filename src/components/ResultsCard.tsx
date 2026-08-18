"use client";

import { motion } from "framer-motion";
import { FiDownload, FiShare2 } from "react-icons/fi";
import { useToast } from "./Toast";
import { ScanResult, SocialPlatform } from "@/types/scan";
import { formatMs } from "@/lib/client/storage";
import { LinkRow, LinkSection } from "./LinkList";
import ScoreRing from "./ScoreRing";

const SOCIAL_ICON: Record<SocialPlatform, string> = {
  facebook: "f",
  instagram: "IG",
  twitter: "𝕏",
  linkedin: "in",
  youtube: "▶",
};

function SummaryStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
      <span className="text-2xl font-bold" style={{ color }}>
        {value}
      </span>
      <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
    </div>
  );
}

export default function ResultsCard({
  result,
  url,
}: {
  result: ScanResult;
  url: string;
}) {
  const { toast } = useToast();

  async function exportJson() {
    const blob = new Blob([JSON.stringify({ url, ...result }, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leadguard-report-${url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]/gi, "-")}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast("success", "Report exported as JSON");
  }

  async function shareReport() {
    const text = `LeadGuard scan for ${url}: score ${result.score}/100 (${result.scanStats.totalLinks} links, ${result.scanStats.brokenLinks} broken)`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "LeadGuard report", text });
        return;
      } catch {
        /* fall back to clipboard */
      }
    }
    await navigator.clipboard.writeText(text);
    toast("info", "Report summary copied");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex flex-col items-center gap-6 border-b border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/60 sm:flex-row">
        <ScoreRing score={result.score} />
        <div className="flex-1 space-y-4 text-center sm:text-left">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Scan report
            </h2>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400" title={url}>
              {url}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <SummaryStat label="Total" value={result.scanStats.totalLinks} color="#6366f1" />
            <SummaryStat label="Working" value={result.scanStats.workingLinks} color="#10b981" />
            <SummaryStat label="Broken" value={result.scanStats.brokenLinks} color="#ef4444" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400 sm:justify-start">
            <span>
              Fetch {formatMs(result.performance.fetchTime)} · Parse{" "}
              {formatMs(result.performance.parseTime)} · Total{" "}
              {formatMs(result.performance.totalTime)}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold dark:bg-slate-700">
              {result.summary.successRate}% success
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-primary-500 hover:text-primary-600 dark:border-slate-600 dark:text-slate-300"
            >
              <FiDownload className="h-4 w-4" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={shareReport}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-primary-500 hover:text-primary-600 dark:border-slate-600 dark:text-slate-300"
            >
              <FiShare2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <LinkSection title="WhatsApp" count={result.whatsappLinks.length} icon={<span aria-hidden>🟢</span>}>
          {result.whatsappLinks.map((l, i) => (
            <LinkRow key={i} url={l.url} display={l.url} status={l.status} sub={l.phone ? `Phone: ${l.phone}` : undefined} />
          ))}
        </LinkSection>

        <LinkSection title="Phone" count={result.phoneLinks.length} icon={<span aria-hidden>📞</span>}>
          {result.phoneLinks.map((l, i) => (
            <LinkRow key={i} url={l.url} display={l.url} status={l.status} sub={l.number ? `Number: ${l.number}` : undefined} />
          ))}
        </LinkSection>

        <LinkSection title="Email" count={result.emailLinks.length} icon={<span aria-hidden>✉️</span>}>
          {result.emailLinks.map((l, i) => (
            <LinkRow key={i} url={l.url} display={l.email} status={l.status} />
          ))}
        </LinkSection>

        <LinkSection title="Review" count={result.reviewLinks.length} icon={<span aria-hidden>⭐</span>}>
          {result.reviewLinks.map((l, i) => (
            <LinkRow key={i} url={l.url} display={l.url} badge={<StatusBadgeInline platform={l.platform} />} />
          ))}
        </LinkSection>

        <div className="lg:col-span-2">
          <LinkSection title="Social" count={result.socialLinks.length} icon={<span aria-hidden>🌐</span>}>
            {result.socialLinks.map((l, i) => (
              <LinkRow
                key={i}
                url={l.url}
                display={l.url}
                badge={
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {SOCIAL_ICON[l.platform]}
                  </span>
                }
                sub={l.platform}
              />
            ))}
          </LinkSection>
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadgeInline({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-400">
      {platform}
    </span>
  );
}