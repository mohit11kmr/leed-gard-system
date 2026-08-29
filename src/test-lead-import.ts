import { load } from "cheerio";
import { validatePublicUrl, assertPublicHost } from "./scanner/fetchHtml";
import { ScanError } from "./scanner/types";

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
