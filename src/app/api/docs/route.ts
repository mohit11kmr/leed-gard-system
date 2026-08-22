import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({
    openapi: "3.0.3",
    info: {
      title: "LeadGuard API",
      version: "1.0.0",
      description: "Website contact-link health scanning API.",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: { apiKey: { type: "apiKey", in: "header", name: "x-api-key" } },
    },
    paths: {
      "/api/scan": {
        post: {
          security: [{ apiKey: [] }],
          summary: "Start a scan",
          responses: { "200": { description: "Scan queued" } },
        },
      },
      "/api/scan/bulk": {
        post: {
          security: [{ apiKey: [] }],
          summary: "Queue up to ten scans",
          responses: { "200": { description: "Scans queued" } },
        },
      },
      "/api/history": {
        get: {
          security: [{ apiKey: [] }],
          summary: "Get paginated scan history",
          responses: { "200": { description: "Scan history" } },
        },
      },
      "/api/health": {
        get: {
          summary: "Check service health",
          responses: {
            "200": { description: "Healthy" },
            "503": { description: "Dependency unavailable" },
          },
        },
      },
    },
  });
}
