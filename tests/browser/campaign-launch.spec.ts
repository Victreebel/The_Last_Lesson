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

test("launches the installed single-player campaign theatre", async ({ page }) => {
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
  expect(pageErrors).toEqual([]);
});
