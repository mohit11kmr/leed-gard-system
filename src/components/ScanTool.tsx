"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiClock, FiShield } from "react-icons/fi";
import { HistoryEntry, ScanResult, ScanStatusResponse } from "@/types/scan";
import { addToHistory, clearHistory, getHistory } from "@/lib/client/storage";
import { authedFetch } from "@/lib/client/api";
import { useToast } from "@/components/Toast";
import ScanForm from "@/components/ScanForm";
import ProgressBar from "@/components/ProgressBar";
import ScanTerminalModal from "@/components/ScanTerminalModal";
import ResultsCard from "@/components/ResultsCard";
import HistoryPanel from "@/components/HistoryPanel";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30;

export default function ScanTool() {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const [resultScanId, setResultScanId] = useState<string | null>(null);
  const [scanningUrl, setScanningUrl] = useState("");
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

  const persistEntry = useCallback((entry: HistoryEntry) => {
    setHistory(addToHistory(entry));
  }, []);

  const pollScan = useCallback(
    (scanId: string) => {
      stopPolling();
      let polls = 0;

      pollRef.current = setInterval(async () => {
        polls += 1;
        setProgress(Math.min(90, 10 + (polls / MAX_POLLS) * 80));

        try {
          const res = await authedFetch(`/api/scan/${scanId}`, { cache: "no-store" });
          if (!res.ok) throw new Error("Failed to fetch scan status.");
          const data = (await res.json()) as { data: ScanStatusResponse };
          const scan = data.data;

          if (scan.status === "COMPLETED" && scan.result) {
            stopPolling();
            setProgress(100);
            setResult(scan.result);
            setResultUrl(scan.url);
            setResultScanId(scan.id);
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
          } else if (polls >= MAX_POLLS) {
            stopPolling();
            setScanning(false);
            setProgress(0);
            toast("error", "Timed out waiting for the scan. Try again.");
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
    [persistEntry, stopPolling, toast],
  );

  const handleScan = useCallback(
    async (url: string) => {
      setScanning(true);
      setResult(null);
      setProgress(5);
      setScanningUrl(url);
      toast("info", "Scanning in progress...");

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
    [pollScan, toast],
  );

  const handleHistorySelect = useCallback(
    (entry: HistoryEntry) => {
      if (entry.result) {
        setResult(entry.result);
        setResultUrl(entry.url);
        setResultScanId(entry.id);
      } else {
        toast("info", entry.error || "This scan has no stored result.");
      }
      setHistoryOpen(false);
    },
    [toast],
  );

  const handleClearHistory = useCallback(() => {
    setHistory(clearHistory());
    toast("info", "History cleared");
  }, [toast]);

  return (
    <div className="w-full">
      <ScanForm scanning={scanning} onScan={handleScan} />
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/70">
        <FiShield className="h-3.5 w-3.5" />
        Free for any public website · No signup required · Takes ~5 seconds
      </p>

      {scanning && (
        <div className="mx-auto mt-6 max-w-xl rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
          <ProgressBar progress={progress} />
        </div>
      )}
      {scanning && (
        <ScanTerminalModal
          open={scanning}
          url={scanningUrl || "yourwebsite.com"}
          progress={progress}
        />
      )}

      {result && (
        <div className="mt-6">
          <ResultsCard result={result} url={resultUrl} scanId={resultScanId} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setHistoryOpen((o) => !o)}
        className="mx-auto mt-6 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition hover:border-white/40 hover:text-white"
      >
        <FiClock className="h-4 w-4" />
        Recent scans
      </button>

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onClear={handleClearHistory}
        onSelect={handleHistorySelect}
      />
    </div>
  );
}
