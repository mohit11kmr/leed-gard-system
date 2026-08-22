"use client";

import { useEffect, useRef, useState } from "react";
import { FiCopy, FiX, FiZap } from "react-icons/fi";
import { authedFetch } from "@/lib/client/api";

interface AiFixModalProps {
  open: boolean;
  onClose: () => void;
  linkType?: string;
  linkUrl?: string;
  issue?: string;
  suggestedFix?: string;
  pageUrl?: string;
}

type Phase = "idle" | "loading" | "ready" | "error";

function renderSections(fix: string) {
  const parts = fix.split(/^(PROBLEM|FIX|TIP):\s*/m).filter(Boolean);
  const sections: { label: string; body: string }[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i] === "PROBLEM" || parts[i] === "FIX" || parts[i] === "TIP") {
      sections.push({ label: parts[i], body: parts[i + 1]?.trim() ?? "" });
    } else if (i === 0) {
      sections.push({ label: "", body: parts[0] });
    }
  }
  return sections;
}

export default function AiFixModal(props: AiFixModalProps) {
  const { open, onClose, linkType, linkUrl, issue, suggestedFix, pageUrl } = props;
  const [phase, setPhase] = useState<Phase>("idle");
  const [fixText, setFixText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      requestedRef.current = false;
      setPhase("idle");
      setFixText("");
      setError("");
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || phase !== "idle" || requestedRef.current) return;
    requestedRef.current = true;
    setPhase("loading");
    (async () => {
      try {
        const res = await authedFetch("/api/ai-fix", {
          method: "POST",
          body: JSON.stringify({ linkType, linkUrl, issue, suggestedFix, pageUrl }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || "AI request failed.");
        }
        setFixText(data.data.fix as string);
        setPhase("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : "AI request failed.");
        setPhase("error");
      }
    })();
  }, [open, phase, linkType, linkUrl, issue, suggestedFix, pageUrl]);

  if (!open) return null;

  async function copyCode() {
    const match = fixText.match(/```[a-z]*\n([\s\S]*?)```/);
    const code = match ? match[1] : fixText;
    try {
      await navigator.clipboard.writeText(code.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="AI fix suggestion"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <FiZap className="text-primary-500" />
            AI Fix Suggestion
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {phase === "loading" && (
          <div className="mt-8 flex flex-col items-center gap-3 py-6 text-sm text-slate-600 dark:text-slate-300">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            AI soch raha hai…
          </div>
        )}

        {phase === "error" && (
          <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}

        {phase === "ready" && (
          <div className="mt-4 space-y-4">
            {renderSections(fixText).map((s, i) => (
              <div key={i}>
                {s.label && (
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                    {s.label}
                  </p>
                )}
                {/```/.test(s.body) ? (
                  <div className="relative">
                    <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-xs text-emerald-300">
                      {s.body.replace(/```[a-z]*\n?/g, "").replace(/```/g, "").trim()}
                    </pre>
                    <button
                      type="button"
                      onClick={() => void copyCode()}
                      className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] text-white transition hover:bg-white/20"
                    >
                      <FiCopy className="h-3 w-3" />
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {s.body}
                  </p>
                )}
              </div>
            ))}
            <p className="text-[11px] text-slate-400">
              AI suggestion — paste karne se pehle verify zaroor karein.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
