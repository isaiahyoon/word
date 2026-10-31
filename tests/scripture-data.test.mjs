import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { BOOKS, bookFileName } from "../js/books.mjs";

describe("generated scripture data", () => {
  it("preserves every verse in the KJV source", async () => {
    const source = JSON.parse(await readFile(new URL("../sources/kjv.json", import.meta.url), "utf8"));
    const manifest = JSON.parse(await readFile(new URL("../scripture/kjv/index.json", import.meta.url), "utf8"));
    const expectedBooks = Array.from({ length: BOOKS.length }, () => new Map());
    let excludedPlaceholderCount = 0;

    for (const { field } of source.contents) {
      const [, book, chapter, verse, text] = field;
      assert.ok(book >= 1 && book <= BOOKS.length, `Invalid KJV book number: ${book}`);
      if (book === 64 && chapter === 1 && verse === 15 && text === "[]") {
        excludedPlaceholderCount += 1;
        continue;
      }
      if (!expectedBooks[book - 1].has(chapter)) expectedBooks[book - 1].set(chapter, []);
      expectedBooks[book - 1].get(chapter).push([verse, text]);
    }

    await assertEditionMatchesSource(manifest, expectedBooks, "kjv");
    assert.equal([...expectedBooks].reduce((total, chapters) =>
      total + [...chapters.values()].reduce((count, verses) => count + verses.length, 0), 0),
    source.contents.length - 1);
    assert.equal(excludedPlaceholderCount, 1);
    const thirdJohn = JSON.parse(await readFile(
      new URL(`../scripture/kjv/books/${manifest.bookFiles[63]}`, import.meta.url),
      "utf8",
    ));
    assert.equal(thirdJohn[1].length, 14);
    assert.equal(thirdJohn[1].some(([verse]) => verse === 15), false);
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

  it("preserves JapBungo text, labels, and KJV verse numbering", async () => {
    const source = JSON.parse(await readFile(new URL("../sources/japbungo.json", import.meta.url), "utf8"));
    const manifest = JSON.parse(await readFile(new URL("../scripture/japbungo/index.json", import.meta.url), "utf8"));
    const canonicalIndex = JSON.parse(await readFile(new URL("../scripture/kjv/index.json", import.meta.url), "utf8"));
    const expectedBooks = Array.from({ length: BOOKS.length }, () => new Map());
    const fallbacks = new Map(source.fallbackVerses.map((fallback) => [
      `${fallback.book}:${fallback.chapter}:${fallback.verse}`,
      fallback,
    ]));
    let sourceVerseCount = 0;
    let fallbackVerseCount = 0;

    assert.equal(source.metadata.editionId, "japbungo");
    assert.equal(source.metadata.upstreamLicense, "Public Domain");
    assert.equal(source.metadata.versification, "KJV");
    assert.equal(source.books.length, BOOKS.length);

    for (const [bookIndex, sourceBook] of source.books.entries()) {
      assert.equal(sourceBook.number, bookIndex + 1);
      assert.ok(sourceBook.displayName);
      assert.equal(manifest.displayBookNames[bookIndex], sourceBook.displayName);

      const canonical = JSON.parse(await readFile(
        new URL(`../scripture/kjv/books/${canonicalIndex.bookFiles[bookIndex]}`, import.meta.url),
        "utf8",
      ));
      assert.equal(sourceBook.chapters.length, canonicalIndex.chapterCounts[bookIndex]);

      for (const [chapterIndex, sourceChapter] of sourceBook.chapters.entries()) {
        const chapter = chapterIndex + 1;
        assert.equal(sourceChapter.number, chapter);
        const verseTexts = new Map(sourceChapter.verses);
        assert.equal(verseTexts.size, sourceChapter.verses.length);
        sourceVerseCount += verseTexts.size;
        const chapterFallbackVerseCount = Math.max(0, ...source.fallbackVerses
          .filter((fallback) => fallback.book === bookIndex + 1 && fallback.chapter === chapter)
          .map((fallback) => fallback.verse));
        const expectedVerseCount = Math.max(canonical[chapter].length, chapterFallbackVerseCount);
        const expectedVerses = Array.from({ length: expectedVerseCount }, (_, index) => {
          const verse = index + 1;
          if (verseTexts.has(verse)) return [verse, verseTexts.get(verse)];
          const fallback = fallbacks.get(`${bookIndex + 1}:${chapter}:${verse}`);
          assert.ok(fallback, `Missing JapBungo fallback ${bookIndex + 1}:${chapter}:${verse}`);
          fallbackVerseCount += 1;
          const kjvReferenceText = canonical[chapter][index]?.[1];
          if (!kjvReferenceText || kjvReferenceText === "[]") {
            assert.equal(`${bookIndex + 1}:${chapter}:${verse}`, "64:1:15");
            return [verse, fallback.text, fallback.sourceEdition];
          }
          return [verse, fallback.text, fallback.sourceEdition, kjvReferenceText];
        });
        expectedBooks[bookIndex].set(chapter, expectedVerses);
      }
    }

    assert.equal(sourceVerseCount, 31099);
    assert.equal(fallbackVerseCount, 4);
    assert.equal(manifest.sourceVerseCount, sourceVerseCount);
    assert.equal(manifest.fallbackVerseCount, fallbackVerseCount);
    await assertEditionMatchesSource(manifest, expectedBooks, "japbungo");
  });

  it("preserves Diodati text and KJV verse numbering", async () => {
    const source = JSON.parse(await readFile(new URL("../sources/diodati.json", import.meta.url), "utf8"));
    const manifest = JSON.parse(await readFile(new URL("../scripture/diodati/index.json", import.meta.url), "utf8"));
    const canonicalIndex = JSON.parse(await readFile(new URL("../scripture/kjv/index.json", import.meta.url), "utf8"));
    const expectedBooks = Array.from({ length: BOOKS.length }, () => new Map());
    let sourceVerseCount = 0;

    assert.equal(source.metadata.editionId, "diodati");
    assert.equal(source.metadata.language, "it");
    assert.equal(source.metadata.versification, "KJV");
    assert.equal(source.books.length, BOOKS.length);

    for (const [bookIndex, sourceBook] of source.books.entries()) {
      assert.equal(sourceBook.number, bookIndex + 1);
      assert.equal(sourceBook.name, BOOKS[bookIndex]);
      assert.ok(sourceBook.displayName);
      assert.equal(manifest.displayBookNames[bookIndex], sourceBook.displayName);

      const canonical = JSON.parse(await readFile(
        new URL(`../scripture/kjv/books/${canonicalIndex.bookFiles[bookIndex]}`, import.meta.url),
        "utf8",
      ));
      assert.equal(sourceBook.chapters.length, canonicalIndex.chapterCounts[bookIndex]);

      for (const [chapterIndex, sourceChapter] of sourceBook.chapters.entries()) {
        const chapter = chapterIndex + 1;
        assert.equal(sourceChapter.number, chapter);
        assert.equal(sourceChapter.verses.length, canonical[chapter].length);
        for (const [verseIndex, [verse, text]] of sourceChapter.verses.entries()) {
          assert.equal(verse, verseIndex + 1);
          assert.equal(typeof text, "string");
        }
        sourceVerseCount += sourceChapter.verses.length;
        expectedBooks[bookIndex].set(chapter, sourceChapter.verses);
      }
    }

    assert.equal(sourceVerseCount, 31102);
    assert.equal(manifest.sourceVerseCount, sourceVerseCount);
    await assertEditionMatchesSource(manifest, expectedBooks, "diodati");
  });

  it("preserves Luther text, German book labels, and KJV verse numbering", async () => {
    const source = JSON.parse(await readFile(new URL("../sources/luther_1912.json", import.meta.url), "utf8"));
    const manifest = JSON.parse(await readFile(new URL("../scripture/luther1912/index.json", import.meta.url), "utf8"));
    const canonicalIndex = JSON.parse(await readFile(new URL("../scripture/kjv/index.json", import.meta.url), "utf8"));
    const expectedBooks = Array.from({ length: BOOKS.length }, () => new Map());
    const displayBookNames = Array(BOOKS.length);

    assert.equal(source.metadata.module, "luther_1912");
    assert.equal(source.metadata.lang_short, "de");
    assert.equal(source.metadata.year, "1912");
    assert.equal(source.metadata.copyright, 0);

    for (const record of source.verses) {
      const { book, book_name: displayName, chapter, verse, text } = record;
      const bookIndex = book - 1;
      assert.ok(bookIndex >= 0 && bookIndex < BOOKS.length);
      assert.ok(displayName);
      assert.equal(typeof text, "string");
      if (displayBookNames[bookIndex] === undefined) displayBookNames[bookIndex] = displayName;
      assert.equal(displayBookNames[bookIndex], displayName);
      if (!expectedBooks[bookIndex].has(chapter)) expectedBooks[bookIndex].set(chapter, new Map());
      const chapterVerses = expectedBooks[bookIndex].get(chapter);
      assert.equal(chapterVerses.has(verse), false, `${displayName} ${chapter}:${verse} is unique`);
      chapterVerses.set(verse, [verse, text]);
    }

    assert.equal(displayBookNames.length, BOOKS.length);
    let sourceVerseCount = 0;
    for (const [bookIndex, chapters] of expectedBooks.entries()) {
      assert.ok(displayBookNames[bookIndex]);
      assert.equal(manifest.displayBookNames[bookIndex], displayBookNames[bookIndex]);
      assert.equal(chapters.size, canonicalIndex.chapterCounts[bookIndex]);
      const canonical = JSON.parse(await readFile(
        new URL(`../scripture/kjv/books/${canonicalIndex.bookFiles[bookIndex]}`, import.meta.url),
        "utf8",
      ));
      for (let chapter = 1; chapter <= canonicalIndex.chapterCounts[bookIndex]; chapter += 1) {
        const verses = chapters.get(chapter);
        assert.ok(verses, `${displayBookNames[bookIndex]} chapter ${chapter} exists`);
        assert.equal(verses.size, canonical[chapter].length);
        const orderedVerses = Array.from({ length: canonical[chapter].length }, (_, index) => {
          const record = verses.get(index + 1);
          assert.ok(record, `${displayBookNames[bookIndex]} ${chapter}:${index + 1} exists`);
          return record;
        });
        chapters.set(chapter, orderedVerses);
        sourceVerseCount += orderedVerses.length;
      }
    }

    assert.equal(sourceVerseCount, source.verses.length);
    assert.equal(manifest.sourceVerseCount, sourceVerseCount);
    assert.equal(manifest.language, "de");
    assert.equal(manifest.versification, "KJV");
    assert.equal(manifest.rightsUrl, "https://ebible.org/details.php?id=deu1912");
    await assertEditionMatchesSource(manifest, expectedBooks, "luther1912");
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