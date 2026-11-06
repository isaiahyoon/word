import { expect, test } from "./support/browser-test.mjs";

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

  await page.goto("/alm");
  await expect(page).toHaveURL(/\/alm\/?$/);
  await expect(page.locator("body")).toHaveClass(/is-alm1911-edition/);
  await expect(page.locator("#verse-1 .verse-text")).toContainText("No principio creou Deus os céus e a terra.");
});

test("omits 3 John 1:15 from the KJV edition", async ({ page }) => {
  await page.goto("/kjv/b/3-john/c/1");
  await expect(page.locator("#verse-14")).toBeVisible();
  await expect(page.locator("#verse-15")).toHaveCount(0);

  await page.goto("/kjv/b/3-john/c/1/v/15");
  await expect(page).toHaveTitle("Page Not Found — The Amazing Word");
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
  await expect(page.locator("#verse-list")).not.toHaveAttribute("aria-busy", "true");
  await expect(page.locator("#edition-select")).toBeEnabled();
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

test("keeps the mobile navigation drawer above the verse action buttons", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#verse-16").click();
  await expect(page.locator("#verse-actions")).toHaveClass(/is-visible/);

  await page.locator("#menu-toggle").click();
  await expect(page.locator("#sidebar")).toHaveClass(/is-open/);
  await expect.poll(() => page.locator("#sidebar").evaluate((element) =>
    getComputedStyle(element).transform,
  )).toBe("matrix(1, 0, 0, 1, 0, 0)");

  const topElementIsDrawer = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("#verse-actions > button")];
    const sidebar = document.querySelector("#sidebar");
    const scrim = document.querySelector("#sidebar-scrim");
    return buttons.every((button) => {
      const box = button.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return sidebar.contains(top) || top === scrim;
    });
  });
  expect(topElementIsDrawer).toBe(true);
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
  test(`keeps the back-to-top button in place when selecting verses on ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/kjv/b/john/c/3/v/16");
    const scrollToTop = page.locator("#scroll-to-top");

    await page.evaluate(() => window.scrollTo(0, 800));
    await expect(scrollToTop).toBeVisible();
    const positionBeforeSelection = await scrollToTop.boundingBox();
    await page.locator("#verse-16").click();
    await expect(page.locator("#verse-actions")).toBeVisible();
    const positionAfterSelection = await scrollToTop.boundingBox();

    expect(positionAfterSelection.x).toBe(positionBeforeSelection.x);
    expect(positionAfterSelection.y).toBe(positionBeforeSelection.y);
  });
}

test("Space jumps to the top and is listed with a rainbow keycap", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await page.locator("#verse-1").waitFor();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(420);

  await expect(async () => {
    await page.keyboard.press("Space");
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  }).toPass();
  await expect(page.locator("#verse-1")).toHaveAttribute("aria-pressed", "false");

  await page.locator("#shortcuts-open").click();
  const row = page.locator(".shortcut-row--scroll-top");
  await expect(row.locator("kbd")).toHaveText("Space");
  await expect(row.locator("span")).toHaveText("Jump to top");
  const background = await row.locator("kbd").evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(background.match(/rgb\(/g)).toHaveLength(6);
});

test("Space still activates focused buttons instead of scrolling", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await page.locator("#verse-1").waitFor();
  await page.locator("#shortcuts-open").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#shortcuts-dialog")).toHaveAttribute("open", "");
});

test("restores reading position and selected verses across reloads", async ({ page }) => {
  await page.goto("/krv/b/john/c/3/v/16");
  await page.locator("#verse-17").click();
  await page.locator("#verse-21").click();

  await page.reload();
  await expect(page).toHaveURL(/\/krv\/b\/john\/c\/3\/v\/21$/);
  await expect(page.locator("body")).toHaveClass(/is-krv-edition/);
  await expect(page.locator("#verse-17")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#verse-21")).toHaveAttribute("aria-pressed", "true");

  await page.goto("/");
  await expect(page.locator("#heading-book")).toHaveText("요한복음");
  await expect(page.locator("#heading-chapter")).toHaveText("3");
  await expect(page.locator("body")).toHaveClass(/is-krv-edition/);
  await expect(page.locator("#verse-17")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#verse-21")).toHaveAttribute("aria-pressed", "true");

  await page.goto("/diodati/b/psalms/c/3/v/1");
  await expect(page.locator("body")).toHaveClass(/is-diodati-edition/);
  await expect(page.locator("#heading-book")).toHaveText("Salmi");
  await expect(page.locator("#verse-1")).toHaveAttribute("aria-pressed", "false");
});

for (const viewport of [
  { width: 390, height: 844, label: "mobile" },
  { width: 1280, height: 900, label: "desktop" },
]) {
  for (const [edition, routeSegment] of [["kjv", "kjv"], ["diodati", "diodati"], ["luther1912", "licht"], ["alm1911", "alm"]]) {
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
      const copyLabels = {
        kjv: { two: "Copy 2 verses", one: "Copy 1 verse" },
        diodati: { two: "Copia 2 versetti", one: "Copia 1 versetto" },
        luther1912: { two: "2 Verse kopieren", one: "1 Vers kopieren" },
        alm1911: { two: "Copiar 2 versículos", one: "Copiar 1 versículo" },
      }[edition];
      await expect(copyControl).toHaveText(copyLabels.two);
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
      await expect(copyControl).toHaveText(copyLabels.one);
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

for (const viewport of [
  { width: 320, height: 568, label: "narrow mobile" },
  { width: 390, height: 844, label: "mobile" },
  { width: 1280, height: 900, label: "desktop" },
]) {
  test(`cuts selected verses from the action button without overlap on ${viewport.label}`, async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/kjv/b/john/c/3/v/16");
    const verse = page.locator("#verse-16");
    const verseText = (await verse.locator(".verse-text").textContent()).trim();
    await verse.click();
    await page.evaluate(() => window.scrollTo(0, 800));

    const cutControl = page.locator("#cut-selected-verses");
    const copyControl = page.locator("#copy-selected-verses");
    const shareControl = page.locator("#share-selected-verses");
    const clearControl = page.locator("#clear-selected-verses");
    const scrollToTop = page.locator("#scroll-to-top");
    await expect(cutControl).toBeVisible();
    await expect(scrollToTop).toBeVisible();
    await expect(clearControl).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");

    const cutBounds = await cutControl.boundingBox();
    const copyBounds = await copyControl.boundingBox();
    const shareBounds = await shareControl.boundingBox();
    const clearBounds = await clearControl.boundingBox();
    const topBounds = await scrollToTop.boundingBox();
    const viewportBounds = page.viewportSize();
    expect(copyBounds.y).toBeCloseTo(cutBounds.y, 0);
    expect(copyBounds.x + copyBounds.width).toBeLessThanOrEqual(shareBounds.x + 2);
    expect(shareBounds.x + shareBounds.width).toBeLessThanOrEqual(cutBounds.x + 2);
    expect(cutBounds.x + cutBounds.width).toBeLessThanOrEqual(clearBounds.x + 2);
    const actionsBounds = await page.locator("#verse-actions").boundingBox();
    const overlaps = topBounds.x < actionsBounds.x + actionsBounds.width &&
      topBounds.x + topBounds.width > actionsBounds.x &&
      topBounds.y < actionsBounds.y + actionsBounds.height &&
      topBounds.y + topBounds.height > actionsBounds.y;
    expect(overlaps).toBe(false);
    for (const bounds of [cutBounds, copyBounds, shareBounds, clearBounds]) {
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewportBounds.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewportBounds.height);
    }

    expect(clearBounds.x + clearBounds.width).toBeCloseTo(topBounds.x + topBounds.width, 0);

    await cutControl.click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`"${verseText}"\n\n- John 3:16`);
    await expect(verse).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#verse-actions")).toBeHidden();
  });
}
