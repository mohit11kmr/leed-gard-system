import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { ToastProvider } from "@/components/Toast";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "LeadGuard – Free WhatsApp & Call Link Health Check",
  description:
    "Find broken WhatsApp, phone and email links on your website in seconds. Get a clear 0–100 health score and fix every link before it costs you customers.",
  openGraph: {
    title: "LeadGuard – Website Revenue & Security Diagnostic",
    description:
      "Free scan: broken WhatsApp/call links, ad-tracking gaps, SEO risks and hack indicators — one 0–100 health score.",
    url: BASE_URL,
    siteName: "LeadGuard",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadGuard – Website Revenue & Security Diagnostic",
    description:
      "Broken WhatsApp links, ad waste, SEO risks, hack indicators — one free scan.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f2847",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Lora:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <ToastProvider>{children}</ToastProvider>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
