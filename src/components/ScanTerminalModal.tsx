"use client";

const STEPS = [
  { text: "Connecting & reading the website" },
  { text: "Checking customer contact channels" },
  { text: "Checking advertising tags" },
  { text: "Checking SEO indexing risks" },
  { text: "Checking security & spam injections" },
  { text: "Computing health score & loss estimate" },
];

function stepFor(progress: number): number {
  const scaled = Math.min(99, Math.max(0, progress));
  return Math.min(STEPS.length - 1, Math.floor((scaled / 100) * STEPS.length));
}

export default function ScanTerminalModal({
  open,
  url,
  progress,
}: {
  open: boolean;
  url: string;
  progress: number;
}) {
  if (!open) return null;
  const active = stepFor(progress);

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto mt-6 max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-black/40 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-rose-500/80" />
        <span className="h-3 w-3 rounded-full bg-amber-500/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
        <p className="ml-2 truncate font-mono text-xs text-slate-400">
          leadguard scan — {url}
        </p>
      </div>

      <div className="space-y-2.5 p-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-400 transition-all duration-700"
            style={{ width: `${Math.min(100, Math.max(4, progress))}%` }}
          />
        </div>

        <ul className="space-y-1.5 pt-1">
          {STEPS.map((step, i) => {
            if (i < active) {
              return (
                <li key={i} className="flex items-center gap-2 font-mono text-xs text-emerald-400">
                  <span aria-hidden>✓</span>
                  <span>{step.text}</span>
                </li>
              );
            }
            if (i === active) {
              return (
                <li key={i} className="flex items-center gap-2 font-mono text-xs text-white">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary-400" aria-hidden />
                  <span>{step.text}…</span>
                </li>
              );
            }
            return (
              <li key={i} className="flex items-center gap-2 font-mono text-xs text-slate-600">
                <span aria-hidden>○</span>
                <span>{step.text}</span>
              </li>
            );
          })}
        </ul>

        <p className="pt-1 font-mono text-[10px] text-slate-500">
          This may take a few seconds.
        </p>
      </div>
    </div>
  );
}
