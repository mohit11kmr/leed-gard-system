"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiClock, FiShield } from "react-icons/fi";
import { HistoryEntry, ScanResult, ScanStatusResponse } from "@/types/scan";
import { addToHistory, getHistory } from "@/lib/client/storage";
import { authedFetch } from "@/lib/client/api";
import { ToastProvider, useToast } from "@/components/Toast";
import ScanForm from "@/components/ScanForm";
import ProgressBar from "@/components/ProgressBar";
import ResultsCard from "@/components/ResultsCard";
import HistoryPanel from "@/components/HistoryPanel";
import ThemeToggle from "@/components/ThemeToggle";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30;

function Home() {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const persistEntry = useCallback(
    (entry: HistoryEntry) => {
      setHistory(addToHistory(entry));
    },
    []
  );

  const pollScan = useCallback(
    (scanId: string) => {
      stopPolling();
      let polls = 0;

      pollRef.current = setInterval(async () => {
        polls += 1;
        setProgress(Math.min(90, 10 + (polls / MAX_POLLS) * 80));

        try {
          const res = await authedFetch(`/api/scan/${scanId}`, { cache: "no-store" });
          if (!res.ok) {
            throw new Error("Failed to fetch scan status.");
          }
          const data = (await res.json()) as { data: ScanStatusResponse };
          const scan = data.data;

          if (scan.status === "COMPLETED" && scan.result) {
            stopPolling();
            setProgress(100);
            setResult(scan.result);
            setResultUrl(scan.url);
            persistEntry({
              id: scan.id,
              url: scan.url,
              score: scan.score,
              status: "COMPLETED",
              error: null,
              result: scan.result,
              scannedAt: new Date().toISOString(),
            });
            setScanning(false);
            toast("success", `Scan complete · score ${scan.score}/100`);
          } else if (scan.status === "FAILED") {
            stopPolling();
            setProgress(100);
            setResult(null);
            persistEntry({
              id: scan.id,
              url: scan.url,
              score: null,
              status: "FAILED",
              error: scan.error,
              result: null,
              scannedAt: new Date().toISOString(),
            });
            setScanning(false);
            toast("error", scan.error || "Scan failed");
          }
        } catch {
          if (polls >= MAX_POLLS) {
            stopPolling();
            setScanning(false);
            toast("error", "Timed out waiting for the scan.");
          }
        }
      }, POLL_INTERVAL_MS);
    },
    [persistEntry, stopPolling, toast]
  );

  const handleScan = useCallback(
    async (url: string) => {
      setScanning(true);
      setResult(null);
      setProgress(5);

      try {
        const res = await authedFetch("/api/scan", {
          method: "POST",
          body: JSON.stringify({ url }),
        });

        if (res.status === 429) {
          toast("error", "Rate limit reached. Try again in a minute.");
          setScanning(false);
          setProgress(0);
          return;
        }

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || "Failed to start scan.");
        }

        setProgress(10);
        pollScan(data.scanId as string);
      } catch (err) {
        setScanning(false);
        setProgress(0);
        toast("error", err instanceof Error ? err.message : "Scan failed to start.");
      }
    },
    [pollScan, toast]
  );

  const handleHistorySelect = useCallback(
    (entry: HistoryEntry) => {
      if (entry.result) {
        setResult(entry.result);
        setResultUrl(entry.url);
      } else {
        toast("info", entry.error || "This scan has no stored result.");
      }
      setHistoryOpen(false);
    },
    [toast]
  );

  const clearHistory = useCallback(() => {
    setHistory(getHistory());
    window.localStorage.removeItem("leadguard:history");
    setHistory([]);
    toast("info", "History cleared");
  }, [toast]);

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-lg font-bold text-white">
              LG
            </span>
            <div>
              <p className="text-sm font-bold leading-tight text-slate-800 dark:text-slate-100">
                LeadGuard Scanner
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Check if your WhatsApp &amp; call links are broken
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-primary-400 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <FiClock className="h-4 w-4" />
              History
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-12 pb-4">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Is your website losing leads?
          </h1>
          <p className="mt-3 text-base text-slate-500 dark:text-slate-400">
            LeadGuard crawls your site and checks WhatsApp buttons, phone numbers,
            review links and emails — giving you a clear health score in seconds.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-4">
        <ScanForm scanning={scanning} onScan={handleScan} />
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <FiShield className="h-3.5 w-3.5" />
          Free for any public website. No signup required.
        </p>
      </section>

      <section className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {scanning && (
          <div className="mx-auto max-w-xl">
            <ProgressBar progress={progress} />
          </div>
        )}

        {result && <ResultsCard result={result} url={resultUrl} />}

        <HistoryPanel
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          history={history}
          onClear={clearHistory}
          onSelect={handleHistorySelect}
        />
      </section>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-slate-400">
        LeadGuard Scanner · Free link health audits for small businesses
      </footer>
    </main>
  );
}

export default function Page() {
  return (
    <ToastProvider>
      <Home />
    </ToastProvider>
  );
}