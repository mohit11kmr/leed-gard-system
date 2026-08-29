/**
 * @jest-environment node
 */
import { isValidCron } from "../src/lib/cron";
import { buildRemediationPrompt, isOpenAiConfigured, RemediationInput } from "../src/lib/openai";

describe("isValidCron", () => {
  it("accepts standard 5-field cron", () => {
    expect(isValidCron("0 9 * * *")).toBe(true);
    expect(isValidCron("0 9 * * 1")).toBe(true);
    expect(isValidCron("*/5 * * * *")).toBe(true);
    expect(isValidCron("30 2,14 * * 1-5")).toBe(true);
  });

  it("rejects malformed cron", () => {
    expect(isValidCron("daily")).toBe(false);
    expect(isValidCron("* * *")).toBe(false);
    expect(isValidCron("")).toBe(false);
    expect(isValidCron("0 9 * * * extra")).toBe(false);
  });
});

describe("buildRemediationPrompt", () => {
  const input: RemediationInput = {
    url: "https://example.com",
    score: 62,
    brokenLinks: [{ url: "tel:+911234567890", status: "INVALID" }],
    securityFindings: [
      {
        ruleId: "CYBER-BASE64-001",
        type: "suspicious_script",
        severity: "danger",
        detail: "Long base64 blob found",
      },
    ],
    seoIssues: [{ severity: "HIGH", detail: "noindex meta present" }],
  };

  it("includes the senior engineer persona and all finding classes", () => {
    const prompt = buildRemediationPrompt(input);
    expect(prompt).toContain("Act as a senior security engineer");
    expect(prompt).toContain("https://example.com");
    expect(prompt).toContain("[BROKEN-LINK] tel:+911234567890 (INVALID)");
    expect(prompt).toContain("CYBER-BASE64-001/danger");
    expect(prompt).toContain("[SEO/HIGH] noindex meta present");
    expect(prompt.toLowerCase()).toContain("concise");
  });

  it("handles empty findings gracefully", () => {
    const prompt = buildRemediationPrompt({
      url: "https://clean.com",
      score: 100,
      brokenLinks: [],
      securityFindings: [],
      seoIssues: [],
    });
    expect(prompt).toContain("No issues detected.");
  });
});

describe("isOpenAiConfigured", () => {
  const prev = process.env.OPENAI_API_KEY;
  afterEach(() => {
    if (prev === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prev;
  });

  it("is false without key, true with key", () => {
    delete process.env.OPENAI_API_KEY;
    expect(isOpenAiConfigured()).toBe(false);
    process.env.OPENAI_API_KEY = "sk-test";
    expect(isOpenAiConfigured()).toBe(true);
  });
});
