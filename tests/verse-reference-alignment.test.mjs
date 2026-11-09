import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createVerseReferenceAlignment } from "../js/verse-reference-alignment.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

async function chapterVerses(editionId, book, chapter) {
  const index = await readJson(`../scripture/${editionId}/index.json`);
  const bookData = await readJson(`../scripture/${editionId}/books/${index.bookFiles[book - 1]}`);
  return bookData[chapter];
}

test("maps verified numbering differences and leaves uncertain chapters unavailable", async () => {
  const martinIndex = await readJson("../scripture/martin1744/index.json");
  const martin = createVerseReferenceAlignment("martin1744", martinIndex, {
    book: 19,
    chapter: 42,
    verseCount: (await chapterVerses("martin1744", 19, 42)).length,
    kjvVerseCount: (await chapterVerses("kjv", 19, 42)).length,
  });
  assert.deepEqual(martin.toKjvReferences(19, 42, 1), []);
  assert.deepEqual(martin.toKjvReferences(19, 42, 2), [[19, 42, 1]]);
  assert.deepEqual(martin.toKjvReferences(19, 42, 6), [[19, 42, 5]]);
  assert.equal(martin.toKjvReferences(4, 12, 1), null);

  const almIndex = await readJson("../scripture/alm1911/index.json");
  const alm = createVerseReferenceAlignment("alm1911", almIndex, {
    book: 47,
    chapter: 13,
    verseCount: (await chapterVerses("alm1911", 47, 13)).length,
    kjvVerseCount: (await chapterVerses("kjv", 47, 13)).length,
  });
  assert.deepEqual(alm.toKjvReferences(47, 13, 12), [[47, 13, 12], [47, 13, 13]]);
  assert.deepEqual(alm.toKjvReferences(47, 13, 13), [[47, 13, 14]]);
  assert.deepEqual(alm.toKjvReferences(47, 13, 11), [[47, 13, 11]]);

  const jap = createVerseReferenceAlignment("japbungo", {}, {
    book: 64,
    chapter: 1,
    verseCount: (await chapterVerses("japbungo", 64, 1)).length,
    kjvVerseCount: (await chapterVerses("kjv", 64, 1)).length,
  });
  assert.deepEqual(jap.toKjvReferences(64, 1, 14), [[64, 1, 14]]);
  assert.deepEqual(jap.toKjvReferences(64, 1, 15), []);

  const krv = createVerseReferenceAlignment("krv", {}, {
    book: 22,
    chapter: 6,
    verseCount: (await chapterVerses("krv", 22, 6)).length,
    kjvVerseCount: (await chapterVerses("kjv", 22, 6)).length,
  });
  assert.equal(krv.toKjvReferences(22, 6, 14), null);

  const rvIndex = await readJson("../scripture/rv1865/index.json");
  const rv = createVerseReferenceAlignment("rv1865", rvIndex);
  assert.equal(rv.toKjvReferences(9, 20, 1), null);
  assert.equal(rv.toKjvReferences(7, 14, 18), null);
  assert.deepEqual(rv.toKjvReferences(43, 3, 16), [[43, 3, 16]]);
});

test("classifies every verse reference in every edition against existing KJV slots", async () => {
  const kjvIndex = await readJson("../scripture/kjv/index.json");
  const kjvBooks = await Promise.all(kjvIndex.bookFiles.map((file) =>
    readJson(`../scripture/kjv/books/${file}`)
  ));
  const editionIds = ["kjv", "krv", "diodati", "luther1912", "japbungo", "martin1744", "rv1865", "alm1911"];

  for (const editionId of editionIds) {
    const index = await readJson(`../scripture/${editionId}/index.json`);
    for (const [bookIndex, file] of index.bookFiles.entries()) {
      const chapters = await readJson(`../scripture/${editionId}/books/${file}`);
      for (const [chapterKey, verses] of Object.entries(chapters)) {
        const chapter = Number(chapterKey);
        const kjvChapter = kjvBooks[bookIndex][chapterKey];
        const countMismatch = verses.length !== kjvChapter.length;
        const alignment = createVerseReferenceAlignment(editionId, index, {
          book: bookIndex + 1,
          chapter,
          verseCount: verses.length,
          kjvVerseCount: kjvChapter.length,
        });
        const knownCountMismatch = (
          editionId === "martin1744" && bookIndex + 1 === 19 && chapter === 42
        ) || (
          editionId === "alm1911" && bookIndex + 1 === 47 && chapter === 13
        ) || (
          editionId === "japbungo" && bookIndex + 1 === 64 && chapter === 1
        );
        if (countMismatch && !knownCountMismatch) {
          assert.equal(alignment.isChapterAligned(bookIndex + 1, chapter), false);
        }
        for (const [verse] of verses) {
          const references = alignment.toKjvReferences(bookIndex + 1, chapter, verse);
          if (references === null) {
            assert.equal(alignment.isChapterAligned(bookIndex + 1, chapter), false);
            continue;
          }
          if (references.length === 0) {
            assert.ok(
              (editionId === "martin1744" && bookIndex + 1 === 19 && chapter === 42 && verse === 1) ||
              (editionId === "japbungo" && bookIndex + 1 === 64 && chapter === 1 && verse === 15),
              `${editionId} ${bookIndex + 1}:${chapter}:${verse} has an unexpected missing KJV reference`,
            );
            continue;
          }
          for (const [book, refChapter, refVerse] of references) {
            assert.ok(
              kjvBooks[book - 1][refChapter]?.some(([number]) => number === refVerse),
              `${editionId} ${bookIndex + 1}:${chapter}:${verse} maps to missing KJV ${book}:${refChapter}:${refVerse}`,
            );
          }
        }
      }
    }
  }
});
