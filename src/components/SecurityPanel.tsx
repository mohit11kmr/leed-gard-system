"use client";

import { SecurityCheck } from "@/types/scan";

const STATUS_META = {
  CLEAN: {
    label: "No compromise signs found",
    desc: "Basic security checks passed — no spam injections or suspicious scripts detected on this page.",
    banner: "border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10",
    dot: "bg-emerald-500",
    text: "text-emerald-800 dark:text-emerald-300",
    sub: "text-emerald-700/80 dark:text-emerald-400/80",
  },
  WARNING: {
    label: "Warning signs detected",
    desc: "Some indicators of compromise were found. We recommend an expert review.",
    banner: "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10",
    dot: "bg-amber-500",
    text: "text-amber-800 dark:text-amber-300",
    sub: "text-amber-700/90 dark:text-amber-400/90",
  },
  DANGER: {
    label: "Strong compromise signals",
    desc: "Multiple indicators suggest this site may be hacked or has injected spam content. This can lead to Google penalties and lost customer trust. Expert cleanup recommended.",
    banner: "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10",
    dot: "bg-red-500",
    text: "text-red-800 dark:text-red-300",
    sub: "text-red-700/90 dark:text-red-400/90",
  },
} as const;

const FINDING_LABEL: Record<string, string> = {
  spam_content: "Spam content injection",
  hidden_links: "Hidden external links",
  suspicious_script: "Suspicious / obfuscated scripts",
};

export default function SecurityPanel({ security }: { security?: SecurityCheck }) {
  if (!security) return null;
  const meta = STATUS_META[security.status];

  return (
    <section aria-label="Website security check" className="space-y-3">
      <div className={`rounded-xl border p-4 ${meta.banner}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${meta.dot}`} />
          <div>
            <h3 className={`text-sm font-semibold uppercase tracking-wide ${meta.text}`}>
              Security check · {security.status}
            </h3>
            <p className={`mt-1 text-sm font-medium ${meta.text}`}>{meta.label}</p>
            <p className={`mt-0.5 text-xs leading-relaxed ${meta.sub}`}>{meta.desc}</p>
          </div>
        </div>

        {security.findings.length > 0 && (
          <ul className="mt-4 space-y-3">
            {security.findings.map((f, i) => (
              <li
                key={i}
                className="rounded-lg border border-slate-200 bg-white/70 p-3 text-sm dark:border-slate-600/60 dark:bg-slate-900/60"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                      f.severity === "danger"
                        ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                    }`}
                  >
                    {f.severity}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {FINDING_LABEL[f.type] ?? f.type}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {f.detail}
                </p>
                {f.evidence.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {f.evidence.map((e, j) => (
                      <li key={j} className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        · {e}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        {security.status !== "CLEAN" && (
          <p className={`mt-3 text-xs font-medium ${meta.sub}`}>
            Hacked ya compromised lag rahi hai? Hum iski expert review aur cleanup kar sakte hain —{" "}
            <a
              href="https://wa.me/918307070605?text=Hi%2C%20meri%20website%20ka%20security%20check%20me%20problem%20mili%20hai.%20Please%20review%20karein."
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:no-underline"
            >
              WhatsApp for a security audit
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
