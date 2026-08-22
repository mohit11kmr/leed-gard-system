"use client";

import { useState } from "react";
import { FiBell, FiCheckCircle } from "react-icons/fi";
import { useToast } from "./Toast";

type Phase = "idle" | "busy" | "done";
type Channel = "EMAIL" | "WHATSAPP" | "TELEGRAM";

const CHANNELS: { id: Channel; label: string; placeholder: string; inputType: string; aria: string }[] = [
  { id: "EMAIL", label: "Email", placeholder: "you@yourbusiness.com", inputType: "email", aria: "Email for alerts" },
  { id: "WHATSAPP", label: "WhatsApp", placeholder: "98765 43210", inputType: "tel", aria: "WhatsApp number for alerts" },
  { id: "TELEGRAM", label: "Telegram ID", placeholder: "123456789", inputType: "text", aria: "Telegram chat ID for alerts" },
];

export default function WatchdogForm({
  scanId,
  compact = false,
}: {
  scanId?: string | null;
  compact?: boolean;
}) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("idle");
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [contactValue, setContactValue] = useState("");
  const [message, setMessage] = useState("");

  if (!scanId) return null;

  async function activate() {
    if (phase === "busy") return;
    setPhase("busy");
    try {
      const res = await fetch("/api/watchdog/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId, contactType: channel, contactValue }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Activation failed.");
      }
      setMessage(data.data?.message || "Protection active.");
      setPhase("done");
      toast("success", "Free daily protection activated");
    } catch (err) {
      setPhase("idle");
      toast("error", err instanceof Error ? err.message : "Activation failed.");
    }
  }

  if (phase === "done") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-500/40 dark:bg-emerald-500/10">
        <FiCheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Free daily protection active
          </p>
          <p className="mt-0.5 text-xs text-emerald-700/90 dark:text-emerald-400/90">
            {message} We re-scan this page daily and email you the moment a new problem appears.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="watchdog"
      className={`rounded-xl border border-primary-500/30 bg-primary-500/5 ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex items-start gap-3">
        <FiBell className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600 dark:text-primary-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Protect this page free — forever checked daily
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            We re-scan this page every day. If any contact link breaks or a new security
            sign appears, you get an instant email alert. No payment, no signup.
          </p>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void activate();
            }}
          >
            <div
              role="radiogroup"
              aria-label="Alert channel"
              className="flex gap-1.5"
            >
              {CHANNELS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={channel === id}
                  onClick={() => {
                    setChannel(id);
                    setContactValue("");
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    channel === id
                      ? "bg-primary-600 text-white"
                      : "border border-slate-300 bg-white text-slate-600 hover:border-primary-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {CHANNELS.filter((c) => c.id === channel).map(({ id, placeholder, inputType, aria }) => (
              <input
                key={id}
                type={inputType}
                required
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                placeholder={placeholder}
                aria-label={aria}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            ))}
            <button
              type="submit"
              disabled={phase === "busy"}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-60"
            >
              {phase === "busy" ? "Activating…" : "Activate free alerts"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
