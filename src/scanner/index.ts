import { cleanHtml } from "./cleanHtml";
import { extractAllLinks } from "./extract";
import { fetchHtml } from "./fetchHtml";
import { calculateScore } from "./score";
import {
  LinkStatus,
  ScanResult,
} from "./types";
import { validateAll } from "./validate";

export async function performScan(url: string): Promise<ScanResult> {
  const started = Date.now();
  const { html, fetchTime } = await fetchHtml(url);

  const parseStarted = Date.now();
  const cleaned = cleanHtml(html);
  const raw = extractAllLinks(cleaned);
  const validated = validateAll(raw.whatsappLinks, raw.phoneLinks, raw.emailLinks);

  const brokenWhatsApp = validated.whatsappLinks.filter(
    (l) => l.status === "BROKEN"
  ).length;
  const invalidPhone = validated.phoneLinks.filter(
    (l) => l.status === "BROKEN"
  ).length;
  const invalidEmail = validated.emailLinks.filter(
    (l) => l.status === "BROKEN"
  ).length;

  const { score } = calculateScore({
    brokenWhatsAppCount: brokenWhatsApp,
    invalidPhoneCount: invalidPhone,
    invalidEmailCount: invalidEmail,
  });

  const totalLinks =
    validated.whatsappLinks.length +
    validated.phoneLinks.length +
    validated.emailLinks.length +
    raw.reviewLinks.length +
    raw.socialLinks.length;

  const brokenLinks =
    brokenWhatsApp + invalidPhone + invalidEmail;

  const workingLinks = totalLinks - brokenLinks;

  const parseTime = Date.now() - parseStarted;
  const totalTime = Date.now() - started;

  const result: ScanResult = {
    score,
    whatsappLinks: validated.whatsappLinks,
    phoneLinks: validated.phoneLinks,
    reviewLinks: raw.reviewLinks,
    socialLinks: raw.socialLinks,
    emailLinks: validated.emailLinks,
    scanStats: {
      totalLinks,
      workingLinks,
      brokenLinks,
    },
    summary: {
      successRate:
        totalLinks === 0 ? 100 : Math.round((workingLinks / totalLinks) * 100),
    },
    performance: {
      fetchTime,
      parseTime,
      totalTime,
    },
  };

  return result;
}

export function emptyScanResult(): ScanResult {
  return {
    score: 100,
    whatsappLinks: [],
    phoneLinks: [],
    reviewLinks: [],
    socialLinks: [],
    emailLinks: [],
    scanStats: { totalLinks: 0, workingLinks: 0, brokenLinks: 0 },
    summary: { successRate: 100 },
    performance: { fetchTime: 0, parseTime: 0, totalTime: 0 },
  };
}

export function isBrokenStatus(status: LinkStatus): boolean {
  return status === "BROKEN";
}