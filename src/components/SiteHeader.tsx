"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiLogOut, FiShield } from "react-icons/fi";
import ThemeToggle from "@/components/ThemeToggle";
import { clearStoredAuth, getStoredAuth } from "@/lib/client/api";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

export default function SiteHeader() {
  const [authed, setAuthed] = useState(false);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    const auth = getStoredAuth();
    setAuthed(Boolean(auth?.apiKey));
    setGuest(Boolean(auth?.guest));
  }, []);

  function handleLogout() {
    clearStoredAuth();
    setAuthed(false);
    setGuest(false);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 text-white shadow-md">
            <FiShield className="h-5 w-5" />
          </span>
          <span className="text-base font-extrabold tracking-tight text-navy-900 dark:text-white">
            LeadGuard
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-600 transition hover:text-navy-900 dark:text-slate-300 dark:hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {!authed ? (
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-primary-500 dark:hover:text-primary-400"
            >
              Log in
            </Link>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-primary-500 dark:hover:text-primary-400"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Log out"
                title={guest ? "Clear guest session" : "Log out"}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-red-400 hover:text-red-500 dark:border-slate-700 dark:text-slate-300"
              >
                <FiLogOut className="h-4 w-4" />
              </button>
            </>
          )}
          <Link
            href="/"
            className="hidden rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 sm:inline-flex"
          >
            Scan a website
          </Link>
        </div>
      </div>
    </header>
  );
}
