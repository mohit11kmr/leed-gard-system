import Link from "next/link";
import {
  FiActivity,
  FiArrowRight,
  FiFileText,
  FiMail,
  FiSmartphone,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";

const FEATURES = [
  {
    icon: FiSmartphone,
    title: "WhatsApp link health",
    desc: "Detects wa.me and api.whatsapp.com links and verifies the number has a valid 10–15 digit format — so your chat button always opens a real conversation.",
  },
  {
    icon: FiActivity,
    title: "Indian phone validation",
    desc: "Catches tel: links with doubled country codes, missing digits or landline mistakes — the exact errors that make one-tap calls fail.",
  },
  {
    icon: FiMail,
    title: "Email & review links",
    desc: "Validates mailto links and flags review and social links, so customers always land where you intended.",
  },
  {
    icon: FiZap,
    title: "Health score in seconds",
    desc: "A clear 0–100 score computed from every broken WhatsApp, phone and email link. Zero guesswork — either your links work or they don't.",
  },
  {
    icon: FiFileText,
    title: "Actionable report",
    desc: "Every broken link listed with the exact corrected value. Copy the fix, apply it, done — no technical knowledge needed.",
  },
  {
    icon: FiTrendingUp,
    title: "Monitoring (coming soon)",
    desc: "Scheduled re-scans with WhatsApp and email alerts the moment a link breaks — so you never lose leads quietly again.",
  },
];

const COVERAGE = [
  { label: "WhatsApp (wa.me / api.whatsapp.com)", detail: "10–15 digit validation" },
  { label: "Phone (tel:)", detail: "Indian 10-digit, landline-aware" },
  { label: "Email (mailto:)", detail: "Format validation" },
  { label: "Review links", detail: "Google Maps, g.page, goo.gl/maps" },
  { label: "Social links", detail: "Facebook, Instagram, X, LinkedIn, YouTube" },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="bg-slate-50 py-16 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-primary-600">
            Features
          </p>
          <h1 className="mx-auto mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Everything a lead-ready website needs
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-300">
            LeadGuard was built for one job: making sure every way a customer can
            reach you — actually works.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white">
                <f.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-3 font-bold text-slate-900 dark:text-white">{f.title}</h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-14 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-primary-600">
              Coverage
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Built for Indian businesses
            </h2>
          </div>
          <div className="mx-auto mt-8 grid max-w-3xl gap-3">
            {COVERAGE.map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="font-medium text-slate-800 dark:text-slate-100">{c.label}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{c.detail}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary-700"
            >
              Scan your website free
              <FiArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
