"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowRight, FiShield, FiLock } from "react-icons/fi";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validToken, setValidToken] = useState(true);

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    if (!token || !email) {
      setValidToken(false);
      setError("Invalid reset link. Please request a new one.");
    }
  }, [token, email]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!token || !email) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Reset failed.");
      }
      router.push("/login?reset=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!validToken) {
    return (
      <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900 text-center">
          <span className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-md">
            <FiLock className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-navy-900 dark:text-white">
            Invalid reset link
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This password reset link is invalid or has expired.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            Request a new link
            <FiArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 text-white shadow-md">
            <FiLock className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-navy-900 dark:text-white">
            Set new password
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your new password must be different from your current password.
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="••••••••"
              minLength={8}
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="••••••••"
              minLength={8}
            />
          </div>
          {password && confirmPassword && password !== confirmPassword && (
            <p className="text-sm text-red-600 dark:text-red-400">Passwords do not match</p>
          )}
          <button
            type="submit"
            disabled={busy || password !== confirmPassword || password.length < 8}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
          >
            {busy ? "Resetting…" : "Reset password"}
            {!busy && <FiArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-500">
            ← Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
