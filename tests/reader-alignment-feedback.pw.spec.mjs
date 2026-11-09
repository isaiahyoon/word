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

for (const route of ["kjv", "krv", "diodati", "licht", "japbungo", "moh", "luz", "alm"]) {
  test(`shows a concise language menu for ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(`/${route}/b/john/c/3/v/16`);
    await page.locator("#verse-16").click();
    await page.locator("#copy-selected-verses").click();
    const menu = page.locator("#share-language-menu");
    await expect(menu.locator("#share-alignment-notice")).toHaveCount(0);
    await expect(menu).not.toHaveAttribute("aria-describedby");
    for (const edition of Object.values(EDITIONS)) {
      await expect(menu.locator(`[data-edition='${edition.id}'] .share-language-name`)).toHaveText(edition.languageName);
    }
    const menuBounds = await menu.boundingBox();
    const focusedBounds = await menu.locator("[aria-current]").boundingBox();
    expect(focusedBounds.y).toBeGreaterThanOrEqual(menuBounds.y);
  });
}

for (const [route, book, chapter, selected, target, language, selection, extra] of [
  ["kjv", "psalms", 42, [5], "martin1744", "en", "Psalm 42:5", null],
  ["moh", "psalms", 42, [6], "kjv", "fr", "Psaumes 42:6", null],
  ["kjv", "2-corinthians", 13, [12], "martin1744", "en", "2 Corinthians 13:12", "2 Corinthians 13:13"],
  ["kjv", "2-corinthians", 13, [12, 13], "alm1911", "en", "2 Corinthians 13:12-13", null],
  ["krv", "3-john", 1, [14], "kjv", "ko", "요한3서 1:14", "요한3서 1:15"],
  ["alm", "2-corinthians", 13, [13], "kjv", "pt", "2 Coríntios 13:13", null],
]) {
  for (const action of ["copy", "share", "fallback"]) {
    test(`${action} reports mapped selection from ${route} ${book} ${chapter}:${selected.join(",")}`, async ({ page }) => {
      await page.addInitScript(({ nativeShare }) => {
        window.copyWrites = [];
        window.sharedPayloads = [];
        Object.defineProperty(navigator, "clipboard", {
          configurable: true, value: { writeText: async (text) => window.copyWrites.push(text) },
        });
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: nativeShare ? async (payload) => {
            window.statusAtShare = document.querySelector("#copy-status").textContent;
            window.sharedPayloads.push(payload);
          } : undefined,
        });
      }, { nativeShare: action === "share" });
      await page.goto(`/${route}/b/${book}/c/${chapter}/v/${selected[0]}`);
      for (const verse of selected) await page.locator(`#verse-${verse}`).click();
      await page.locator(`#${action === "copy" ? "copy" : "share"}-selected-verses`).click();
      await page.locator(`#share-language-menu [data-edition='${target}']`).click();
      const sourceEdition = EDITIONS[route === "moh" ? "martin1744" : route === "alm" ? "alm1911" : route];
      const sourceCode = sourceEdition.shortCode ?? sourceEdition.id.toUpperCase();
      const expectedSelection = UI_LOCALES[language].alignmentSelection
        .replace("{reference}", selection).replace("{edition}", sourceCode);
      const status = page.locator("#copy-status");
      await expect(status).toContainText(expectedSelection);
      if (extra) await expect(status).toContainText(UI_LOCALES[language].alignmentExtraText.replace("{reference}", extra));
      else await expect(status).not.toContainText(UI_LOCALES[language].alignmentExtraText.split("{reference}")[0]);
      if (action === "share") {
        expect(await page.evaluate(() => window.sharedPayloads.length)).toBe(1);
        expect(await page.evaluate(() => window.statusAtShare)).toContain(expectedSelection);
      } else {
        expect(await page.evaluate(() => window.copyWrites.length)).toBe(1);
      }
    });
  }
}

test("keeps ordinary and same-edition copy feedback concise", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true, value: { writeText: async () => {} },
    });
  });
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#verse-16").click();
  for (const [target, expected] of [["kjv", "John 3:16"], ["martin1744", "Jean 3:16"]]) {
    await page.locator("#copy-selected-verses").click();
    await page.locator(`#share-language-menu [data-edition='${target}']`).click();
    await expect(page.locator("#copy-status")).toHaveText(`Copied ${expected} to clipboard.`);
  }
});

for (const [result, message] of [["cancel", ""], ["failure", UI_LOCALES.en.shareFailed]]) {
  test(`does not report a mapped share as successful on ${result}`, async ({ page }) => {
    await page.addInitScript((result) => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async () => {
          if (result === "cancel") throw new DOMException("Cancelled", "AbortError");
          throw new Error("Share failed");
        },
      });
    }, result);
    await page.goto("/kjv/b/psalms/c/42/v/5");
    await page.locator("#verse-5").click();
    await page.locator("#share-selected-verses").click();
    await page.locator("#share-language-menu [data-edition='martin1744']").click();
    await expect(page.locator("#copy-status")).toHaveText(message);
  });
}

for (const [route, language] of [["diodati", "it"], ["licht", "de"], ["japbungo", "ja"], ["luz", "es"]]) {
  test(`localizes mapped-copy feedback for ${route}`, async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true, value: { writeText: async () => {} },
      });
    });
    await page.goto(`/${route}/b/psalms/c/42/v/5`);
    await page.locator("#verse-5").click();
    await page.locator("#copy-selected-verses").click();
    await page.locator("#share-language-menu [data-edition='martin1744']").click();
    await expect(page.locator("#copy-status")).toContainText(UI_LOCALES[language].alignmentSelection.split("{reference}")[0]);
  });
}

test("keeps mapped copy feedback visible after the button resets, within desktop and mobile viewports", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true, value: { writeText: async () => {} },
    });
  });
  for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/kjv/b/2-corinthians/c/13/v/12");
    await page.locator("#verse-12").click();
    await page.locator("#copy-selected-verses").click();
    await page.locator("#share-language-menu [data-edition='martin1744']").click();
    const status = page.locator("#copy-status");
    await expect(status).toContainText("It may also include text from 2 Corinthians 13:13.");
    await expect(page.locator("#copy-selected-label")).toHaveText("Copy 1 verse");
    await expect(status).toBeVisible();
    const bounds = await status.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    await page.locator("#clear-selected-verses").click();
    await expect(status).toBeHidden();
  }
});

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

test("keeps the language menu and blocked-copy feedback visible and usable on desktop and mobile", async ({ page }) => {
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
    await expect(menu).toBeVisible();
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
    expect(lastBounds.y).toBeGreaterThanOrEqual(bounds.y);
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
