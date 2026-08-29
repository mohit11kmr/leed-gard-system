import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { corsHeaders, handleOptions, jsonError } from "@/lib/api";
import { rateLimit, rateLimitKeyFor } from "@/lib/rateLimit";
import { z } from "zod";

const resetPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const limit = await rateLimit(`reset-password:${await rateLimitKeyFor(req)}`, 5);
  if (!limit.ok) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." },
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds), ...corsHeaders(req) },
      },
    );
  }

  let body: { email?: string; token?: string; password?: string };
  try {
    body = resetPasswordSchema.parse(await req.json());
  } catch {
    return jsonError(400, "INVALID_BODY", "Invalid request body.");
  }

  const { email, token, password } = body as { email: string; token: string; password: string };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.resetTokenHash || !user.resetTokenExpiresAt) {
    return jsonError(400, "INVALID_TOKEN", "Invalid or expired reset token.");
  }

  if (user.resetTokenExpiresAt < new Date()) {
    return jsonError(400, "TOKEN_EXPIRED", "Reset token has expired. Please request a new one.");
  }

  const valid = await verifyPassword(token, user.resetTokenHash);
  if (!valid) {
    return jsonError(400, "INVALID_TOKEN", "Invalid reset token.");
  }

  // Check if new password is same as current
  const sameAsCurrent = await verifyPassword(password, user.password);
  if (sameAsCurrent) {
    return jsonError(400, "SAME_PASSWORD", "New password must be different from current password.");
  }

  const newPasswordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: newPasswordHash,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    },
  });

  return NextResponse.json(
    { success: true, message: "Password has been reset successfully." },
    { headers: corsHeaders(req) },
  );
}
