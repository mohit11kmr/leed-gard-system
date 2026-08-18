import { NextRequest, NextResponse } from "next/server";
import { signToken, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitKeyFor } from "@/lib/rateLimit";
import { corsHeaders, handleOptions, jsonError } from "@/lib/api";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const limit = await rateLimit(await rateLimitKeyFor(req));
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." } },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds), ...corsHeaders(req) },
      }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_BODY", "Invalid JSON body.");
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.password))) {
    return jsonError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    type: "access",
  });

  return NextResponse.json(
    {
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, apiKey: user.apiKey, role: user.role },
    },
    { headers: corsHeaders(req) }
  );
}