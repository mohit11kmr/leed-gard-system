"use client";

import { Pillars } from "@/types/scan";

const PILLAR_META = [
  { key: "lead", name: "Lead Guardian", icon: "💬" },
  { key: "adshield", name: "Ad Shield", icon: "🎯" },
  { key: "seo", name: "SEO Shield", icon: "🔍" },
  { key: "cyber", name: "Cyber Shield", icon: "🚨" },
] as const;

function band(score: number): {
  label: string;
  text: string;
  ring: string;
} {
  if (score >= 90)
    return {
      label: "Very healthy",
      text: "text-emerald-600 dark:text-emerald-400",
      ring: "border-emerald-200 dark:border-emerald-500/30",
    };
  if (score >= 70)
    return {
      label: "Good",
      text: "text-lime-600 dark:text-lime-400",
      ring: "border-lime-200 dark:border-lime-500/30",
    };
  if (score >= 50)
    return {
      label: "Needs attention",
      text: "text-amber-600 dark:text-amber-400",
      ring: "border-amber-200 dark:border-amber-500/30",
    };
  return {
    label: "High risk",
    text: "text-rose-600 dark:text-rose-400",
    ring: "border-rose-200 dark:border-rose-500/30",
  };
}

export default function PillarCards({ pillars }: { pillars?: Pillars }) {
  if (!pillars) return null;

  return (
    <section aria-label="Diagnostic pillars" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {PILLAR_META.map(({ key, name, icon }) => {
        const p = pillars[key];
        if (!p) return null;
        const b = band(p.score);
        return (
          <div
            key={key}
            className={`rounded-xl border bg-white p-4 dark:bg-slate-800/60 ${b.ring}`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <span aria-hidden>{icon}</span>
                {name}
              </span>
              <span className={`text-xs font-medium ${b.text}`}>{b.label}</span>
            </div>
            <p className={`mt-2 text-3xl font-bold tabular-nums ${b.text}`}>
              {p.score}
              <span className="ml-0.5 text-sm font-medium text-slate-400">/100</span>
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {p.issueCount > 0 ? `${p.issueCount} finding${p.issueCount === 1 ? "" : "s"}` : "All clear"}
            </p>
            <p className="mt-2 line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {p.summary}
            </p>
            <a
              href="#findings"
              className="mt-2 inline-block text-xs font-semibold text-primary-600 transition hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              View findings →
            </a>
          </div>
        );
      })}
    </section>
  );
}
