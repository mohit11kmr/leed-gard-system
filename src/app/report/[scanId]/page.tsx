import type { Metadata } from "next";
import ReportView from "@/components/ReportView";

export const metadata: Metadata = {
  title: "LeadGuard Audit Report",
  robots: { index: false, follow: false },
};

export default async function ReportPage({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  return (
    <main className="bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <ReportView scanId={scanId} />
      </div>
    </main>
  );
}
