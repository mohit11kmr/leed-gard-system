import {
  buildHtmlFindings,
  countHiddenExternalLinks,
  findSpamTerms,
  runSecurityChecks,
  scanScripts,
} from "../src/scanner/security";

describe("findSpamTerms", () => {
  it("detects spam keywords with counts", () => {
    const hits = findSpamTerms("Buy viagra and cialis online. Best casino guide. viagra again.");
    const terms = hits.map((h) => h.term);
    expect(terms).toEqual(expect.arrayContaining(["viagra", "cialis", "casino"]));
    expect(hits.find((h) => h.term === "viagra")?.count).toBe(2);
  });

  it("ignores clean content", () => {
    expect(findSpamTerms("We are a leading research consultancy offering academic support.")).toHaveLength(0);
  });

  it("does not match words embedded inside other words", () => {
    expect(findSpamTerms("xxcasinoxx and viagrax")).toHaveLength(0);
    expect(findSpamTerms("buy-cheap-viagra-online-guide")).toHaveLength(1);
  });
});

describe("countHiddenExternalLinks", () => {
  it("counts hidden external links only", () => {
    const html = [
      '<a href="https://spam-site-1.com/x" style="display:none">1</a>',
      '<a href="https://spam-site-2.com/y" style="visibility:hidden">2</a>',
      '<a href="https://spam-site-3.com/z" style="opacity:0;">3</a>',
      '<a href="/internal-menu" style="display:none">menu</a>',
      '<a href="https://example.com/visible" style="display:flex">ok</a>',
    ].join("");
    expect(countHiddenExternalLinks(html, "https://example.com")).toBe(3);
  });

  it("returns zero when links are visible", () => {
    const html = '<a href="https://other.com/a">a</a><a href="https://other.com/b">b</a>';
    expect(countHiddenExternalLinks(html, "https://example.com")).toBe(0);
  });
});

describe("scanScripts", () => {
  it("flags obfuscated patterns in inline scripts", () => {
    const html = `<p>hello</p><script>var d=atob("YWJj"); eval(d);</script><script>window.x = String.fromCharCode(65)</script>`;
    const hits = scanScripts(html);
    expect(hits).toEqual(expect.arrayContaining(["eval()", "atob()", "fromCharCode"]));
  });

  it("ignores normal scripts", () => {
    const html = `<script>console.log("normal analytics");</script>`;
    expect(scanScripts(html)).toHaveLength(0);
  });
});

describe("buildHtmlFindings", () => {
  it("clean page yields no findings", () => {
    const findings = buildHtmlFindings(
      "<p>Welcome to our clinic</p>",
      "<p>Welcome to our clinic</p>",
      "https://example.com"
    );
    expect(findings).toHaveLength(0);
  });

  it("3+ spam keyword hits escalate to danger", () => {
    const cleaned = "<p>viagra cialis casino online slots</p>";
    const findings = buildHtmlFindings("<p>x</p>", cleaned, "https://example.com");
    const spam = findings.find((f) => f.type === "spam_content");
    expect(spam?.severity).toBe("danger");
  });

  it("single spam hit stays warning", () => {
    const findings = buildHtmlFindings("<p>x</p>", "<p>casino bonus</p>", "https://example.com");
    expect(findings[0].severity).toBe("warning");
  });

  it("hidden external link farm is flagged", () => {
    const hidden = [1, 2, 3]
      .map((i) => `<a href="https://farm-${i}.com/l" style="display:none">l</a>`)
      .join("");
    const findings = buildHtmlFindings(hidden, hidden, "https://example.com");
    expect(findings.some((f) => f.type === "hidden_links")).toBe(true);
  });

  it("eval + atob combo escalates script finding to danger", () => {
    const raw = `<script>eval(atob("ZG9jdW1lbnQud3JpdGUo"))</script>`;
    const findings = buildHtmlFindings(raw, "<p>x</p>", "https://example.com");
    const scriptFinding = findings.find((f) => f.type === "suspicious_script");
    expect(scriptFinding?.severity).toBe("danger");
  });
});

describe("PRD FR-010/011 cyber rules", () => {
  it("CYBER-BASE64-001: long base64 blob with obfuscation is flagged", () => {
    const b64 = "QWxhZGRpbjpvcGVuIHNlc2FtZQ" + "A".repeat(300);
    const raw = `<script>var x=atob("${b64}");eval(x)</script>`;
    const findings = buildHtmlFindings(raw, "<p>x</p>", "https://example.com");
    const f = findings.find((r) => r.ruleId === "CYBER-BASE64-001");
    expect(f).toBeDefined();
  });

  it("CYBER-BASE64-001: plain base64 image data without obfuscation is not flagged", () => {
    const b64 = "/9j/4AAQSkZJRgABAQAAAQABAAD".padEnd(250, "A");
    const raw = `<img src="data:image/jpeg;base64,${b64}">`;
    const findings = buildHtmlFindings(raw, "<p>x</p>", "https://example.com");
    expect(findings.find((r) => r.ruleId === "CYBER-BASE64-001")).toBeUndefined();
  });

  it("CYBER-REDIRECT-001: fast meta refresh to external domain is danger", () => {
    const raw = `<meta http-equiv="refresh" content="2;url=https://evil.example.net/go">`;
    const findings = buildHtmlFindings(raw, "<p>x</p>", "https://example.com");
    const f = findings.find((r) => r.ruleId === "CYBER-REDIRECT-001");
    expect(f?.severity).toBe("danger");
  });

  it("CYBER-REDIRECT-001: same-origin meta refresh is ignored", () => {
    const raw = `<meta http-equiv="refresh" content="5;url=/thanks">`;
    const findings = buildHtmlFindings(raw, "<p>x</p>", "https://example.com");
    expect(findings.find((r) => r.ruleId === "CYBER-REDIRECT-001")).toBeUndefined();
  });

  it("CYBER-JSREDIR-001: external location.replace is warning", () => {
    const raw = `<script>location.replace("https://track.example.org/click");</script>`;
    const findings = buildHtmlFindings(raw, "<p>x</p>", "https://example.com");
    const f = findings.find((r) => r.ruleId === "CYBER-JSREDIR-001");
    expect(f?.severity).toBe("warning");
  });

  it("CYBER-MOBILE-001: mobile UA branching + redirect is danger", () => {
    const raw = `<script>if(navigator.userAgent.match(/iphone|android/i)){location.href="https://spam.example.mobi/x";}</script>`;
    const findings = buildHtmlFindings(raw, "<p>x</p>", "https://example.com");
    const f = findings.find((r) => r.ruleId === "CYBER-MOBILE-001");
    expect(f?.severity).toBe("danger");
  });

  it("CYBER-IFRAME-001: hidden external iframe is danger", () => {
    const raw = `<iframe src="https://mal.example.ru/load" width="0" height="0" style="display:none"></iframe>`;
    const findings = buildHtmlFindings(raw, "<p>x</p>", "https://example.com");
    const f = findings.find((r) => r.ruleId === "CYBER-IFRAME-001");
    expect(f?.severity).toBe("danger");
  });

  it("visible same-size iframe from analytics origin is not flagged as hidden", () => {
    const raw = `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-X" height="0" width="0" style="display:none;visibility:hidden"></iframe><script>dataLayer=[];</script>`;
    const findings = buildHtmlFindings(raw, "<p>x</p>", "https://example.com");
    const iframe = findings.find((r) => r.ruleId === "CYBER-IFRAME-001");
    expect(iframe).toBeUndefined();
  });

  it("every finding carries ruleId and confidence", () => {
    const raw = `<meta http-equiv="refresh" content="1;url=https://evil.example.net"><a href="https://farm1.com" style="display:none">x</a><a href="https://farm2.com" style="display:none">y</a><a href="https://farm3.com" style="display:none">z</a>`;
    const cleaned = `${raw}<p>casino viagra cialis</p>`;
    const findings = buildHtmlFindings(raw, cleaned, "https://example.com");
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.ruleId).toMatch(/^CYBER-/);
      expect(typeof f.confidence).toBe("number");
    }
  });
});

describe("runSecurityChecks", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns CLEAN for a clean site with clean sitemap", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        `<?xml version="1.0"?><urlset><url><loc>https://example.com/our-services/</loc></url><url><loc>https://example.com/contact/</loc></url></urlset>`,
    } as unknown as Response);

    const check = await runSecurityChecks(
      "<p>Clean homepage</p>",
      "<p>Clean homepage</p>",
      "https://example.com"
    );
    expect(check.status).toBe("CLEAN");
    expect(check.findings).toHaveLength(0);
  });

  it("catches injected spam post via post-sitemap.xml (kalpresearchwork-style)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        `<?xml version="1.0"?><urlset><url><loc>https://example.com/regular-post/</loc></url><url><loc>https://example.com/unlocking-the-truth-about-sexual-performance-boosters-science-safety-smart-choices/</loc></url></urlset>`,
    } as unknown as Response);

    const check = await runSecurityChecks(
      "<p>Clean-looking homepage</p>",
      "<p>Clean-looking homepage</p>",
      "https://example.com"
    );
    expect(check.status).toBe("DANGER");
    expect(check.findings[0].type).toBe("spam_content");
    expect(check.findings[0].severity).toBe("danger");
    expect(JSON.stringify(check.findings[0].evidence)).toMatch(/sexual[-\s]?performance|performance[-\s]?booster/i);
  });

  it("follows sitemap_index.xml to find post-sitemap", async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/post-sitemap.xml")) {
        return Promise.resolve({ ok: false } as unknown as Response);
      }
      if (url.endsWith("/sitemap_index.xml")) {
        return Promise.resolve({
          ok: true,
          text: async () =>
            `<sitemapindex><sitemap><loc>https://example.com/wp-sitemap-posts-post-1.xml</loc></sitemap></sitemapindex>`,
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        text: async () =>
          `<urlset><url><loc>https://example.com/buy-cheap-viagra-online/</loc></url></urlset>`,
      } as unknown as Response);
    }) as unknown as typeof fetch;

    const check = await runSecurityChecks("<p>hi</p>", "<p>hi</p>", "https://example.com");
    expect(check.status).toBe("DANGER");
  });

  it("stays silent when no sitemap exists", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false } as unknown as Response);
    const check = await runSecurityChecks("<p>hi</p>", "<p>hi</p>", "https://example.com");
    expect(check.status).toBe("CLEAN");
  });

  it("skips sitemap check when page already has spam finding", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const dirty = "<p>viagra cialis casino</p>";
    const check = await runSecurityChecks(dirty, dirty, "https://example.com");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(check.status).toBe("DANGER");
  });
});
