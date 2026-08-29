import { lookup } from "node:dns/promises";
import net from "node:net";
import { DEFAULT_TIMEOUT_MS, FetchResult, MAX_RETRIES, RETRY_DELAY_MS, ScanError } from "./types";

const INTERNAL_IP_RANGES = [
  /^0\./,
  /^10\./,
  /^100\.64\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^198\.18\./,
  /^198\.19\./,
  /^192\.0\.0\./,
  /^224\./,
  /^240\./,
  /^255\.255\.255\.255/,
];

const LOCALHOST_REGEX = /^(localhost|127\.0\.0\.1|::1|0\.0\.0\.0)$/i;

function isPrivateIpv4(ip: string): boolean {
  return INTERNAL_IP_RANGES.some((re) => re.test(ip));
}

function ipv6ToBigInt(ip: string): bigint | null {
  let s = ip.toLowerCase();
  s = s.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/, (_, a, b, c, d) => {
    const n = ((+a << 24) | (+b << 16) | (+c << 8) | +d) >>> 0;
    return n.toString(16);
  });

  let parts = s.split(":");
  if (s.includes("::")) {
    let leading: string[] = [];
    let suffix: string[] = [];
    if (parts[0] === "" && parts[1] === "") {
      leading = [];
      suffix = parts.slice(2);
    } else if (parts[parts.length - 1] === "" && parts[parts.length - 2] === "") {
      leading = parts.slice(0, -2);
      suffix = [];
    } else {
      const idx = parts.indexOf("");
      leading = parts.slice(0, idx);
      suffix = parts.slice(idx + 1);
    }
    const missing = 8 - leading.length - suffix.length;
    if (missing < 1) return null;
    parts = [...leading, ...Array.from({ length: missing }, () => "0"), ...suffix];
  }

  if (parts.length !== 8) return null;
  let result = 0n;
  for (const h of parts) {
    const v = parseInt(h || "0", 16);
    if (Number.isNaN(v)) return null;
    result = (result << 16n) | BigInt(v);
  }
  return result;
}

function privateIpv4FromLast32Bits(value: bigint): boolean {
  const v4 = Number(value & 0xffffffffn) >>> 0;
  const ip = `${(v4 >>> 24) & 255}.${(v4 >>> 16) & 255}.${(v4 >>> 8) & 255}.${v4 & 255}`;
  return isPrivateIpv4(ip);
}

function isPrivateIpv6(ip: string): boolean {
  if (!net.isIPv6(ip)) return false;
  const v = ipv6ToBigInt(ip);
  if (v === null) return true; // fail closed

  if (v === 0n) return true; // ::
  if (v === 1n) return true; // ::1 loopback

  const top10 = v >> 118n;
  if (top10 === 0b1111111010n) return true; // fe80::/10 link-local
  const top7 = v >> 121n;
  if (top7 === 0b1111110n) return true; // fc00::/7 ULA
  const top8 = v >> 120n;
  if (top8 === 0xffn) return true; // ff00::/8 multicast
  const top32 = v >> 96n;
  if (top32 === 0x20010db8n) return true; // 2001:db8::/32 documentation

  if (v >> 80n === 0n && v >> 32n === 0xffffn) {
    return privateIpv4FromLast32Bits(v); // ::ffff:a.b.c.d IPv4-mapped
  }
  if (v >> 32n === 0x64ff9bn << 64n) {
    return privateIpv4FromLast32Bits(v); // 64:ff9b::/96 NAT64
  }
  return false;
}

export async function assertPublicHost(hostname: string): Promise<void> {
  const clean = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (LOCALHOST_REGEX.test(clean)) {
    throw new ScanError("SSRF_BLOCKED", "SSRF blocked: localhost URLs are not allowed.");
  }

  if (net.isIP(clean)) {
    if (net.isIPv4(clean) ? isPrivateIpv4(clean) : isPrivateIpv6(clean)) {
      throw new ScanError(
        "SSRF_BLOCKED",
        "SSRF blocked: internal/private IP addresses are not allowed.",
      );
    }
    return;
  }

  try {
    // Resolve twice and validate EVERY address across both lookups. This keeps
    // the anti-rebinding guard effective against DNS that flips to a private
    // IP, while tolerating legitimate round-robin/CDN records (multiple public IPs).
    const [first, second] = await Promise.all([
      lookup(clean, { all: true }),
      lookup(clean, { all: true }),
    ]);
    const addresses = [...new Set([...first, ...second].map((a) => a.address))];
    if (addresses.length === 0) {
      throw new ScanError("DNS_FAILED", `Unable to resolve hostname: ${clean}`);
    }
    if (addresses.some((address) => isPrivateIpv4(address) || isPrivateIpv6(address))) {
      throw new ScanError(
        "SSRF_BLOCKED",
        "SSRF blocked: hostname resolves to an internal/private address.",
      );
    }
  } catch (err) {
    if (err instanceof ScanError) throw err;
    throw new ScanError("DNS_FAILED", `Unable to resolve hostname: ${clean}`);
  }
}

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

export async function validatePublicUrl(input: string): Promise<string> {
  const trimmed = input.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    throw new ScanError("INVALID_PROTOCOL", "Only HTTP and HTTPS URLs are allowed.");
  }

  const url = normalizeUrl(input);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ScanError("INVALID_URL", "Invalid URL provided.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ScanError("INVALID_PROTOCOL", "Only HTTP and HTTPS URLs are allowed.");
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  await assertPublicHost(hostname);

  return url;
}

const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

async function fetchWithValidatedRedirects(input: string, timeoutMs: number): Promise<Response> {
  let current = input;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const validated = await validatePublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(validated, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "LeadGuard-Scanner/0.1 (website contact-link health checker; contact: mohitsikarwar123@gmail.com)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if (REDIRECT_STATUSES.has(res.status)) {
      const location = res.headers.get("location");
      if (!location) return res;
      current = new URL(location, validated).toString();
      continue;
    }
    return res;
  }

  throw new ScanError("TOO_MANY_REDIRECTS", `Too many redirects (more than ${MAX_REDIRECTS}).`);
}

export async function fetchHtml(
  input: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<FetchResult> {
  const url = await validatePublicUrl(input);
  const started = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithValidatedRedirects(url, timeoutMs);

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        throw new ScanError(
          "NOT_HTML",
          `Target returned ${contentType || "unknown content type"}, not HTML.`,
        );
      }

      if (!res.ok) {
        throw new ScanError("FETCH_FAILED", `Target responded with HTTP ${res.status}.`);
      }

      const contentLength = parseInt(res.headers.get("content-length") || "0", 10);
      if (contentLength > MAX_BODY_BYTES) {
        throw new ScanError(
          "RESPONSE_TOO_LARGE",
          `Response exceeds ${MAX_BODY_BYTES / (1024 * 1024)} MB limit.`,
        );
      }

      const html = await res.text();
      if (html.length > MAX_BODY_BYTES) {
        throw new ScanError(
          "RESPONSE_TOO_LARGE",
          `Response exceeds ${MAX_BODY_BYTES / (1024 * 1024)} MB limit.`,
        );
      }
      return {
        html,
        finalUrl: res.url || url,
        fetchTime: Date.now() - started,
      };
    } catch (err) {
      lastError = err;
      if (err instanceof ScanError && err.code !== "FETCH_FAILED" && err.code !== "NOT_HTML") {
        throw err;
      }
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  if (lastError instanceof ScanError) {
    throw lastError;
  }
  throw new ScanError("FETCH_TIMEOUT", `Failed to fetch ${url} after ${MAX_RETRIES + 1} attempts.`);
}
