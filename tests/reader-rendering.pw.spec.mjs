import { expect, test } from "./support/browser-test.mjs";
import { EDITIONS, EDITION_IDS } from "../js/editions.mjs";

for (const edition of Object.values(EDITIONS)) {
  test(`reuses unchanged reader content and controls in ${edition.id}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${edition.routeSegment}/b/john/c/3/v/16`);
    await expect(page.locator("#verse-16")).toHaveClass(/is-focused/);
    await page.evaluate(() => {
      const selectors = {
        verses: "#verse-list .verse",
        books: "#book-list .book-row",
        chapters: "#chapter-options-list .chapter-option",
        editions: "#edition-options .edition-option",
      };
      window.readerNodes = Object.fromEntries(Object.entries(selectors).map(([name, selector]) =>
        [name, [...document.querySelectorAll(selector)]]));
      window.verseListChanges = { removed: 0, loading: false };
      new MutationObserver((records) => {
        for (const record of records) {
          window.verseListChanges.removed += record.removedNodes.length;
          if (record.type === "attributes" && record.target.getAttribute("aria-busy") === "true") {
            window.verseListChanges.loading = true;
          }
        }
      }).observe(document.querySelector("#verse-list"), { childList: true, attributes: true });
    });
    const expectPreserved = async (names) => {
      expect(await page.evaluate((keys) => Object.fromEntries(keys.map((name) =>
        [name, window.readerNodes[name].every((node) => node.isConnected)])), names))
        .toEqual(Object.fromEntries(names.map((name) => [name, true])));
    };

    await page.locator("#search-input").fill("John 3:18");
    const result = page.locator(".search-result").first();
    await expect(result).toHaveAttribute("data-search-type", "reference");
    await result.click();
    await expect(page).toHaveURL(/\/john\/c\/3\/v\/18$/);
    await expect(page.locator("#verse-18")).toBeFocused();
    await expectPreserved(["verses", "books", "chapters", "editions"]);

    await page.goBack();
    await expect(page.locator("#verse-16")).toHaveClass(/is-focused/);
    await page.goForward();
    await expect(page.locator("#verse-18")).toHaveClass(/is-focused/);
    await expectPreserved(["verses", "books", "chapters", "editions"]);

    await page.locator("#chapter-select").click();
    await page.locator('#chapter-options-list [data-chapter="3"]').click();
    await expect(page).toHaveURL(/\/john\/c\/3\/v\/1$/);
    await expect(page.locator("#verse-1")).toHaveClass(/is-focused/);
    await page.keyboard.press("q");
    await expect(page.locator("body")).toHaveClass(/is-quiet-reading/);
    await page.keyboard.press("q");
    await page.locator("#verse-1").click();
    await expect(page.locator("#verse-1")).toHaveAttribute("aria-pressed", "true");
    await page.locator("#copy-selected-verses").click();
    await expect(page.locator("#share-language-menu")).toBeVisible();
    await page.evaluate(() => {
      window.readerNodes.languages = [...document.querySelectorAll(".share-language-option")];
    });
    await page.keyboard.press("Escape");
    await page.locator("#share-selected-verses").click();
    await expectPreserved(["verses", "books", "chapters", "editions", "languages"]);
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => window.verseListChanges)).toEqual({ removed: 0, loading: false });

    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/\/john\/c\/4\/v\/1$/);
    await expect(page.locator("#heading-chapter")).toHaveText("4");
    await expect(page.locator('#chapter-options-list [data-chapter="4"]')).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('#chapter-options-list [data-chapter="3"]')).toHaveAttribute("aria-selected", "false");
    await expectPreserved(["books", "chapters", "editions"]);
    expect(await page.evaluate(() => window.readerNodes.verses.every((node) => !node.isConnected))).toBe(true);

    await page.locator('.book-row[data-book="42"]').click();
    await expect(page).toHaveURL(/\/luke\/c\/1\/v\/1$/);
    await expect(page.locator('.book-row[data-book="42"]')).toHaveAttribute("aria-current", "page");
    await expect(page.locator('.book-row[data-book="43"]')).toHaveAttribute("aria-current", "false");
    await expect(page.locator(".chapter-option")).toHaveCount(24);
    await expectPreserved(["books", "editions"]);
    expect(await page.evaluate(() => window.readerNodes.chapters.every((node) => !node.isConnected))).toBe(true);

    const nextId = EDITION_IDS[(EDITION_IDS.indexOf(edition.id) + 1) % EDITION_IDS.length];
    await page.keyboard.press("Tab");
    await expect(page).toHaveURL(new RegExp(`/${EDITIONS[nextId].routeSegment}/b/luke/c/1/v/1$`));
    await expect(page.locator("#verse-list")).toHaveAttribute("lang", EDITIONS[nextId].language);
    await expectPreserved(["editions", "languages"]);
    expect(await page.evaluate(() => window.readerNodes.books.every((node) => !node.isConnected))).toBe(true);
    await page.locator("#verse-1").click();
    await page.locator("#copy-selected-verses").click();
    await expect(page.locator(".share-language-option[aria-current]")).toHaveAttribute("data-edition", nextId);
    await expectPreserved(["languages"]);
  });
}
