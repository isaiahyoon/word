import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { BOOKS, bookFileName } from "../js/books.mjs";

const sourceFileUrl = new URL("../sources/japbungo.json", import.meta.url);
const canonicalIndexUrl = new URL("../scripture/kjv/index.json", import.meta.url);
const outputUrl = new URL("../scripture/japbungo/", import.meta.url);
const bookOutputUrl = new URL("books/", outputUrl);
const source = JSON.parse(await readFile(sourceFileUrl, "utf8"));
const canonicalIndex = JSON.parse(await readFile(canonicalIndexUrl, "utf8"));

if (
  source.metadata?.editionId !== "japbungo" ||
  source.metadata.language !== "ja" ||
  source.metadata.upstreamLicense !== "Public Domain" ||
  source.metadata.versification !== "KJV" ||
  !Array.isArray(source.books) ||
  source.books.length !== BOOKS.length ||
  !Array.isArray(source.fallbackVerses)
) {
  throw new Error("The JapBungo source metadata or book list is invalid");
}

if (
  canonicalIndex.chapterCounts.length !== BOOKS.length ||
  canonicalIndex.bookFiles.length !== BOOKS.length
) {
  throw new Error("The canonical KJV index is invalid");
}

const books = Array.from({ length: BOOKS.length }, () => null);
const fallbackVerseTexts = new Map();
for (const fallback of source.fallbackVerses) {
  const key = `${fallback.book}:${fallback.chapter}:${fallback.verse}`;
  if (
    !Number.isInteger(fallback.book) ||
    fallback.book < 1 ||
    fallback.book > BOOKS.length ||
    !Number.isInteger(fallback.chapter) ||
    fallback.chapter < 1 ||
    !Number.isInteger(fallback.verse) ||
    fallback.verse < 1 ||
    fallback.sourceEdition !== "krv" ||
    fallback.language !== "ko" ||
    typeof fallback.text !== "string" ||
    fallback.text.length === 0 ||
    fallbackVerseTexts.has(key)
  ) {
    throw new Error(`Invalid JapBungo fallback verse: ${key}`);
  }
  fallbackVerseTexts.set(key, fallback);
}

let sourceVerseCount = 0;
let generatedVerseCount = 0;
let fallbackVerseCount = 0;
const usedFallbackVerses = new Set();

for (const [bookIndex, sourceBook] of source.books.entries()) {
  const bookNumber = bookIndex + 1;
  if (
    sourceBook.number !== bookNumber ||
    typeof sourceBook.displayName !== "string" ||
    sourceBook.displayName.trim() === "" ||
    !Array.isArray(sourceBook.chapters)
  ) {
    throw new Error(`Invalid JapBungo book record at ${BOOKS[bookIndex]}`);
  }

  if (sourceBook.chapters.length !== canonicalIndex.chapterCounts[bookIndex]) {
    throw new Error(`Unexpected JapBungo chapter count for ${BOOKS[bookIndex]}`);
  }

  const canonicalBook = JSON.parse(await readFile(
    new URL(`../scripture/kjv/books/${canonicalIndex.bookFiles[bookIndex]}`, import.meta.url),
    "utf8",
  ));
  const chapterData = {};

  for (const [chapterIndex, sourceChapter] of sourceBook.chapters.entries()) {
    const chapterNumber = chapterIndex + 1;
    if (sourceChapter.number !== chapterNumber || !Array.isArray(sourceChapter.verses)) {
      throw new Error(`Invalid JapBungo chapter ${BOOKS[bookIndex]} ${sourceChapter.number}`);
    }

    const canonicalChapter = canonicalBook[chapterNumber];
    if (!canonicalChapter?.length) throw new Error(`Missing canonical chapter ${BOOKS[bookIndex]} ${chapterNumber}`);
    const chapterFallbackVerseCount = source.fallbackVerses.reduce((maximum, fallback) =>
      fallback.book === bookNumber && fallback.chapter === chapterNumber
        ? Math.max(maximum, fallback.verse)
        : maximum,
    0);
    const expectedVerseCount = Math.max(canonicalChapter.length, chapterFallbackVerseCount);

    const verseTexts = new Map();
    let previousVerse = 0;
    for (const record of sourceChapter.verses) {
      if (
        !Array.isArray(record) ||
        record.length !== 2 ||
        !Number.isSafeInteger(record[0]) ||
        record[0] <= previousVerse ||
        record[0] > expectedVerseCount ||
        typeof record[1] !== "string"
      ) {
        throw new Error(`Invalid JapBungo verse in ${BOOKS[bookIndex]} ${chapterNumber}`);
      }
      previousVerse = record[0];
      verseTexts.set(record[0], record[1]);
      sourceVerseCount += 1;
    }

    const denseVerses = Array.from({ length: expectedVerseCount }, (_, index) => {
      const verse = index + 1;
      if (verseTexts.has(verse)) return [verse, verseTexts.get(verse)];

      const fallbackKey = `${bookNumber}:${chapterNumber}:${verse}`;
      const fallback = fallbackVerseTexts.get(fallbackKey);
      if (!fallback) throw new Error(`Missing JapBungo verse without a declared fallback: ${fallbackKey}`);
      usedFallbackVerses.add(fallbackKey);
      fallbackVerseCount += 1;
      const kjvReferenceText = canonicalChapter[index]?.[1];
      return kjvReferenceText && kjvReferenceText !== "[]"
        ? [verse, fallback.text, fallback.sourceEdition, kjvReferenceText]
        : [verse, fallback.text, fallback.sourceEdition];
    });
    generatedVerseCount += denseVerses.length;
    chapterData[chapterNumber] = denseVerses;
  }

  books[bookIndex] = chapterData;
}

if (books.some((book) => book === null)) throw new Error("JapBungo does not cover the fixed canon");
if (usedFallbackVerses.size !== fallbackVerseTexts.size) {
  throw new Error("JapBungo fallback list includes verses that are not missing from the source");
}

await mkdir(bookOutputUrl, { recursive: true });
for (const file of await readdir(bookOutputUrl)) {
  if (/^\d+_[a-z0-9_]+\.json$/.test(file)) await unlink(new URL(file, bookOutputUrl));
}

const bookFiles = BOOKS.map((_, index) => bookFileName(index + 1));
const chapterCounts = books.map((book) => Object.keys(book).length);
for (const [index, book] of books.entries()) {
  await writeFile(new URL(bookFiles[index], bookOutputUrl), JSON.stringify(book));
}

await writeFile(
  new URL("index.json", outputUrl),
  JSON.stringify({
    edition: source.metadata.editionId,
    chapterCounts,
    bookFiles,
    displayBookNames: source.books.map((book) => book.displayName),
    language: source.metadata.language,
    sourceUrl: source.metadata.sourceApi,
    sourceRepository: source.metadata.sourceRepository,
    sourceSha: source.metadata.upstreamSha,
    sourceVersion: source.metadata.upstreamVersion,
    license: source.metadata.upstreamLicense,
    versification: source.metadata.versification,
    sourceVerseCount,
    generatedVerseCount,
    fallbackVerseCount,
  }),
);

console.log(
  `Wrote JapBungo data for ${BOOKS.length} books, ${sourceVerseCount.toLocaleString()} Japanese source verses, ${generatedVerseCount.toLocaleString()} generated verse slots, and ${fallbackVerseCount} KRV fallback verses.`,
);