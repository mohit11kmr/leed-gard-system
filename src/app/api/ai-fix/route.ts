import { NextRequest, NextResponse } from "next/server";
import { authenticate, corsHeaders, handleOptions, withCors } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

interface AiFixRequest {
  linkType?: string;
  linkUrl?: string;
  issue?: string;
  suggestedFix?: string;
  pageUrl?: string;
}

function buildPrompt(body: AiFixRequest): string {
  const { linkType, linkUrl, issue, suggestedFix, pageUrl } = body;
  return [
    "You are a friendly web developer helping an Indian small-business owner fix a broken contact link on their website.",
    "Reply in simple Hinglish (Hindi written in English letters mixed with English tech terms). Keep the whole answer under 120 words.",
    "Structure your answer exactly like this:",
    "PROBLEM: <one line explanation of what is wrong>",
    "FIX: <the corrected HTML anchor tag they can copy-paste, inside a code block>",
    "TIP: <one short practical tip to avoid this in future>",
    "",
    "Details:",
    `- Website: ${pageUrl || "their website"}`,
    `- Link type: ${linkType || "contact link"}`,
    `- Current href: ${linkUrl || "(unknown)"}`,
    `- Detected problem: ${issue || "link is not working"}`,
    suggestedFix ? `- Quick manual fix suggestion: ${suggestedFix}` : "",
    "",
    "Rules for the FIX html:",
    "- Always output ONE complete <a> tag with correct href.",
    "- For WhatsApp use https://wa.me/91XXXXXXXXXX format with a real-looking valid Indian number kept as-is from input if provided, otherwise use 919876543210 as placeholder.",
    "- Add target=\"_blank\" and rel=\"noopener\".",
    "- Do not invent any other attributes.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  if (!process.env.GEMINI_API_KEY) {
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: { code: "AI_DISABLED", message: "AI fix suggestions are not configured yet." },
        },
        { status: 503 }
      ),
      req
    );
  }

  const limited = await rateLimit(`aifix:${auth.ctx.userId}`, 10);
  if (!limited.ok) {
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: { code: "RATE_LIMITED", message: "Too many AI requests. Try again shortly." },
        },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
      ),
      req
    );
  }

  let body: AiFixRequest;
  try {
    body = await req.json();
  } catch {
    return withCors(
      NextResponse.json(
        { success: false, error: { code: "INVALID_BODY", message: "Invalid JSON body." } },
        { status: 400 }
      ),
      req
    );
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  try {
    const res = await fetch(`${GEMINI_URL}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(body) }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: {
              code: "AI_UPSTREAM_ERROR",
              message: `Gemini responded HTTP ${res.status}. ${detail.slice(0, 150)}`,
            },
          },
          { status: 502 }
        ),
        req
      );
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    if (!text.trim()) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: { code: "AI_EMPTY", message: "AI returned an empty response. Try again." },
          },
          { status: 502 }
        ),
        req
      );
    }

    return withCors(NextResponse.json({ success: true, data: { fix: text, model } }), req);
  } catch (err) {
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: {
            code: "AI_TIMEOUT",
            message: err instanceof Error ? err.message : "AI request failed.",
          },
        },
        { status: 504 }
      ),
      req
    );
  }
}
