import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { BOOKS, bookFileName } from "../books.mjs";

describe("generated scripture data", () => {
  it("matches every verse in the canonical source", async () => {
    const source = JSON.parse(await readFile(new URL("../kjv.json", import.meta.url), "utf8"));
    const manifest = JSON.parse(await readFile(new URL("../scripture/index.json", import.meta.url), "utf8"));
    const expectedBooks = Array.from({ length: BOOKS.length }, () => new Map());

    for (const { field } of source.contents) {
      const [, book, chapter, verse, text] = field;
      assert.ok(book >= 1 && book <= BOOKS.length, `Invalid book number: ${book}`);
      if (!expectedBooks[book - 1].has(chapter)) expectedBooks[book - 1].set(chapter, []);
      expectedBooks[book - 1].get(chapter).push([verse, text]);
    }

    assert.equal(manifest.bookFiles.length, BOOKS.length);
    assert.equal(manifest.chapterCounts.length, BOOKS.length);

    let comparedVerses = 0;
    for (const [index, expectedChapters] of expectedBooks.entries()) {
      const book = index + 1;
      const fileName = bookFileName(book);
      assert.equal(manifest.bookFiles[index], fileName);
      assert.equal(manifest.chapterCounts[index], expectedChapters.size);

      const bookData = JSON.parse(await readFile(new URL(`../scripture/books/${fileName}`, import.meta.url), "utf8"));
      assert.equal(Object.keys(bookData).length, expectedChapters.size, `${BOOKS[index]} chapter count`);
      for (const [chapter, expectedVerses] of expectedChapters) {
        assert.deepEqual(bookData[chapter], expectedVerses, `${BOOKS[index]} ${chapter}`);
        comparedVerses += expectedVerses.length;
      }
    }

    assert.equal(comparedVerses, source.contents.length);
  });
});