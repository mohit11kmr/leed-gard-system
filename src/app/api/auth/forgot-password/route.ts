import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateWebhookSecret } from "@/lib/auth";
import { sendEmail, appBaseUrl } from "@/lib/email";
import { corsHeaders, handleOptions, jsonError } from "@/lib/api";
import { rateLimit, rateLimitKeyFor } from "@/lib/rateLimit";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const limit = await rateLimit(`forgot-password:${await rateLimitKeyFor(req)}`, 3);
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

  let body: { email?: string };
  try {
    body = forgotPasswordSchema.parse(await req.json());
  } catch {
    return jsonError(400, "INVALID_BODY", "Invalid request body.");
  }

  const email = body.email!;

  // Always return success to prevent user enumeration
  const genericSuccess = {
    success: true,
    message: "If an account exists, a password reset link has been sent.",
  };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // User doesn't exist, but we return success anyway
    return NextResponse.json(genericSuccess, { headers: corsHeaders(req) });
  }

  // Skip guest users
  if (user.email.endsWith("@leadguard.local")) {
    return NextResponse.json(genericSuccess, { headers: corsHeaders(req) });
  }

  // Generate secure reset token
  const resetToken = generateWebhookSecret(); // 64-char hex string
  const resetTokenHash = await hashPassword(resetToken);
  const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetTokenHash, resetTokenExpiresAt },
  });

  const baseUrl = appBaseUrl();
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  const subject = "Reset your LeadGuard password";
  const text = [
    `Hi ${user.name || "there"},`,
    "",
    "You requested a password reset for your LeadGuard account.",
    "",
    `Click the link below to set a new password (expires in 1 hour):`,
    resetLink,
    "",
    "If you didn't request this, you can safely ignore this email.",
    "",
    "— LeadGuard Team",
  ].join("\n");

  try {
    await sendEmail({ to: email, subject, text });
  } catch (err) {
    // Log but don't expose to user
    console.error("Failed to send password reset email:", err);
  }

  return NextResponse.json(genericSuccess, { headers: corsHeaders(req) });
}
