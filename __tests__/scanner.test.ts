import { cleanHtml } from "../src/scanner/cleanHtml";
import {
  extractAllLinks,
  extractEmailLinks,
  extractPhoneLinks,
  extractReviewLinks,
  extractSocialLinks,
  extractWhatsAppLinks,
} from "../src/scanner/extract";
import { validatePublicUrl } from "../src/scanner/fetchHtml";
import { calculateScore } from "../src/scanner/score";
import { performScan } from "../src/scanner";
import { isValidIndianPhone, validateEmailLink, validatePhoneLink, validateWhatsAppLink } from "../src/scanner/validate";

describe("cleanHtml", () => {
  it("removes scripts, styles and comments", () => {
    const html = `<script>var x='tel:123';</script><style>a{}</style><!-- tel:999 --><a href="tel:9876543210">call</a>`;
    const cleaned = cleanHtml(html);
    expect(cleaned).not.toContain("script");
    expect(cleaned).not.toContain("style");
    expect(cleaned).not.toContain("tel:999");
    expect(cleaned).toContain("tel:9876543210");
  });
});

describe("extract", () => {
  it("extracts WhatsApp links from wa.me and api.whatsapp.com", () => {
    const html = `<a href="https://wa.me/919876543210">a</a><a href="https://api.whatsapp.com/send?phone=919876543210&text=hi">b</a>`;
    const links = extractWhatsAppLinks(html);
    expect(links).toHaveLength(2);
    expect(links[0].phone).toBe("919876543210");
    expect(links[1].phone).toBe("919876543210");
  });

  it("extracts tel: links and strips non-digits", () => {
    const links = extractPhoneLinks(`<a href="tel:+91-98765-43210">call</a>`);
    expect(links).toHaveLength(1);
    expect(links[0].number).toBe("919876543210");
  });

  it("extracts review and social links", () => {
    const review = extractReviewLinks(`<a href="https://g.page/r/abc123">r</a>`);
    expect(review).toHaveLength(1);
    expect(review[0].platform).toBe("Google Page");

    const social = extractSocialLinks(`<a href="https://facebook.com/example">f</a><a href="https://instagram.com/x">i</a>`);
    expect(social).toHaveLength(2);
    expect(social.map((s) => s.platform)).toEqual(expect.arrayContaining(["facebook", "instagram"]));
  });

  it("extracts mailto emails", () => {
    const links = extractEmailLinks(`<a href="mailto:info@example.com">mail</a>`);
    expect(links).toHaveLength(1);
    expect(links[0].email).toBe("info@example.com");
  });

  it("deduplicates repeated URLs", () => {
    const links = extractWhatsAppLinks(`<a href="https://wa.me/919876543210">a</a><a href="https://wa.me/919876543210">b</a>`);
    expect(links).toHaveLength(1);
  });

  it("extractAllLinks returns all categories", () => {
    const html = [
      '<a href="https://wa.me/919876543210">w</a>',
      '<a href="tel:9876543210">t</a>',
      '<a href="https://g.page/r/abc">g</a>',
      '<a href="https://linkedin.com/company/x">l</a>',
      '<a href="mailto:a@b.com">e</a>',
    ].join("");
    const all = extractAllLinks(html);
    expect(all.whatsappLinks).toHaveLength(1);
    expect(all.phoneLinks).toHaveLength(1);
    expect(all.reviewLinks).toHaveLength(1);
    expect(all.socialLinks).toHaveLength(1);
    expect(all.emailLinks).toHaveLength(1);
  });
});

describe("validate", () => {
  it("accepts valid Indian phone numbers", () => {
    expect(isValidIndianPhone("9876543210")).toBe(true);
    expect(isValidIndianPhone("8876543210")).toBe(true);
  });

  it("rejects invalid Indian phone numbers", () => {
    expect(isValidIndianPhone("12345")).toBe(false);
    expect(isValidIndianPhone("1234567890")).toBe(false);
    expect(isValidIndianPhone("98765432100")).toBe(false);
  });

  it("validates WhatsApp links with 10-15 digit numbers", () => {
    const ok = validateWhatsAppLink({ url: "https://wa.me/919876543210", phone: "919876543210", status: "WORKING", isValid: true });
    expect(ok.isValid).toBe(true);
    expect(ok.status).toBe("WORKING");

    const bad = validateWhatsAppLink({ url: "https://wa.me/123", phone: "123", status: "WORKING", isValid: true });
    expect(bad.isValid).toBe(false);
    expect(bad.status).toBe("BROKEN");
  });

  it("validates phone links", () => {
    expect(validatePhoneLink({ url: "tel:9876543210", number: "9876543210", status: "WORKING", isValid: true }).isValid).toBe(true);
    expect(validatePhoneLink({ url: "tel:1234567890", number: "1234567890", status: "WORKING", isValid: true }).isValid).toBe(false);
  });

  it("validates emails", () => {
    expect(validateEmailLink({ email: "info@example.com", url: "mailto:info@example.com", status: "WORKING", isValid: true }).isValid).toBe(true);
    expect(validateEmailLink({ email: "not-an-email", url: "mailto:not-an-email", status: "WORKING", isValid: true }).isValid).toBe(false);
  });
});

describe("score", () => {
  it("deducts per broken category and clamps at 0", () => {
    expect(calculateScore({ brokenWhatsAppCount: 1, invalidPhoneCount: 1, invalidEmailCount: 1 }).score).toBe(40);
    expect(calculateScore({ brokenWhatsAppCount: 0, invalidPhoneCount: 0, invalidEmailCount: 0 }).score).toBe(100);
    expect(calculateScore({ brokenWhatsAppCount: 10, invalidPhoneCount: 10, invalidEmailCount: 10 }).score).toBe(0);
  });
});

describe("validatePublicUrl", () => {
  it("adds https scheme", async () => {
    expect(await validatePublicUrl("example.com")).toBe("https://example.com");
  });

  it("rejects localhost and private IPs", async () => {
    await expect(validatePublicUrl("http://localhost:3000")).rejects.toThrow(/SSRF/i);
    await expect(validatePublicUrl("http://127.0.0.1")).rejects.toThrow(/SSRF/i);
    await expect(validatePublicUrl("http://192.168.1.1")).rejects.toThrow(/SSRF/i);
    await expect(validatePublicUrl("http://10.0.0.5")).rejects.toThrow(/SSRF/i);
  });

  it("rejects hostnames resolving to private addresses (DNS rebinding)", async () => {
    const lookup = jest.spyOn(require("node:dns/promises"), "lookup");
    lookup.mockResolvedValue({ address: "127.0.0.1", family: 4 });
    await expect(validatePublicUrl("http://127.0.0.1.nip.io")).rejects.toThrow(/SSRF/i);
    lookup.mockRestore();
  });

  it("rejects IPv6 NAT64 / IPv4-mapped addresses that embed private IPv4", async () => {
    const lookup = jest.spyOn(require("node:dns/promises"), "lookup");
    lookup.mockResolvedValue({ address: "64:ff9b::7f00:1", family: 6 });
    await expect(validatePublicUrl("http://nat64.example.com")).rejects.toThrow(/SSRF/i);
    lookup.mockResolvedValue({ address: "::ffff:7f00:1", family: 6 });
    await expect(validatePublicUrl("http://mapped.example.com")).rejects.toThrow(/SSRF/i);
    lookup.mockResolvedValue({ address: "::1", family: 6 });
    await expect(validatePublicUrl("http://loop.example.com")).rejects.toThrow(/SSRF/i);
    lookup.mockRestore();
  });

  it("allows public IPv6 addresses", async () => {
    const lookup = jest.spyOn(require("node:dns/promises"), "lookup");
    lookup.mockResolvedValue({ address: "2606:4700:4700::1111", family: 6 });
    await expect(validatePublicUrl("http://public-v6.example.com")).resolves.toMatch(/^https?:\/\//);
    lookup.mockRestore();
  });

  it("rejects non-http protocols", async () => {
    await expect(validatePublicUrl("ftp://example.com")).rejects.toThrow();
  });
});

describe("performScan (mocked fetch)", () => {
  const sampleHtml = [
    '<a href="https://wa.me/919876543210">w1</a>',
    '<a href="https://wa.me/12345">w2</a>',
    '<a href="tel:+919876543210">t1</a>',
    '<a href="tel:1234567890">t2</a>',
    '<a href="mailto:info@example.com">e1</a>',
    '<a href="mailto:not-an-email">e2</a>',
    '<a href="https://g.page/r/abc">g</a>',
    '<a href="https://facebook.com/example">f</a>',
  ].join("");

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "text/html" },
      url: "https://example.com/",
      text: async () => sampleHtml,
    } as unknown as Response);
    jest.spyOn(require("node:dns/promises"), "lookup").mockResolvedValue({
      address: "93.184.216.34",
      family: 4,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("classifies links and computes score", async () => {
    const result = await performScan("https://example.com");
    expect(result.score).toBe(100 - 25 - 20 - 15); // 40
    expect(result.scanStats.totalLinks).toBe(8);
    expect(result.scanStats.brokenLinks).toBe(3);
    expect(result.whatsappLinks.find((l) => l.phone === "919876543210")?.status).toBe("WORKING");
    expect(result.whatsappLinks.find((l) => l.phone === "12345")?.status).toBe("BROKEN");
    expect(result.phoneLinks.find((l) => l.number === "919876543210")?.status).toBe("WORKING");
    expect(result.phoneLinks.find((l) => l.number === "1234567890")?.status).toBe("BROKEN");
    expect(result.emailLinks.find((l) => l.email === "info@example.com")?.status).toBe("WORKING");
    expect(result.emailLinks.find((l) => l.email === "not-an-email")?.status).toBe("BROKEN");
    expect(result.reviewLinks).toHaveLength(1);
    expect(result.socialLinks).toHaveLength(1);
    expect(result.performance.fetchTime).toBeGreaterThanOrEqual(0);
  });
});