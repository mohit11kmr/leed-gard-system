import { expect, test } from "@playwright/test";

const result = {
  score: 100,
  scanStats: { totalLinks: 0, workingLinks: 0, brokenLinks: 0 },
  whatsappLinks: [],
  phoneLinks: [],
  emailLinks: [],
  reviewLinks: [],
  socialLinks: [],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/guest", async (route) =>
    route.fulfill({
      json: { success: true, token: "test-token", apiKey: "test-key", guest: true },
    }),
  );
  await page.route("**/api/scan", async (route) =>
    route.fulfill({ json: { success: true, scanId: "e2e-scan", status: "PENDING" } }),
  );
  await page.route("**/api/scan/e2e-scan", async (route) =>
    route.fulfill({
      json: {
        data: {
          id: "e2e-scan",
          url: "https://example.com",
          status: "COMPLETED",
          score: 100,
          result,
        },
      },
    }),
  );
});

test("user submits URL and sees result", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Website URL").fill("example.com");
  await page.getByRole("button", { name: "Scan" }).click();
  await expect(page.getByText("100/100")).toBeVisible({ timeout: 10000 });
});

test("user downloads a PDF report", async ({ page }) => {
  await page.route("**/api/public/report/e2e-scan", async (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: "e2e-scan",
          url: "https://example.com",
          status: "COMPLETED",
          score: 100,
          result,
        },
      },
    }),
  );
  await page.goto("/report/e2e-scan");
  await expect(page.getByText("Download PDF report")).toBeVisible({ timeout: 10000 });
  const download = page.waitForEvent("download");
  await page.getByText("Download PDF report").click();
  await expect(download).resolves.toBeTruthy();
});
