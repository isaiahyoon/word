import { expect, test } from "./support/browser-test.mjs";

test("uses the picker root to distinguish inside and outside clicks", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#chapter-picker").evaluate((root) => {
    root.id = "custom-picker-root";
  });
  await page.locator("#chapter-select").click();
  await expect(page.locator(".chapter-popover")).toBeVisible();

  await page.locator("body").click({ position: { x: 2, y: 2 } });

  await expect(page.locator(".chapter-popover")).toBeHidden();
});

test("loads another search batch when the results panel scrolls to the bottom", async ({ page }) => {
  const searchCases = [
    ["kjv", "john", "John 3:16", "130 verses found · Showing 36"],
    ["diodati", "Iddio", "Giovanni 3:16", null],
  ];

  for (const [edition, query, reference, expectedSummary] of searchCases) {
    await page.goto(`/${edition}`);
    await page.locator("#verse-1").waitFor();
    const searchInput = page.locator("#search-input");
    const results = page.locator(".search-result");
    const searchResults = page.locator("#search-results");

    await searchInput.fill(query);
    await expect(results).toHaveCount(12);

    await searchResults.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await expect(page.locator("#search-results")).toBeVisible();
    await expect(searchInput).toHaveAttribute("aria-expanded", "true");
    await expect(results).toHaveCount(24);

    if (expectedSummary) {
      await searchResults.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect(results).toHaveCount(36);
      await expect(page.locator(".search-summary")).toContainText(expectedSummary);
    }

    await searchInput.fill(reference);
    await expect(results.first()).toHaveAttribute("data-search-type", "reference");
    const exactPassageLabel = edition === "diodati" ? "BRANO ESATTO" : "EXACT PASSAGE";
    await expect(results.first()).toContainText(`${exactPassageLabel} · ${reference}`);
  }
});

test("prioritizes Korean book, chapter, and exact-verse suggestions", async ({ page }) => {
  await page.goto("/krv");
  await page.locator("#verse-1").waitFor();
  const searchInput = page.locator("#search-input");
  const firstResult = page.locator(".search-result").first();

  await searchInput.fill("요한복음");
  await expect(firstResult).toHaveAttribute("data-search-type", "book");
  await expect(firstResult).toContainText("책 · 요한복음");

  await searchInput.fill("요한복음 1장");
  await expect(firstResult).toHaveAttribute("data-search-type", "chapter");
  await expect(firstResult).toContainText("장 · 요한복음 1장");

  await searchInput.fill("요한");
  await expect(firstResult).toHaveAttribute("data-search-type", "book");
  await expect(firstResult).toContainText("책 · 요한복음");
  await expect(page.locator(".search-result--navigation")).toHaveCount(5);

  await searchInput.fill("요한복음 １：１");
  await expect(firstResult).toHaveAttribute("data-search-type", "reference");
  await expect(firstResult).toContainText("정확한 본문 · 요한복음 1:1");
  await firstResult.click();
  await expect(page).toHaveURL(/\/krv\/b\/john\/c\/1\/v\/1$/);

  await searchInput.fill("하느님");
  const normalizedKoreanMatch = page.locator(".search-result mark").filter({ hasText: /하나님/ }).first();
  await expect(normalizedKoreanMatch).toBeVisible();
});

test("finds separated and misspelled words and highlights the matched verse terms", async ({ page }) => {
  await page.goto("/");
  await page.locator("#verse-1").waitFor();
  const searchInput = page.locator("#search-input");

  await searchInput.fill("piercing sword");
  let result = page.locator(".search-result").filter({ hasText: "Hebrews 4:12" });
  await expect(result).toHaveCount(1);
  await expect(result.locator("mark")).toHaveText(["sword", "piercing"]);

  await searchInput.fill("piercin sword");
  result = page.locator(".search-result").filter({ hasText: "Hebrews 4:12" });
  await expect(result).toHaveCount(1);
  await expect(result.locator("mark")).toHaveText(["sword", "piercing"]);
});

test("highlights the first search result and opens it with Enter", async ({ page }) => {
  await page.goto("/");
  await page.locator("#verse-1").waitFor();
  const searchInput = page.locator("#search-input");
  const firstResult = page.locator(".search-result").first();

  await searchInput.fill("piercing sword");
  await expect(firstResult).toContainText("Isaiah 27:1");
  await expect(firstResult).toHaveAttribute("aria-selected", "true");
  await expect(searchInput).toHaveAttribute("aria-activedescendant", "search-result-0");

  await searchInput.press("Enter");
  await expect(page).toHaveURL(/\/kjv\/b\/isaiah\/c\/27\/v\/1$/);
});

for (const openWith of ["Enter", "click"]) {
  test(`Tab cycles editions after opening a search result with ${openWith}`, async ({ page }) => {
    await page.goto("/");
    await page.locator("#verse-1").waitFor();
    const searchInput = page.locator("#search-input");

    await searchInput.fill("piercing sword");
    await expect(page.locator(".search-result").first()).toContainText("Isaiah 27:1");
    if (openWith === "Enter") await searchInput.press("Enter");
    else await page.locator(".search-result").first().click();
    await expect(page).toHaveURL(/\/kjv\/b\/isaiah\/c\/27\/v\/1$/);
    await expect(searchInput).not.toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page).toHaveURL(/\/krv\/b\/isaiah\/c\/27\/v\/1$/);
    await expect(page.locator(".search-results")).toBeHidden();
    await expect(searchInput).toHaveValue("");

    await page.keyboard.press("Shift+Tab");
    await expect(page).toHaveURL(/\/kjv\/b\/isaiah\/c\/27\/v\/1$/);
    await expect(page.locator(".search-results")).toBeHidden();
    await expect(searchInput).not.toBeFocused();
  });
}

test("Cmd+K scrolls all the way to the top when the focused search bar is offscreen", async ({ page }) => {
  await page.goto("/");
  const searchInput = page.locator("#search-input");
  await searchInput.focus();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(searchInput).not.toBeInViewport();

  await page.keyboard.press("Meta+k");

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(searchInput).toBeFocused();
  await expect(searchInput).toBeInViewport();
  const searchBox = page.locator(".search-box");
  await expect(searchBox).toHaveCSS("animation-name", "search-focus-glow");
  await expect(searchBox).toHaveCSS("animation-iteration-count", "infinite");

  await searchInput.evaluate((input) => input.blur());
  await expect(searchBox).toHaveCSS("animation-name", "none");
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
    touchPoints: [{ id: 1, x, y: Math.round(bounds.y + bounds.height - 12) }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ id: 1, x, y: Math.max(1, Math.round(bounds.y - 120)) }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await session.detach();

  await expect(page.locator(".search-result")).toHaveCount(24);
});

test("refreshes the current passage only after a pull past the mobile threshold", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/kjv/b/john/c/3/v/16");
  await expect(page.locator("#verse-16")).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  const dispatchTouch = (type, y) => session.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: type === "touchEnd" ? [] : [{ id: 1, x: 5, y }],
  });

  await dispatchTouch("touchStart", 50);
  await dispatchTouch("touchMove", 90);
  await expect(page.locator("#pull-refresh-indicator")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#pull-refresh-label")).toHaveText("Pull down to refresh");
  await dispatchTouch("touchEnd", 90);
  await expect(page.locator("#pull-refresh-indicator")).toHaveAttribute("aria-hidden", "true");
  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/16$/);

  await dispatchTouch("touchStart", 50);
  await dispatchTouch("touchMove", 190);
  await expect(page.locator("#pull-refresh-label")).toHaveText("Release to refresh");
  const reloaded = page.waitForEvent("load");
  await dispatchTouch("touchEnd", 190);
  await reloaded;
  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/16$/);
  await session.detach();
});
