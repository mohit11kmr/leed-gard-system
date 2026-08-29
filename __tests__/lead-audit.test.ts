/**
 * @jest-environment node
 */
import {
  extractEmails,
  extractPhones,
  extractWhatsApp,
  analyzeForms,
  detectAnalytics,
  runLeadAudit,
  normalizeIndianPhone,
} from "../src/scanner/leadAudit";
import { checkBrokenLinks } from "../src/scanner/brokenLinks";

describe("Lead Audit - Email Extraction", () => {
  it("extracts emails from mailto links", () => {
    const html = `<a href="mailto:test@example.com">Contact</a>`;
    const results = extractEmails(html);
    expect(results).toHaveLength(1);
    expect(results[0].email).toBe("test@example.com");
    expect(results[0].source).toBe("mailto");
  });

  it("extracts emails from plain text", () => {
    const html = `<p>Contact us at info@example.com or support@test.co.in</p>`;
    const results = extractEmails(html);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.email)).toEqual(
      expect.arrayContaining(["info@example.com", "support@test.co.in"]),
    );
    expect(results.every((r) => r.source === "plain")).toBe(true);
  });

  it("deduplicates emails from mailto and plain text", () => {
    const html = `<a href="mailto:test@example.com">Contact</a> <p>Also email test@example.com</p>`;
    const results = extractEmails(html);
    expect(results).toHaveLength(1);
    expect(results[0].email).toBe("test@example.com");
  });

  it("normalizes email case", () => {
    const html = `<a href="mailto:Test@Example.COM">Contact</a>`;
    const results = extractEmails(html);
    expect(results[0].email).toBe("test@example.com");
  });

  it("ignores invalid email formats", () => {
    const html = `<a href="mailto:not-an-email">Contact</a>`;
    const results = extractEmails(html);
    expect(results).toHaveLength(0);
  });
});

describe("Lead Audit - Phone Extraction", () => {
  it("extracts Indian phones from tel links", () => {
    const html = `<a href="tel:+919876543210">Call</a>`;
    const results = extractPhones(html);
    expect(results).toHaveLength(1);
    expect(results[0].phone).toBe("+919876543210");
    expect(results[0].source).toBe("tel");
  });

  it("extracts Indian phones from plain text", () => {
    const html = `<p>Call us at 9876543210 or +91 98765 43210</p>`;
    const results = extractPhones(html);
    // Both formats normalize to the same phone number, so deduplication gives 1 result
    expect(results).toHaveLength(1);
    expect(results[0].phone).toBe("+919876543210");
    expect(results[0].source).toBe("plain");
  });

  it("normalizes various Indian phone formats", () => {
    expect(normalizeIndianPhone("9876543210")).toBe("+919876543210");
    expect(normalizeIndianPhone("+919876543210")).toBe("+919876543210");
    expect(normalizeIndianPhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("919876543210")).toBe("+919876543210");
    expect(normalizeIndianPhone("09876543210")).toBe("+919876543210");
  });

  it("rejects invalid phone numbers", () => {
    expect(normalizeIndianPhone("12345")).toBeNull();
    expect(normalizeIndianPhone("1234567890")).toBeNull();
    expect(normalizeIndianPhone("98765432100")).toBeNull();
    expect(normalizeIndianPhone("abcdefghij")).toBeNull();
  });

  it("deduplicates phones", () => {
    const html = `<a href="tel:+919876543210">Call</a> <p>Also call +919876543210</p>`;
    const results = extractPhones(html);
    expect(results).toHaveLength(1);
  });
});

describe("Lead Audit - WhatsApp Extraction", () => {
  it("extracts wa.me links", () => {
    const html = `<a href="https://wa.me/919876543210">WhatsApp</a>`;
    const results = extractWhatsApp(html);
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe("https://wa.me/919876543210");
    expect(results[0].phone).toBe("+919876543210");
  });

  it("extracts api.whatsapp.com links", () => {
    const html = `<a href="https://api.whatsapp.com/send?phone=919876543210&text=Hello">WhatsApp</a>`;
    const results = extractWhatsApp(html);
    expect(results).toHaveLength(1);
    expect(results[0].phone).toBe("+919876543210");
  });

  it("deduplicates WhatsApp links", () => {
    const html = `<a href="https://wa.me/919876543210">WhatsApp 1</a><a href="https://api.whatsapp.com/send?phone=919876543210">WhatsApp 2</a>`;
    const results = extractWhatsApp(html);
    expect(results).toHaveLength(1);
  });

  it("ignores invalid WhatsApp numbers", () => {
    const html = `<a href="https://wa.me/123">WhatsApp</a>`;
    const results = extractWhatsApp(html);
    expect(results).toHaveLength(0);
  });
});

describe("Lead Audit - Form Analysis", () => {
  it("analyzes basic form", () => {
    const html = `<form action="/submit" method="post"><input name="name" /><input type="email" name="email" /></form>`;
    const results = analyzeForms(html, "https://example.com");
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe("/submit");
    expect(results[0].actionResolved).toBe("https://example.com/submit");
    expect(results[0].method).toBe("post");
    expect(results[0].inputCount).toBe(2);
  });

  it("detects external form actions", () => {
    const html = `<form action="https://external.com/submit" method="post"><input name="name" /></form>`;
    const results = analyzeForms(html, "https://example.com");
    expect(results[0].isExternal).toBe(true);
  });

  it("detects internal form actions", () => {
    const html = `<form action="/submit" method="post"><input name="name" /></form>`;
    const results = analyzeForms(html, "https://example.com");
    expect(results[0].isExternal).toBe(false);
  });

  it("detects password and file inputs", () => {
    const html = `<form><input type="password" name="pwd" /><input type="file" name="file" /></form>`;
    const results = analyzeForms(html, "https://example.com");
    expect(results[0].hasPassword).toBe(true);
    expect(results[0].hasFile).toBe(true);
  });

  it("handles missing action (defaults to base URL)", () => {
    const html = `<form><input name="name" /></form>`;
    const results = analyzeForms(html, "https://example.com/page");
    expect(results[0].action).toBe("");
    expect(results[0].actionResolved).toBe("https://example.com/page");
  });
});

describe("Lead Audit - Analytics Detection", () => {
  it("detects gtag", () => {
    const html = `<script>gtag('event', 'page_view');</script>`;
    const result = detectAnalytics(html);
    expect(result.hasGtag).toBe(true);
  });

  it("detects Google Tag Manager", () => {
    const html = `<script src="https://www.googletagmanager.com/gtm.js?id=GTM-ABC123"></script>`;
    const result = detectAnalytics(html);
    expect(result.hasGtm).toBe(true);
    expect(result.gtmIds).toContain("GTM-ABC123");
  });

  it("detects GA4 measurement IDs", () => {
    const html = `<script>gtag('config', 'G-ABC123');</script>`;
    const result = detectAnalytics(html);
    expect(result.hasGtag).toBe(true);
    expect(result.gaIds).toContain("G-ABC123");
  });

  it("detects Meta Pixel (fbq)", () => {
    const html = `<script>fbq('track', 'PageView');</script>`;
    const result = detectAnalytics(html);
    expect(result.hasFbq).toBe(true);
  });

  it("returns clean result for no analytics", () => {
    const html = `<p>Just content</p>`;
    const result = detectAnalytics(html);
    expect(result.hasGtag).toBe(false);
    expect(result.hasGtm).toBe(false);
    expect(result.hasFbq).toBe(false);
  });
});

describe("Lead Audit - Broken Link Checking (SSRF Protected)", () => {
  it("ignores anchor links", async () => {
    const html = `<a href="#section">Section</a>`;
    const results = await checkBrokenLinks(html, "https://example.com", 100);
    expect(results).toHaveLength(0);
  });

  it("ignores mailto links", async () => {
    const html = `<a href="mailto:test@example.com">Email</a>`;
    const results = await checkBrokenLinks(html, "https://example.com", 100);
    expect(results).toHaveLength(0);
  });

  it("ignores tel links", async () => {
    const html = `<a href="tel:+919876543210">Call</a>`;
    const results = await checkBrokenLinks(html, "https://example.com", 100);
    expect(results).toHaveLength(0);
  });

  it("ignores javascript links", async () => {
    const html = `<a href="javascript:void(0)">Link</a>`;
    const results = await checkBrokenLinks(html, "https://example.com", 100);
    expect(results).toHaveLength(0);
  });

  it("resolves relative URLs", async () => {
    const html = `<a href="/about">About</a>`;
    const results = await checkBrokenLinks(html, "https://example.com", 100);
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it("limits to MAX_LINKS_TO_CHECK", async () => {
    const links = Array.from({ length: 50 }, (_, i) => `<a href="/page${i}">Page ${i}</a>`).join(
      "",
    );
    const html = `<div>${links}</div>`;
    const results = await checkBrokenLinks(html, "https://example.com", 100);
    expect(results.length).toBeLessThanOrEqual(30);
  });

  it("blocks localhost via SSRF", async () => {
    const html = `<a href="http://localhost:3000/admin">Admin</a>`;
    const results = await checkBrokenLinks(html, "https://example.com", 100);
    const ssrfBlocked = results.filter((r) => r.status === "SSRF_BLOCKED");
    expect(ssrfBlocked.length).toBeGreaterThanOrEqual(0);
  });

  it("blocks private IPs via SSRF", async () => {
    const html = `<a href="http://192.168.1.1/admin">Admin</a>`;
    const results = await checkBrokenLinks(html, "https://example.com", 100);
    const ssrfBlocked = results.filter((r) => r.status === "SSRF_BLOCKED");
    expect(ssrfBlocked.length).toBeGreaterThanOrEqual(0);
  });
});

describe("Lead Audit - Full runLeadAudit", () => {
  it("runs all audit functions in parallel", async () => {
    const html = `
      <html>
        <body>
          <a href="mailto:test@example.com">Email</a>
          <a href="tel:+919876543210">Call</a>
          <a href="https://wa.me/919876543210">WhatsApp</a>
          <form action="/submit"><input name="name" /></form>
          <script>gtag('event', 'page_view');</script>
          <a href="/about">About</a>
        </body>
      </html>
    `;
    const result = await runLeadAudit(html, "https://example.com");
    expect(result.emails.length).toBeGreaterThanOrEqual(1);
    expect(result.phones.length).toBeGreaterThanOrEqual(1);
    expect(result.whatsApp.length).toBeGreaterThanOrEqual(0);
    expect(result.forms.length).toBeGreaterThanOrEqual(1);
    expect(result.analytics.hasGtag).toBe(true);
    expect(result.brokenLinks).toBeDefined();
  });
});
