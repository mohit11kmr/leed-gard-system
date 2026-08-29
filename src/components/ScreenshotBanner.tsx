"use client";

import { useState } from "react";
import { FiEye } from "react-icons/fi";

export default function ScreenshotBanner({
  scanId,
  hasScreenshot,
}: {
  scanId: string;
  hasScreenshot: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!hasScreenshot || failed) return null;

  return (
    <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur">
        <FiEye className="h-3.5 w-3.5 animate-pulse" />
        Live Preview
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/scan/${scanId}/screenshot`}
        alt={`Full-page preview captured during the scan`}
        loading="lazy"
        onError={() => setFailed(true)}
        className="max-h-[420px] w-full object-cover object-top"
      />
      <p className="border-t border-white/10 px-4 py-2 text-xs text-white/50">
        Full-page snapshot captured by LeadGuard at scan time.
      </p>
    </div>
  );
}
