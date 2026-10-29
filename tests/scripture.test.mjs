import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOOKS, bookFileName } from "../books.mjs";
import { createScriptureRoutes, isValidVerseRange, normalizeVerseRange } from "../scripture-routes.mjs";
import { createScriptureStore } from "../scripture-store.js";

function createMockFetch() {
  const requests = [];
  const chapterCounts = BOOKS.map((_, index) => index === 42 ? 3 : 1);
  const bookFiles = BOOKS.map((_, index) => bookFileName(index + 1));
  const books = BOOKS.map((name, index) => ({
    1: [[1, index === 0 ? "In the beginning God created the heaven and the earth" : `${name} first verse`]]
  }));
  books[42] = {
    1: [[1, "In the beginning was the Word"]],
    2: [[1, "John chapter two"]],
    3: Array.from({ length: 16 }, (_, index) => [index + 1, index === 15 ? "For God so loved the world" : `John chapter three verse ${index + 1}`])
  };

  return {
    requests,
    fetchImpl: async (url) => {
      requests.push(url);
      const value = url === "./scripture/index.json"
        ? { chapterCounts, bookFiles }
        : books[bookFiles.indexOf(url.split("/").at(-1))];
      if (!value) return { ok: false };
      return { ok: true, json: async () => value };
    }
  };
}

describe("scripture routes", () => {
  const routes = createScriptureRoutes(BOOKS);

  it("defaults book-only and chapter-only routes to verse one", () => {
    assert.deepEqual(routes.parse("/b/john"), { book: 43, chapter: 1, range: { start: 1, end: 1 } });
    assert.deepEqual(routes.parse("/b/john/c/3"), { book: 43, chapter: 3, range: { start: 1, end: 1 } });
  });

  it("parses and builds single-verse and inclusive range routes", () => {
    assert.deepEqual(routes.parse("/b/john/c/3/v/16"), { book: 43, chapter: 3, range: { start: 16, end: 16 } });
    assert.deepEqual(routes.parse("/b/john/c/3/v/16-18"), { book: 43, chapter: 3, range: { start: 16, end: 18 } });
    assert.equal(routes.buildPath(43, 3, { start: 16, end: 16 }), "/b/john/c/3/v/16");
    assert.equal(routes.buildPath(43, 3, { start: 16, end: 18 }), "/b/john/c/3/v/16-18");
  });

  it("round-trips numbered and multiword book slugs", () => {
    for (const [book, name] of BOOKS.entries()) {
      const path = routes.buildPath(book + 1, 1, { start: 1, end: 1 });
      assert.equal(routes.parse(path).book, book + 1, name);
    }
  });

  it("supports an application mounted below the domain root", () => {
    const mountedRoutes = createScriptureRoutes(BOOKS, "/reader/");
    assert.equal(mountedRoutes.buildPath(43, 3, { start: 16, end: 18 }), "/reader/b/john/c/3/v/16-18");
    assert.deepEqual(mountedRoutes.parse("/reader/b/john/c/3/v/16-18"), {
      book: 43,
      chapter: 3,
      range: { start: 16, end: 18 }
    });
    assert.equal(mountedRoutes.parse("/other/b/john/c/3"), null);
  });

  it("rejects malformed or unknown routes", () => {
    for (const path of ["/b/not-a-book", "/b/john/c/0", "/b/john/c/3/v/18-16", "/b/john/c/3/v/1-2-3", "/b/john/3"]) {
      const route = routes.parse(path);
      assert.ok(route === null || (route.range && !isValidVerseRange(route.range, 16)), path);
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
    assert.equal(mock.requests.filter((url) => url.endsWith("43_john.json")).length, 1);
  });

  it("searches exact references and rejects missing verses", async () => {
    const store = createScriptureStore({ fetchImpl: createMockFetch().fetchImpl });
    await store.initialize();

    assert.deepEqual((await store.search("John 3:16")).map(({ book, chapter, verse }) => ({ book, chapter, verse })), [
      { book: 43, chapter: 3, verse: 16 }
    ]);
    assert.deepEqual(await store.search("John 3:99"), []);
    assert.deepEqual(await store.search("John 22:1"), []);
  });

  it("searches verse text across books", async () => {
    const store = createScriptureStore({ fetchImpl: createMockFetch().fetchImpl });
    await store.initialize();

    const matches = await store.search("in the beginning");
    assert.deepEqual(matches.map(({ book, chapter, verse }) => ({ book, chapter, verse })), [
      { book: 1, chapter: 1, verse: 1 },
      { book: 43, chapter: 1, verse: 1 }
    ]);
  });

  it("rejects invalid chapter references", async () => {
    const store = createScriptureStore({ fetchImpl: createMockFetch().fetchImpl });
    await store.initialize();

    await assert.rejects(store.loadChapter(43, 4), RangeError);
    assert.equal(store.chapterCount(43), 3);
  });
});