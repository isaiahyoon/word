import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { BOOKS, bookFileName } from "../js/books.mjs";

describe("generated scripture data", () => {
  it("preserves every verse in the KJV source", async () => {
    const source = JSON.parse(await readFile(new URL("../sources/kjv.json", import.meta.url), "utf8"));
    const manifest = JSON.parse(await readFile(new URL("../scripture/kjv/index.json", import.meta.url), "utf8"));
    const expectedBooks = Array.from({ length: BOOKS.length }, () => new Map());

    for (const { field } of source.contents) {
      const [, book, chapter, verse, text] = field;
      assert.ok(book >= 1 && book <= BOOKS.length, `Invalid KJV book number: ${book}`);
      if (!expectedBooks[book - 1].has(chapter)) expectedBooks[book - 1].set(chapter, []);
      expectedBooks[book - 1].get(chapter).push([verse, text]);
    }

    await assertEditionMatchesSource(manifest, expectedBooks, "kjv");
    assert.equal([...expectedBooks].reduce((total, chapters) =>
      total + [...chapters.values()].reduce((count, verses) => count + verses.length, 0), 0),
    source.contents.length);
  });

  it("preserves every verse in the KRV source", async () => {
    const source = JSON.parse(await readFile(new URL("../sources/krv-1961.json", import.meta.url), "utf8"));
    const manifest = JSON.parse(await readFile(new URL("../scripture/krv/index.json", import.meta.url), "utf8"));
    const bookIndexes = new Map(BOOKS.map((name, index) => [normalizeBookId(name), index]));
    const expectedBooks = Array.from({ length: BOOKS.length }, () => new Map());
    const seenBooks = new Set();
    let sourceVerseCount = 0;

    for (const sourceBook of source) {
      const bookIndex = bookIndexes.get(normalizeBookId(sourceBook.book));
      assert.notEqual(bookIndex, undefined, `Unknown KRV source book: ${sourceBook.book}`);
      assert.equal(seenBooks.has(bookIndex), false, `Duplicate KRV source book: ${sourceBook.book}`);
      seenBooks.add(bookIndex);

      for (const [chapterIndex, sourceChapter] of sourceBook.chapters.entries()) {
        assert.equal(sourceChapter.chapter, chapterIndex + 1, `${sourceBook.book} chapter order`);
        const expectedVerses = sourceChapter.verses.map((verse, verseIndex) => {
          assert.equal(verse.verse, verseIndex + 1, `${sourceBook.book} ${sourceChapter.chapter} verse order`);
          assert.equal(typeof verse.text, "string", `${sourceBook.book} ${sourceChapter.chapter}:${verse.verse} text`);
          return [verse.verse, verse.text];
        });
        expectedBooks[bookIndex].set(sourceChapter.chapter, expectedVerses);
        sourceVerseCount += expectedVerses.length;
      }
    }

    assert.equal(seenBooks.size, BOOKS.length, "KRV covers the fixed 66-book canon");
    assert.equal(sourceVerseCount, 31102);
    await assertEditionMatchesSource(manifest, expectedBooks, "krv");
  });

  async function assertEditionMatchesSource(manifest, expectedBooks, edition) {
    assert.equal(manifest.edition, edition);
    assert.equal(manifest.bookFiles.length, BOOKS.length);
    assert.equal(manifest.chapterCounts.length, BOOKS.length);

    let comparedVerses = 0;
    for (const [index, expectedChapters] of expectedBooks.entries()) {
      const bookNumber = index + 1;
      const fileName = bookFileName(bookNumber);
      assert.equal(manifest.bookFiles[index], fileName);
      assert.equal(manifest.chapterCounts[index], expectedChapters.size);

      const bookData = JSON.parse(await readFile(
        new URL(`../scripture/${edition}/books/${fileName}`, import.meta.url),
        "utf8",
      ));
      assert.equal(Object.keys(bookData).length, expectedChapters.size, `${edition} ${BOOKS[index]} chapter count`);
      for (const [chapter, expectedVerses] of expectedChapters) {
        assert.deepEqual(bookData[chapter], expectedVerses, `${edition} ${BOOKS[index]} ${chapter}`);
        comparedVerses += expectedVerses.length;
      }
    }

    const expectedVerseCount = expectedBooks.reduce(
      (total, chapters) => total + [...chapters.values()].reduce((count, verses) => count + verses.length, 0),
      0,
    );
    assert.equal(comparedVerses, expectedVerseCount, `${edition} verse total`);
  }
});

function normalizeBookId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}