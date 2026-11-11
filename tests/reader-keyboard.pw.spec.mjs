import { expect, test } from "./support/browser-test.mjs";
import { EDITIONS } from "../js/editions.mjs";

for (const edition of Object.values(EDITIONS)) {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`verse hotkeys keep the chapter mounted without scroll jumps in ${edition.id} at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/${edition.routeSegment}/b/psalms/c/119/v/80`);
      const verse = page.locator("#verse-80");
      await expect(verse).toHaveClass(/is-focused/);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await verse.evaluate((row) => row.scrollIntoView({ behavior: "instant", block: "center" }));
      const expectCentered = async (number) => {
        await expect.poll(() => page.locator(`#verse-${number}`).evaluate((row) => {
          const bounds = row.getBoundingClientRect();
          const style = getComputedStyle(row);
          const center = (window.innerHeight + parseFloat(style.scrollMarginTop) - parseFloat(style.scrollMarginBottom)) / 2;
          return Math.abs(bounds.top + bounds.height / 2 - center);
        })).toBeLessThan(16);
      };
      await expect(verse).toBeInViewport();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
      await page.emulateMedia({ reducedMotion: viewport.width === 390 ? "reduce" : "no-preference" });
      await verse.focus({ preventScroll: true });
      await verse.click();
      await expect(verse).toHaveAttribute("aria-pressed", "true");
      await page.evaluate(() => {
        const list = document.querySelector("#verse-list");
        const rows = [...list.querySelectorAll(".verse")];
        const probe = {
          rows,
          removed: 0,
          initialHeight: list.getBoundingClientRect().height,
          minimumHeight: list.getBoundingClientRect().height,
          minimumScroll: window.scrollY,
          initialScroll: window.scrollY,
        };
        window.verseNavigationProbe = probe;
        const observer = new MutationObserver((records) => {
          probe.removed += records.reduce((count, record) =>
            count + [...record.removedNodes].filter((node) => rows.includes(node)).length, 0);
          probe.minimumHeight = Math.min(probe.minimumHeight, list.getBoundingClientRect().height);
          probe.minimumScroll = Math.min(probe.minimumScroll, window.scrollY);
        });
        observer.observe(list, { childList: true });
      });

      for (const [key, number] of [["ArrowDown", 81], ["ArrowDown", 82], ["ArrowUp", 81]]) {
        await page.keyboard.press(key);
        await expect(page).toHaveURL(new RegExp(`/c/119/v/${number}$`));
        await expect(page.locator(".verse.is-focused")).toHaveCount(1);
        await expect(page.locator(`#verse-${number}`)).toHaveClass(/is-focused/);
        await expectCentered(number);
      }

      const result = await page.evaluate(() => {
        const probe = window.verseNavigationProbe;
        return {
          removed: probe.removed,
          heightLoss: probe.initialHeight - probe.minimumHeight,
          scrollDrop: probe.initialScroll - probe.minimumScroll,
          sameRows: probe.rows.every((row) => row.isConnected),
          savedVerse: JSON.parse(localStorage.getItem("the-word.reader-state.v1:/")).verse,
          selectedVerses: document.querySelectorAll(".verse[aria-pressed='true']").length,
        };
      });
      expect(result).toEqual({
        removed: 0,
        heightLoss: 0,
        scrollDrop: 0,
        sameRows: true,
        savedVerse: 81,
        selectedVerses: 0,
      });
      await page.goBack();
      await expect(page).toHaveURL(/\/c\/119\/v\/82$/);
      await expect(page.locator("#verse-82")).toHaveClass(/is-focused/);
    });
  }

  test(`verse hotkeys handle repeated keys, ranges, and chapter boundaries in ${edition.id}`, async ({ page }) => {
    await page.goto(`/${edition.routeSegment}/b/psalms/c/119/v/80-82`);
    await expect(page.locator(".verse.is-focused")).toHaveCount(3);
    await page.evaluate(() => {
      for (let index = 0; index < 8; index += 1) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      }
    });
    await expect(page).toHaveURL(/\/c\/119\/v\/88$/);
    await expect(page.locator(".verse.is-focused")).toHaveCount(1);
    await expect(page.locator("#verse-88")).toHaveClass(/is-focused/);

    await page.goto(`/${edition.routeSegment}/b/john/c/3/v/36`);
    await expect(page.locator("#verse-36")).toHaveClass(/is-focused/);
    await page.keyboard.press("ArrowDown");
    await expect(page).toHaveURL(/\/john\/c\/4\/v\/1$/);
    await expect(page.locator("#verse-1")).toHaveClass(/is-focused/);
    await page.keyboard.press("ArrowUp");
    await expect(page).toHaveURL(/\/john\/c\/3\/v\/36$/);
    await expect(page.locator("#verse-36")).toHaveClass(/is-focused/);
  });
}

test("cycles editions with Tab and Shift+Tab and wraps at both ends", async ({ page }) => {
  await page.goto("/");
  await page.locator("#verse-1").waitFor();
  await page.evaluate(() => document.activeElement?.blur());
  await expect.poll(() => page.evaluate(() => document.activeElement.tagName)).toBe("BODY");

  for (const [route, language] of [
    ["/krv", "ko"],
    ["/diodati", "it"],
    ["/licht", "de"],
    ["/japbungo", "ja"],
    ["/moh", "fr"],
    ["/luz", "es"],
    ["/alm", "pt"],
    ["/kjv", "en"],
  ]) {
    await page.keyboard.press("Tab");
    await expect(page).toHaveURL(new RegExp(`${route}/b/genesis/c/1/v/1$`));
    await expect(page.locator("#verse-list")).toHaveAttribute("lang", language);
    await expect.poll(() => page.evaluate(() => document.activeElement.tagName)).toBe("BODY");
  }

  for (const [route, language] of [
    ["/alm", "pt"],
    ["/luz", "es"],
    ["/moh", "fr"],
    ["/japbungo", "ja"],
    ["/licht", "de"],
    ["/diodati", "it"],
  ]) {
    await page.keyboard.press("Shift+Tab");
    await expect(page).toHaveURL(new RegExp(`${route}/b/genesis/c/1/v/1$`));
    await expect(page.locator("#verse-list")).toHaveAttribute("lang", language);
  }
});

test("styles edition cycling keycaps distinctly and preserves native Tab in controls", async ({ page }) => {
  await page.goto("/");
  await page.locator("#shortcuts-open").click();
  const nextRow = page.locator(".shortcut-row--edition-next");
  const previousRow = page.locator(".shortcut-row--edition-previous");
  const slashRow = page.locator(".shortcut-row--shortcuts");
  await expect(nextRow.locator("kbd")).toHaveText("Tab");
  await expect(previousRow.locator("kbd")).toHaveText("⇧ Tab");
  expect(await nextRow.evaluate((element) => element.nextElementSibling.classList.contains("shortcut-row--edition-previous"))).toBe(true);
  expect(await previousRow.evaluate((element) => element.nextElementSibling.classList.contains("shortcut-row--shortcuts"))).toBe(true);
  const nextKeyColor = await nextRow.locator("kbd").evaluate((element) => getComputedStyle(element).backgroundImage);
  const previousKeyColor = await previousRow.locator("kbd").evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(nextKeyColor).toContain("linear-gradient");
  expect(previousKeyColor).toContain("linear-gradient");
  expect(nextKeyColor).not.toBe(previousKeyColor);
  await page.locator("#shortcuts-close").click();
  await expect(slashRow).toHaveCount(1);
});

const pathname = (page) => () => new URL(page.url()).pathname;

test("Tab cycles editions from the focused search bar", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await page.locator("#verse-1").waitFor();
  await page.locator("#search-input").focus();

  await page.keyboard.press("Tab");
  await expect.poll(pathname(page)).toBe("/krv/b/genesis/c/1/v/1");
  await page.keyboard.press("Shift+Tab");
  await expect.poll(pathname(page)).toBe("/kjv/b/genesis/c/1/v/1");
});

test("Tab cycles editions and closes the open chapter picker", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await page.locator("#verse-1").waitFor();
  await page.locator("#chapter-select").click();
  await expect(page.locator("#chapter-select")).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Tab");
  await expect.poll(pathname(page)).toBe("/krv/b/genesis/c/1/v/1");
  await expect(page.locator("#chapter-select")).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Shift+Tab");
  await expect.poll(pathname(page)).toBe("/kjv/b/genesis/c/1/v/1");
});

test("Tab cycles editions and closes the open edition picker", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await page.locator("#verse-1").waitFor();
  await page.locator("#edition-select").click();
  await expect(page.locator("#edition-select")).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Tab");
  await expect.poll(pathname(page)).toBe("/krv/b/genesis/c/1/v/1");
  await expect(page.locator("#edition-select")).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Shift+Tab");
  await expect.poll(pathname(page)).toBe("/kjv/b/genesis/c/1/v/1");
});

test("keeps search and verses out of the Tab order", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await expect(page.locator("#search-input")).toHaveAttribute("tabindex", "-1");
  await expect(page.locator(".verse").first()).toHaveAttribute("tabindex", "-1");

  await page.locator("#verse-1").focus();
  await page.keyboard.press("Tab");
  await expect(page).toHaveURL(/\/krv\/b\/genesis\/c\/1\/v\/1$/);
  await page.keyboard.press("Shift+Tab");
  await expect(page).toHaveURL(/\/kjv\/b\/genesis\/c\/1\/v\/1$/);

  await expect(page.locator("#search-input")).not.toBeFocused();
  await expect(page.locator(".search-results")).toBeHidden();
});

test("Tab after choosing an edition does not walk the verses or focus search", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await page.locator("#edition-select").click();
  await page.locator("#edition-options [data-edition='krv']").click();
  await expect(page).toHaveURL(/\/krv\/b\/genesis\/c\/1\/v\/1$/);
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "ko");
  await expect(page.locator("#verse-list")).not.toHaveAttribute("aria-busy", "true");
  await expect(page.locator("#verse-1")).toBeVisible();

  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#search-input")).not.toBeFocused();
  await expect(page.locator(".search-results")).toBeHidden();
  await expect(page.locator(".verse:focus")).toHaveCount(0);
});

const overlays = [
  ["shortcuts dialog", async (page) => page.locator("#shortcuts-open").click()],
  ["feedback dialog", async (page) => page.locator("#feedback-open").click()],
  ["chapter picker", async (page) => page.locator("#chapter-select").click()],
  ["edition picker", async (page) => page.locator("#edition-select").click()],
  ["share language menu", async (page) => {
    await page.locator("#verse-1").click();
    await page.locator("#share-selected-verses").click();
  }],
  ["copy language menu", async (page) => {
    await page.locator("#verse-1").click();
    await page.locator("#copy-selected-verses").click();
  }],
];

for (const [name, open] of overlays) {
  test(`Tab cycles editions after closing the ${name}`, async ({ page }) => {
    await page.goto("/kjv/b/genesis/c/1/v/1");
    await page.locator("#verse-1").waitFor();
    await open(page);
    await page.keyboard.press("Escape");

    await page.keyboard.press("Tab");
    await expect(page).toHaveURL(/\/krv\/b\/genesis\/c\/1\/v\/1$/);
    await page.keyboard.press("Shift+Tab");
    await expect(page).toHaveURL(/\/kjv\/b\/genesis\/c\/1\/v\/1$/);
    await expect(page.locator("#search-input")).not.toBeFocused();
  });
}

test("Tab cycles editions after switching testament", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await page.locator("#verse-1").waitFor();
  await page.locator('.testament-tab[data-testament="new"]').click();
  await expect(page.locator('.testament-tab[data-testament="new"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('.testament-tab[data-testament="new"]')).not.toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page).toHaveURL(/\/krv\/b\/matthew\/c\/1\/v\/1$/);
  await page.keyboard.press("Shift+Tab");
  await expect(page).toHaveURL(/\/kjv\/b\/matthew\/c\/1\/v\/1$/);
  await expect(page.locator("#search-input")).not.toBeFocused();
});
