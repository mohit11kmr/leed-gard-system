"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiShield, FiMail } from "react-icons/fi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Request failed.");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 text-white shadow-md">
            <FiMail className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-navy-900 dark:text-white">
            Forgot password?
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            If an account exists, a password reset link has been sent.
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="you@business.com"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send reset link"}
              {!busy && <FiArrowRight className="h-4 w-4" />}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-500">
            ← Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
