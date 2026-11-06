import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOOKS } from "../js/books.mjs";
import { createScriptureRoutes, getVerseStep, isValidVerseRange, normalizeVerseRange } from "../js/scripture-routes.mjs";

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
        editionRoot: true,
      });
    }

    const futureEditionRoutes = createScriptureRoutes(BOOKS, "/", ["kjv", "future-edition"]);
    assert.equal(futureEditionRoutes.parse("/future-edition").book, 1);
    assert.equal(futureEditionRoutes.parse("/future-edition").editionId, "future-edition");
  });

  it("accepts an optional trailing slash on reader routes", () => {
    for (const path of [
      "/kjv/",
      "/krv/b/john/c/3/v/16/",
      "/b/john/3/16/",
    ]) {
      assert.deepEqual(routes.parse(path), routes.parse(path.slice(0, -1)), path);
    }
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

  it("maps public route segments to internal edition ids", () => {
    const editionRoutes = createScriptureRoutes(BOOKS, "/", {
      kjv: { routeSegment: "kjv" },
      luther1912: { routeSegment: "licht" },
    });

    assert.deepEqual(editionRoutes.parse("/licht/b/john/c/3/v/16"), {
      editionId: "luther1912",
      book: 43,
      chapter: 3,
      range: { start: 16, end: 16 },
      legacy: false,
    });
    assert.equal(editionRoutes.parse("/licht").editionId, "luther1912");
    assert.equal(
      editionRoutes.buildPath(43, 3, { start: 16, end: 16 }, "luther1912"),
      "/licht/b/john/c/3/v/16",
    );
    assert.equal(editionRoutes.parse("/luther1912/b/john/c/3/v/16"), null);

    const martinRoutes = createScriptureRoutes(BOOKS, "/", {
      kjv: { routeSegment: "kjv" },
      martin1744: { routeSegment: "moh" },
    });
    assert.deepEqual(martinRoutes.parse("/moh/b/psalms/c/3/v/2"), {
      editionId: "martin1744",
      book: 19,
      chapter: 3,
      range: { start: 2, end: 2 },
      legacy: false,
    });
    assert.equal(
      martinRoutes.buildPath(19, 3, { start: 2, end: 2 }, "martin1744"),
      "/moh/b/psalms/c/3/v/2",
    );

    const rv1865Routes = createScriptureRoutes(BOOKS, "/", {
      kjv: { routeSegment: "kjv" },
      rv1865: { routeSegment: "luz" },
    });
    assert.deepEqual(rv1865Routes.parse("/luz/b/john/c/1/v/1"), {
      editionId: "rv1865",
      book: 43,
      chapter: 1,
      range: { start: 1, end: 1 },
      legacy: false,
    });
    assert.equal(
      rv1865Routes.buildPath(43, 1, { start: 1, end: 1 }, "rv1865"),
      "/luz/b/john/c/1/v/1",
    );

    const alm1911Routes = createScriptureRoutes(BOOKS, "/", {
      kjv: { routeSegment: "kjv" },
      alm1911: { routeSegment: "alm" },
    });
    assert.deepEqual(alm1911Routes.parse("/alm/b/john/c/3/v/16"), {
      editionId: "alm1911",
      book: 43,
      chapter: 3,
      range: { start: 16, end: 16 },
      legacy: false,
    });
    assert.equal(
      alm1911Routes.buildPath(43, 3, { start: 16, end: 16 }, "alm1911"),
      "/alm/b/john/c/3/v/16",
    );
    assert.equal(alm1911Routes.parse("/alm").editionId, "alm1911");
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

