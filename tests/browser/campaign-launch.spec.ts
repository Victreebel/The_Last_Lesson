import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { BOOK_PANEL_HEIGHT, CAMPAIGN_THEATRE_LAYOUT } from "../../src/rendering/uiLayout";

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
  const campaignScale = resolution.width < 640 ? Math.min(1, (resolution.width - 32) / CAMPAIGN_THEATRE_LAYOUT.width) : 1;
  const panelX = Math.max(16, Math.round((resolution.width - CAMPAIGN_THEATRE_LAYOUT.width * campaignScale) / 2));
  const panelY = Math.max(topHeight + 18, Math.round((resolution.height - CAMPAIGN_THEATRE_LAYOUT.height * campaignScale) / 2));
  const rivalDoctrinePoint = {
    x: panelX + 234 * campaignScale,
    y: panelY + (CAMPAIGN_THEATRE_LAYOUT.difficultyY + 2) * campaignScale
  };
  await page.mouse.click(
    bounds.x + (rivalDoctrinePoint.x / resolution.width) * bounds.width,
    bounds.y + (rivalDoctrinePoint.y / resolution.height) * bounds.height
  );
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("CROWNFALL reign begins");
}

async function beginAshenOathRivalReign(page: Page): Promise<void> {
  const canvas = page.locator("canvas");
  const bounds = await canvas.boundingBox();
  if (!bounds) {
    throw new Error("Tactical canvas did not expose a layout box.");
  }
  const resolution = await canvas.evaluate((element: HTMLCanvasElement) => ({ width: element.width, height: element.height }));
  const topHeight = resolution.width < 640 ? 122 : resolution.width < 900 ? 94 : 58;
  const campaignScale = resolution.width < 640 ? Math.min(1, (resolution.width - 32) / CAMPAIGN_THEATRE_LAYOUT.width) : 1;
  const panelX = Math.max(16, Math.round((resolution.width - CAMPAIGN_THEATRE_LAYOUT.width * campaignScale) / 2));
  const panelY = Math.max(topHeight + 18, Math.round((resolution.height - CAMPAIGN_THEATRE_LAYOUT.height * campaignScale) / 2));
  const ashenOathPoint = {
    x: panelX + 120 * campaignScale,
    y:
      panelY +
      (CAMPAIGN_THEATRE_LAYOUT.scenarioFirstRowY +
        CAMPAIGN_THEATRE_LAYOUT.scenarioCardHeight +
        CAMPAIGN_THEATRE_LAYOUT.scenarioRowGap +
        CAMPAIGN_THEATRE_LAYOUT.scenarioCardHeight / 2) *
        campaignScale
  };
  const rivalDoctrinePoint = {
    x: panelX + 234 * campaignScale,
    y: panelY + (CAMPAIGN_THEATRE_LAYOUT.difficultyY + 2) * campaignScale
  };

  await page.mouse.click(
    bounds.x + (ashenOathPoint.x / resolution.width) * bounds.width,
    bounds.y + (ashenOathPoint.y / resolution.height) * bounds.height
  );
  await page.mouse.click(
    bounds.x + (rivalDoctrinePoint.x / resolution.width) * bounds.width,
    bounds.y + (rivalDoctrinePoint.y / resolution.height) * bounds.height
  );
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("ASHEN OATH reign begins");
}

async function clickCanvasPoint(page: Page, point: { x: number; y: number }): Promise<void> {
  const canvas = page.locator("canvas");
  const bounds = await canvas.boundingBox();
  if (!bounds) {
    throw new Error("Tactical canvas did not expose a layout box.");
  }
  const resolution = await canvas.evaluate((element: HTMLCanvasElement) => ({ width: element.width, height: element.height }));
  await page.mouse.click(
    bounds.x + (point.x / resolution.width) * bounds.width,
    bounds.y + (point.y / resolution.height) * bounds.height
  );
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
  await expect(page.locator("canvas")).toHaveAttribute("data-campaign-phase", "theatre");
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", "The Last Lesson Campaign Theatre selection");
  expect(await page.locator("canvas").getAttribute("aria-keyshortcuts")).toContain("Control+9");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest[.]webmanifest$/);
  await page.waitForTimeout(800);
  await expectRenderedCanvas(page);
  await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.ready).active));
  await beginCrownfallRivalReign(page);
  await expect(page.locator("canvas")).toHaveAttribute("data-campaign-phase", "tactical");
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", "The Last Lesson tactical map and command interface");
  expect(await page.locator("canvas").getAttribute("aria-keyshortcuts")).toContain("D");
  await page.locator("canvas").press("D");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Accord panel expanded");
  await expect.poll(() => assetUrls.some((url) => url.endsWith("painterly-battlefield-v1.webp"))).toBe(true);
  await expect.poll(() => assetUrls.some((url) => url.endsWith("building-atlas-v1.webp"))).toBe(true);
  await expect.poll(() => assetUrls.some((url) => url.endsWith("campaign-theatres-v1.webp"))).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("navigates Campaign Theatre with the keyboard before beginning a reign", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await canvas.focus();

  await canvas.press("ArrowRight");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Chapter 2, RIVERGATE");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Terrain: NAVIGABLE RIVER // SUPPLY & WARSHIPS");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Opening: Commission a supply wagon and secure the river route");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Honor: TIDECALLER. Win with a Crown Warship afloat");
  await canvas.press("Enter");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("RIVERGATE selected");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Terrain: NAVIGABLE RIVER // SUPPLY & WARSHIPS");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Opening: Commission a supply wagon and secure the river route");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Honor: TIDECALLER. Win with a Crown Warship afloat");

  await canvas.press("ArrowDown");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Chapter 4, STONEWALL");
  await canvas.press("Tab");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Begin DISCIPLE");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Measured opening. The rival learns slowly from each exchange");
  await canvas.press("Tab");
  await canvas.press("Tab");
  await canvas.press("Enter");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("RIVERGATE reign begins");
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

test("renders the compact tactical HUD at tablet width", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/");
  await beginCrownfallRivalReign(page);
  await page.waitForTimeout(800);
  await expect(page.locator("canvas")).toHaveAttribute("data-campaign-phase", "tactical");
  await expectRenderedCanvas(page);
  expect(pageErrors).toEqual([]);
});

test("zooms the continuous tactical map around the player's cursor", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await beginCrownfallRivalReign(page);

  const canvas = page.locator("canvas");
  const bounds = await canvas.boundingBox();
  if (!bounds) {
    throw new Error("Tactical canvas did not expose a layout box.");
  }
  const before = await canvas.screenshot();
  await page.mouse.move(bounds.x + bounds.width * 0.52, bounds.y + bounds.height * 0.48);
  await page.mouse.wheel(0, -360);
  await page.waitForTimeout(100);
  const after = await canvas.screenshot();

  expect(after.equals(before)).toBe(false);
});

test("clears management chrome in Field view and restores it for a panel shortcut", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await beginCrownfallRivalReign(page);

  const canvas = page.locator("canvas");
  await canvas.focus();
  await canvas.press("h");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Heir panel expanded");

  await canvas.press("z");
  await expect(canvas).toHaveAttribute("data-tactical-presentation", "field");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Field view enabled");

  await canvas.press("b");
  await expect(canvas).toHaveAttribute("data-tactical-presentation", "command");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Build panel expanded");
});

test("pans the battlefield with middle-mouse drag and Field-view edge scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await beginCrownfallRivalReign(page);

  const canvas = page.locator("canvas");
  const bounds = await canvas.boundingBox();
  if (!bounds) {
    throw new Error("Tactical canvas did not expose a layout box.");
  }

  const beforeDrag = await canvas.screenshot();
  await page.mouse.move(bounds.x + bounds.width * 0.62, bounds.y + bounds.height * 0.52);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(bounds.x + bounds.width * 0.48, bounds.y + bounds.height * 0.42, { steps: 6 });
  await page.mouse.up({ button: "middle" });
  await page.waitForTimeout(80);
  const afterDrag = await canvas.screenshot();
  expect(afterDrag.equals(beforeDrag)).toBe(false);

  await canvas.focus();
  await canvas.press("z");
  const beforeEdgeScroll = await canvas.screenshot();
  await page.mouse.move(bounds.x + bounds.width - 2, bounds.y + bounds.height * 0.5);
  await page.waitForTimeout(180);
  const afterEdgeScroll = await canvas.screenshot();
  expect(afterEdgeScroll.equals(beforeEdgeScroll)).toBe(false);
});

test("surfaces and resolves Ashen Oath's opening civic crisis", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await beginAshenOathRivalReign(page);
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("MEND CROWNKEEP: END THE PLAGUE");

  await page.locator("canvas").press("c");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Mend Settlement petitioned");
});

test("exports a portable reign archive from the Book of Lessons", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await beginCrownfallRivalReign(page);
  await clickCanvasPoint(page, { x: 249, y: 29 });
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Book of Lessons opened");

  const resolution = await page.locator("canvas").evaluate((element: HTMLCanvasElement) => ({
    width: element.width,
    height: element.height
  }));
  const topHeight = resolution.width < 640 ? 122 : resolution.width < 900 ? 94 : 58;
  const bookScale = resolution.width < 640 ? Math.min(1, (resolution.width - 32) / 470) : 1;
  const bookPanelX = Math.max(16, Math.round((resolution.width - 470 * bookScale) / 2));
  const bookPanelY = Math.max(topHeight + 18, Math.round((resolution.height - BOOK_PANEL_HEIGHT * bookScale) / 2));

  const download = page.waitForEvent("download");
  await clickCanvasPoint(page, {
    x: bookPanelX + 120 * bookScale,
    y: bookPanelY + 421 * bookScale
  });

  await expect((await download).suggestedFilename()).toMatch(/^the-last-lesson-crownfall-tick-\d+\.tll$/);
});

test("exports a local playtest record from the Book of Lessons", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await beginCrownfallRivalReign(page);
  await clickCanvasPoint(page, { x: 249, y: 29 });
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Book of Lessons opened");

  const download = page.waitForEvent("download");
  await page.locator("canvas").press("6");
  const recordDownload = await download;
  expect(recordDownload.suggestedFilename()).toMatch(/^the-last-lesson-crownfall-tick-\d+\.playtest\.json$/);
  const recordPath = await recordDownload.path();
  if (!recordPath) {
    throw new Error("Playtest record download did not expose a local path.");
  }
  const record = JSON.parse(await readFile(recordPath, "utf8")) as {
    format: string;
    scenarioId: string;
    rivalDifficulty: string;
    eventCounts: Record<string, number>;
  };

  expect(record).toMatchObject({
    format: "the-last-lesson-playtest-record",
    scenarioId: "crownfall",
    rivalDifficulty: "rival"
  });
  expect(typeof record.eventCounts).toBe("object");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Local playtest record exported");
});

test("selects a visible building shortcut from the expanded Build palette", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await beginCrownfallRivalReign(page);

  await page.locator("canvas").press("b");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Build panel expanded");
  await page.locator("canvas").press("1");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Construction ready: Villa");
});

test("requests browser fullscreen from the wide tactical header", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => {
    Reflect.set(window, "__tllFullscreenRequests", 0);
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: () => {
        const requestCount = Number(Reflect.get(window, "__tllFullscreenRequests") ?? 0);
        Reflect.set(window, "__tllFullscreenRequests", requestCount + 1);
        return Promise.resolve();
      }
    });
  });
  await page.goto("/");
  await beginCrownfallRivalReign(page);

  await clickCanvasPoint(page, { x: 786, y: 29 });
  await expect.poll(() => page.evaluate(() => Number(Reflect.get(window, "__tllFullscreenRequests") ?? 0))).toBe(1);
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Fullscreen");
});

test("reserves fullscreen for headers with room for tactical resources", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.addInitScript(() => {
    Reflect.set(window, "__tllFullscreenRequests", 0);
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: () => {
        const requestCount = Number(Reflect.get(window, "__tllFullscreenRequests") ?? 0);
        Reflect.set(window, "__tllFullscreenRequests", requestCount + 1);
        return Promise.resolve();
      }
    });
  });
  await page.goto("/");
  await beginCrownfallRivalReign(page);

  await clickCanvasPoint(page, { x: 786, y: 29 });
  await expect.poll(() => page.evaluate(() => Number(Reflect.get(window, "__tllFullscreenRequests") ?? 0))).toBe(0);
});

test("aligns visible wide-header controls with their pointer hit areas", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await beginCrownfallRivalReign(page);

  await clickCanvasPoint(page, { x: 468, y: 29 });
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Simulation paused");

  await clickCanvasPoint(page, { x: 548, y: 29 });
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Simulation speed set to 2X");

  await clickCanvasPoint(page, { x: 718, y: 29 });
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Tactical sound disabled");
});

test("uses contextual keyboard actions from the Heir and Accord panels", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await beginCrownfallRivalReign(page);

  const canvas = page.locator("canvas");
  await canvas.focus();
  await canvas.press("h");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Heir panel expanded");
  await canvas.press("1");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("no lesson to reward");

  await page.goto("/");
  await beginAshenOathRivalReign(page);
  await canvas.focus();
  await canvas.press("d");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Accord panel expanded");
  await canvas.press("1");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Prisoner accord proposed: 4 returned");
});

test("requires deliberate confirmation before clearing Book-local data", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await beginCrownfallRivalReign(page);
  await page.evaluate(() => window.localStorage.setItem("the-last-lesson.test-record", "clear-me"));
  await page.locator("canvas").press("l");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Book of Lessons opened");

  await page.locator("canvas").press("0");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("CONFIRM CLEAR DATA");
  expect(await page.evaluate(() => window.localStorage.getItem("the-last-lesson.test-record"))).toBe("clear-me");

  await page.locator("canvas").press("0");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Local records cleared");
  expect(await page.evaluate(() => window.localStorage.getItem("the-last-lesson.test-record"))).toBeNull();
  await expect(page.locator("canvas")).toHaveAttribute("data-campaign-phase", "tactical");
});

test("restores an exported portable reign archive through the Book of Lessons", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await beginCrownfallRivalReign(page);
  await clickCanvasPoint(page, { x: 249, y: 29 });

  const resolution = await page.locator("canvas").evaluate((element: HTMLCanvasElement) => ({
    width: element.width,
    height: element.height
  }));
  const topHeight = resolution.width < 640 ? 122 : resolution.width < 900 ? 94 : 58;
  const bookScale = resolution.width < 640 ? Math.min(1, (resolution.width - 32) / 470) : 1;
  const bookPanelX = Math.max(16, Math.round((resolution.width - 470 * bookScale) / 2));
  const bookPanelY = Math.max(topHeight + 18, Math.round((resolution.height - BOOK_PANEL_HEIGHT * bookScale) / 2));

  const download = page.waitForEvent("download");
  await clickCanvasPoint(page, {
    x: bookPanelX + 120 * bookScale,
    y: bookPanelY + 421 * bookScale
  });
  const archive = await download;
  const archivePath = await archive.path();
  if (!archivePath) {
    throw new Error("Portable save download did not expose a local path.");
  }

  const chooser = page.waitForEvent("filechooser");
  await clickCanvasPoint(page, {
    x: bookPanelX + 350 * bookScale,
    y: bookPanelY + 421 * bookScale
  });
  await (await chooser).setFiles(archivePath);

  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Portable reign restored");
  await expect(page.locator("#the-last-lesson-portable-save-input")).toHaveCount(0);
});

test("rejects a malformed portable archive without replacing the reign", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await beginCrownfallRivalReign(page);
  await clickCanvasPoint(page, { x: 249, y: 29 });

  const resolution = await page.locator("canvas").evaluate((element: HTMLCanvasElement) => ({
    width: element.width,
    height: element.height
  }));
  const bookPanelX = Math.max(16, Math.round((resolution.width - 470) / 2));
  const bookPanelY = Math.max(58 + 18, Math.round((resolution.height - BOOK_PANEL_HEIGHT) / 2));
  const chooser = page.waitForEvent("filechooser");
  await clickCanvasPoint(page, { x: bookPanelX + 350, y: bookPanelY + 421 });
  await (await chooser).setFiles({
    name: "broken-reign.tll",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"not-a-portable-save"}')
  });

  await expect(page.locator("#the-last-lesson-announcements")).toContainText("could not be restored");
  await expect(page.locator("#the-last-lesson-portable-save-input")).toHaveCount(0);
});

test("pauses a local reign when the tactical map is hidden", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await beginCrownfallRivalReign(page);

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden"
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("paused while the field map was out of view");

  await page.locator("canvas").press("Space");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Simulation resumed");
});

test("uses the system reduced-motion preference until the player overrides it", async ({ page }) => {
  await page.addInitScript(() => {
    window.matchMedia = ((query: string) =>
      ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false
      }) as MediaQueryList) as typeof window.matchMedia;
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await beginCrownfallRivalReign(page);
  await clickCanvasPoint(page, { x: 249, y: 29 });

  const resolution = await page.locator("canvas").evaluate((element: HTMLCanvasElement) => ({
    width: element.width,
    height: element.height
  }));
  const bookPanelX = Math.max(16, Math.round((resolution.width - 470) / 2));
  const bookPanelY = Math.max(58 + 18, Math.round((resolution.height - BOOK_PANEL_HEIGHT) / 2));
  await clickCanvasPoint(page, { x: bookPanelX + 235, y: bookPanelY + 553 });

  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Full motion enabled");
});

test("offers a persistent high-contrast presentation mode without changing the reign", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await beginCrownfallRivalReign(page);

  const canvas = page.locator("canvas");
  await canvas.press("x");

  await expect(page.locator("#the-last-lesson-announcements")).toContainText("High contrast enabled");
  await expect(canvas).toHaveAttribute("data-contrast-mode", "high");
  await expect(canvas).toHaveClass(/the-last-lesson--high-contrast/);

  await canvas.press("x");
  await expect(page.locator("#the-last-lesson-announcements")).toContainText("Standard contrast enabled");
  await expect(canvas).toHaveAttribute("data-contrast-mode", "standard");
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
