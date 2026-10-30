import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { describe, it } from "node:test";
import { BOOKS, bookFileName } from "../books.mjs";
import { KRV_BOOK_NAMES } from "../editions.mjs";
import {
  createScriptureRoutes,
  getVerseStep,
  isValidVerseRange,
  normalizeVerseRange,
} from "../scripture-routes.mjs";
import { createScriptureStore } from "../scripture-store.js";

function createMockFetch(dataPath = "./scripture/kjv") {
  const requests = [];
  const chapterCounts = BOOKS.map((_, index) => (index === 42 ? 3 : 1));
  const bookFiles = BOOKS.map((_, index) => bookFileName(index + 1));
  const books = BOOKS.map((name, index) => ({
    1: [
      [
        1,
        index === 0
          ? "In the beginning God created the heaven and the earth"
          : `${name} first verse`,
      ],
    ],
  }));
  books[42] = {
    1: [[1, "In the beginning was the Word"]],
    2: [[1, "John chapter two"]],
    3: Array.from({ length: 16 }, (_, index) => [
      index + 1,
      index === 15
        ? "For God so loved the world"
        : `John chapter three verse ${index + 1}`,
    ]),
  };

  return {
    requests,
    fetchImpl: async (url) => {
      requests.push(url);
      const value =
        url === `${dataPath}/index.json`
          ? { chapterCounts, bookFiles }
          : books[bookFiles.indexOf(url.split("/").at(-1))];
      if (!value) return { ok: false };
      return { ok: true, json: async () => value };
    },
  };
}

describe("scripture routes", () => {
  const routes = createScriptureRoutes(BOOKS, "/", ["kjv", "krv"]);

  it("identifies the reader root as the home route", () => {
    assert.deepEqual(routes.parse("/"), { home: true, editionId: "kjv" });
  });

  it("defaults an edition-only route to Genesis 1:1", () => {
    for (const editionId of ["kjv", "krv"]) {
      assert.deepEqual(routes.parse(`/${editionId}`), {
        editionId,
        book: 1,
        chapter: 1,
        range: { start: 1, end: 1 },
        legacy: false,
      });
    }

    const futureEditionRoutes = createScriptureRoutes(BOOKS, "/", ["kjv", "future-edition"]);
    assert.equal(futureEditionRoutes.parse("/future-edition").book, 1);
    assert.equal(futureEditionRoutes.parse("/future-edition").editionId, "future-edition");
  });

  it("defaults legacy KJV routes to verse one", () => {
    assert.deepEqual(routes.parse("/b/john"), {
      editionId: "kjv",
      book: 43,
      chapter: 1,
      range: { start: 1, end: 1 },
      legacy: true,
    });
    assert.deepEqual(routes.parse("/b/john/c/3"), {
      editionId: "kjv",
      book: 43,
      chapter: 3,
      range: { start: 1, end: 1 },
      legacy: true,
    });
    assert.deepEqual(routes.parse("/b/john/3/16"), {
      editionId: "kjv",
      book: 43,
      chapter: 3,
      range: { start: 16, end: 16 },
      legacy: true,
    });
  });

  it("parses and builds edition-prefixed verse routes", () => {
    assert.deepEqual(routes.parse("/b/john/c/3/v/16"), {
      editionId: "kjv",
      book: 43,
      chapter: 3,
      range: { start: 16, end: 16 },
      legacy: true,
    });
    assert.deepEqual(routes.parse("/kjv/b/john/c/3/v/16-18"), {
      editionId: "kjv",
      book: 43,
      chapter: 3,
      range: { start: 16, end: 18 },
      legacy: false,
    });
    assert.deepEqual(routes.parse("/krv/b/john/c/3/v/16"), {
      editionId: "krv",
      book: 43,
      chapter: 3,
      range: { start: 16, end: 16 },
      legacy: false,
    });
    assert.equal(
      routes.buildPath(43, 3, { start: 16, end: 16 }, "kjv"),
      "/kjv/b/john/c/3/v/16",
    );
    assert.equal(
      routes.buildPath(43, 3, { start: 16, end: 18 }, "krv"),
      "/krv/b/john/c/3/v/16-18",
    );
  });

  it("round-trips numbered and multiword book slugs", () => {
    for (const [book, name] of BOOKS.entries()) {
      const path = routes.buildPath(book + 1, 1, { start: 1, end: 1 }, "kjv");
      assert.equal(routes.parse(path).book, book + 1, name);
    }
  });

  it("supports an application mounted below the domain root", () => {
    const mountedRoutes = createScriptureRoutes(BOOKS, "/reader/", ["kjv", "krv"]);
    assert.equal(
      mountedRoutes.buildPath(43, 3, { start: 16, end: 18 }, "kjv"),
      "/reader/kjv/b/john/c/3/v/16-18",
    );
    assert.deepEqual(mountedRoutes.parse("/reader/kjv/b/john/c/3/v/16-18"), {
      editionId: "kjv",
      book: 43,
      chapter: 3,
      range: { start: 16, end: 18 },
      legacy: false,
    });
    assert.equal(mountedRoutes.parse("/other/b/john/c/3"), null);
  });

  it("rejects malformed or unknown routes", () => {
    for (const path of [
      "/b/not-a-book",
      "/b/john/c/0",
      "/b/john/c/3/v/18-16",
      "/b/john/c/3/v/1-2-3",
      "/b/john/3",
      "/unknown/b/john/c/3",
      "/kjv/b/not-a-book",
    ]) {
      const route = routes.parse(path);
      assert.ok(
        route === null || (route.range && !isValidVerseRange(route.range, 16)),
        path,
      );
    }
  });

  it("validates inclusive verse bounds", () => {
    assert.deepEqual(normalizeVerseRange(16), { start: 16, end: 16 });
    assert.equal(normalizeVerseRange(null), null);
    assert.equal(isValidVerseRange({ start: 1, end: 16 }, 16), true);
    assert.equal(isValidVerseRange({ start: 0, end: 1 }, 16), false);
    assert.equal(isValidVerseRange({ start: 4, end: 3 }, 16), false);
    assert.equal(isValidVerseRange({ start: 1, end: 17 }, 16), false);
  });

  it("steps through verses and across chapter boundaries", () => {
    assert.deepEqual(getVerseStep(7, 16, -1), { chapterOffset: 0, verse: 6 });
    assert.deepEqual(getVerseStep(7, 16, 1), { chapterOffset: 0, verse: 8 });
    assert.deepEqual(getVerseStep(16, 16, 1), { chapterOffset: 1, verse: 1 });
    assert.deepEqual(getVerseStep(1, 16, -1), { chapterOffset: -1, verse: null });
  });

  it("rejects invalid verse navigation steps", () => {
    assert.throws(() => getVerseStep(0, 16, 1), RangeError);
    assert.throws(() => getVerseStep(17, 16, -1), RangeError);
    assert.throws(() => getVerseStep(1, 16, 0), RangeError);
  });
});

describe("scripture store", () => {
  it("loads a book once and returns the requested chapter", async () => {
    const mock = createMockFetch();
    const store = createScriptureStore({ fetchImpl: mock.fetchImpl });
    await store.initialize();

    const firstLoad = await store.loadChapter(43, 3);
    const secondLoad = await store.loadChapter(43, 3);

    assert.equal(firstLoad.length, 16);
    assert.equal(secondLoad[15].text, "For God so loved the world");
    assert.equal(
      mock.requests.filter((url) => url.endsWith("43_john.json")).length,
      1,
    );
  });

  it("loads localized KRV references from the KRV edition path", async () => {
    const mock = createMockFetch("./scripture/krv");
    const store = createScriptureStore({
      fetchImpl: mock.fetchImpl,
      dataPath: "./scripture/krv",
      displayBookNames: KRV_BOOK_NAMES,
    });
    await store.initialize();

    assert.equal(store.bookName(43), "요한복음");
    assert.deepEqual(
      (await store.search("요한복음 3:16")).map(({ book, chapter, verse }) => ({ book, chapter, verse })),
      [{ book: 43, chapter: 3, verse: 16 }],
    );
    assert.ok(mock.requests.includes("./scripture/krv/index.json"));
    assert.ok(mock.requests.includes("./scripture/krv/books/43_john.json"));
  });

  it("searches exact references and rejects missing verses", async () => {
    const store = createScriptureStore({
      fetchImpl: createMockFetch().fetchImpl,
    });
    await store.initialize();

    assert.deepEqual(
      (await store.search("John 3:16")).map(({ book, chapter, verse }) => ({
        book,
        chapter,
        verse,
      })),
      [{ book: 43, chapter: 3, verse: 16 }],
    );
    assert.deepEqual(await store.search("John 3:99"), []);
    assert.deepEqual(await store.search("John 22:1"), []);
  });

  it("searches verse text across books", async () => {
    const store = createScriptureStore({
      fetchImpl: createMockFetch().fetchImpl,
    });
    await store.initialize();

    const matches = await store.search("in the beginning");
    assert.deepEqual(
      matches.map(({ book, chapter, verse }) => ({ book, chapter, verse })),
      [
        { book: 43, chapter: 1, verse: 1 },
        { book: 1, chapter: 1, verse: 1 },
      ],
    );
  });

  it("matches separated and misspelled words without fuzzy short-word collisions", async () => {
    const mock = createMockFetch();
    const fetchImpl = async (url) => {
      if (url.endsWith("1_genesis.json")) {
        return { ok: true, json: async () => ({ 1: [[1, "the word is good"]] }) };
      }
      if (url.endsWith("58_hebrews.json")) {
        return { ok: true, json: async () => ({ 1: [[1, "a piercing sword"]] }) };
      }
      return mock.fetchImpl(url);
    };
    const store = createScriptureStore({ fetchImpl });
    await store.initialize();

    const separated = await store.search("piercing sword");
    assert.deepEqual(
      separated.map(({ book, chapter, verse }) => ({ book, chapter, verse })),
      [{ book: 58, chapter: 1, verse: 1 }],
    );
    assert.deepEqual(separated[0].matchedTerms.sort(), ["piercing", "sword"]);

    const misspelled = await store.search("piercin sword");
    assert.deepEqual(
      misspelled.map(({ book, chapter, verse }) => ({ book, chapter, verse })),
      [{ book: 58, chapter: 1, verse: 1 }],
    );
    assert.deepEqual(await store.search("piercing word"), []);
  });

  it("searches KRV text with the edition-specific index", async () => {
    const mock = createMockFetch("./scripture/krv");
    const fetchImpl = async (url) => {
      if (url.endsWith("58_hebrews.json")) {
        return { ok: true, json: async () => ({ 1: [[1, "날선 검으로"]] }) };
      }
      return mock.fetchImpl(url);
    };
    const store = createScriptureStore({
      fetchImpl,
      dataPath: "./scripture/krv",
      displayBookNames: KRV_BOOK_NAMES,
    });
    await store.initialize();

    const matches = await store.search("날선 검");
    assert.deepEqual(
      matches.map(({ book, chapter, verse }) => ({ book, chapter, verse })),
      [{ book: 58, chapter: 1, verse: 1 }],
    );
    assert.deepEqual(matches[0].matchedTerms.sort(), ["검으로", "날선"]);
  });

  it("keeps warm searches responsive for a Bible-sized index", async () => {
    const verseCount = 31_000;
    const verses = Array.from({ length: verseCount }, (_, index) => [
      index + 1,
      index === verseCount - 1 ? "piercing sword" : `verse text ${index + 1}`,
    ]);
    const fetchImpl = async (url) => {
      if (url === "./scripture/kjv/index.json") {
        return { ok: true, json: async () => ({ chapterCounts: [1], bookFiles: ["1_genesis.json"] }) };
      }
      if (url === "./scripture/kjv/books/1_genesis.json") {
        return { ok: true, json: async () => ({ 1: verses }) };
      }
      return { ok: false };
    };
    const store = createScriptureStore({
      fetchImpl,
      canonicalBookNames: ["Genesis"],
      displayBookNames: ["Genesis"],
      bookOrder: [1],
    });
    await store.initialize();

    const coldStart = performance.now();
    const firstSearch = await store.search("piercing sword");
    const coldSearchDuration = performance.now() - coldStart;
    assert.equal(firstSearch.length, 1);
    assert.ok(coldSearchDuration < 5000, `Cold index build took ${coldSearchDuration.toFixed(1)} ms`);

    const warmStart = performance.now();
    for (let count = 0; count < 30; count += 1) {
      assert.equal((await store.search("piercing sword")).length, 1);
    }
    const warmSearchDuration = performance.now() - warmStart;
    assert.ok(warmSearchDuration < 1500, `Thirty warm searches took ${warmSearchDuration.toFixed(1)} ms`);
  });

  it("searches in the selected edition's book order", async () => {
    const mock = createMockFetch();
    const bookOrder = Array.from({ length: BOOKS.length }, (_, index) => BOOKS.length - index);
    const store = createScriptureStore({ fetchImpl: mock.fetchImpl, bookOrder });
    await store.initialize();

    assert.deepEqual(
      (await store.search("in the beginning")).map(({ book }) => book),
      [43, 1],
    );
  });

  it("rejects invalid chapter references", async () => {
    const store = createScriptureStore({
      fetchImpl: createMockFetch().fetchImpl,
    });
    await store.initialize();

    await assert.rejects(store.loadChapter(43, 4), RangeError);
    assert.equal(store.chapterCount(43), 3);
  });

  it("retries a book after its first fetch fails", async () => {
    const mock = createMockFetch();
    let bookAttempts = 0;
    const store = createScriptureStore({
      fetchImpl: async (url) => {
        if (url.endsWith("43_john.json") && ++bookAttempts === 1)
          return { ok: false };
        return mock.fetchImpl(url);
      },
    });
    await store.initialize();

    await assert.rejects(store.loadChapter(43, 1), /Could not load John/);
    const chapter = await store.loadChapter(43, 1);

    assert.equal(bookAttempts, 2);
    assert.equal(chapter[0].text, "In the beginning was the Word");
  });
});
