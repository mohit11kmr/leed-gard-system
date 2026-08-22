"use client";

import { FormEvent, useState } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { FiArrowLeft, FiBell, FiMail, FiMessageSquare, FiSave } from "react-icons/fi";
import { authedFetch } from "@/lib/client/api";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [frequency, setFrequency] = useState("DAILY");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const { toast } = useToast();
  useEffect(() => {
    authedFetch("/api/settings", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success)
          throw new Error(data.error?.message || "Could not load settings.");
        setEmail(data.settings?.email || "");
        setPhone(data.settings?.phone || "");
      })
      .catch((error) =>
        toast("error", error instanceof Error ? error.message : "Could not load settings."),
      );
  }, [toast]);
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await authedFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          url,
          alertEmail: email || undefined,
          alertPhone: phone || undefined,
          frequency,
          emailEnabled,
          smsEnabled,
          webhookEnabled,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.error?.message || "Could not save settings.");
      setMessage("Saved successfully.");
      toast("success", "Saved successfully.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not save settings.";
      setMessage(errorMessage);
      toast("error", errorMessage);
    } finally {
      setBusy(false);
    }
  }
  async function sendTestAlert() {
    try {
      const response = await authedFetch("/api/monitor/test", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.error?.message || "Could not send test alert.");
      toast("success", "Test alert sent.");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Could not send test alert.");
    }
  }
  return (
    <main className="mx-auto min-h-[70vh] max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600"
      >
        <FiArrowLeft /> Dashboard
      </Link>
      <div className="mt-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600">
          Control room
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-navy-900 dark:text-white">
          Monitoring alerts
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Choose where LeadGuard should send a signal when a site changes.
        </p>
      </div>
      <form onSubmit={save} className="mt-8 space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <label className="flex items-center gap-3 text-sm font-bold text-slate-800 dark:text-white">
            <FiBell className="text-primary-600" /> Site to monitor
          </label>
          <input
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            className="mt-4 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-primary-500 dark:border-slate-700"
          />
          <select
            value={frequency}
            onChange={(event) => setFrequency(event.target.value)}
            className="mt-3 rounded-lg border border-slate-300 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700"
          >
            <option value="DAILY">Daily check</option>
            <option value="WEEKLY">Weekly check</option>
          </select>
        </section>
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
              <FiMail className="text-primary-600" /> Email alerts
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="mt-4 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-primary-500 dark:border-slate-700"
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
              <FiMessageSquare className="text-primary-600" /> SMS alerts
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+919876543210"
              className="mt-4 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-primary-500 dark:border-slate-700"
            />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-800 dark:text-white">Alert channels</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["Email", emailEnabled, setEmailEnabled],
              ["SMS", smsEnabled, setSmsEnabled],
              ["Webhook", webhookEnabled, setWebhookEnabled],
            ].map(([label, enabled, setEnabled]) => (
              <label
                key={label as string}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"
              >
                <span>{label as string}</span>
                <input
                  type="checkbox"
                  checked={enabled as boolean}
                  onChange={(event) =>
                    (setEnabled as (value: boolean) => void)(event.target.checked)
                  }
                  className="h-4 w-4 accent-primary-600"
                />
              </label>
            ))}
          </div>
        </section>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            <FiSave /> {busy ? "Saving..." : "Save settings"}
          </button>
          <button
            type="button"
            onClick={() => void sendTestAlert()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold dark:border-slate-700"
          >
            <FiBell /> Send Test Alert
          </button>
        </div>
        {message && (
          <p
            className={`text-sm font-semibold ${message.includes("successfully") ? "text-emerald-600" : "text-rose-600"}`}
          >
            {message}
          </p>
        )}
      </form>
    </main>
  );
}
