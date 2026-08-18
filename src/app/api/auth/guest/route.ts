import { NextRequest, NextResponse } from "next/server";
import { generateApiKey, hashPassword, signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { corsHeaders, handleOptions } from "@/lib/api";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const nonce = Math.random().toString(36).slice(2, 10);
  const email = `guest_${nonce}@leadguard.local`;
  const password = `guest_${Math.random().toString(36).slice(2, 14)}`;

  const user = await prisma.user.create({
    data: {
      email,
      password: await hashPassword(password),
      name: "Guest",
      apiKey: generateApiKey(),
    },
  });

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
      apiKey: user.apiKey,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      guest: true,
    },
    { headers: corsHeaders(req) }
  );
}