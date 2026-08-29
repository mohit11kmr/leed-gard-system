"use client";

import { useEffect, useState } from "react";
import { FiArrowRight, FiBell, FiDownload, FiShield, FiTool } from "react-icons/fi";
import Link from "next/link";
import { ScanResult, ScanStatus } from "@/types/scan";
import { formatMs } from "@/lib/client/storage";
import { LinkRow, LinkSection } from "./LinkList";
import ScoreRing from "./ScoreRing";
import SecurityPanel from "./SecurityPanel";
import PillarCards from "./PillarCards";
import WatchdogForm from "./WatchdogForm";
import CriticalFindings from "./CriticalFindings";
import AiFixSuggestions from "./AiFixSuggestions";
import ScreenshotBanner from "./ScreenshotBanner";
import LossCalculator from "./LossCalculator";
import SummaryStat from "@/ui/data/SummaryStat";
import StatusBadge from "@/ui/data/StatusBadge";

interface PublicReportData {
  id: string;
  url: string;
  status: ScanStatus;
  score: number | null;
  result: ScanResult | null;
  error: string | null;
  completedAt: string | null;
  screenshotPath: string | null;
}

export default function ReportView({ scanId }: { scanId: string }) {
  const [report, setReport] = useState<PublicReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  function exportJson() {
    if (!result) return;
    trackEvent("report_shared", { scanId, format: "json" });
    const blob = new Blob([JSON.stringify({ scanId, result }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leadguard-scan-${scanId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function trackEvent(event: string, meta?: Record<string, unknown>) {
    void fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        url: typeof window !== "undefined" ? window.location.href : null,
        meta,
      }),
    }).catch(() => {});
  }

  async function downloadPdf() {
    if (!report?.result || pdfBusy) return;
    trackEvent("report_download_clicked", { scanId });
    setPdfBusy(true);
    try {
      const { downloadAuditPdf } = await import("@/lib/client/pdfGenerator");
      await downloadAuditPdf(report.url, report.result, {
        completedAt: report.completedAt ?? undefined,
      });
    } catch {
      /* ignore */
    } finally {
      setPdfBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/report/${scanId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || "Report not found.");
        }
        if (!cancelled) setReport(data.data as PublicReportData);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load report.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scanId]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 py-16 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        <p className="text-sm text-white/70">Loading audit report…</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-400/30 bg-red-500/10 p-8 text-center">
        <p className="text-lg font-semibold text-red-300">Report not found</p>
        <p className="mt-1 text-sm text-white/70">
          This audit link is invalid or the report has been removed.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-500"
        >
          Scan your website free <FiArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const result = report.result;
  const score = report.score ?? result?.score ?? 0;
  const brokenLinks = result?.scanStats.brokenLinks ?? 0;
  const totalLinks = result?.scanStats.totalLinks ?? 0;

  return (
    <div className="mx-auto max-w-3xl">
      <ScreenshotBanner scanId={scanId} hasScreenshot={Boolean(report.screenshotPath)} />
      <div className="mb-6 mt-6 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-300">
          <FiShield className="h-3.5 w-3.5" />
          LeadGuard Audit Report
        </p>
        <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{report.url}</h1>
        <p className="mt-1 text-xs text-white/60">
          {report.completedAt
            ? `Verified ${new Date(report.completedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}`
            : "Audit completed"}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg">
        <div className="flex flex-col items-center gap-6 border-b border-white/10 bg-white/[0.03] p-6 sm:flex-row">
          <ScoreRing score={score} />
          <div className="flex-1 space-y-4 text-center sm:text-left">
            {brokenLinks > 0 && (
              <LossCalculator brokenLinks={brokenLinks} totalLinks={totalLinks} />
            )}
            <div className="grid grid-cols-3 gap-3">
              <SummaryStat label="Links" value={totalLinks} color="#818cf8" />
              <SummaryStat
                label="Working"
                value={result?.scanStats.workingLinks ?? 0}
                color="#34d399"
              />
              <SummaryStat label="Broken" value={brokenLinks} color="#fb7185" />
            </div>
            {result?.performance ? (
              <p className="text-xs text-white/60">
                Fetch {formatMs(result.performance.fetchTime)} · Parse{" "}
                {formatMs(result.performance.parseTime)} · Total{" "}
                {formatMs(result.performance.totalTime)}
              </p>
            ) : null}
          </div>
        </div>

        {result ? (
          <>
            <div className="space-y-6 p-6 pb-0">
              <PillarCards pillars={result.pillars} />
              <CriticalFindings result={result} />
              <SecurityPanel security={result.security} />
            </div>
            <div className="grid gap-6 p-6 lg:grid-cols-2">
              <LinkSection
                title="WhatsApp"
                count={result.whatsappLinks.length}
                icon={<span aria-hidden>🟢</span>}
              >
                {result.whatsappLinks.map((l, i) => (
                  <LinkRow
                    key={i}
                    url={l.url}
                    display={l.url || "(no WhatsApp CTA found)"}
                    status={l.status}
                    sub={l.phone ? `Phone: ${l.phone}` : undefined}
                    issue={l.issue}
                    fix={l.suggestedFix}
                  />
                ))}
              </LinkSection>

              <LinkSection
                title="Phone"
                count={result.phoneLinks.length}
                icon={<span aria-hidden>📞</span>}
              >
                {result.phoneLinks.map((l, i) => (
                  <LinkRow
                    key={i}
                    url={l.url}
                    display={l.url}
                    status={l.status}
                    sub={l.number ? `Number: ${l.number}` : undefined}
                    issue={l.issue}
                    fix={l.suggestedFix}
                  />
                ))}
              </LinkSection>

              <LinkSection
                title="Email"
                count={result.emailLinks.length}
                icon={<span aria-hidden>✉️</span>}
              >
                {result.emailLinks.map((l, i) => (
                  <LinkRow
                    key={i}
                    url={l.url}
                    display={l.email}
                    status={l.status}
                    issue={l.issue}
                    fix={l.suggestedFix}
                  />
                ))}
              </LinkSection>

              <LinkSection
                title="Review"
                count={result.reviewLinks.length}
                icon={<span aria-hidden>⭐</span>}
              >
                {result.reviewLinks.map((l, i) => (
                  <LinkRow
                    key={i}
                    url={l.url}
                    display={l.url}
                    badge={<StatusBadge platform={l.platform} />}
                  />
                ))}
              </LinkSection>

              <div className="lg:col-span-2">
                <LinkSection
                  title="Social"
                  count={result.socialLinks.length}
                  icon={<span aria-hidden>🌐</span>}
                >
                  {result.socialLinks.map((l, i) => (
                    <LinkRow
                      key={i}
                      url={l.url}
                      display={l.url}
                      badge={<StatusBadge platform={l.platform} />}
                      sub={l.platform}
                    />
                  ))}
                </LinkSection>
              </div>
            </div>
          </>
        ) : (
          <p className="p-6 text-sm text-white/70">No scan data available.</p>
        )}
      </div>

      <div className="mt-6 text-left">
        <AiFixSuggestions scanId={scanId} />
      </div>

      <div className="mt-6 text-left">
        <WatchdogForm scanId={scanId} compact />
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-lg font-semibold text-white">Ready to fix these broken links?</p>
        <p className="mt-1 text-sm text-white/70">
          Our team can fix every broken contact channel in 24 hours — or set up 24/7 monitoring so
          this never happens again.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {result && (
            <button
              type="button"
              onClick={downloadPdf}
              disabled={pdfBusy}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 disabled:opacity-50"
            >
              <FiDownload className="h-4 w-4" />
              {pdfBusy ? "Preparing PDF…" : "Download PDF report"}
            </button>
          )}
          {result && (
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Export JSON
            </button>
          )}
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-500"
          >
            Get the fix done <FiArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
          >
            Run a free scan
          </Link>
        </div>
      </div>

      {/* Mobile sticky action bar (spec §26) */}
      {result && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-2 border-t border-white/10 bg-slate-950/95 p-3 backdrop-blur sm:hidden">
          <a
            href="https://wa.me/918307070605?text=Hi%2C%20meri%20website%20ke%20broken%20links%20fix%20karwane%20hain."
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2.5 text-xs font-bold text-white"
          >
            <FiTool className="h-4 w-4" />
            Fix my site
          </a>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={pdfBusy}
            aria-label="Download PDF report"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/20 px-3 py-2.5 text-xs font-semibold text-white/90 disabled:opacity-50"
          >
            <FiDownload className="h-4 w-4" />
            PDF
          </button>
          <button
            type="button"
            onClick={() => {
              document.getElementById("watchdog")?.scrollIntoView({ behavior: "smooth" });
            }}
            aria-label="Monitor this website"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/20 px-3 py-2.5 text-xs font-semibold text-white/90"
          >
            <FiBell className="h-4 w-4" />
            Monitor
          </button>
        </div>
      )}
    </div>
  );
}
