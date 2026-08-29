import { load } from "cheerio";
import { validatePublicUrl, assertPublicHost } from "./fetchHtml";
import { ScanError } from "./types";
import { checkBrokenLinks, type BrokenLinkResult } from "./brokenLinks";

export interface EmailResult {
  email: string;
  source: "mailto" | "plain";
}

export interface PhoneResult {
  phone: string;
  source: "tel" | "plain";
}

export interface WhatsAppResult {
  url: string;
  phone: string;
}

export interface FormResult {
  action: string;
  actionResolved: string;
  isExternal: boolean;
  inputCount: number;
  hasPassword: boolean;
  hasFile: boolean;
  method: string;
}

export interface AnalyticsResult {
  hasGtag: boolean;
  hasGtm: boolean;
  hasFbq: boolean;
  gtmIds: string[];
  gaIds: string[];
}

export interface LeadAuditResult {
  emails: EmailResult[];
  phones: PhoneResult[];
  whatsApp: WhatsAppResult[];
  forms: FormResult[];
  analytics: AnalyticsResult;
  brokenLinks: BrokenLinkResult[];
}

const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;

const PHONE_REGEX_INDIAN = /(?:\+91[\s-]?)?(?:[6-9]\d{9}|[6-9]\d{4}[\s-]?\d{5})/g;

const WA_REGEX = /https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)[^\s"'<>]+/gi;

const GTM_REGEX = /GTM-[A-Z0-9]+/g;
const GA_REGEX = /G-[A-Z0-9]+/g;

export function normalizeIndianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits[1])) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits[2])) {
    return `+${digits}`;
  }
  if (digits.length === 13 && digits.startsWith("+91") && /^[6-9]/.test(digits[3])) {
    return digits;
  }
  return null;
}

export function extractEmails(html: string): EmailResult[] {
  const results: EmailResult[] = [];

  const $ = load(html);
  const mailtoLinks = $("a[href^='mailto:']");
  mailtoLinks.each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const email = href
        .replace(/^mailto:/i, "")
        .split("?")[0]
        .trim();
      if (email && EMAIL_REGEX.test(email)) {
        results.push({ email: email.toLowerCase(), source: "mailto" });
      }
    }
  });

  const plainText = $.text();
  const plainEmails = plainText.match(EMAIL_REGEX);
  if (plainEmails) {
    for (const email of plainEmails) {
      results.push({ email: email.toLowerCase(), source: "plain" });
    }
  }

  return deduplicateByEmail(results);
}

export function extractPhones(html: string): PhoneResult[] {
  const results: PhoneResult[] = [];

  const $ = load(html);
  const telLinks = $("a[href^='tel:']");
  telLinks.each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const phone = normalizeIndianPhone(href.replace(/^tel:/i, ""));
      if (phone) {
        results.push({ phone, source: "tel" });
      }
    }
  });

  const plainText = $.text();
  const plainPhones = plainText.match(PHONE_REGEX_INDIAN);
  if (plainPhones) {
    for (const phone of plainPhones) {
      const normalized = normalizeIndianPhone(phone);
      if (normalized) {
        results.push({ phone: normalized, source: "plain" });
      }
    }
  }

  return deduplicateByPhone(results);
}

export function extractWhatsApp(html: string): WhatsAppResult[] {
  const results: WhatsAppResult[] = [];

  const matches = html.match(WA_REGEX);
  if (matches) {
    for (const url of matches) {
      try {
        const u = new URL(url);
        let phone: string | null = null;
        if (u.hostname === "wa.me") {
          phone = u.pathname.replace(/^\/+/, "").split("/")[0] || null;
        } else if (u.hostname === "api.whatsapp.com") {
          phone = u.searchParams.get("phone");
        }
        if (phone) {
          const normalized = normalizeIndianPhone(phone);
          if (normalized) {
            results.push({ url, phone: normalized });
          }
        }
      } catch {
        // ignore malformed URLs
      }
    }
  }

  return deduplicateByWhatsAppPhone(results);
}

export function analyzeForms(html: string, baseUrl: string): FormResult[] {
  const $ = load(html);
  const results: FormResult[] = [];

  const forms = $("form");
  forms.each((_, el) => {
    const $form = $(el);
    const action = $form.attr("action") || "";
    const method = ($form.attr("method") || "get").toLowerCase();
    const inputs = $form.find("input, select, textarea");

    let actionResolved = action;
    if (action) {
      try {
        actionResolved = new URL(action, baseUrl).toString();
      } catch {
        actionResolved = action;
      }
    } else {
      actionResolved = baseUrl;
    }

    let isExternal = false;
    try {
      const actionUrl = new URL(actionResolved);
      const baseUrlObj = new URL(baseUrl);
      isExternal = actionUrl.origin !== baseUrlObj.origin;
    } catch {
      isExternal = false;
    }

    const inputCount = inputs.length;
    const hasPassword = inputs.filter((_, el) => $(el).attr("type") === "password").length > 0;
    const hasFile = inputs.filter((_, el) => $(el).attr("type") === "file").length > 0;

    results.push({
      action,
      actionResolved,
      isExternal,
      inputCount,
      hasPassword,
      hasFile,
      method,
    });
  });

  return results;
}

export function detectAnalytics(html: string): AnalyticsResult {
  const $ = load(html);
  const scripts = $("script");
  let hasGtag = false;
  let hasGtm = false;
  let hasFbq = false;
  const gtmIds: string[] = [];
  const gaIds: string[] = [];

  scripts.each((_, el) => {
    const content = $(el).html() || "";
    const src = $(el).attr("src") || "";

    if (content.includes("gtag(") || src.includes("gtag")) {
      hasGtag = true;
    }
    if (content.includes("googletagmanager") || src.includes("googletagmanager")) {
      hasGtm = true;
    }
    if (content.includes("fbq(") || src.includes("fbevents")) {
      hasFbq = true;
    }

    const gtmMatches = content.match(GTM_REGEX);
    if (gtmMatches) gtmIds.push(...gtmMatches);
    const gtmSrcMatches = src.match(GTM_REGEX);
    if (gtmSrcMatches) gtmIds.push(...gtmSrcMatches);
    const gaMatches = content.match(GA_REGEX);
    if (gaMatches) gaIds.push(...gaMatches);
    const gaSrcMatches = src.match(GA_REGEX);
    if (gaSrcMatches) gaIds.push(...gaSrcMatches);
  });

  return {
    hasGtag,
    hasGtm,
    hasFbq,
    gtmIds: uniqueStrings(gtmIds),
    gaIds: uniqueStrings(gaIds),
  };
}

export async function runLeadAudit(html: string, baseUrl: string): Promise<LeadAuditResult> {
  const [emails, phones, whatsApp, forms, analytics, brokenLinks] = await Promise.all([
    Promise.resolve(extractEmails(html)),
    Promise.resolve(extractPhones(html)),
    Promise.resolve(extractWhatsApp(html)),
    Promise.resolve(analyzeForms(html, baseUrl)),
    Promise.resolve(detectAnalytics(html)),
    checkBrokenLinks(html, baseUrl),
  ]);

  return { emails, phones, whatsApp, forms, analytics, brokenLinks };
}

function uniqueStrings(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

function deduplicateByEmail(arr: EmailResult[]): EmailResult[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const key = item.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateByPhone(arr: PhoneResult[]): PhoneResult[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const key = item.phone;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateByWhatsAppPhone(arr: WhatsAppResult[]): WhatsAppResult[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const key = item.phone;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
