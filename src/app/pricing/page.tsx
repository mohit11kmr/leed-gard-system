"use client";

import { useEffect } from "react";
import { FiArrowRight, FiCheck } from "react-icons/fi";

const WHATSAPP = "https://wa.me/918307070605";
const EMAIL = "mailto:mohitsikarwar123@gmail.com";

const PLANS = [
  {
    name: "Free Scan",
    price: "₹0",
    period: "forever",
    desc: "Check any website's contact-link health instantly.",
    features: [
      "Single-page scan",
      "Health score (0–100)",
      "4 pillars: links, ad tags, SEO & security",
      "Shareable report link",
      "No signup required",
    ],
    cta: "Scan now",
    href: "/",
    highlight: false,
  },
  {
    name: "Audit & Fix",
    price: "₹4,999",
    period: "one-time",
    desc: "A real person reviews your site and fixes every broken contact link.",
    features: [
      "Human-reviewed full audit",
      "We fix WhatsApp, phone & email links",
      "You approve the fix list before paying",
      "Free re-scan after the fix",
      "Delivery within 48 hours",
    ],
    cta: "Book on WhatsApp",
    href: WHATSAPP,
    highlight: true,
  },
  {
    name: "Monitoring",
    price: "₹299",
    period: "/month",
    desc: "Automatic daily re-scans and instant email alerts when something breaks.",
    features: [
      "Free: protect 1 page after any scan",
      "₹299/mo: monitor any 5 websites",
      "Daily re-scan + instant email alert",
      "Security & spam injection alerts included",
      "Cancel anytime",
    ],
    cta: "Book on WhatsApp",
    href: WHATSAPP,
    highlight: false,
  },
];

export default function PricingPage() {
  useEffect(() => {
    void fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "pricing_viewed" }),
    }).catch(() => {});
  }, []);

  return (
    <>
      <section className="bg-slate-50 py-16 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-primary-600">
            Pricing
          </p>
          <h1 className="mx-auto mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Start free. Pay only when it helps.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-300">
            The scanner is always free. Fixing and monitoring is where the value lives.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                p.highlight
                  ? "border-primary-500 bg-white shadow-xl ring-2 ring-primary-500/20 dark:bg-slate-900"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-3 py-0.5 text-xs font-bold text-white">
                  Most popular
                </span>
              )}
              <h2 className="font-bold text-slate-900 dark:text-white">{p.name}</h2>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{p.price}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{p.period}</span>
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{p.desc}</p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={p.href}
                className={`mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  p.highlight
                    ? "bg-primary-600 text-white shadow-md hover:bg-primary-700"
                    : "border border-slate-300 text-slate-700 hover:border-primary-400 hover:text-primary-600 dark:border-slate-700 dark:text-slate-200"
                }`}
              >
                {p.cta}
                <FiArrowRight className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-xl text-center text-sm text-slate-500 dark:text-slate-400">
          Not sure what you need? Message us on WhatsApp — we&apos;ll scan your site
          for free and tell you exactly what&apos;s broken before you spend anything.
        </p>
      </section>
    </>
  );
}
