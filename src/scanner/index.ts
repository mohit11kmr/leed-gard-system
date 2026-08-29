import { cleanHtml } from "./cleanHtml";
import { extractAllLinks } from "./extract";
import { fetchHtml } from "./fetchHtml";
import { runLeadAudit } from "./leadAudit";
import {
  calculateOverallScore,
  calculateScore,
  estimateMonthlyLoss,
  scoreAdPillar,
  scoreCyberPillar,
  scoreSeoPillar,
} from "./score";
import { detectTracking, evaluateAdShield } from "./adshield";
import { runSeoShield } from "./seoshield";
import { runSecurityChecks } from "./security";
import { LinkStatus, PillarResult, ScanResult } from "./types";
import { validateAll } from "./validate";

function pillar(score: number, issueCount: number, summary: string): PillarResult {
  return { score: Math.round(score), issueCount, summary };
}

export async function performScan(url: string): Promise<ScanResult> {
  const started = Date.now();
  const { html, fetchTime } = await fetchHtml(url);

  const parseStarted = Date.now();
  const cleaned = cleanHtml(html);
  const raw = extractAllLinks(cleaned);
  const validated = validateAll(raw.whatsappLinks, raw.phoneLinks, raw.emailLinks);
  const security = await runSecurityChecks(html, cleaned, url);

  // Lead Audit (non-blocking for scan score, but runs during scan)
  const leadAuditData = await runLeadAudit(html, url);

  if (validated.whatsappLinks.length === 0) {
    validated.whatsappLinks.push({
      url: "(no WhatsApp click-to-chat button found on this page)",
      phone: null,
      status: "MISSING",
      isValid: false,
      issue:
        "No WhatsApp CTA found on this page. Most Indian customers prefer messaging over calling — without a WhatsApp button they leave silently.",
      suggestedFix:
        "Add a floating WhatsApp chat button linking to https://wa.me/91XXXXXXXXXX (your full number with country code).",
    });
  }

  const brokenWhatsApp = validated.whatsappLinks.filter((l) => l.status !== "WORKING").length;
  const invalidPhone = validated.phoneLinks.filter((l) => l.status !== "WORKING").length;
  const invalidEmail = validated.emailLinks.filter((l) => l.status !== "WORKING").length;

  const { score: leadScore } = calculateScore({
    brokenWhatsAppCount: brokenWhatsApp,
    invalidPhoneCount: invalidPhone,
    invalidEmailCount: invalidEmail,
  });

  const tracking = detectTracking(html);
  const { findings: adFindings } = evaluateAdShield(tracking);
  const adScore = scoreAdPillar(adFindings);

  const seoFindings = await runSeoShield(html, cleaned, url);
  const seoScore = scoreSeoPillar(seoFindings);

  const cyberScore = scoreCyberPillar(security.findings);

  const totalLinks =
    validated.whatsappLinks.length +
    validated.phoneLinks.length +
    validated.emailLinks.length +
    raw.reviewLinks.length +
    raw.socialLinks.length;

  const brokenLinks = brokenWhatsApp + invalidPhone + invalidEmail;

  const estimatedLoss = estimateMonthlyLoss(brokenLinks);

  const workingLinks = totalLinks - brokenLinks;

  const parseTime = Date.now() - parseStarted;
  const totalTime = Date.now() - started;

  const overallScore = calculateOverallScore({
    leadScore,
    adScore,
    seoScore,
    cyberScore,
  });

  const result: ScanResult = {
    score: overallScore,
    estimatedLoss,
    security,
    pillars: {
      lead: pillar(
        leadScore,
        brokenLinks,
        brokenLinks === 0
          ? "All contact channels healthy"
          : `${brokenLinks} contact channel problem${brokenLinks === 1 ? "" : "s"} found`,
      ),
      adshield: pillar(
        adScore,
        adFindings.length,
        adFindings.length === 0
          ? "Ad tracking detected and clean"
          : adFindings[0].message.split(".")[0],
      ),
      seo: pillar(
        seoScore,
        seoFindings.filter((f) => f.severity !== "INFO").length,
        seoFindings.length === 0
          ? "No indexing risks detected"
          : seoFindings[0].message.split(".")[0],
      ),
      cyber: pillar(
        cyberScore,
        security.findings.length,
        security.findings.length === 0
          ? "No compromise signs found"
          : security.status === "DANGER"
            ? "Strong compromise signals detected"
            : "Warning signs detected",
      ),
    },
    tracking,
    adFindings,
    seoFindings,
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
      successRate: totalLinks === 0 ? 100 : Math.round((workingLinks / totalLinks) * 100),
    },
    performance: {
      fetchTime,
      parseTime,
      totalTime,
    },
    leadAuditData,
  };

  return result;
}

export function emptyScanResult(): ScanResult {
  return {
    score: 100,
    estimatedLoss: 0,
    security: { status: "CLEAN", findings: [] },
    pillars: {
      lead: pillar(100, 0, "All contact channels healthy"),
      adshield: pillar(100, 0, "Ad tracking detected and clean"),
      seo: pillar(100, 0, "No indexing risks detected"),
      cyber: pillar(100, 0, "No compromise signs found"),
    },
    tracking: [],
    adFindings: [],
    seoFindings: [],
    whatsappLinks: [],
    phoneLinks: [],
    reviewLinks: [],
    socialLinks: [],
    emailLinks: [],
    scanStats: { totalLinks: 0, workingLinks: 0, brokenLinks: 0 },
    summary: { successRate: 100 },
    performance: { fetchTime: 0, parseTime: 0, totalTime: 0 },
    leadAuditData: {
      emails: [],
      phones: [],
      whatsApp: [],
      forms: [],
      analytics: { hasGtag: false, hasGtm: false, hasFbq: false, gtmIds: [], gaIds: [] },
      brokenLinks: [],
    },
  };
}

export function isBrokenStatus(status: LinkStatus): boolean {
  return status === "BROKEN" || status === "MISSING";
}
