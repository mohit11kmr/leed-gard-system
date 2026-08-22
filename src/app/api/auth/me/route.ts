import { NextRequest, NextResponse } from "next/server";
import { authenticate, corsHeaders, handleOptions, withCors } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.ctx.userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  if (!user) {
    return withCors(
      NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "User not found." } },
        { status: 404 }
      ),
      req
    );
  }

  return withCors(NextResponse.json({ success: true, user }), req);
}
