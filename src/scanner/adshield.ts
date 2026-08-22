import { TrackingSignal } from "./types";

const META_PATTERNS: RegExp[] = [
  /fbq\s*\(/i,
  /connect\.facebook\.net/i,
  /facebook\.com\/tr\?/i,
  /fbevents\.js/i,
];

const GOOGLE_TAG_PATTERNS: RegExp[] = [
  /googletagmanager\.com\/gtm\.js/i,
  /googletagmanager\.com\/ns\.html/i,
  /\bGTM-[A-Z0-9]{5,12}\b/,
];

const GTAG_PATTERNS: RegExp[] = [/\bgtag\s*\(/i, /GoogleAnalyticsObject/i];

const GA4_ID_PATTERN = /\bG-[A-Z0-9]{6,12}\b/g;
const GTM_ID_PATTERN = /\bGTM-[A-Z0-9]{5,12}\b/g;

function collect(html: string, patterns: RegExp[]): string[] {
  const evidence: string[] = [];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) evidence.push(m[0].slice(0, 60));
  }
  return evidence;
}

export function detectTracking(rawHtml: string): TrackingSignal[] {
  const lower = rawHtml.toLowerCase();

  const metaEvidence = collect(rawHtml, META_PATTERNS);
  const gtmEvidence = collect(rawHtml, GOOGLE_TAG_PATTERNS);
  const gtagEvidence = collect(rawHtml, GTAG_PATTERNS);

  const ga4Ids = Array.from(new Set(lower.match(GA4_ID_PATTERN) ?? []));
  const gtmIds = Array.from(new Set(lower.match(GTM_ID_PATTERN) ?? []));

  if (gtmIds.length > 0 && !/googletagmanager\.com/.test(lower)) {
    gtmEvidence.push(`container id ${gtmIds.join(", ")}`);
  }
  if (ga4Ids.length > 0) {
    gtagEvidence.push(`GA4 measurement id ${ga4Ids.join(", ")}`);
  }

  return [
    {
      platform: "META",
      detected: metaEvidence.length > 0,
      evidence: metaEvidence.slice(0, 4),
      confidence: metaEvidence.length > 0 ? 0.95 : 1,
    },
    {
      platform: "GTM",
      detected: gtmEvidence.length > 0,
      evidence: [...new Set(gtmEvidence)].slice(0, 4),
      confidence: gtmEvidence.length > 0 ? 0.95 : 1,
    },
    {
      platform: "GOOGLE_TAG",
      detected:
        gtagEvidence.length > 0 &&
        !(gtagEvidence.length === 1 && ga4Ids.length === 1 && gtmEvidence.length === 0),
      evidence: [...new Set(gtagEvidence)].slice(0, 4),
      confidence: gtagEvidence.length > 0 ? 0.85 : 1,
    },
    {
      platform: "GA4",
      detected: ga4Ids.length > 0 || /google-analytics\.com/.test(lower),
      evidence: ga4Ids.length > 0 ? ga4Ids.slice(0, 4) : [],
      confidence: 0.9,
    },
  ];
}

export interface AdShieldFinding {
  ruleId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  message: string;
}

export function evaluateAdShield(signals: TrackingSignal[]): {
  findings: AdShieldFinding[];
} {
  const findings: AdShieldFinding[] = [];
  const meta = signals.find((s) => s.platform === "META");
  const google = signals.find((s) => s.platform === "GOOGLE_TAG");
  const ga4 = signals.find((s) => s.platform === "GA4");
  const gtm = signals.find((s) => s.platform === "GTM");

  const googleAny = Boolean(
    (google?.detected || ga4?.detected || gtm?.detected)
  );

  if (!meta?.detected) {
    findings.push({
      ruleId: "AD-META-001",
      severity: "HIGH",
      message:
        "Meta Pixel not found. If you run Facebook/Instagram ads you cannot retarget visitors or measure conversions.",
    });
  }
  if (!googleAny) {
    findings.push({
      ruleId: "AD-GOOGLE-001",
      severity: "HIGH",
      message:
        "No Google tag detected (GTM / gtag / GA4). Google Ads conversion tracking and Analytics are not measurable.",
    });
  }
  if (ga4 && ga4.evidence.length > 1) {
    findings.push({
      ruleId: "AD-DUP-GA4-001",
      severity: "MEDIUM",
      message: `Multiple GA4 measurement IDs detected (${ga4.evidence.join(", ")}). Duplicate tags inflate or corrupt your data.`,
    });
  }
  const gtmIdEvidence = gtm?.evidence.filter((e) => e.startsWith("container id")) ?? [];
  if (gtmIdEvidence.length > 1) {
    findings.push({
      ruleId: "AD-DUP-GTM-001",
      severity: "MEDIUM",
      message:
        "Multiple GTM container IDs detected on the same page. Duplicate containers double-fire every tag.",
    });
  }

  return { findings };
}
