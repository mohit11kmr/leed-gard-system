import { FiMail, FiMessageSquare, FiShield } from "react-icons/fi";

const CHANNELS = [
  {
    icon: FiMail,
    title: "Email us",
    desc: "For audits, partnerships and anything else.",
    action: "mohitsikarwar123@gmail.com",
    href: "mailto:mohitsikarwar123@gmail.com",
  },
  {
    icon: FiMessageSquare,
    title: "WhatsApp",
    desc: "Fastest for a quick question or audit request.",
    action: "Chat on WhatsApp",
    href: "https://wa.me/918307070605",
  },
  {
    icon: FiShield,
    title: "Free scan",
    desc: "See what's broken on your site right now.",
    action: "Scan your website",
    href: "/",
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="bg-slate-50 py-16 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-primary-600">
            Contact
          </p>
          <h1 className="mx-auto mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Let&apos;s get your links working
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-300">
            Whether it&apos;s a one-time audit or ongoing monitoring, we reply
            within one business day.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {CHANNELS.map((c) => (
            <a
              key={c.title}
              href={c.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-primary-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white">
                <c.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{c.title}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.desc}</p>
              <p className="mt-3 text-sm font-semibold text-primary-600 transition group-hover:text-primary-700 dark:text-primary-400">
                {c.action} →
              </p>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
