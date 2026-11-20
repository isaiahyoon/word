import { readFile, writeFile } from "node:fs/promises";
import { BOOKS } from "../js/books.mjs";
import { EDITIONS } from "../js/editions.mjs";
import { generateChapterData } from "./chapter-data.mjs";
import { writeSearchIndexCodeVersion } from "./search-index-version.mjs";
import { writeEditionBooks } from "./write-edition-books.mjs";

const searchIndexCodeVersion = await writeSearchIndexCodeVersion();

const sourceCommit = "65cdce887b141581b45097163b4b224de4a332fa";
const sourceUrl = `https://raw.githubusercontent.com/bluesaurel/Korean-Bible-1961-KRV/${sourceCommit}/bible_1961_krv.json`;
const sourceFileUrl = new URL("../sources/krv-1961.json", import.meta.url);
const outputUrl = new URL("../scripture/krv/", import.meta.url);
const bookOutputUrl = new URL("books/", outputUrl);
const canonicalIndex = JSON.parse(await readFile(new URL("../scripture/kjv/index.json", import.meta.url), "utf8"));
const sourceBooks = JSON.parse(await readFile(sourceFileUrl, "utf8"));
const canonicalBookIndexes = new Map(
  BOOKS.map((name, index) => [normalizeBookId(name), index]),
);
const books = Array.from({ length: BOOKS.length }, () => null);

for (const sourceBook of sourceBooks) {
  const index = canonicalBookIndexes.get(normalizeBookId(sourceBook.book));
  if (index === undefined) throw new Error(`Unknown KRV book: ${sourceBook.book}`);
  if (books[index]) throw new Error(`Duplicate KRV book: ${sourceBook.book}`);

  if (sourceBook.chapters.length !== canonicalIndex.chapterCounts[index]) {
    throw new Error(`Unexpected chapter count for KRV ${sourceBook.book}`);
  }

  const chapterData = {};
  sourceBook.chapters.forEach((chapter, chapterIndex) => {
    if (chapter.chapter !== chapterIndex + 1 || !Array.isArray(chapter.verses)) {
      throw new Error(`Invalid KRV chapter ${sourceBook.book} ${chapter.chapter}`);
    }

    chapterData[chapter.chapter] = chapter.verses.map((verse, verseIndex) => {
      if (verse.verse !== verseIndex + 1 || typeof verse.text !== "string") {
        throw new Error(`Invalid KRV verse ${sourceBook.book} ${chapter.chapter}:${verse.verse}`);
      }
      return [verse.verse, verse.text];
    });
  });

  books[index] = chapterData;
}

if (sourceBooks.length !== BOOKS.length || books.some((book) => book === null)) {
  throw new Error("KRV source does not cover the fixed 66-book canon");
}

const totalVerses = books.reduce(
  (total, book) => total + Object.values(book).reduce((count, verses) => count + verses.length, 0),
  0,
);
if (totalVerses !== 31102) throw new Error(`Expected 31,102 KRV verses, found ${totalVerses}`);

const { bookFiles, chapterCounts, searchIndexVersion } = await writeEditionBooks({
  editionId: "krv",
  books,
  bookOutputUrl,
  searchIndexCodeVersion,
  removeStaleBookFiles: true,
});

await writeFile(
  new URL("index.json", outputUrl),
  JSON.stringify({
    chapterCounts,
    bookFiles,
    searchIndexCodeVersion,
    searchIndexVersion,
    edition: EDITIONS.krv.id,
    sourceUrl,
    attribution: EDITIONS.krv.attribution,
  }),
);

await generateChapterData("krv");
console.log(`Wrote KRV data for ${BOOKS.length} books and ${totalVerses.toLocaleString()} verses.`);

function normalizeBookId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}