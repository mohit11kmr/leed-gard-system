import { logger } from "./logger";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

async function sendViaResend(msg: EmailMessage): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const from = process.env.ALERT_FROM_EMAIL || "LeadGuard <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend API responded HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }
  return true;
}

async function sendViaSmtp(msg: EmailMessage): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  if (!host) return false;
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  await transporter.sendMail({
    from: process.env.ALERT_FROM_EMAIL || "LeadGuard <alerts@leadguard.local>",
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
  });
  return true;
}

export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  try {
    if (await sendViaResend(msg)) return true;
  } catch (err) {
    logger.error("resend email failed, trying smtp fallback", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return sendViaSmtp(msg);
}

export { appBaseUrl };
