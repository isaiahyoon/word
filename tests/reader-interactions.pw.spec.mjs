import { expect, test } from "@playwright/test";

test("centers the chapter picker within a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/b/john/c/3/v/16");
  await page.locator("#chapter-select").click();

  const popover = page.locator(".chapter-popover");
  await expect(popover).toBeVisible();
  await expect(popover).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");

  const [bounds, triggerBounds] = await Promise.all([
    popover.boundingBox(),
    page.locator("#chapter-select").boundingBox(),
  ]);
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(triggerBounds).not.toBeNull();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
  expect(Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2)).toBeLessThan(1);
  expect(Math.abs(bounds.y - triggerBounds.y - triggerBounds.height - 9)).toBeLessThan(1);
});

test("keeps shortcut keycaps inside the dialog on short mobile screens", async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 650 });
  await page.goto("/b/john/c/3/v/16");
  await page.locator("#shortcuts-open").click();

  const dialog = page.locator("#shortcuts-dialog");
  const lastKey = dialog.locator(".shortcut-row--shortcuts kbd");
  await lastKey.scrollIntoViewIfNeeded();

  const [dialogBounds, keyBounds, scrollTop] = await Promise.all([
    dialog.boundingBox(),
    lastKey.boundingBox(),
    dialog.evaluate((element) => element.scrollTop),
  ]);
  expect(dialogBounds).not.toBeNull();
  expect(keyBounds).not.toBeNull();
  expect(dialogBounds.y).toBeGreaterThanOrEqual(0);
  expect(dialogBounds.y + dialogBounds.height).toBeLessThanOrEqual(650);
  expect(keyBounds.y).toBeGreaterThanOrEqual(dialogBounds.y);
  expect(keyBounds.y + keyBounds.height).toBeLessThanOrEqual(dialogBounds.y + dialogBounds.height);
  expect(scrollTop).toBeGreaterThan(0);
});

test("uses the picker root to distinguish inside and outside clicks", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/b/john/c/3/v/16");
  await page.locator("#chapter-picker").evaluate((root) => {
    root.id = "custom-picker-root";
  });
  await page.locator("#chapter-select").click();
  await expect(page.locator(".chapter-popover")).toBeVisible();

  await page.locator("body").click({ position: { x: 2, y: 2 } });

  await expect(page.locator(".chapter-popover")).toBeHidden();
});

for (const viewport of [
  { width: 390, height: 844, label: "mobile" },
  { width: 1280, height: 900, label: "desktop" },
]) {
  test(`clicking a verse updates the URL and highlights it on ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/b/john/c/3/v/16");
    await page.locator("#verse-17").click();

    await expect(page).toHaveURL(/\/b\/john\/c\/3\/v\/17$/);
    await expect(page.locator("#verse-17")).toHaveClass(/is-focused/);
    await expect(page.locator("#verse-17")).toHaveCSS("animation-name", "verse-glow");
  });
}