import { load } from "cheerio";

const MAX_LINKS_TO_CHECK = 30;
const CONCURRENCY_LIMIT = 5;
const IGNORED_PROTOCOLS = /^(#|mailto:|tel:|javascript:|data:)/i;

async function checkBrokenLinks(
  html: string,
  baseUrl: string,
  timeoutMs: number = 2000,
): Promise<{ url: string; status: string }[]> {
  const $ = load(html);
  const links = $("a[href]");
  const urls: string[] = [];

  links.each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    if (IGNORED_PROTOCOLS.test(href)) return;
    try {
      const resolved = new URL(href, baseUrl).toString();
    } catch {
      // ignore malformed
    }
  });

  const seenUrls = new Set<string>();
  const uniqueUrls = urls
    .filter((url) => {
      if (seenUrls.has(url)) return false;
      seenUrls.add(url);
      return true;
    })
    .slice(0, MAX_LINKS_TO_CHECK);
  return [];
}

interface EmailResult {
  email: string;
  source: "mailto" | "plain";
}

interface PhoneResult {
  phone: string;
  source: "tel" | "plain";
}

interface WhatsAppResult {
  url: string;
  phone: string;
}

interface FormResult {
  action: string;
  actionResolved: string;
  isExternal: boolean;
  inputCount: number;
  hasPassword: boolean;
  hasFile: boolean;
  method: string;
}

interface AnalyticsResult {
  hasGtag: boolean;
  hasGtm: boolean;
  hasFbq: boolean;
  gtmIds: string[];
  gaIds: string[];
}

interface BrokenLinkResult {
  url: string;
  status: "BROKEN" | "TIMEOUT" | "ERROR" | "SSRF_BLOCKED";
  statusCode?: number;
  error?: string;
}

interface LeadAuditResult {
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

function uniqueStrings(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

function deduplicateByEmail(arr: { email: string }[]): { email: string }[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const key = item.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
