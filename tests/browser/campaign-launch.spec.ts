import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

async function expectRenderedCanvas(page: Page): Promise<void> {
  const screenshot = await page.locator("canvas").screenshot();
  const { data } = await sharp(screenshot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minimum = 255;
  let maximum = 0;

  for (let index = 0; index < data.length; index += 64) {
    minimum = Math.min(minimum, data[index], data[index + 1], data[index + 2]);
    maximum = Math.max(maximum, data[index], data[index + 1], data[index + 2]);
  }

  expect(maximum - minimum).toBeGreaterThan(24);
}

async function beginCrownfallRivalReign(page: Page): Promise<void> {
  const canvas = page.locator("canvas");
  const bounds = await canvas.boundingBox();
  if (!bounds) {
    throw new Error("Tactical canvas did not expose a layout box.");
  }
  const resolution = await canvas.evaluate((element: HTMLCanvasElement) => ({ width: element.width, height: element.height }));
  const topHeight = resolution.width < 640 ? 122 : resolution.width < 900 ? 94 : 58;
  const campaignScale = resolution.width < 640 ? Math.min(1, (resolution.width - 32) / 470) : 1;
  const panelX = Math.max(16, Math.round((resolution.width - 470 * campaignScale) / 2));
  const panelY = Math.max(topHeight + 18, Math.round((resolution.height - 402 * campaignScale) / 2));
  const rivalDoctrinePoint = { x: panelX + 234 * campaignScale, y: panelY + 296 * campaignScale };
  await page.mouse.click(
    bounds.x + (rivalDoctrinePoint.x / resolution.width) * bounds.width,
    bounds.y + (rivalDoctrinePoint.y / resolution.height) * bounds.height
  );
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("CROWNFALL reign begins");
}

test("launches the campaign theatre and begins a Crownfall reign", async ({ page }) => {
  const pageErrors: Error[] = [];
  const assetUrls: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  page.on("response", (response) => assetUrls.push(response.url()));

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator("canvas")).toHaveAttribute("role", "application");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await page.waitForTimeout(800);
  await expectRenderedCanvas(page);
  await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.ready).active));
  await beginCrownfallRivalReign(page);
  await expect.poll(() => assetUrls.some((url) => url.endsWith("painterly-battlefield-v1.webp"))).toBe(true);
  await expect.poll(() => assetUrls.some((url) => url.endsWith("building-atlas-v1.webp"))).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("renders a usable tactical canvas on a phone-sized viewport", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(800);
  await expectRenderedCanvas(page);
  await beginCrownfallRivalReign(page);
  expect(pageErrors).toEqual([]);
});

test("retains the installed campaign shell through an offline reload", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.ready).active));
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("canvas")).toBeVisible();
    await page.waitForTimeout(500);
    await expectRenderedCanvas(page);
  } finally {
    await context.setOffline(false);
  }
});
