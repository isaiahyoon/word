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

test("loads another search batch when the results panel scrolls to the bottom", async ({ page }) => {
  await page.goto("/");
  await page.locator("#verse-1").waitFor();
  const searchInput = page.locator("#search-input");
  const results = page.locator(".search-result");
  const searchResults = page.locator("#search-results");

  await searchInput.fill("john");
  await expect(results).toHaveCount(12);

  await searchResults.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect(page.locator("#search-results")).toBeVisible();
  await expect(searchInput).toHaveAttribute("aria-expanded", "true");
  await expect(results).toHaveCount(24);

  await searchResults.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(results).toHaveCount(36);
  await expect(page.locator(".search-summary")).toContainText("130 verses found · Showing 36");

  await searchInput.fill("John 3:16");
  await expect(results).toHaveCount(1);
});

test("loads another search batch from a mobile touch scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#verse-1").waitFor();
  await page.locator("#search-input").fill("john");
  await expect(page.locator(".search-result")).toHaveCount(12);

  const searchResults = page.locator("#search-results");
  const bounds = await searchResults.boundingBox();
  expect(bounds).not.toBeNull();

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  const x = Math.round(bounds.x + bounds.width / 2);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 1, x, y: Math.round(bounds.y + bounds.height - 24) }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ id: 1, x, y: Math.round(bounds.y + 24) }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await session.detach();

  await expect(page.locator(".search-result")).toHaveCount(24);
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