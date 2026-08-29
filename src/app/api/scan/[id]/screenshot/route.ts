import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import { Readable } from "stream";
import path from "path";
import { prisma } from "@/lib/prisma";
import { SCREENSHOT_DIR } from "@/scanner/screenshot";

// Screenshots are captured after a scan completes and are referenced by an
// unguessable scan id, so this mirrors the public report's access model.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]+$/i.test(id)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const scan = await prisma.scan.findUnique({
    where: { id },
    select: { screenshotPath: true },
  });
  if (!scan?.screenshotPath) {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  const file = path.join(SCREENSHOT_DIR, `${id}.png`);
  if (!existsSync(file)) {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  const stream = Readable.toWeb(createReadStream(file)) as unknown as ReadableStream;
  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(statSync(file).size),
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
