import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const SCREENSHOT_DIR = path.join(process.cwd(), "public", "screenshots");

export interface ScreenshotResult {
  publicPath: string;
}

export async function captureScreenshot(
  scanId: string,
  url: string,
  timeoutMs = 20000,
): Promise<ScreenshotResult | null> {
  try {
    const { default: puppeteer } = await import("puppeteer-core");
    const candidates = [
      process.env.CHROMIUM_PATH,
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/local/bin/chromium",
    ].filter((p): p is string => Boolean(p));
    const executablePath = candidates.find((p) => {
      try {
        return existsSync(p);
      } catch {
        return false;
      }
    });
    if (!executablePath)
      throw new Error(`No chromium binary found (tried: ${candidates.join(", ")})`);
    const browser = await puppeteer.launch({
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
      ],
      timeout: timeoutMs,
    });
    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (compatible; LeadGuardBot/1.0; +https://leadguard.app/bot)",
      );
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(url, { waitUntil: "networkidle2", timeout: timeoutMs });
      await mkdir(SCREENSHOT_DIR, { recursive: true });
      const file = path.join(SCREENSHOT_DIR, `${scanId}.png`);
      await page.screenshot({ path: file, fullPage: true });
      return { publicPath: `/screenshots/${scanId}.png` };
    } finally {
      await browser.close().catch(() => {});
    }
  } catch (err) {
    console.warn("[screenshot] skipped:", err instanceof Error ? err.message.slice(0, 160) : err);
    return null;
  }
}
