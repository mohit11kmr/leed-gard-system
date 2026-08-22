import Link from "next/link";
import { FiMail, FiShield } from "react-icons/fi";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Scan a website", href: "/" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "About", href: "/contact" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 text-white">
                <FiShield className="h-5 w-5" />
              </span>
              <span className="text-base font-extrabold tracking-tight text-navy-900 dark:text-white">
                LeadGuard
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Free website link health checks for small businesses. We find broken
              WhatsApp, phone and email links before they cost you customers.
            </p>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{c.title}</p>
              <ul className="mt-3 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-slate-500 transition hover:text-navy-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 text-sm text-slate-400 dark:border-slate-800 sm:flex-row">
          <p>© {new Date().getFullYear()} LeadGuard. All rights reserved.</p>
          <a
            href="mailto:mohitsikarwar123@gmail.com"
            className="inline-flex items-center gap-1.5 transition hover:text-primary-600"
          >
            <FiMail className="h-4 w-4" />
            mohitsikarwar123@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
