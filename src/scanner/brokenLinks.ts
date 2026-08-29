import { load } from "cheerio";
import { validatePublicUrl } from "./fetchHtml";
import { ScanError } from "./types";

export interface BrokenLinkResult {
  url: string;
  status: "BROKEN" | "TIMEOUT" | "ERROR" | "SSRF_BLOCKED";
  statusCode?: number;
  error?: string;
}

const IGNORED_PROTOCOLS = /^(#|mailto:|tel:|javascript:|data:)/i;
const MAX_LINKS_TO_CHECK = 30;
const CONCURRENCY_LIMIT = 5;

function extractUrls(html: string, baseUrl: string): string[] {
  const $ = load(html);
  const urls: string[] = [];

  const links = $("a[href]");
  links.each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    if (/^(#|mailto:|tel:|javascript:|data:)/i.test(href)) return;
    try {
      const resolved = new URL(href, baseUrl).toString();
      urls.push(resolved);
    } catch {
      // ignore malformed
    }
  });

  const seen = new Set<string>();
  return urls
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .slice(0, 30);
}

async function checkSingleLink(
  url: string,
  baseUrl: string,
  timeoutMs: number,
): Promise<BrokenLinkResult> {
  try {
    const normalizedUrl = await validatePublicUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(normalizedUrl, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "LeadGuard-Scanner/0.1 (link checker)",
        },
      });
      clearTimeout(timer);

      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return { url, status: "BROKEN", statusCode: res.status };
      }
      return { url, status: "BROKEN", statusCode: res.status };
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === "AbortError") {
        return { url, status: "TIMEOUT", error: "Request timeout" };
      }
      return { url, status: "ERROR", error: err instanceof Error ? err.message : "Unknown error" };
    }
  } catch (err) {
    return { url, status: "ERROR", error: err instanceof Error ? err.message : "Invalid URL" };
  }
}

export async function checkBrokenLinks(
  html: string,
  baseUrl: string,
  timeoutMs: number = 2000,
): Promise<BrokenLinkResult[]> {
  const urls = extractUrls(html, baseUrl);
  const results: BrokenLinkResult[] = [];

  for (let i = 0; i < urls.length; i += 5) {
    const batch = urls.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map((url) => checkSingleLink(url, baseUrl, 2000)));
    results.push(...batchResults);
  }

  return results;
}
