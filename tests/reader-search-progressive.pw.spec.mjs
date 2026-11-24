import { readFile } from "node:fs/promises";
import { expect, test } from "./support/browser-test.mjs";

async function useProgressiveSearchCorpus(context, editionId, gate) {
  // Exercise real loading and tokenization without benchmarking a whole-edition cold index.
  await context.route(`**/scripture/${editionId}/books/*.json`, async (route) => {
    const fileName = new URL(route.request().url()).pathname.split("/").at(-1);
    if (fileName === "1_genesis.json") await gate;
    const book = JSON.parse(await readFile(
      new URL(`../scripture/${editionId}/books/${fileName}`, import.meta.url),
      "utf8",
    ));
    const chapters = Object.fromEntries(Object.entries(book).map(([chapter, verses]) => [
      chapter,
      fileName === "43_john.json" && chapter === "3" ? verses : verses.slice(0, 1),
    ]));
    await route.fulfill({ json: chapters });
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  test.describe(`progressive search at ${viewport.width}px`, () => {
    test.use({ viewport, serviceWorkers: "block" });

    test.describe("persistent search index", () => {
      test.use({ serviceWorkers: "allow" });

      test("persists a search index lazily and reuses it after reload", async ({ page }) => {
        await page.goto("/kjv/b/john/c/3/v/16");
        await page.evaluate(async () => {
          await caches.delete("the-word-search-indexes-v1");
          await navigator.serviceWorker.ready;
        });
        expect(await page.evaluate(() => caches.keys())).not.toContain("the-word-search-indexes-v1");

        const search = page.locator("#search-input");
        await search.fill("piercing sword");
        await expect(page.locator(".search-result[data-search-type='text']")
          .filter({ hasText: "Hebrews 4:12" })).toHaveCount(1);
        // Wait for a complete, readable index before unloading the worker.
        await expect.poll(() => page.evaluate(async () => {
          const cache = await caches.open("the-word-search-indexes-v1");
          const keys = await cache.keys();
          if (keys.length !== 1) return null;
          const response = await cache.match(keys[0]);
          return response ? (await response.json()).documentCount : null;
        })).toBe(31_102);

        // An index-only probe proves reuse without changing the displayed Scripture.
        await page.evaluate(async () => {
          const { default: MiniSearch } = await import("/js/vendor/minisearch.js");
          const cache = await caches.open("the-word-search-indexes-v1");
          const [key] = await cache.keys();
          const response = await cache.match(key);
          const index = MiniSearch.loadJSON(await response.text(), { fields: ["text"] });
          index.replace({ id: "58:4:12", text: "piercing sword cacheprobe" });
          await cache.put(key, new Response(JSON.stringify(index), {
            headers: response.headers,
          }));
        });

        await page.reload();
        await page.locator("#search-input").fill("piercing sword");
        await expect(page.locator(".search-result[data-search-type='text']")
          .filter({ hasText: "Hebrews 4:12" })).toHaveCount(1);
        await page.locator("#search-input").fill("cacheprobe");
        await expect(page.locator(".search-result[data-search-type='text']")
          .filter({ hasText: "Hebrews 4:12" })).toHaveCount(1);
        await expect(page.locator(".search-result[data-search-type='text']"))
          .not.toContainText("cacheprobe");
        expect(await page.evaluate(async () =>
          (await (await caches.open("the-word-search-indexes-v1")).keys()).length
        )).toBe(1);
      });
    });

    test("retains a query typed before the edition finishes initializing", async ({ page, context }) => {
      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      await context.route("**/scripture/kjv/index.json", async (route) => {
        await gate;
        await route.continue();
      });
      try {
        await page.goto("/kjv/b/john/c/3/v/16");
        await page.locator("#search-input").fill("John 3:16");
        release();
        await expect(page.locator(".search-result--navigation")).toContainText("John 3:16");
      } finally {
        release();
      }
    });

    for (const [editionId, route, abbreviation, bookName, textQuery, textVerse] of [
      ["kjv", "kjv", "Jn.", "John", "worlx", 16],
      ["krv", "krv", "요", "요한복음", "하느님 독생자", 16],
      ["japbungo", "japbungo", "ヨハ", "ヨハネの福音書", "ニコテモ", 1],
      ["diodati", "diodati", "Gv", "Giovanni", "mondx", 16],
      ["luther1912", "licht", "Joh", "Johannes", "lebex", 16],
      ["martin1744", "moh", "Jn", "Jean", "mondx", 16],
      ["rv1865", "luz", "Jn", "San Juan", "mundx", 16],
      ["alm1911", "alm", "Jo", "João", "mundx", 16],
    ]) {
      test(`shows ${editionId} navigation before full-text loading and retains it when text search completes`, async ({ page, context }) => {
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        await useProgressiveSearchCorpus(context, editionId, gate);
        try {
          await page.goto(`/${route}/b/john/c/3/v/16`);
          await page.locator("#search-input").fill(`${abbreviation} 3:16`);
          const navigation = page.locator(".search-result--navigation");
          await expect(navigation).toHaveCount(1);
          await expect(navigation).toContainText(`${bookName} 3:16`);
          await navigation.evaluate((element) => { element.dataset.navigationProbe = "retained"; });
          if (editionId === "krv") {
            await expect(page.locator("#search-results")).not.toHaveAttribute("aria-busy", "true");
            expect(page.workers()).toHaveLength(0);
          } else {
            await expect(page.locator(".search-loading")).toBeVisible();
            await expect.poll(() => page.workers().length).toBe(1);
          }
          release();
          await expect(page.locator("#search-results")).not.toHaveAttribute("aria-busy", "true");
          await expect(navigation).toHaveAttribute("data-navigation-probe", "retained");
          await expect(navigation).toHaveCount(1);
          await expect(navigation).toHaveAttribute("aria-selected", "true");
          await expect(page.locator(".search-result").first()).toHaveAttribute("data-search-type", "reference");
          await expect(page.locator(".search-empty")).toHaveCount(0);
          await navigation.click();
          await expect(page).toHaveURL(new RegExp(`/${route}/b/john/c/3/v/16$`));

          await page.locator("#search-input").fill(textQuery);
          const textResult = page.locator(".search-result[data-search-type='text']").filter({
            has: page.locator(".result-reference", { hasText: new RegExp(`^${bookName} 3:${textVerse}$`) }),
          });
          await expect(textResult).toHaveCount(1);
          const john = JSON.parse(await readFile(
            new URL(`../scripture/${editionId}/books/43_john.json`, import.meta.url),
            "utf8",
          ));
          await expect(textResult.locator(".result-text")).toHaveText(john["3"][textVerse - 1][1]);
          await expect(page.locator("#search-results")).not.toHaveAttribute("aria-busy", "true");
          expect(page.workers()).toHaveLength(1);
        } finally {
          release();
        }
      });
    }

    test("keeps an ambiguous keyboard selection when text matches arrive", async ({ page, context }) => {
      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      await context.route("**/scripture/martin1744/books/1_genesis.json", async (route) => {
        await gate;
        await route.continue();
      });
      try {
        await page.goto("/moh/b/john/c/3/v/16");
        const search = page.locator("#search-input");
        await search.fill("Phil");
        const navigation = page.locator(".search-result--navigation");
        await expect(navigation).toHaveCount(2);
        await search.press("ArrowDown");
        await expect(navigation.nth(1)).toHaveAttribute("aria-selected", "true");
        const activeId = await search.getAttribute("aria-activedescendant");
        release();
        await expect(page.locator("#search-results")).not.toHaveAttribute("aria-busy", "true");
        await expect(page.locator(".search-result")).toHaveCount(12);
        await expect(search).toHaveAttribute("aria-activedescendant", activeId);
        await expect(navigation.nth(1)).toHaveAttribute("aria-selected", "true");
        await search.press("Enter");
        await expect(page).toHaveURL(/\/moh\/b\/philemon\/c\/1\/v\/1$/);
      } finally {
        release();
      }
    });

    test("discards superseded queries while the worker is indexing", async ({ page, context }) => {
      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      await context.route("**/scripture/kjv/books/1_genesis.json", async (route) => {
        await gate;
        await route.continue();
      });
      try {
        await page.goto("/kjv/b/john/c/3/v/16");
        const search = page.locator("#search-input");
        await search.fill("John 3:16");
        await expect(page.locator(".search-result--navigation")).toContainText("John 3:16");
        await expect.poll(() => page.workers().length).toBe(1);
        await search.fill("Psalm 23:1");
        await expect(page.locator(".search-result--navigation")).toContainText("Psalm 23:1");
        release();
        await expect(page.locator("#search-results")).not.toHaveAttribute("aria-busy", "true");
        await expect(page.locator(".search-result--navigation")).toHaveCount(1);
        await expect(page.locator(".search-result--navigation")).toContainText("Psalm 23:1");
        expect(page.workers()).toHaveLength(1);
      } finally {
        release();
      }
    });

    test("keeps navigation usable when full-text loading fails and retries on the next query", async ({ page, context }) => {
      let fail = true;
      await context.route("**/scripture/kjv/books/1_genesis.json", (route) =>
        fail ? route.abort() : route.continue());
      await page.goto("/kjv/b/john/c/3/v/16");
      const search = page.locator("#search-input");
      await search.fill("John 3:16");
      await expect(page.locator(".search-empty")).toContainText("Please check your network connection.");
      await expect(page.locator(".search-result--navigation")).toContainText("John 3:16");
      await expect(page.locator("#search-results")).not.toHaveAttribute("aria-busy", "true");
      fail = false;
      await search.fill("John 3:17");
      await expect(page.locator("#search-results")).not.toHaveAttribute("aria-busy", "true");
      await expect(page.locator(".search-result--navigation")).toContainText("John 3:17");
      await expect(page.locator(".search-result[data-search-type='text']").first()).toBeVisible();
      await expect(page.locator(".search-empty")).toHaveCount(0);
    });

    test.describe("saved edition", () => {
      test.use({ serviceWorkers: "allow" });

      test("runs a cold worker search after an offline reload", async ({ page, context }) => {
        await page.goto("/kjv/b/john/c/3/v/16");
        await page.evaluate(() => navigator.serviceWorker.ready);
        if (viewport.width < 700) await page.locator("#menu-toggle").click();
        await page.locator("#edition-offline-action").click();
        await expect(page.locator("#edition-offline-status")).toHaveText("Available offline");
        await context.setOffline(true);
        await page.reload();
        await expect(page.locator("#verse-16")).toBeVisible();
        await page.locator("#search-input").fill("piercing sword");
        await expect(page.locator(".search-result").filter({ hasText: "Hebrews 4:12" })).toHaveCount(1);
        await expect(page.locator("#search-results")).not.toHaveAttribute("aria-busy", "true");
        expect(page.workers()).toHaveLength(1);
      });
    });
  });
}
