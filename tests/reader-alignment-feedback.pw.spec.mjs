import { expect, test } from "./support/browser-test.mjs";
import { UI_LOCALES } from "../js/ui-locales.mjs";
import { EDITIONS } from "../js/editions.mjs";

for (const [source, chapter, verse, target] of [
  ["kjv", 13, 1, "martin1744"], ["moh", 13, 1, "kjv"],
  ["kjv", 12, 17, "japbungo"], ["japbungo", 12, 17, "kjv"],
  ["kjv", 13, 1, "japbungo"], ["japbungo", 13, 1, "kjv"],
  ["kjv", 12, 17, "krv"], ["krv", 12, 17, "kjv"],
  ["kjv", 13, 1, "krv"], ["krv", 13, 1, "kjv"],
]) {
  for (const action of ["copy", "share"]) {
    test(`blocks ${action} from ${source} Revelation ${chapter}:${verse} to ${target}`, async ({ page }) => {
      await page.addInitScript(() => {
        window.copyWrites = [];
        window.sharedPayloads = [];
        Object.defineProperty(navigator, "clipboard", {
          configurable: true, value: { writeText: async (text) => window.copyWrites.push(text) },
        });
        Object.defineProperty(navigator, "share", {
          configurable: true, value: async (payload) => window.sharedPayloads.push(payload),
        });
      });
      await page.goto(`/${source}/b/revelation/c/${chapter}/v/${verse}`);
      await page.locator(`#verse-${verse}`).click();
      await page.locator(`#${action}-selected-verses`).click();
      await page.locator(`#share-language-menu [data-edition='${target}']`).click();
      await expect(page.locator("#copy-status")).toBeVisible();
      await expect(page.locator("#copy-status")).not.toBeEmpty();
      expect(await page.evaluate(() => [window.copyWrites.length, window.sharedPayloads.length])).toEqual([0, 0]);
      await expect(page.locator(`#verse-${verse}`)).toHaveAttribute("aria-pressed", "true");
    });
  }
}

for (const [route, language] of [
  ["kjv", "en"], ["krv", "ko"], ["diodati", "it"], ["licht", "de"],
  ["japbungo", "ja"], ["moh", "fr"], ["luz", "es"], ["alm", "pt"],
]) {
  test(`shows localized alignment uncertainty for ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(`/${route}/b/john/c/3/v/16`);
    await page.locator("#verse-16").click();
    await page.locator("#copy-selected-verses").click();
    const menu = page.locator("#share-language-menu");
    await expect(menu.locator("#share-alignment-notice")).toHaveText(UI_LOCALES[language].alignmentNotice);
    await expect(menu).toHaveAttribute("aria-describedby", "share-alignment-notice");
    for (const edition of Object.values(EDITIONS)) {
      await expect(menu.locator(`[data-edition='${edition.id}'] .share-language-name`)).toHaveText(edition.languageName);
    }
    const menuBounds = await menu.boundingBox();
    const noticeBounds = await menu.locator("#share-alignment-notice").boundingBox();
    expect(noticeBounds.y).toBeGreaterThanOrEqual(menuBounds.y);
    expect(noticeBounds.y + noticeBounds.height).toBeLessThanOrEqual(menuBounds.y + menuBounds.height);
    const focusedBounds = await menu.locator("[aria-current]").boundingBox();
    expect(focusedBounds.y).toBeGreaterThanOrEqual(noticeBounds.y + noticeBounds.height);
  });
}

test("keeps safe adjacent verses and same-edition copying available", async ({ page }) => {
  await page.addInitScript(() => {
    window.copyWrites = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true, value: { writeText: async (text) => window.copyWrites.push(text) },
    });
  });
  await page.goto("/kjv/b/revelation/c/13/v/2");
  await page.locator("#verse-2").click();
  await page.locator("#copy-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='krv']").click();
  await expect.poll(() => page.evaluate(() => window.copyWrites.length)).toBe(1);
  await page.locator("#verse-1").click();
  await page.locator("#copy-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='krv']").click();
  await expect(page.locator("#copy-status")).toContainText("Nothing was copied or shared");
  expect(await page.evaluate(() => window.copyWrites.length)).toBe(1);
  await page.locator("#copy-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='kjv']").click();
  await expect.poll(() => page.evaluate(() => window.copyWrites.length)).toBe(2);
});

test("labels Almeida as Portuguese in both language menus", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#verse-16").click();
  for (const action of ["copy", "share"]) {
    await page.locator(`#${action}-selected-verses`).click();
    await expect(page.locator("#share-language-menu [data-edition='alm1911']"))
      .toHaveText("ALMPortuguês");
    await page.keyboard.press("Escape");
  }
});

test("keeps the warning menu and blocked-copy feedback visible and usable on desktop and mobile", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true, value: { writeText: async () => {} },
    });
  });
  for (const viewport of [
    { width: 320, height: 568 }, { width: 390, height: 844 },
    { width: 568, height: 320 }, { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/kjv/b/revelation/c/13/v/1");
    await page.locator("#verse-1").click();
    await page.locator("#copy-selected-verses").click();
    const menu = page.locator("#share-language-menu");
    const notice = menu.locator("#share-alignment-notice");
    await expect(notice).toBeVisible();
    const bounds = await menu.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    await expect(menu.locator("[data-edition='kjv']")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menu.locator("[data-edition='krv']")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    const lastOption = menu.locator("[data-edition='alm1911']");
    await expect(lastOption).toBeFocused();
    const lastBounds = await lastOption.boundingBox();
    const noticeBounds = await notice.boundingBox();
    expect(lastBounds.y).toBeGreaterThanOrEqual(noticeBounds.y + noticeBounds.height);
    expect(lastBounds.y + lastBounds.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    await page.keyboard.press("ArrowDown");
    await expect(menu.locator("[data-edition='kjv']")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await page.locator("#copy-selected-verses").click();
    await menu.locator("[data-edition='martin1744']").click();
    const status = page.locator("#copy-status");
    await expect(status).toBeVisible();
    await expect(status).toContainText("Nothing was copied or shared");
    const statusBounds = await status.boundingBox();
    expect(statusBounds.x).toBeGreaterThanOrEqual(0);
    expect(statusBounds.y).toBeGreaterThanOrEqual(0);
    expect(statusBounds.x + statusBounds.width).toBeLessThanOrEqual(viewport.width);
    expect(statusBounds.y + statusBounds.height).toBeLessThanOrEqual(viewport.height);
    await page.locator("#copy-selected-verses").click();
    await expect(status).toBeHidden();
    await page.keyboard.press("Escape");
    await page.locator("#clear-selected-verses").click();
  }
});
