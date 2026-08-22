import { FiArrowRight, FiCheck, FiShield } from "react-icons/fi";
import ScanTool from "@/components/ScanTool";

const STATS = [
  { v: "307+", l: "real websites scanned" },
  { v: "116", l: "found losing leads (38%)" },
  { v: "~5s", l: "average scan time" },
];

const STEPS = [
  {
    n: "01",
    title: "Paste your URL",
    desc: "Enter any public website. No signup, no install.",
  },
  {
    n: "02",
    title: "We crawl & validate",
    desc: "LeadGuard finds every WhatsApp, phone, email and review link and checks it.",
  },
  {
    n: "03",
    title: "Get your score & fixes",
    desc: "A clear 0–100 health score with each broken link and its exact fix.",
  },
];

const POINTS = [
  "WhatsApp button health (wa.me, api.whatsapp.com)",
  "Indian phone numbers — catches doubled country codes",
  "Email (mailto) and review/social links",
  "Actionable report: every broken link + the fix",
];

export default function HomePage() {
  return (
    <>
      <section id="top" className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(16,185,129,0.14),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <FiShield className="h-3.5 w-3.5" />
            Free website link health check
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl">
            Is your website silently losing customers?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            A broken WhatsApp button or phone link turns ready buyers away every
            single day. LeadGuard finds them in seconds — and shows you exactly
            how to fix them.
          </p>

          <div className="mx-auto mt-10 max-w-2xl">
            <ScanTool />
          </div>

          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {STATS.map((s) => (
              <div
                key={s.l}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur"
              >
                <p className="text-2xl font-extrabold text-emerald-400">{s.v}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-300">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-primary-600">
            What it checks
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Every contact link, verified
          </h2>
        </div>
        <ul className="mx-auto mt-8 max-w-xl space-y-3">
          {POINTS.map((p) => (
            <li key={p} className="flex items-start gap-3 text-slate-700 dark:text-slate-200">
              <FiCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-slate-50 py-16 sm:py-20 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-primary-600">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              From URL to report in three steps
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="text-4xl font-extrabold text-primary-100 dark:text-primary-900">
                  {s.n}
                </span>
                <h3 className="mt-3 font-bold text-slate-900 dark:text-white">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 px-6 py-14 text-center text-white">
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            Find out what your website is really missing
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-100">
            One scan tells you exactly which contact links are costing you
            customers. It takes five seconds and it&apos;s free.
          </p>
          <a
            href="#top"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary-700 shadow-lg transition hover:bg-primary-50"
          >
            Check my website free
            <FiArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-4">
            <a
              href="/report/cmt3e69mg00057gzv7o4grtbe"
              className="text-sm font-medium text-primary-200 underline-offset-4 transition hover:text-white hover:underline"
            >
              or see an example report →
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
