import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { authenticate, corsHeaders, handleOptions, withCors, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req) ?? new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

function newToken(): { token: string; hash: string; prefix: string } {
  const raw = randomBytes(24).toString("base64url");
  const token = `lgci_${raw}`;
  return {
    token,
    hash: createHash("sha256").update(token).digest("hex"),
    prefix: token.slice(0, 9),
  };
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const tokens = await prisma.apiToken.findMany({
    where: { userId: auth.ctx.userId },
    select: {
      id: true,
      name: true,
      prefix: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return withCors(NextResponse.json({ success: true, tokens }), req);
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const name = (body.name || "CI token").slice(0, 60);

  const activeCount = await prisma.apiToken.count({
    where: { userId: auth.ctx.userId, revokedAt: null },
  });
  if (activeCount >= 10) {
    return jsonError(429, "TOKEN_LIMIT", "Maximum 10 active tokens. Revoke one first.");
  }

  const { token, hash, prefix } = newToken();
  const created = await prisma.apiToken.create({
    data: { userId: auth.ctx.userId, name, tokenHash: hash, prefix },
  });

  return withCors(
    NextResponse.json(
      {
        success: true,
        token: created,
        // Plaintext is returned exactly once — only the SHA-256 hash is stored.
        secret: token,
      },
      { status: 201 },
    ),
    req,
  );
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError(400, "VALIDATION_ERROR", "id query param required.");

  const existing = await prisma.apiToken.findFirst({ where: { id, userId: auth.ctx.userId } });
  if (!existing) return jsonError(404, "NOT_FOUND", "Token not found.");

  await prisma.apiToken.update({
    where: { id },
    data: { revokedAt: existing.revokedAt ?? new Date() },
  });
  return withCors(NextResponse.json({ success: true }), req);
}
