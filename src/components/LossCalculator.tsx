"use client";

import { useMemo, useState } from "react";
import { FiChevronDown } from "react-icons/fi";

function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export default function LossCalculator({
  prefill,
  brokenLinks,
  totalLinks,
}: {
  prefill?: number;
  brokenLinks?: number;
  totalLinks?: number;
}) {
  const [open, setOpen] = useState(false);
  const [visitors, setVisitors] = useState(10000);
  const [rate, setRate] = useState(2);
  const [value, setValue] = useState(3000);
  const derivedAffected =
    brokenLinks != null && totalLinks != null && totalLinks > 0
      ? Math.min(100, Math.round((brokenLinks / totalLinks) * 100))
      : null;
  const initial = prefill && prefill > 0 ? Math.min(100, prefill) : derivedAffected ?? 25;
  const [affected, setAffected] = useState(initial);

  const exposure = useMemo(
    () => visitors * (rate / 100) * value * (affected / 100),
    [visitors, rate, value, affected]
  );

  const field =
    "w-24 rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-right text-sm text-slate-100 outline-none focus:border-primary-400";
  const label = "text-xs font-medium text-slate-300";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-slate-100">
            🧮 Revenue exposure calculator
          </span>
          <span className="mt-0.5 block text-xs text-slate-400">
            Apne numbers daalo — dekho problem mahine kitni kamai kha rahi hai
          </span>
        </span>
        <FiChevronDown
          className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-white/10 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className={label}>Monthly visitors</span>
              <input type="number" min={0} value={visitors} onChange={(e) => setVisitors(Math.max(0, +e.target.value || 0))} className={field} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={label}>Lead rate %</span>
              <input type="number" min={0} max={100} step="0.5" value={rate} onChange={(e) => setRate(Math.min(100, Math.max(0, +e.target.value || 0)))} className={field} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={label}>Avg customer ₹</span>
              <input type="number" min={0} step={500} value={value} onChange={(e) => setValue(Math.max(0, +e.target.value || 0))} className={field} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={label}>Affected %</span>
              <input type="number" min={0} max={100} value={affected} onChange={(e) => setAffected(Math.min(100, Math.max(0, +e.target.value || 0)))} className={field} />
            </label>
          </div>

          <p className="mt-4 text-center text-2xl font-extrabold text-slate-50">
            {inr(exposure)} <span className="text-sm font-medium text-slate-400">/ month estimated exposure</span>
          </p>
          <p className="mt-1.5 text-center text-[11px] italic text-slate-500">
            Scenario estimate based on your inputs — not a guaranteed loss figure.
          </p>
        </div>
      )}
    </div>
  );
}
