import { SecurityCheck, SecurityFinding } from "./types";

const SPAM_TERMS = [
  "viagra",
  "cialis",
  "kamagra",
  "casino",
  "slot online",
  "judi online",
  "poker online",
  "porn",
  "xxx",
  "hentai",
  "escort service",
  "call girls",
  "payday loan",
  "replica watches",
  "fake passport",
  "cbd gummies",
];

const SPAM_TERM_RES: RegExp[] = SPAM_TERMS.map((t) =>
  new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")
);

const SITEMAP_SPAM_PATTERNS: RegExp[] = [
  /sexual[-\s]?performance/i,
  /performance[-\s]?booster/i,
  /male[-\s]?enhancement/i,
  /penis[-\s]?enlargement/i,
  /erectile[-\s]?dysfunction/i,
  /\bsatta\b/i,
];

const HIDDEN_PATTERNS =
  /display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0(?:px|pt)?\s*[;"}']|opacity\s*:\s*0(?:\.0+)?\s*[;"}']/i;

const SCRIPT_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\beval\s*\(/, label: "eval()" },
  { re: /\batob\s*\(/, label: "atob()" },
  { re: /\bunescape\s*\(/, label: "unescape()" },
  { re: /fromCharCode/, label: "fromCharCode" },
  { re: /document\.write\s*\(\s*unescape/, label: "document.write(unescape())" },
];

export function findSpamTerms(text: string): {
  term: string;
  count: number;
}[] {
  const lower = text.toLowerCase().replace(/[-_/]/g, " ");
  const hits: { term: string; count: number }[] = [];
  for (let i = 0; i < SPAM_TERMS.length; i++) {
    const matches = lower.match(SPAM_TERM_RES[i]);
    if (matches && matches.length > 0) {
      hits.push({ term: SPAM_TERMS[i], count: matches.length });
    }
  }
  return hits;
}

export function countHiddenExternalLinks(
  html: string,
  origin: string
): number {
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  let hiddenExternal = 0;
  while ((match = anchorRe.exec(html)) !== null) {
    const tag = match[0];
    if (!HIDDEN_PATTERNS.test(tag)) continue;
    const href = match[1];
    if (/^https?:\/\//i.test(href)) {
      try {
        if (new URL(href).origin !== origin) hiddenExternal += 1;
      } catch {
        /* ignore malformed */
      }
    } else if (href.startsWith("//")) {
      hiddenExternal += 1;
    }
  }
  return hiddenExternal;
}

export function scanScripts(rawHtml: string): string[] {
  const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  const found = new Set<string>();
  while ((match = scriptRe.exec(rawHtml)) !== null) {
    const body = match[1];
    for (const p of SCRIPT_PATTERNS) {
      if (p.re.test(body)) found.add(p.label);
    }
  }
  return [...found];
}

const BASE64_BLOB_RE = /[A-Za-z0-9+/]{200,}={0,2}/g;
const META_REFRESH_RE =
  /<meta[^>]+http-equiv=["']?refresh["']?[^>]*content=["']?\s*(\d+)\s*;\s*url=([^"'>\s]+)/gi;
const JS_REDIRECT_RE =
  /(?:location|window\.location)\s*(?:\.\s*(?:href|replace|assign)\s*=?\s*\(?\s*|\s*=\s*)["']?(https?:\/\/[^"')\s;]+)/gi;
const MOBILE_UA_RE = /navigator\.userAgent[^;\n]{0,80}(iphone|android|mobile)/i;
const HIDDEN_IFRAME_RE = /<iframe\b[^>]*src=["']([^"']+)["'][^>]*>/gi;

function isExternalUrl(raw: string, origin: string): string | null {
  try {
    const u = new URL(raw, origin || undefined);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (origin && u.origin === origin) return null;
    return u.href.slice(0, 120);
  } catch {
    return null;
  }
}

function findLongBase64Blobs(rawHtml: string): string[] {
  const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  const blobs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(rawHtml)) !== null) {
    const hits = match[1].match(BASE64_BLOB_RE);
    if (hits) blobs.push(...hits.map((b) => `${b.slice(0, 48)}… (${b.length} chars)`));
  }
  return blobs;
}

const KNOWN_SAFE_IFRAME_RE =
  /googletagmanager\.com\/ns\.html|googleadservices\.com|doubleclick\.net|googlesyndication\.com/i;

function findHiddenExternalIframes(
  rawHtml: string,
  origin: string
): string[] {
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = HIDDEN_IFRAME_RE.exec(rawHtml)) !== null) {
    const tag = match[0];
    if (KNOWN_SAFE_IFRAME_RE.test(tag)) continue;
    const hidden =
      HIDDEN_PATTERNS.test(tag) ||
      /(?:width|height)\s*=\s*["']?[0-2]\b/i.test(tag) ||
      /(?:width|height)\s*:\s*[0-2](?:px)?\s*[;"}']/i.test(tag);
    if (!hidden) continue;
    const ext = isExternalUrl(match[1], origin);
    if (ext) out.push(ext);
  }
  return out;
}

export interface RedirectSignals {
  metaRefreshExternal: { delay: string; url: string }[];
  jsRedirectExternal: string[];
  mobileRedirect: boolean;
}

export function findRedirectSignals(
  rawHtml: string,
  origin: string
): RedirectSignals {
  const metaRefreshExternal: RedirectSignals["metaRefreshExternal"] = [];
  let m: RegExpExecArray | null;
  while ((m = META_REFRESH_RE.exec(rawHtml)) !== null) {
    const ext = isExternalUrl(m[2], origin);
    if (ext) metaRefreshExternal.push({ delay: m[1], url: ext });
  }
  const jsRedirectExternal: string[] = [];
  while ((m = JS_REDIRECT_RE.exec(rawHtml)) !== null) {
    const ext = isExternalUrl(m[1], origin);
    if (ext) jsRedirectExternal.push(ext);
  }
  const mobileRedirect = MOBILE_UA_RE.test(rawHtml) && jsRedirectExternal.length > 0;
  return { metaRefreshExternal, jsRedirectExternal, mobileRedirect };
}

export function buildHtmlFindings(
  rawHtml: string,
  cleanedHtml: string,
  origin: string
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  const pageSpam = findSpamTerms(cleanedHtml);
  const totalPageHits = pageSpam.reduce((n, h) => n + h.count, 0);
  if (pageSpam.length > 0) {
    findings.push({
      type: "spam_content",
      severity: totalPageHits >= 3 ? "danger" : "warning",
      detail: `Spam/pharma keywords found in page content (${totalPageHits} hit${totalPageHits === 1 ? "" : "s"}). Common sign of injected SEO spam.`,
      evidence: pageSpam.map((h) => `"${h.term}" ×${h.count}`),
      ruleId: "CYBER-SPAM-001",
      confidence: 0.85,
    });
  }

  const hiddenExternal = countHiddenExternalLinks(cleanedHtml, origin);
  if (hiddenExternal >= 3) {
    findings.push({
      type: "hidden_links",
      severity: hiddenExternal >= 6 ? "danger" : "warning",
      detail: `${hiddenExternal} hidden external links detected (display:none/opacity:0). Classic black-hat SEO link-farm injection.`,
      evidence: [`${hiddenExternal} hidden external <a> tags`],
      ruleId: "CYBER-HIDDENLINKS-001",
      confidence: 0.8,
    });
  }

  const scriptHits = scanScripts(rawHtml);
  if (scriptHits.length > 0) {
    const isDanger =
      (scriptHits.includes("eval()") && scriptHits.includes("atob()")) ||
      scriptHits.length >= 3;
    findings.push({
      type: "suspicious_script",
      severity: isDanger ? "danger" : "warning",
      detail:
        "Obfuscated JavaScript patterns found in inline scripts (often used to hide redirects/spam from site owners).",
      evidence: scriptHits.map((s) => `${s} in inline <script>`),
      ruleId: "CYBER-OBFUSC-001",
      confidence: 0.7,
    });
  }

  const base64Blobs = findLongBase64Blobs(rawHtml);
  if (base64Blobs.length > 0 && scriptHits.length > 0) {
    findings.push({
      type: "suspicious_script",
      severity: base64Blobs.some((b) => b.length > 500) ? "danger" : "warning",
      detail:
        "Long Base64-encoded blob(s) inside inline scripts combined with decoding patterns. Possible obfuscated payload — needs manual review.",
      evidence: base64Blobs.slice(0, 3),
      ruleId: "CYBER-BASE64-001",
      confidence: 0.5,
    });
  }

  const redirects = findRedirectSignals(rawHtml, origin);

  if (redirects.metaRefreshExternal.length > 0) {
    const r = redirects.metaRefreshExternal[0];
    findings.push({
      type: "suspicious_script",
      severity: parseInt(r.delay, 10) <= 3 ? "danger" : "warning",
      detail: `Meta-refresh redirect to an external domain after ${r.delay}s. Possible hidden redirect indicator.`,
      evidence: redirects.metaRefreshExternal.map((x) => `refresh ${x.delay}s → ${x.url}`),
      ruleId: "CYBER-REDIRECT-001",
      confidence: 0.6,
    });
  }

  if (redirects.jsRedirectExternal.length > 0 && !redirects.mobileRedirect) {
    findings.push({
      type: "suspicious_script",
      severity: "warning",
      detail:
        "JavaScript redirects page to an external domain. Possible redirect indicator — verify this redirect is intentional.",
      evidence: [...new Set(redirects.jsRedirectExternal)].slice(0, 3).map((u) => `JS redirect → ${u}`),
      ruleId: "CYBER-JSREDIR-001",
      confidence: 0.5,
    });
  }

  if (redirects.mobileRedirect) {
    findings.push({
      type: "suspicious_script",
      severity: "danger",
      detail:
        "Mobile user-agent branching with external redirect detected in static code. Classic silent mobile-redirect injection indicator.",
      evidence: [...new Set(redirects.jsRedirectExternal)].slice(0, 3).map((u) => `mobile UA → redirect ${u}`),
      ruleId: "CYBER-MOBILE-001",
      confidence: 0.6,
    });
  }

  const hiddenIframes = findHiddenExternalIframes(rawHtml, origin);
  if (hiddenIframes.length > 0) {
    findings.push({
      type: "suspicious_script",
      severity: "danger",
      detail: `${hiddenIframes.length} hidden iframe(s) loading external content (0×0/1px or CSS-hidden). Common malware injection pattern.`,
      evidence: hiddenIframes.slice(0, 3).map((u) => `hidden <iframe src="${u}">`),
      ruleId: "CYBER-IFRAME-001",
      confidence: 0.7,
    });
  }

  return findings;
}

const SITEMAP_TIMEOUT_MS = 6000;
const MAX_SITEMAP_URLS = 500;

async function fetchText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SITEMAP_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/xml,text/xml,*/*" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchSitemapSlugText(baseUrl: string): Promise<string> {
  const origin = new URL(baseUrl).origin;
  let xml = await fetchText(`${origin}/post-sitemap.xml`);
  if (!xml) {
    const index = await fetchText(`${origin}/sitemap_index.xml`);
    if (index) {
      const locMatch = index.match(
        /<loc>\s*([^<]*?(?:post-sitemap|sitemap-posts)[^<]*?\.xml)\s*<\/loc>/i
      );
      if (locMatch) xml = await fetchText(locMatch[1]);
    }
  }
  if (!xml) return "";
  const slugs: string[] = [];
  const locRe = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = locRe.exec(xml)) !== null && slugs.length < MAX_SITEMAP_URLS) {
    try {
      const path = decodeURIComponent(new URL(m[1].trim()).pathname);
      slugs.push(path);
    } catch {
      /* ignore malformed loc */
    }
  }
  return slugs.join(" ").toLowerCase();
}

function extractSitemapSpamFinding(slugText: string): SecurityFinding | null {
  const evidence: string[] = [];

  for (const h of findSpamTerms(slugText)) {
    evidence.push(`sitemap slug contains "${h.term}"`);
  }
  for (const re of SITEMAP_SPAM_PATTERNS) {
    const m = slugText.match(re);
    if (m) evidence.push(`sitemap slug contains "${m[0]}"`);
  }

  if (evidence.length === 0) return null;
  return {
    type: "spam_content",
    severity: "danger",
    detail:
      "Spam keywords found in published post URLs (sitemap). Strong sign of an injected spam post — often invisible on the homepage.",
    evidence: [...new Set(evidence)],
    ruleId: "CYBER-SITEMAPSPAM-001",
    confidence: 0.9,
  };
}

export async function runSecurityChecks(
  rawHtml: string,
  cleanedHtml: string,
  baseUrl: string
): Promise<SecurityCheck> {
  let origin = "";
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    origin = "";
  }

  const findings = buildHtmlFindings(rawHtml, cleanedHtml, origin);

  if (!findings.some((f) => f.type === "spam_content")) {
    const slugText = await fetchSitemapSlugText(baseUrl);
    if (slugText) {
      const sitemapFinding = extractSitemapSpamFinding(slugText);
      if (sitemapFinding) findings.push(sitemapFinding);
    }
  }

  const hasDanger = findings.some((f) => f.severity === "danger");
  const status: SecurityCheck["status"] = hasDanger
    ? "DANGER"
    : findings.length > 0
      ? "WARNING"
      : "CLEAN";

  return { status, findings };
}
