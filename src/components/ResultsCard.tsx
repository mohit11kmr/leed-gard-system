"use client";

import { motion } from "framer-motion";
import { FiDownload, FiFileText, FiLink, FiShare2 } from "react-icons/fi";
import { useToast } from "./Toast";
import { ScanResult, SocialPlatform } from "@/types/scan";
import { formatMs } from "@/lib/client/storage";
import SummaryStat from "@/ui/data/SummaryStat";
import { LinkRow, LinkSection } from "./LinkList";
import ScoreRing from "./ScoreRing";
import LossCalculator from "./LossCalculator";
import SecurityPanel from "./SecurityPanel";
import WatchdogForm from "./WatchdogForm";
import CriticalFindings from "./CriticalFindings";
import PillarCards from "./PillarCards";
import StatusBadge from "@/ui/data/StatusBadge";

export default function ResultsCard({
  result,
  url,
  scanId,
}: {
  result: ScanResult;
  url: string;
  scanId?: string | null;
}) {
  const { toast } = useToast();
  const reportLink = scanId ? `${window.location.origin}/report/${scanId}` : null;

  async function copyReportLink() {
    if (!reportLink) return;
    try {
      await navigator.clipboard.writeText(reportLink);
      toast("success", "Public report link copied — share it with anyone");
    } catch {
      toast("error", "Copy failed");
    }
  }

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

  async function exportPdf() {
    try {
      const { downloadAuditPdf } = await import("@/lib/client/pdfGenerator");
      await downloadAuditPdf(url, result);
      toast("success", "PDF audit report downloaded");
    } catch {
      toast("error", "PDF export failed");
    }
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
          {result.scanStats.brokenLinks > 0 && (
            <LossCalculator
              brokenLinks={result.scanStats.brokenLinks}
              totalLinks={result.scanStats.totalLinks}
            />
          )}
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
              onClick={exportPdf}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-500"
            >
              <FiFileText className="h-4 w-4" />
              Download PDF
            </button>
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
            {reportLink && (
              <button
                type="button"
                onClick={copyReportLink}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-500"
              >
                <FiLink className="h-4 w-4" />
                Copy public report link
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <PillarCards pillars={result.pillars} />
        <CriticalFindings result={result} />
        <SecurityPanel security={result.security} />
        <WatchdogForm scanId={scanId} />
      </div>

      <div className="grid gap-6 p-6 pt-0 lg:grid-cols-2">
        <LinkSection title="WhatsApp" count={result.whatsappLinks.length} icon={<span aria-hidden>🟢</span>}>
          {result.whatsappLinks.map((l, i) => (
            <LinkRow key={i} url={l.url} display={l.url || "(no WhatsApp CTA found)"} status={l.status} sub={l.phone ? `Phone: ${l.phone}` : undefined} issue={l.issue} fix={l.suggestedFix} />
          ))}
        </LinkSection>

        <LinkSection title="Phone" count={result.phoneLinks.length} icon={<span aria-hidden>📞</span>}>
          {result.phoneLinks.map((l, i) => (
            <LinkRow key={i} url={l.url} display={l.url} status={l.status} sub={l.number ? `Number: ${l.number}` : undefined} issue={l.issue} fix={l.suggestedFix} />
          ))}
        </LinkSection>

        <LinkSection title="Email" count={result.emailLinks.length} icon={<span aria-hidden>✉️</span>}>
          {result.emailLinks.map((l, i) => (
            <LinkRow key={i} url={l.url} display={l.email} status={l.status} issue={l.issue} fix={l.suggestedFix} />
          ))}
        </LinkSection>

        <LinkSection title="Review" count={result.reviewLinks.length} icon={<span aria-hidden>⭐</span>}>
          {result.reviewLinks.map((l, i) => (
            <LinkRow key={i} url={l.url} display={l.url} badge={<StatusBadge platform={l.platform} />} />
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
                    {l.platform ? l.platform[0]?.toUpperCase() : "🌐"}
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