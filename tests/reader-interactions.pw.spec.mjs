import { expect, test } from "@playwright/test";

test("centers the chapter picker within a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kjv/b/john/c/3/v/16");
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

test("frames the testament tabs and gives the active tab a raised finish", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  const tabs = page.locator(".testament-tabs");
  const activeTab = page.locator('.testament-tab[aria-selected="true"]');

  await expect(tabs).toHaveCSS("border-top-color", "rgba(169, 124, 53, 0.4)");
  await expect(tabs).toHaveCSS("box-shadow", /169, 124, 53/);
  await expect(activeTab).toHaveCSS("border-top-color", "rgba(169, 124, 53, 0.35)");
  await expect(activeTab).toHaveCSS("box-shadow", /223, 198, 129/);
});

test("uses a yellow-pink gradient for focused verses", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  const verse = page.locator("#verse-16");
  await expect(verse).toHaveClass(/is-focused/);
  await expect(verse).toHaveCSS("animation-name", "none");
  const highlight = await verse.evaluate((element) => ({
    animation: getComputedStyle(element, "::before").animationName,
    radius: getComputedStyle(element, "::before").borderRadius,
    gradient: getComputedStyle(element, "::before").backgroundImage,
  }));
  expect(highlight.animation).toBe("verse-glow");
  expect(highlight.radius).toBe("6px");
  expect(highlight.gradient).toContain("rgb(255, 254, 207)");
  expect(highlight.gradient).toContain("rgb(250, 212, 224)");
});

test("renders edition-colored dotted scripture pages without mobile overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kjv/b/john/c/3/v/16");
  const verseList = page.locator("#verse-list");
  const getPageStyle = () => verseList.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      dot: style.getPropertyValue("--journal-dot").trim(),
      paper: style.getPropertyValue("--journal-paper").trim(),
      background: style.backgroundImage,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    };
  });

  const kjvPage = await getPageStyle();
  expect(kjvPage.background).toContain("radial-gradient");
  expect(kjvPage.background).toContain("linear-gradient");
  expect(kjvPage.background).not.toContain("189, 121, 152");
  expect(kjvPage.paper).toBe("#f6f5ff");
  expect(kjvPage.scrollWidth).toBe(kjvPage.clientWidth);

  await page.locator("#menu-toggle").click();
  await page.locator("#edition-select").click();
  await page.locator("#edition-option-krv").click();
  await expect(page.locator("body")).toHaveClass(/is-krv-edition/);
  const krvPage = await getPageStyle();
  expect(krvPage.paper).toBe("#f1faf5");
  expect(krvPage.dot).not.toBe(kjvPage.dot);
  expect(krvPage.background).not.toContain("196, 123, 139");
  expect(krvPage.scrollWidth).toBe(krvPage.clientWidth);
});

test("styles the active book row with a metallic blue finish", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  const activeBook = page.locator('.book-row[aria-current="page"]');
  const style = await activeBook.evaluate((element) => ({
    background: getComputedStyle(element).backgroundImage,
    shadow: getComputedStyle(element).boxShadow,
    text: getComputedStyle(element).color,
  }));
  expect(style.background).toContain("linear-gradient");
  expect(style.background).toContain("rgb(223, 198, 129)");
  expect(style.shadow).toContain("49, 88, 99");
  expect(style.text).toBe("rgb(34, 59, 85)");
});

test("styles the active Diodati book row with a rose gradient", async ({ page }) => {
  await page.goto("/diodati/b/genesis/c/1/v/1");
  const activeBook = page.locator('.book-row[aria-current="page"]');
  const style = await activeBook.evaluate((element) => ({
    background: getComputedStyle(element).backgroundImage,
    shadow: getComputedStyle(element).boxShadow,
    text: getComputedStyle(element).color,
  }));
  expect(style.background).toContain("linear-gradient");
  expect(style.background).toContain("rgb(239, 205, 216)");
  expect(style.shadow).toContain("103, 66, 81");
  expect(style.text).toBe("rgb(64, 53, 62)");
});

test("selecting a chapter focuses verse one for arrow navigation", async ({ page }) => {
  await page.goto("/kjv/b/1-kings/c/18/v/2");
  await page.locator("#chapter-select").click();
  await page.locator('#chapter-options-list [data-chapter="9"]').click();

  await expect(page).toHaveURL(/\/kjv\/b\/1-kings\/c\/9\/v\/1$/);
  await expect(page.locator("#verse-1")).toBeFocused();

  await page.keyboard.press("ArrowDown");

  await expect(page).toHaveURL(/\/kjv\/b\/1-kings\/c\/9\/v\/2$/);
  await expect(page.locator("#verse-2")).toHaveClass(/is-focused/);
});

test("renders the wordmark with a muted brass body and navy outline", async ({ page }) => {
  await page.goto("/");
  const wordmark = page.locator(".brand-copy strong");
  await page.locator(".brand").hover();
  await expect(wordmark).toHaveCSS("-webkit-text-stroke-color", "rgb(34, 59, 85)");
  await expect(wordmark).toHaveCSS("-webkit-text-stroke-width", "0.45px");

  const fill = await wordmark.evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(fill).toContain("linear-gradient");
  expect(fill).toContain("rgb(188, 162, 106)");
  await expect.poll(() => wordmark.evaluate((element) =>
    getComputedStyle(element, "::after").animationName,
  )).toBe("text-glimmer");
});

test("accents the four-color brand mark without changing its spin", async ({ page }) => {
  await page.goto("/");
  const mark = page.locator(".brand-mark");
  const tiles = mark.locator("i");
  await expect(tiles).toHaveCount(4);
  expect(await tiles.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundColor))).toEqual([
    "rgb(222, 254, 252)",
    "rgb(220, 215, 247)",
    "rgb(250, 212, 224)",
    "rgb(214, 242, 185)",
  ]);
  expect(await tiles.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).borderTopLeftRadius))).toEqual([
    "5px",
    "1.5px",
    "1.5px",
    "1.5px",
  ]);
  await expect(tiles.first()).toHaveCSS("border-top-color", "rgba(34, 59, 85, 0.52)");
  expect(await tiles.first().evaluate((element) => getComputedStyle(element).boxShadow)).toContain("169, 124, 53");

  await mark.hover();
  await expect(mark).toHaveCSS("animation-name", "logo-spin-settle");
});

test("keeps shortcut keycaps inside the dialog on short mobile screens", async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 650 });
  await page.goto("/kjv/b/john/c/3/v/16");
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

test("shines shortcut keycaps on hover", async ({ page }) => {
  await page.goto("/");
  await page.locator("#shortcuts-open").click();
  const keycap = page.locator(".shortcut-row kbd").first();
  await keycap.hover();

  await expect.poll(() => keycap.evaluate((element) =>
    getComputedStyle(element, "::after").animationName,
  )).toBe("shortcut-keycap-glint");
});

test("keeps all editable text fields at 16px on touch devices", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const textControls = page.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]');
  const fontSizes = await textControls.evaluateAll((elements) => elements.map((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize),
  ));
  expect(fontSizes.length).toBeGreaterThan(0);
  expect(fontSizes.every((size) => size >= 16)).toBe(true);
});

test("frames the shortcut question mark and styles the close control on hover", async ({ page }) => {
  await page.goto("/");
  const shortcutButton = page.locator("#shortcuts-open");
  const questionMark = shortcutButton.locator("span").first();
  await expect(questionMark).toHaveCSS("border-top-width", "1px");
  await expect(questionMark).toHaveCSS("border-top-color", "rgb(183, 147, 82)");

  await shortcutButton.hover();
  await expect(questionMark).toHaveCSS("border-top-color", "rgb(110, 159, 168)");
  await expect(questionMark).toHaveCSS("box-shadow", /169, 124, 53/);

  await shortcutButton.click();
  const closeButton = page.locator("#shortcuts-close");
  await closeButton.hover();
  await expect(closeButton).toHaveCSS("border-radius", "50%");
  await expect(closeButton).toHaveCSS("border-top-color", "rgb(169, 124, 53)");
  await expect(closeButton).toHaveCSS("box-shadow", /169, 124, 53/);
});

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
    await expect(results.first()).toContainText(`EXACT PASSAGE · ${reference}`);
  }
});

test("prioritizes Korean book, chapter, and exact-verse suggestions", async ({ page }) => {
  await page.goto("/krv");
  await page.locator("#verse-1").waitFor();
  const searchInput = page.locator("#search-input");
  const firstResult = page.locator(".search-result").first();

  await searchInput.fill("요한복음");
  await expect(firstResult).toHaveAttribute("data-search-type", "book");
  await expect(firstResult).toContainText("BOOK · 요한복음");

  await searchInput.fill("요한복음 1장");
  await expect(firstResult).toHaveAttribute("data-search-type", "chapter");
  await expect(firstResult).toContainText("CHAPTER · 요한복음 1");

  await searchInput.fill("요한");
  await expect(firstResult).toHaveAttribute("data-search-type", "book");
  await expect(firstResult).toContainText("BOOK · 요한복음");
  await expect(page.locator(".search-result--navigation")).toHaveCount(5);

  await searchInput.fill("요한복음 １：１");
  await expect(firstResult).toHaveAttribute("data-search-type", "reference");
  await expect(firstResult).toContainText("EXACT PASSAGE · 요한복음 1:1");
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
  await page.locator("#verse-16").waitFor();
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

test("switches editions at the same passage and canonicalizes legacy KJV links", async ({ page }) => {
  await page.goto("/b/john/c/3/v/16");
  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/16$/);

  await page.goto("/b/john/3/16");
  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "en");

  await page.locator("#edition-select").click();
  await expect(page.locator("#edition-options")).toBeVisible();
  await page.locator("#edition-option-krv").click();
  await expect(page).toHaveURL(/\/krv\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#edition-options")).toBeHidden();
  await expect.poll(() => page.locator("#reader").evaluate((reader) =>
    reader.getAnimations().some((animation) => animation.effect.getTiming().duration === 620),
  )).toBe(true);
  await expect(page.locator("#verse-16")).toBeFocused();
  await page.reload();
  await expect(page).toHaveURL(/\/krv\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("body")).toHaveClass(/is-krv-edition/);
  await expect.poll(() => page.locator("body").evaluate((element) =>
    getComputedStyle(element, "::before").opacity,
  )).toBe("1");
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "ko");
  await expect(page.locator("#verse-16 .verse-text")).toContainText("하나님이 세상을 이처럼 사랑하사");
  await expect(page.locator("#verse-16 .verse-text")).toHaveJSProperty("lang", "ko");
  expect(await page.locator("#verse-16 .verse-text").evaluate((element) =>
    getComputedStyle(element).fontFamily.includes("Helvetica Neue"),
  )).toBe(true);
  expect(await page.locator(".edition-trigger-label").evaluate((element) =>
    getComputedStyle(element).fontFamily.includes("Noto Serif KR"),
  )).toBe(true);
  expect(await page.locator(".book-name").first().evaluate((element) =>
    getComputedStyle(element).fontFamily.includes("Noto Serif KR"),
  )).toBe(true);
  expect(await page.locator(".chapter-option").first().evaluate((element) =>
    getComputedStyle(element).fontFamily.includes("Noto Serif KR"),
  )).toBe(true);
  await expect(page.locator("#edition-attribution")).toContainText("대한성서공회");

  await page.keyboard.press("ArrowDown");
  await expect(page).toHaveURL(/\/krv\/b\/john\/c\/3\/v\/17$/);
  await expect(page.locator("#verse-17")).toHaveClass(/is-focused/);

  await page.locator("#edition-select").click();
  await page.locator("#edition-option-kjv").click();
  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/17$/);
  await expect(page.locator("body")).not.toHaveClass(/is-krv-edition/);
  await expect.poll(() => page.locator("body").evaluate((element) =>
    getComputedStyle(element, "::before").opacity,
  )).toBe("0");
  await expect(page.locator("#verse-16 .verse-text")).toContainText("For God so loved the world");
  await expect(page.locator("#edition-attribution")).toBeHidden();

  await page.locator("#edition-select").click();
  await page.locator("#edition-option-luther1912").click();
  await expect(page).toHaveURL(/\/licht\/b\/john\/c\/3\/v\/17$/);
  await expect(page.locator("body")).toHaveClass(/is-luther1912-edition/);
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "de");
  await expect(page.locator("#verse-17 .verse-text")).toContainText("Denn Gott hat seinen Sohn nicht gesandt");
});

test("renders the KRV brand before its scripture index finishes loading", async ({ page }) => {
  await page.route("**/scripture/krv/index.json", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });

  await page.goto("/krv/b/john/c/3/v/16", { waitUntil: "domcontentloaded" });

  await expect(page.locator("#brand-edition-primary")).toHaveText("개역한글");
  await expect(page.locator("#brand-edition-secondary")).toHaveText("1961");
  await expect(page.locator("#brand-edition-primary")).not.toHaveText("KING JAMES");
  await expect(page.locator("#verse-16 .verse-text")).toContainText("하나님이 세상을 이처럼 사랑하사");
});

test("uses a compact JAP edition code while keeping the full Bungo name", async ({ page }) => {
  await page.goto("/japbungo");
  await expect(page.locator("#edition-select-code")).toHaveText("JAP");
  await expect(page.locator("#edition-select-label")).toHaveText("Bungo-yaku · 日本語");

  await page.locator("#edition-select").click();
  await expect(page.locator("#edition-option-japbungo .edition-option-mark")).toHaveText("JAP");
  await expect(page.locator("#edition-option-japbungo .edition-option-description small")).toHaveText("Bungo-yaku (文語訳)");
});

test("loads Diodati with the DIO code, Italian typography, and pink theme", async ({ page }) => {
  await page.goto("/diodati/b/genesis/c/1/v/1");

  await expect(page).toHaveURL(/\/diodati\/b\/genesis\/c\/1\/v\/1$/);
  await expect(page.locator("#edition-select-code")).toHaveText("DIO");
  await expect(page.locator("#edition-select-label")).toHaveText("Diodati · Italiano");
  await page.locator("#edition-select").click();
  await expect(page.locator("#edition-option-diodati .edition-option-mark")).toHaveText("DIO");
  await expect(page.locator("#edition-option-diodati .edition-option-description small")).toHaveText("Giovanni Diodati (1649)");
  await page.locator("#edition-select").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(page.locator("body")).toHaveClass(/is-diodati-edition/);
  await expect(page.locator("#verse-1 .verse-text")).toContainText("NEL principio Iddio creò il cielo e la terra.");
  expect(await page.locator("#verse-1 .verse-text").evaluate((element) =>
    getComputedStyle(element).fontFamily.includes("Cormorant Garamond"),
  )).toBe(true);
  expect(await page.locator("body").evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--canvas").trim(),
  )).toBe("#f8edf1");
  expect(await page.locator("body").evaluate((element) =>
    getComputedStyle(element, "::before").backgroundImage.includes("linear-gradient"),
  )).toBe(true);

  const searchInput = page.locator("#search-input");
  const firstResult = page.locator("#search-results .search-result").first();
  await searchInput.fill("Gene");
  await expect(firstResult).toHaveAttribute("data-search-type", "book");
  await expect(firstResult).toContainText("BOOK · Genesi");

  await searchInput.fill("Genesi 1");
  await expect(firstResult).toHaveAttribute("data-search-type", "chapter");
  await expect(firstResult).toContainText("CHAPTER · Genesi 1");

  await searchInput.fill("Genesi 1:1");
  await expect(firstResult).toHaveAttribute("data-search-type", "reference");
  await expect(firstResult).toContainText("EXACT PASSAGE · Genesi 1:1");
  await firstResult.click();
  await expect(page).toHaveURL(/\/diodati\/b\/genesis\/c\/1\/v\/1$/);

  await searchInput.fill("principo cielo");
  const fuzzyResult = page.locator("#search-results .search-result").filter({ hasText: "Genesi 1:1" });
  await expect(fuzzyResult).toHaveCount(1);
  await expect(fuzzyResult).toContainText("NEL principio");
});

test("loads Luther with the LUX code, German search, and yellow-red theme", async ({ page }) => {
  await page.goto("/licht/b/genesis/c/1/v/1");

  await expect(page).toHaveURL(/\/licht\/b\/genesis\/c\/1\/v\/1$/);
  await expect(page.locator("#edition-select-code")).toHaveText("LUX");
  await expect(page.locator("#edition-select-label")).toHaveText("Lutherbibel · Licht im Wort");
  await page.locator("#edition-select").click();
  await expect(page.locator("#edition-option-luther1912 .edition-option-mark")).toHaveText("LUX");
  await expect(page.locator("#edition-option-luther1912 .edition-option-description small")).toHaveText("Luther Bible (1912)");
  await page.locator("#edition-select").click();

  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.locator("body")).toHaveClass(/is-luther1912-edition/);
  await expect(page.locator("#verse-1 .verse-text")).toHaveText("Am Anfang schuf Gott Himmel und Erde.");
  await expect(page.locator("#edition-attribution a")).toHaveAttribute(
    "href",
    "https://ebible.org/details.php?id=deu1912",
  );
  expect(await page.locator("#verse-1 .verse-text").evaluate((element) =>
    getComputedStyle(element).fontFamily.includes("Gelasio"),
  )).toBe(true);
  expect(await page.locator("body").evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--canvas").trim(),
  )).toBe("#fff8df");
  const backdrop = await page.locator("body").evaluate((element) =>
    getComputedStyle(element, "::before").backgroundImage,
  );
  expect(backdrop).toContain("linear-gradient");
  expect(backdrop).toContain("185, 83, 75");

  const searchInput = page.locator("#search-input");
  const firstResult = page.locator("#search-results .search-result").first();
  await searchInput.fill("1 Mo");
  await expect(firstResult).toHaveAttribute("data-search-type", "book");
  await expect(firstResult).toContainText("BOOK · 1 Mose");

  await searchInput.fill("Johannes 3");
  await expect(firstResult).toHaveAttribute("data-search-type", "chapter");
  await expect(firstResult).toContainText("CHAPTER · Johannes 3");

  await searchInput.fill("Johannes 3:16");
  await expect(firstResult).toHaveAttribute("data-search-type", "reference");
  await expect(firstResult).toContainText("EXACT PASSAGE · Johannes 3:16");
  await firstResult.click();
  await expect(page).toHaveURL(/\/licht\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#verse-16 .verse-text")).toContainText("Also hat Gott die Welt geliebt");

  await searchInput.fill("wüst schwebte");
  await expect(page.locator("#search-results .search-result").filter({ hasText: "1 Mose 1:2" }).first())
    .toContainText("wüst und leer");

  await searchInput.fill("Anfangg Erde");
  await expect(page.locator("#search-results .search-result").filter({ hasText: "1 Mose 1:1" }))
    .toHaveCount(1);
});

test("supports Japanese JapBungo search", async ({ page }) => {
  await page.goto("/japbungo");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator("body")).toHaveClass(/is-japbungo-edition/);
  await page.locator("#search-input").fill("ニコデモ");
  await expect(page.locator("#search-results .search-result").first()).toContainText("ニコデモ");
});

test("labels and copies Korean JapBungo fallback verses", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const fallbackCases = [
    ["exodus", 7, 25, true],
    ["2-samuel", 19, 25, true],
    ["2-chronicles", 2, 13, true],
    ["3-john", 1, 15, false],
  ];

  for (const [book, chapter, verse, hasKJVReference] of fallbackCases) {
    await page.goto(`/japbungo/b/${book}/c/${chapter}/v/${verse}`);
    const fallbackText = page.locator(`#verse-${verse} .verse-text`);
    await expect(fallbackText).toHaveAttribute("lang", "ko");
    const krvFallback = fallbackText.locator(".verse-source-panel--krv");
    await expect(krvFallback.locator(".verse-source-label")).toHaveText("KRV fallback");
    await expect(krvFallback).toHaveCSS("background-image", /linear-gradient/);
    const koreanVerse = (await krvFallback.locator(".verse-source-panel-text").textContent()).trim();
    const kjvReference = fallbackText.locator(".verse-kjv-reference");
    let englishVerse = "";
    if (hasKJVReference) {
      await expect(kjvReference).toHaveAttribute("lang", "en");
      await expect(kjvReference.locator(".verse-kjv-reference-label")).toHaveText("KJV reference");
      await expect(kjvReference).toHaveCSS("background-color", "rgb(246, 244, 249)");
      await expect(kjvReference).toHaveCSS("font-family", /Gelasio/);
      englishVerse = (await kjvReference.locator(".verse-source-panel-text").textContent()).trim();
    } else {
      await expect(kjvReference).toHaveCount(0);
    }

    await page.locator(`#verse-${verse}`).click();
    await page.locator("#copy-selected-verses").click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("[KRV fallback]");
    const copiedText = await page.evaluate(() => navigator.clipboard.readText());
    const citation = copiedText.split("\n\n").at(-1);
    const expectedVerseText = hasKJVReference
      ? `${koreanVerse} [KRV fallback]\n\n${englishVerse} [KJV reference]`
      : `${koreanVerse} [KRV fallback]`;
    expect(copiedText).toBe(`"${expectedVerseText}"\n\n${citation}`);
    expect(citation).toMatch(/^- .+ \d+:\d+$/u);
  }
});

test("routes an edition-only URL to Genesis 1:1 in that edition", async ({ page }) => {
  await page.goto("/krv");

  await expect(page).toHaveURL(/\/krv\/?$/);
  await expect(page.locator("body")).toHaveClass(/is-krv-edition/);
  await expect(page.locator("#verse-1 .verse-text")).toContainText("태초에 하나님이 천지를 창조하시니라");

  await page.goto("/diodati");
  await expect(page).toHaveURL(/\/diodati\/?$/);
  await expect(page.locator("body")).toHaveClass(/is-diodati-edition/);
  await expect(page.locator("#verse-1 .verse-text")).toContainText("NEL principio Iddio creò il cielo e la terra.");

  await page.goto("/licht");
  await expect(page).toHaveURL(/\/licht\/?$/);
  await expect(page.locator("body")).toHaveClass(/is-luther1912-edition/);
  await expect(page.locator("#verse-1 .verse-text")).toContainText("Am Anfang schuf Gott Himmel und Erde.");
});

test("omits 3 John 1:15 from the KJV edition", async ({ page }) => {
  await page.goto("/kjv/b/3-john/c/1");
  await expect(page.locator("#verse-14")).toBeVisible();
  await expect(page.locator("#verse-15")).toHaveCount(0);

  await page.goto("/kjv/b/3-john/c/1/v/15");
  await expect(page).toHaveTitle("Page Not Found — The Word");
});

test("supports keyboard navigation in the edition menu", async ({ page }) => {
  await page.goto("/");
  const trigger = page.locator("#edition-select");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#edition-options")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#edition-option-krv")).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/krv\/b\/genesis\/c\/1\/v\/1$/);
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "ko");
});

test("selects Diodati from the edition menu with the keyboard", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#edition-select").focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#edition-option-diodati")).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/diodati\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "it");
  await expect(page.locator("#edition-select-code")).toHaveText("DIO");
});

test("selects Luther from the edition menu with the keyboard", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#edition-select").focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#edition-option-luther1912")).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/licht\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "de");
  await expect(page.locator("#edition-select-code")).toHaveText("LUX");
});

test("Escape from the edition menu returns focus to the verse for arrow navigation", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  const trigger = page.locator("#edition-select");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#edition-options")).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(page.locator("#edition-options")).toBeHidden();
  await expect(page.locator("#verse-16")).toBeFocused();
  await page.keyboard.press("ArrowDown");

  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/17$/);
  await expect(page.locator("#verse-17")).toHaveClass(/is-focused/);
});

test("keeps the mobile navigation drawer open and focused after switching to KRV", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#menu-toggle").click();
  await page.locator("#edition-select").click();
  await page.locator("#edition-option-krv").click();

  await expect(page).toHaveURL(/\/krv\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#sidebar")).toHaveClass(/is-open/);
  await expect(page.locator('.book-row[aria-current="page"]')).toBeFocused();
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "ko");
  await expect(page.locator("#verse-16 .verse-text")).toContainText("하나님이 세상을 이처럼 사랑하사");
});

test("opens the mobile navigation drawer with a right swipe from the left edge", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#verse-1").waitFor();

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  const dispatchTouch = (type, x, y) => session.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: type === "touchEnd" ? [] : [{ id: 1, x, y }],
  });

  await dispatchTouch("touchStart", 5, 280);
  await dispatchTouch("touchMove", 85, 286);
  await dispatchTouch("touchMove", 155, 290);
  await dispatchTouch("touchEnd", 155, 290);

  await expect(page.locator("#sidebar")).toHaveClass(/is-open/);
  await expect(page.locator("#sidebar-scrim")).toHaveClass(/is-open/);
  await expect(page.locator("#menu-toggle")).toHaveAttribute("aria-expanded", "true");
  await session.detach();
});

test("closes the mobile navigation drawer with a left swipe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#menu-toggle").click();
  await expect(page.locator("#sidebar")).toHaveClass(/is-open/);
  await expect.poll(() => page.locator("#sidebar").evaluate((element) =>
    getComputedStyle(element).transform,
  )).toBe("matrix(1, 0, 0, 1, 0, 0)");

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  const dispatchTouch = (type, x, y) => session.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: type === "touchEnd" ? [] : [{ id: 1, x, y }],
  });

  await dispatchTouch("touchStart", 260, 350);
  await dispatchTouch("touchMove", 180, 354);
  await dispatchTouch("touchMove", 100, 358);
  await dispatchTouch("touchEnd", 100, 358);

  await expect(page.locator("#sidebar")).not.toHaveClass(/is-open/);
  await expect(page.locator("#sidebar-scrim")).not.toHaveClass(/is-open/);
  await expect(page.locator("#menu-toggle")).toHaveAttribute("aria-expanded", "false");
  await session.detach();
});

test("shows a back-to-top button on mobile and desktop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#verse-1").waitFor();
  const scrollToTop = page.locator("#scroll-to-top");

  await expect(scrollToTop).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(scrollToTop).toBeVisible();
  await scrollToTop.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(scrollToTop).toBeHidden();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(scrollToTop).toBeVisible();
  await scrollToTop.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(scrollToTop).toBeHidden();
});

for (const viewport of [
  { width: 390, height: 844, label: "mobile" },
  { width: 1280, height: 900, label: "desktop" },
]) {
  for (const [edition, routeSegment] of [["kjv", "kjv"], ["diodati", "diodati"], ["luther1912", "licht"]]) {
    test(`toggles independent verse selections on ${viewport.label} in ${edition}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`/${routeSegment}/b/john/c/3/v/16`);
      const passageUrl = (verse) => new RegExp(`/${routeSegment}/b/john/c/3/v/${verse}$`);
      await page.locator("#verse-17").click();
      await expect(page).toHaveURL(passageUrl(17));
      await page.locator("#verse-21").click();

      await expect(page).toHaveURL(passageUrl(21));
      await expect(page.locator("#verse-17")).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#verse-21")).toHaveAttribute("aria-pressed", "true");
      const copyControl = page.locator("#copy-selected-verses");
      const clearControl = page.locator("#clear-selected-verses");
      await expect(copyControl).toHaveText("Copy 2 verses");
      await expect(copyControl).toBeVisible();
      await expect(clearControl).toBeVisible();
      const bounds = await copyControl.boundingBox();
      const viewportBounds = page.viewportSize();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewportBounds.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewportBounds.height);

      await page.locator("#verse-17").click();
      await expect(page).toHaveURL(passageUrl(17));
      await expect(page.locator("#verse-17")).toHaveAttribute("aria-pressed", "false");
      await expect(copyControl).toHaveText("Copy 1 verse");
      await page.locator("#verse-21").click();
      await expect(page).toHaveURL(passageUrl(21));
      await expect(copyControl).toBeHidden();
      await expect(clearControl).toBeHidden();

      await page.locator("#verse-17").click();
      await page.locator("#verse-21").click();
      await clearControl.click();
      await expect(page.locator("#verse-17")).toHaveAttribute("aria-pressed", "false");
      await expect(page.locator("#verse-21")).toHaveAttribute("aria-pressed", "false");
      await expect(copyControl).toBeHidden();
      await expect(clearControl).toBeHidden();
    });
  }
}

test("copies consecutive verses on every edition as separate lines with a compressed citation", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const editions = [
    ["kjv", "John"],
    ["krv", "요한복음"],
    ["diodati", "Giovanni"],
    ["licht", "Johannes"],
    ["japbungo", "ヨハネの福音書"],
  ];

  for (const [edition, displayBook] of editions) {
    await page.goto(`/${edition}/b/john/c/3/v/16`);
    const verses = [16, 17, 18];
    const expectedLines = await Promise.all(verses.map(async (number) =>
      (await page.locator(`#verse-${number} .verse-text`).textContent()).trim(),
    ));

    for (const number of verses) await page.locator(`#verse-${number}`).click();
    await page.locator("#copy-selected-verses").click();

    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`"${expectedLines.join("\n\n")}"\n\n- ${displayBook} 3:16-18`);
  }
});

test("copies selected verses with Command+C", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/isaiah/c/3/v/10");
  const verses = [21, 10];
  const expectedText = (await Promise.all(verses.map(async (number) => ({
    number,
    text: await page.locator(`#verse-${number} .verse-text`).textContent(),
  })))).sort((left, right) => left.number - right.number).map((verse) => verse.text).join("\n\n");

  for (const number of verses) await page.locator(`#verse-${number}`).click();
  await page.keyboard.press("Meta+C");

  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`"${expectedText}"\n\n- Isaiah 3:10, 21`);
});

test("copies selected verses with Control+C", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/isaiah/c/3/v/10");
  const verses = [21, 10];
  const expectedText = (await Promise.all(verses.map(async (number) => ({
    number,
    text: await page.locator(`#verse-${number} .verse-text`).textContent(),
  })))).sort((left, right) => left.number - right.number).map((verse) => verse.text).join("\n\n");

  for (const number of verses) await page.locator(`#verse-${number}`).click();
  await page.keyboard.press("Control+C");

  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`"${expectedText}"\n\n- Isaiah 3:10, 21`);
});

test("fills the currently focused verse when it is selected for copying", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  const focusedVerse = page.locator("#verse-16");
  const otherVerse = page.locator("#verse-17");
  await otherVerse.click();
  await focusedVerse.click();

  await expect(focusedVerse).toHaveAttribute("aria-pressed", "true");
  await expect(focusedVerse).toHaveCSS("background-color", "rgba(169, 124, 53, 0.09)");
  await expect(otherVerse).toHaveCSS("background-color", "rgba(169, 124, 53, 0.09)");
});

test("copies staggered verses in chapter order with separated reference ranges", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/isaiah/c/3/v/10");
  const verses = [22, 10, 21];
  const expectedText = (await Promise.all(verses.map(async (number) => ({
    number,
    text: await page.locator(`#verse-${number} .verse-text`).textContent(),
  })))).sort((left, right) => left.number - right.number).map((verse) => verse.text).join("\n\n");

  for (const number of verses) await page.locator(`#verse-${number}`).click();
  await page.locator("#copy-selected-verses").click();

  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`"${expectedText}"\n\n- Isaiah 3:10, 21-22`);
});

for (const viewport of [
  { width: 390, height: 844, label: "mobile" },
  { width: 1280, height: 900, label: "desktop" },
]) {
  test(`links Buy Me a Coffee directly from the footer on ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    const supportLink = page.locator(".site-footer-coffee");

    await expect(supportLink).toBeVisible();
    await expect(supportLink).toHaveAttribute("href", "https://buymeacoffee.com/isaiahyoon");
    await expect(supportLink).toHaveAttribute("target", "_blank");
    await expect(supportLink).toHaveAttribute("rel", "noopener noreferrer");
    await expect(page.locator('script[data-name="BMC-Widget"]')).toHaveCount(0);
    const footerLinks = page.locator(".site-footer a");
    await expect(footerLinks.locator(".external-link-icon svg")).toHaveCount(3);
    expect((await footerLinks.allTextContents()).join(" ")).not.toContain("↗");
    const iconGaps = await footerLinks.evaluateAll((links) => links.map((link) => {
      const label = link.querySelector(".footer-link-label").getBoundingClientRect();
      const icon = link.querySelector(".external-link-icon svg").getBoundingClientRect();
      return icon.left - label.right;
    }));
    expect(iconGaps).toEqual([4, 4, 4]);
  });
}

for (const shortcut of ["Meta+X", "Control+X"]) {
  test(`copies and clears selected verses with ${shortcut}`, async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/kjv/b/isaiah/c/3/v/10");
    const verses = [21, 10];
    const expectedText = (await Promise.all(verses.map(async (number) => ({
      number,
      text: await page.locator(`#verse-${number} .verse-text`).textContent(),
    })))).sort((left, right) => left.number - right.number).map((verse) => verse.text).join("\n\n");

    for (const number of verses) await page.locator(`#verse-${number}`).click();
    await page.keyboard.press(shortcut);

    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`"${expectedText}"\n\n- Isaiah 3:10, 21`);
    await expect(page.locator("#verse-10")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#verse-21")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#verse-actions")).toBeHidden();
  });
}

test("uses the Korean UI font for KRV bottom chapter navigation", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  const kjvFont = await page.locator("#bottom-next strong").evaluate((element) =>
    getComputedStyle(element).fontFamily,
  );

  await page.goto("/krv/b/john/c/3/v/16");
  const krvTitle = page.locator("#bottom-next strong");
  await expect(krvTitle).toHaveCSS("font-family", /Noto Serif KR/);
  const krvFont = await krvTitle.evaluate((element) => getComputedStyle(element).fontFamily);

  expect(kjvFont).toContain("Gelasio");
  expect(krvFont).not.toBe(kjvFont);
});

test("styles the optional-passage checkbox and feedback exit control", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#feedback-open").click();
  const passageOption = page.locator(".feedback-passage-option");
  const checkbox = page.locator("#feedback-include-passage");
  const closeButton = page.locator("#feedback-close");

  await expect(passageOption).toHaveCSS("border-radius", "5px");
  await expect(passageOption).toHaveCSS("background-image", /linear-gradient/);
  await checkbox.check();
  await expect(passageOption).toHaveCSS("border-top-color", "rgba(49, 88, 99, 0.42)");
  await expect(checkbox).toHaveCSS("appearance", "none");
  await expect(checkbox).toHaveCSS("border-top-color", "rgb(49, 88, 99)");

  await closeButton.hover();
  await expect(closeButton).toHaveCSS("border-radius", "50%");
  await expect(closeButton).toHaveCSS("border-top-color", "rgb(223, 198, 129)");
  await expect(closeButton).toHaveCSS("box-shadow", /72, 65, 99/);
});

test("submits the URL-focused feedback passage only by consent", async ({ page }) => {
  let submittedForm;
  await page.route("**/*", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    submittedForm = new URLSearchParams(route.request().postData() ?? "");
    await route.fulfill({ status: 200, contentType: "text/plain", body: "ok" });
  });
  await page.goto("/kjv/b/john/c/3/v/16-17");
  await page.locator("#feedback-open").click();

  const dialog = page.locator("#feedback-dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#feedback-include-passage")).not.toBeChecked();
  await expect(page.locator("#feedback-category-trigger")).toBeFocused();
  await page.locator("#feedback-close").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/16-17$/);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.locator("#feedback-open").click();
  await page.locator("#feedback-message").fill("The KRV page feels lovely on mobile.");
  await page.locator("#feedback-submit").click();
  await expect(page.locator("#feedback-category-error")).toBeVisible();
  await expect(page.locator("#feedback-category-trigger")).toHaveAttribute("aria-invalid", "true");

  const categoryTrigger = page.locator("#feedback-category-trigger");
  const categoryOptions = page.locator("#feedback-category-options");
  await categoryTrigger.click();
  await expect(categoryOptions).toBeVisible();
  await expect(categoryOptions).toHaveCSS("background-color", "rgb(255, 254, 240)");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(categoryTrigger).toContainText("A bright idea");
  await expect(categoryOptions).toBeHidden();
  await page.locator("#feedback-include-passage").check();
  await page.locator("#feedback-submit").click();

  await expect(page.locator("#feedback-success")).toBeVisible();
  expect(submittedForm.get("form-name")).toBe("reader-feedback");
  expect(submittedForm.get("category")).toBe("idea");
  expect(submittedForm.get("message")).toBe("The KRV page feels lovely on mobile.");
  expect(submittedForm.get("email")).toBe("");
  expect(submittedForm.get("passage")).toBe("John 3:16-17");
  expect(submittedForm.get("bot-field")).toBe("");
});