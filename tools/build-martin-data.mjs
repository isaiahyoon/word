import { readFile, writeFile } from "node:fs/promises";
import { BOOKS } from "../js/books.mjs";
import { MARTIN_BOOK_NAMES } from "../js/editions.mjs";
import { generateChapterData } from "./chapter-data.mjs";
import { writeSearchIndexCodeVersion } from "./search-index-version.mjs";
import { writeEditionBooks } from "./write-edition-books.mjs";

const searchIndexCodeVersion = await writeSearchIndexCodeVersion();

const sourceUrl = new URL("../sources/martin_1744.json", import.meta.url);
const canonicalIndexUrl = new URL("../scripture/kjv/index.json", import.meta.url);
const outputUrl = new URL("../scripture/martin1744/", import.meta.url);
const bookOutputUrl = new URL("books/", outputUrl);
const source = JSON.parse(await readFile(sourceUrl, "utf8"));
const canonicalIndex = JSON.parse(await readFile(canonicalIndexUrl, "utf8"));
const normalizeBookName = (name) => name === "Revelation of John"
  ? "Revelation"
  : name.replace(/^(III|II|I) /, (_, numeral) => `${numeral.length} `);

if (
  !Array.isArray(source.books) ||
  source.books.length !== BOOKS.length ||
  MARTIN_BOOK_NAMES.length !== BOOKS.length ||
  canonicalIndex.chapterCounts.length !== BOOKS.length ||
  canonicalIndex.bookFiles.length !== BOOKS.length
) {
  throw new Error("Martin source or canonical KJV index is invalid");
}

const books = [];
const displayBookNames = [];
const numberingDifferences = [];
const excludedEmptyRecords = [];
let sourceVerseCount = 0;
let sourceRecordCount = 0;

for (const [bookIndex, sourceBook] of source.books.entries()) {
  const bookNumber = bookIndex + 1;
  if (
    normalizeBookName(sourceBook.name) !== BOOKS[bookIndex] ||
    !Array.isArray(sourceBook.chapters) ||
    sourceBook.chapters.length !== canonicalIndex.chapterCounts[bookIndex]
  ) {
    throw new Error(`Unexpected Martin book or chapter coverage for ${BOOKS[bookIndex]}`);
  }

  const chapterData = {};
  for (const [chapterIndex, sourceChapter] of sourceBook.chapters.entries()) {
    const chapter = chapterIndex + 1;
    if (sourceChapter.chapter !== chapter || !Array.isArray(sourceChapter.verses)) {
      throw new Error(`Invalid Martin chapter ${BOOKS[bookIndex]} ${sourceChapter.chapter}`);
    }

    const verses = [];
    for (const [verseIndex, record] of sourceChapter.verses.entries()) {
      if (
        record.chapter !== chapter ||
        record.verse !== verseIndex + 1 ||
        typeof record.text !== "string"
      ) {
        throw new Error(`Invalid Martin verse ${BOOKS[bookIndex]} ${chapter}:${verseIndex + 1}`);
      }
      sourceRecordCount += 1;
      if (record.text.trim() === "") {
        excludedEmptyRecords.push({ book: bookNumber, chapter, verse: record.verse });
        continue;
      }
      verses.push([record.verse, record.text]);
    }

    const canonicalBook = JSON.parse(await readFile(
      new URL(`../scripture/kjv/books/${canonicalIndex.bookFiles[bookIndex]}`, import.meta.url),
      "utf8",
    ));
    const kjvVerseCount = canonicalBook[chapter]?.length ?? 0;
    if (verses.length !== kjvVerseCount) {
      numberingDifferences.push({
        book: bookNumber,
        chapter,
        martinVerseCount: verses.length,
        kjvVerseCount,
      });
    }
    sourceVerseCount += verses.length;
    chapterData[chapter] = verses;
  }

  books.push(chapterData);
  displayBookNames.push(MARTIN_BOOK_NAMES[bookIndex]);
}

const { bookFiles, chapterCounts, searchIndexVersion } = await writeEditionBooks({
  editionId: "martin1744",
  books,
  bookOutputUrl,
  searchIndexCodeVersion,
});

await writeFile(
  new URL("index.json", outputUrl),
  JSON.stringify({
    edition: "martin1744",
    chapterCounts,
    bookFiles,
    searchIndexCodeVersion,
    searchIndexVersion,
    displayBookNames,
    language: "fr",
    source: "David Martin Bible (1744)",
    sourceUrl: "https://github.com/getbible/v2/tree/master/martin",
    sourceVersion: "1744",
    license: "Public domain",
    versification: "Calvin",
    sourceVerseCount,
    sourceRecordCount,
    kjvVerseCount: 31102,
    numberingDifferences,
    excludedEmptyRecords,
  }),
);

await generateChapterData("martin1744");
console.log(
  `Wrote Martin data for ${BOOKS.length} books, ${sourceVerseCount.toLocaleString()} native verses, and ${numberingDifferences.length} chapters with KJV count differences.`,
);