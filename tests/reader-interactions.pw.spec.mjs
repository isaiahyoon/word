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

test("routes an edition-only URL to Genesis 1:1 in that edition", async ({ page }) => {
  await page.goto("/krv");

  await expect(page).toHaveURL(/\/krv\/?$/);
  await expect(page.locator("body")).toHaveClass(/is-krv-edition/);
  await expect(page.locator("#verse-1 .verse-text")).toContainText("태초에 하나님이 천지를 창조하시니라");
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

for (const viewport of [
  { width: 390, height: 844, label: "mobile" },
  { width: 1280, height: 900, label: "desktop" },
]) {
  test(`toggles independent verse selections on ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/kjv/b/john/c/3/v/16");
    await page.locator("#verse-17").click();
    await page.locator("#verse-21").click();

    await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/16$/);
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
    await expect(page.locator("#verse-17")).toHaveAttribute("aria-pressed", "false");
    await expect(copyControl).toHaveText("Copy 1 verse");
    await page.locator("#verse-21").click();
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

test("copies consecutive verses as plain text with a compressed citation", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/john/c/3/v/16");
  const verses = [19, 17, 16, 18];
  const expectedText = (await Promise.all(verses.map(async (number) => ({
    number,
    text: await page.locator(`#verse-${number} .verse-text`).textContent(),
  })))).sort((left, right) => left.number - right.number).map((verse) => verse.text).join(" ");

  for (const number of verses) await page.locator(`#verse-${number}`).click();
  await page.locator("#copy-selected-verses").click();

  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`${expectedText}\n\n- John 3:16-19`);
});

test("copies selected verses with Command+C", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/isaiah/c/3/v/10");
  const verses = [21, 10];
  const expectedText = (await Promise.all(verses.map(async (number) => ({
    number,
    text: await page.locator(`#verse-${number} .verse-text`).textContent(),
  })))).sort((left, right) => left.number - right.number).map((verse) => verse.text).join(" ");

  for (const number of verses) await page.locator(`#verse-${number}`).click();
  await page.keyboard.press("Meta+C");

  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`${expectedText}\n\n- Isaiah 3:10, 21`);
});

test("copies selected verses with Control+C", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/isaiah/c/3/v/10");
  const verses = [21, 10];
  const expectedText = (await Promise.all(verses.map(async (number) => ({
    number,
    text: await page.locator(`#verse-${number} .verse-text`).textContent(),
  })))).sort((left, right) => left.number - right.number).map((verse) => verse.text).join(" ");

  for (const number of verses) await page.locator(`#verse-${number}`).click();
  await page.keyboard.press("Control+C");

  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`${expectedText}\n\n- Isaiah 3:10, 21`);
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
  })))).sort((left, right) => left.number - right.number).map((verse) => verse.text).join(" ");

  for (const number of verses) await page.locator(`#verse-${number}`).click();
  await page.locator("#copy-selected-verses").click();

  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`${expectedText}\n\n- Isaiah 3:10, 21-22`);
});

test("positions the Buy Me a Coffee widget on the left", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.locator('script[data-name="BMC-Widget"]')).toHaveAttribute("data-position", "Left");
  const position = await page.evaluate(() => {
    let widget = document.querySelector("#bmc-wbtn");
    const isTestWidget = !widget;
    if (!widget) {
      widget = document.createElement("div");
      widget.id = "bmc-wbtn";
      widget.style.cssText = "position: fixed; left: 1200px; right: 18px; width: 64px; height: 64px";
      document.body.append(widget);
    }
    const style = getComputedStyle(widget);
    const result = { left: style.left, bounds: widget.getBoundingClientRect().toJSON() };
    if (isTestWidget) widget.remove();
    return result;
  });
  expect(position.left).toBe("18px");
  expect(position.bounds.left).toBe(18);

  const formPosition = await page.evaluate(() => {
    let form = document.querySelector("#bmc-iframe");
    const isTestForm = !form;
    if (!form) {
      form = document.createElement("iframe");
      form.id = "bmc-iframe";
      form.style.cssText = "position: fixed; left: 1002px; right: 18px; width: 420px; height: 780px";
      document.body.append(form);
    }
    const style = getComputedStyle(form);
    const result = { left: style.left };
    if (isTestForm) form.remove();
    return result;
  });
  expect(formPosition.left).toBe("18px");
});

for (const shortcut of ["Meta+X", "Control+X"]) {
  test(`copies and clears selected verses with ${shortcut}`, async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/kjv/b/isaiah/c/3/v/10");
    const verses = [21, 10];
    const expectedText = (await Promise.all(verses.map(async (number) => ({
      number,
      text: await page.locator(`#verse-${number} .verse-text`).textContent(),
    })))).sort((left, right) => left.number - right.number).map((verse) => verse.text).join(" ");

    for (const number of verses) await page.locator(`#verse-${number}`).click();
    await page.keyboard.press(shortcut);

    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`${expectedText}\n\n- Isaiah 3:10, 21`);
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