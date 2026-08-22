"use client";

import { useMemo, useState } from "react";
import { ScanResult, Severity } from "@/types/scan";

type Pillar = "LEAD" | "ADS" | "SEO" | "SECURITY";

interface UnifiedFinding {
  pillar: Pillar;
  severity: Severity;
  title: string;
  detail?: string;
  evidence?: string;
  fix?: string;
}

const SEVERITY_META: Record<Severity, { dot: string; label: string; cls: string }> = {
  CRITICAL: { dot: "🔴", label: "CRITICAL", cls: "text-rose-600 dark:text-rose-400" },
  HIGH: { dot: "🟠", label: "HIGH", cls: "text-orange-600 dark:text-orange-400" },
  MEDIUM: { dot: "🟡", label: "MEDIUM", cls: "text-amber-600 dark:text-amber-400" },
  LOW: { dot: "🔵", label: "LOW", cls: "text-sky-600 dark:text-sky-400" },
  INFO: { dot: "⚪", label: "INFO", cls: "text-slate-500 dark:text-slate-400" },
};

const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

const TABS: { key: Pillar | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "LEAD", label: "Lead" },
  { key: "ADS", label: "Ads" },
  { key: "SEO", label: "SEO" },
  { key: "SECURITY", label: "Security" },
];

function collectFindings(result: ScanResult): UnifiedFinding[] {
  const out: UnifiedFinding[] = [];

  for (const link of result.whatsappLinks ?? []) {
    if (link.issue) {
      out.push({
        pillar: "LEAD",
        severity: link.status === "BROKEN" ? "HIGH" : "MEDIUM",
        title: `WhatsApp contact link ${link.status === "BROKEN" ? "malformed" : "missing"}`,
        detail: link.issue,
        evidence: link.url,
        fix: link.suggestedFix ?? undefined,
      });
    }
  }
  for (const link of result.phoneLinks ?? []) {
    if (link.issue) {
      out.push({
        pillar: "LEAD",
        severity: "MEDIUM",
        title: "Phone number looks invalid",
        detail: link.issue,
        evidence: link.url,
        fix: link.suggestedFix ?? undefined,
      });
    }
  }
  for (const f of result.adFindings ?? []) {
    out.push({
      pillar: "ADS",
      severity: f.severity,
      title: f.message,
      detail:
        f.ruleId === "AD-DUP-GA4-001"
          ? "Duplicate GA4 tags can double-count visitors and corrupt ad reporting."
          : "Advertising / analytics tag issue detected on this page.",
      evidence: f.ruleId,
    });
  }
  for (const f of result.seoFindings ?? []) {
    out.push({
      pillar: "SEO",
      severity: f.severity,
      title: f.message,
      detail:
        f.ruleId === "SEO-NOINDEX-001"
          ? "Search engines may be instructed not to index this page, hiding you from Google."
          : "SEO indexing risk detected.",
      evidence: f.source,
    });
  }
  for (const f of result.security?.findings ?? []) {
    out.push({
      pillar: "SECURITY",
      severity: f.severity === "danger" ? "CRITICAL" : "HIGH",
      title: f.detail.split(".")[0],
      detail: f.detail,
      evidence: f.evidence?.[0],
      fix:
        f.type === "spam_content"
          ? "Remove injected spam pages/posts, then run a malware scan and update your CMS + plugins."
          : "Inspect and remove the suspicious code, then rotate all CMS/admin passwords.",
    });
  }

  return out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

export default function CriticalFindings({ result }: { result: ScanResult }) {
  const findings = useMemo(() => collectFindings(result), [result]);
  const [tab, setTab] = useState<Pillar | "ALL">("ALL");
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const visible = tab === "ALL" ? findings : findings.filter((f) => f.pillar === tab);
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;

  if (findings.length === 0) {
    return (
      <section id="findings" className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/5">
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          ✓ Great news — no issues were detected by the current automated rules.
        </p>
      </section>
    );
  }

  return (
    <section id="findings" aria-label="Findings by severity">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
          Findings
          {criticalCount > 0 && (
            <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
              {criticalCount} critical
            </span>
          )}
        </h3>
        <div role="tablist" aria-label="Filter findings by pillar" className="-mx-1 flex overflow-x-auto px-1">
          {TABS.map((t) => {
            const count = t.key === "ALL" ? findings.length : findings.filter((f) => f.pillar === t.key).length;
            if (count === 0 && t.key !== "ALL") return null;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition ${
                  tab === t.key
                    ? "bg-primary-600 text-white"
                    : "bg-white/10 text-slate-300 hover:bg-white/20"
                }`}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <ul className="space-y-2">
        {visible.map((f, i) => {
          const meta = SEVERITY_META[f.severity];
          const open = openIdx === i;
          return (
            <li
              key={`${f.pillar}-${i}`}
              className="rounded-lg border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                aria-expanded={open}
                className="flex w-full items-start gap-2.5 text-left"
              >
                <span aria-hidden className="mt-0.5">{meta.dot}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[11px] font-bold tracking-wide ${meta.cls}`}>
                    {meta.label} · {TABS.find((t) => t.key === f.pillar)?.label}
                  </span>
                  <span className="block text-sm font-medium text-slate-100">{f.title}</span>
                </span>
                <span aria-hidden className="ml-1 mt-1 text-xs text-slate-400">{open ? "▲" : "▼"}</span>
              </button>
              {open && (
                <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2 pl-6 text-xs leading-relaxed text-slate-300">
                  {f.detail && <p>{f.detail}</p>}
                  {f.evidence && (
                    <p className="break-all font-mono text-[11px] text-slate-400">
                      Evidence: {f.evidence}
                    </p>
                  )}
                  {f.fix && (
                    <p className="font-medium text-emerald-400">Fix: {f.fix}</p>
                  )}
                  <p className="pt-0.5 text-[11px] italic text-slate-500">
                    Automated finding — manual verification recommended.
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
