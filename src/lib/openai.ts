import OpenAI from "openai";

let client: OpenAI | null = null;

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export interface RemediationInput {
  url: string;
  score: number;
  brokenLinks: { url: string; status: string; suggestedFix?: string | null }[];
  securityFindings: {
    ruleId?: string;
    type: string;
    severity: string;
    detail: string;
    evidence?: string[];
  }[];
  seoIssues: { ruleId?: string; severity: string; detail: string }[];
}

export function buildRemediationPrompt(input: RemediationInput): string {
  const vulnList = [
    ...input.brokenLinks.map(
      (l) =>
        `- [BROKEN-LINK] ${l.url} (${l.status})${l.suggestedFix ? ` fix hint: ${l.suggestedFix}` : ""}`,
    ),
    ...input.securityFindings.map(
      (f) =>
        `- [${f.ruleId ?? f.type}/${f.severity}] ${f.detail}${f.evidence?.length ? ` evidence: ${f.evidence[0]}` : ""}`,
    ),
    ...input.seoIssues.map((s) => `- [SEO/${s.severity}] ${s.detail}`),
  ].join("\n");

  return [
    `Act as a senior security engineer. Suggest specific code fixes for these vulnerabilities found on ${input.url} (health score ${input.score}/100):`,
    vulnList || "- No issues detected.",
    "",
    "Keep it concise. For each issue give one actionable fix (HTML attribute, DNS/registry change, or config snippet). Plain text, numbered list.",
  ].join("\n");
}

export async function generateRemediation(input: RemediationInput): Promise<string | null> {
  if (!isOpenAiConfigured()) return null;
  try {
    const res = await getClient().chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: 700,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a senior web security engineer. You write short, concrete remediation steps for small-business website owners.",
        },
        { role: "user", content: buildRemediationPrompt(input) },
      ],
    });
    const text = res.choices[0]?.message?.content?.trim();
    return text || null;
  } catch (err) {
    console.error("[openai] remediation failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
