import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { EDITION_IDS } from "../js/editions.mjs";
import { createScriptureStore } from "../js/scripture-store.js";
import { createScriptureSearchIndexCache } from "../js/scripture-search-index-cache.js";
import { SCRIPTURE_SEARCH_INDEX_CODE_VERSION } from "../js/scripture-search-index-version.mjs";
import { createSearchIndexVersion, getSearchIndexCodeVersion } from "../tools/search-index-version.mjs";
import MiniSearch from "../js/vendor/minisearch.js";

function createMemoryCacheStorage() {
  const stores = new Map();
  return {
    stores,
    async open(name) {
      if (!stores.has(name)) {
        const entries = new Map();
        stores.set(name, {
          async match(request) {
            return entries.get(request.url)?.clone();
          },
          async put(request, response) {
            entries.set(request.url, response.clone());
          },
          async delete(request) {
            return entries.delete(request.url);
          },
          async keys() {
            return [...entries.keys()].map((url) => new Request(url));
          },
        });
      }
      return stores.get(name);
    },
  };
}

describe("scripture search index cache", () => {
  it("keeps at most two edition indexes and replaces stale versions", async () => {
    const cacheStorage = createMemoryCacheStorage();
    const indexCache = createScriptureSearchIndexCache({
      cacheStorage,
      origin: "https://example.test",
    });
    const versionA = "a".repeat(64);
    const versionB = "b".repeat(64);

    await indexCache.set("kjv", versionA, "kjv index");
    await indexCache.set("krv", versionA, "krv index");
    await indexCache.set("kjv", versionB, "updated kjv index");
    await indexCache.set("japbungo", versionA, "Japanese index");

    assert.equal(await indexCache.get("kjv", versionA), null);
    assert.equal(await indexCache.get("kjv", versionB), "updated kjv index");
    assert.equal(await indexCache.get("japbungo", versionA), "Japanese index");
    assert.equal(await indexCache.get("krv", versionA), null);
    const cache = await cacheStorage.open("the-word-search-indexes-v1");
    assert.equal((await cache.keys()).length, 2);
  });

  it("separates Japanese tokenizer caches by browser runtime", async () => {
    const indexCache = createScriptureSearchIndexCache({
      cacheStorage: createMemoryCacheStorage(),
      origin: "https://example.test",
    });
    const version = "c".repeat(64);

    await indexCache.set("japbungo", version, "browser A", "browser A");
    await indexCache.set("japbungo", version, "browser B", "browser B");

    assert.equal(await indexCache.get("japbungo", version, "browser A"), null);
    assert.equal(await indexCache.get("japbungo", version, "browser B"), "browser B");
  });

  it("leaves search available when persistent storage is unavailable", async () => {
    const indexCache = createScriptureSearchIndexCache({ cacheStorage: null });
    assert.equal(await indexCache.get("kjv", "d".repeat(64)), null);
    await indexCache.set("kjv", "d".repeat(64), "index");
  });

  it("restores a matching versioned search index from the persistent cache", async () => {
    const searchIndexVersion = "a".repeat(64);
    const cachedIndex = new MiniSearch({
      fields: ["text"],
      processTerm: (term) => term.normalize("NFKC").toLocaleLowerCase(),
    });
    cachedIndex.add({ id: "1:1:1", text: "cacheprobe" });
    const cacheReads = [];
    let cacheWrites = 0;
    const store = createScriptureStore({
      editionId: "kjv",
      canonicalBookNames: ["Genesis"],
      displayBookNames: ["Genesis"],
      bookOrder: [1],
      fetchImpl: async (url) => url.endsWith("/index.json")
        ? {
          ok: true,
          json: async () => ({
            chapterCounts: [1],
            bookFiles: ["1_genesis.json"],
            searchIndexCodeVersion: SCRIPTURE_SEARCH_INDEX_CODE_VERSION,
            searchIndexVersion,
          }),
        }
        : { ok: true, json: async () => ({ 1: [[1, "Scripture verse"]] }) },
      searchIndexCache: {
        get: async (...args) => {
          cacheReads.push(args);
          return JSON.stringify(cachedIndex);
        },
        set: async () => { cacheWrites += 1; },
      },
    });

    const result = await store.search("cacheprobe");
    assert.equal(result[0].text, "Scripture verse");
    assert.deepEqual(cacheReads, [["kjv", searchIndexVersion, ""]]);
    assert.equal(cacheWrites, 0);
  });

  it("falls back to rebuilding when a cached search index cannot be restored", async () => {
    const warnings = [];
    let removed = 0;
    const store = createScriptureStore({
      editionId: "kjv",
      canonicalBookNames: ["Genesis"],
      displayBookNames: ["Genesis"],
      bookOrder: [1],
      logger: { error() {}, warn: (...args) => warnings.push(args) },
      fetchImpl: async (url) => url.endsWith("/index.json")
        ? {
          ok: true,
          json: async () => ({
            chapterCounts: [1],
            bookFiles: ["1_genesis.json"],
            searchIndexCodeVersion: SCRIPTURE_SEARCH_INDEX_CODE_VERSION,
            searchIndexVersion: "b".repeat(64),
          }),
        }
        : { ok: true, json: async () => ({ 1: [[1, "source marker"]] }) },
      searchIndexCache: {
        get: async () => "{invalid JSON",
        remove: async () => { removed += 1; },
      },
    });

    const result = await store.search("source");
    assert.equal(result[0].text, "source marker");
    assert.equal(removed, 1);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0][0], /Cached search index/u);
  });

  it("keeps generated cache versions aligned with every edition's data and search code", async () => {
    const codeVersion = await getSearchIndexCodeVersion();
    assert.equal(SCRIPTURE_SEARCH_INDEX_CODE_VERSION, codeVersion);
    for (const editionId of EDITION_IDS) {
      const dataRoot = new URL(`../scripture/${editionId}/`, import.meta.url);
      const manifest = JSON.parse(await readFile(new URL("index.json", dataRoot), "utf8"));
      assert.match(manifest.searchIndexVersion ?? "", /^[a-f0-9]{64}$/u, editionId);
      assert.equal(manifest.searchIndexCodeVersion, codeVersion, editionId);

      const version = await createSearchIndexVersion({
        editionId,
        bookFiles: manifest.bookFiles,
        bookOutputUrl: new URL("books/", dataRoot),
        searchIndexCodeVersion: codeVersion,
      });
      assert.equal(manifest.searchIndexVersion, version, editionId);
    }
  });
});
