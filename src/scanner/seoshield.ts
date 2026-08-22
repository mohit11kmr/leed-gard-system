export interface SeoFinding {
  ruleId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  message: string;
  source?: string;
}

async function fetchText(url: string, timeoutMs = 6000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractMetaContent(html: string, name: string): string[] {
  const re = new RegExp(
    `<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']*)["']`,
    "gi"
  );
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*name=["']${name}["']`,
    "gi"
  );
  const values: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) values.push(m[1].toLowerCase());
  while ((m = alt.exec(html)) !== null) values.push(m[1].toLowerCase());
  return values;
}

export function checkHeadSeo(
  rawHtml: string,
  baseUrl: string
): { findings: SeoFinding[] } {
  const findings: SeoFinding[] = [];

  const robotsValues = [
    ...extractMetaContent(rawHtml, "robots"),
    ...extractMetaContent(rawHtml, "googlebot"),
  ];
  const noindex = robotsValues.find((v) => v.includes("noindex"));
  if (noindex) {
    findings.push({
      ruleId: "SEO-NOINDEX-001",
      severity: "CRITICAL",
      message: `Page is marked noindex ("${noindex}"). Google is instructed to keep this page OUT of search results.`,
      source: "meta[name=robots]",
    });
  }

  const canonicalMatches = rawHtml.match(/<link[^>]+rel=["']canonical["'][^>]*>/gi) ?? [];
  if (canonicalMatches.length === 0) {
    findings.push({
      ruleId: "SEO-CANONICAL-001",
      severity: "LOW",
      message:
        "No canonical tag found. Duplicate versions of pages (with/without www, query params) can split your ranking signals.",
      source: "head",
    });
  } else if (canonicalMatches.length > 1) {
    findings.push({
      ruleId: "SEO-CANONICAL-002",
      severity: "HIGH",
      message: `Multiple canonical tags found (${canonicalMatches.length}). Conflicting canonicals confuse Google about the real URL.`,
      source: "head",
    });
  }

  if (baseUrl.startsWith("http://")) {
    findings.push({
      ruleId: "SEO-HTTPS-001",
      severity: "HIGH",
      message:
        "Site served over plain HTTP. Browsers show 'Not Secure' and Google prefers HTTPS in ranking.",
    });
  }

  const mixedAssets = rawHtml.match(/(?:src|href)=["']http:\/\/[^"']+["']/gi) ?? [];
  const mixedCount = mixedAssets.filter((a) => !/http:\/\/(www\.)?(example|w3)\./i.test(a)).length;
  if (baseUrl.startsWith("https://") && mixedCount > 0) {
    findings.push({
      ruleId: "SEO-MIXED-001",
      severity: "MEDIUM",
      message: `${mixedCount} resource(s) loaded over insecure http:// on an https page. Mixed content gets blocked or flagged by browsers.`,
      source: `${mixedCount} http:// references`,
    });
  }

  return { findings };
}

export async function runSeoShield(
  rawHtml: string,
  cleanedHtml: string,
  baseUrl: string
): Promise<SeoFinding[]> {
  const { findings } = checkHeadSeo(rawHtml, baseUrl);

  try {
    const origin = new URL(baseUrl).origin;
    const robotsTxt = await fetchText(`${origin}/robots.txt`);
    if (robotsTxt === null) {
      findings.push({
        ruleId: "SEO-ROBOTS-001",
        severity: "INFO",
        message:
          "No robots.txt found. Not fatal, but adding one helps control what Google crawls.",
        source: "/robots.txt",
      });
    } else if (/^\s*disallow:\s*\/\s*$/im.test(robotsTxt)) {
      findings.push({
        ruleId: "SEO-ROBOTS-002",
        severity: "CRITICAL",
        message:
          'robots.txt contains "Disallow: /" — the whole site can be blocked from crawling!',
        source: "/robots.txt",
      });
    }

    const sitemapDirect = await fetchText(`${origin}/sitemap.xml`);
    const hasSitemapRef =
      robotsTxt && /sitemap\s*:/i.test(robotsTxt) ? true : false;
    if (!sitemapDirect && !hasSitemapRef) {
      findings.push({
        ruleId: "SEO-SITEMAP-001",
        severity: "MEDIUM",
        message:
          "No XML sitemap found at /sitemap.xml (and none listed in robots.txt). A sitemap helps Google discover all your pages.",
        source: "/sitemap.xml",
      });
    }
  } catch {
    /* ignore */
  }

  return findings;
}
