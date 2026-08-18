import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./auth";
import { prisma } from "./prisma";

export interface AuthedContext {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  let allow = "*";
  if (ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes("*")) {
    allow = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  }
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleOptions(req: NextRequest): NextResponse | null {
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
  }
  return null;
}

export async function authenticate(
  req: NextRequest
): Promise<{ ok: true; ctx: AuthedContext } | { ok: false; response: NextResponse }> {
  const authHeader = req.headers.get("authorization") || "";
  const apiKey = req.headers.get("x-api-key");

  if (apiKey) {
    const user = await prisma.user.findUnique({ where: { apiKey } });
    if (!user) {
      return {
        ok: false,
        response: jsonError(401, "INVALID_API_KEY", "Invalid API key."),
      };
    }
    return {
      ok: true,
      ctx: { userId: user.id, email: user.email, role: user.role },
    };
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return {
      ok: false,
      response: jsonError(401, "UNAUTHORIZED", "Missing authentication token or API key."),
    };
  }

  try {
    const payload = verifyToken(token);
    return {
      ok: true,
      ctx: { userId: payload.sub, email: payload.email, role: payload.role },
    };
  } catch {
    return {
      ok: false,
      response: jsonError(401, "INVALID_TOKEN", "Invalid or expired token."),
    };
  }
}

export function withCors(res: NextResponse, req: NextRequest): NextResponse {
  for (const [k, v] of Object.entries(corsHeaders(req))) {
    if (v) res.headers.set(k, v);
  }
  return res;
}