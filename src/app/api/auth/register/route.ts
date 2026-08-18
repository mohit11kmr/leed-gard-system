import { NextRequest, NextResponse } from "next/server";
import { generateApiKey, hashPassword } from "@/lib/auth";
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

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_BODY", "Invalid JSON body.");
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const name = (body.name || "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return jsonError(400, "INVALID_EMAIL", "A valid email is required.");
  }
  if (password.length < 8) {
    return jsonError(400, "WEAK_PASSWORD", "Password must be at least 8 characters.");
  }
  if (!name) {
    return jsonError(400, "INVALID_NAME", "Name is required.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError(409, "EMAIL_EXISTS", "An account with this email already exists.");
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: await hashPassword(password),
      name,
      apiKey: generateApiKey(),
    },
    select: { id: true, email: true, name: true, apiKey: true, role: true },
  });

  return NextResponse.json(
    { success: true, user },
    { headers: corsHeaders(req) }
  );
}