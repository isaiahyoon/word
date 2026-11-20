import { readFile, writeFile } from "node:fs/promises";
import { BOOKS } from "../js/books.mjs";
import { generateChapterData } from "./chapter-data.mjs";
import { writeSearchIndexCodeVersion } from "./search-index-version.mjs";
import { writeEditionBooks } from "./write-edition-books.mjs";

const searchIndexCodeVersion = await writeSearchIndexCodeVersion();

const sourceFileUrl = new URL("../sources/diodati.json", import.meta.url);
const canonicalIndexUrl = new URL("../scripture/kjv/index.json", import.meta.url);
const outputUrl = new URL("../scripture/diodati/", import.meta.url);
const bookOutputUrl = new URL("books/", outputUrl);
const source = JSON.parse(await readFile(sourceFileUrl, "utf8"));
const canonicalIndex = JSON.parse(await readFile(canonicalIndexUrl, "utf8"));

if (
  source.metadata?.editionId !== "diodati" ||
  source.metadata.language !== "it" ||
  source.metadata.versification !== "KJV" ||
  !Array.isArray(source.books) ||
  source.books.length !== BOOKS.length
) {
  throw new Error("The Diodati source metadata or book list is invalid");
}

if (
  canonicalIndex.chapterCounts.length !== BOOKS.length ||
  canonicalIndex.bookFiles.length !== BOOKS.length
) {
  throw new Error("The canonical KJV index is invalid");
}

const books = [];
let sourceVerseCount = 0;

for (const [bookIndex, sourceBook] of source.books.entries()) {
  const bookNumber = bookIndex + 1;
  if (
    sourceBook.number !== bookNumber ||
    sourceBook.name !== BOOKS[bookIndex] ||
    typeof sourceBook.displayName !== "string" ||
    sourceBook.displayName.trim() === "" ||
    !Array.isArray(sourceBook.chapters)
  ) {
    throw new Error(`Invalid Diodati book record at ${BOOKS[bookIndex]}`);
  }

  if (sourceBook.chapters.length !== canonicalIndex.chapterCounts[bookIndex]) {
    throw new Error(`Unexpected Diodati chapter count for ${BOOKS[bookIndex]}`);
  }

  const canonicalBook = JSON.parse(await readFile(
    new URL(`../scripture/kjv/books/${canonicalIndex.bookFiles[bookIndex]}`, import.meta.url),
    "utf8",
  ));
  const chapterData = {};

  for (const [chapterIndex, sourceChapter] of sourceBook.chapters.entries()) {
    const chapterNumber = chapterIndex + 1;
    const canonicalChapter = canonicalBook[chapterNumber];
    if (
      sourceChapter.number !== chapterNumber ||
      !Array.isArray(sourceChapter.verses) ||
      sourceChapter.verses.length !== canonicalChapter?.length
    ) {
      throw new Error(`Invalid Diodati chapter ${BOOKS[bookIndex]} ${chapterNumber}`);
    }

    const verses = sourceChapter.verses.map((record, verseIndex) => {
      const verseNumber = verseIndex + 1;
      if (
        !Array.isArray(record) ||
        record.length !== 2 ||
        record[0] !== verseNumber ||
        typeof record[1] !== "string" ||
        record[1].length === 0
      ) {
        throw new Error(`Invalid Diodati verse ${BOOKS[bookIndex]} ${chapterNumber}:${verseNumber}`);
      }
      sourceVerseCount += 1;
      return [verseNumber, record[1]];
    });

    chapterData[chapterNumber] = verses;
  }

  books.push(chapterData);
}

if (sourceVerseCount !== 31102) {
  throw new Error(`Unexpected Diodati verse count: ${sourceVerseCount}`);
}

const { bookFiles, chapterCounts, searchIndexVersion } = await writeEditionBooks({
  editionId: "diodati",
  books,
  bookOutputUrl,
  searchIndexCodeVersion,
});

await writeFile(
  new URL("index.json", outputUrl),
  JSON.stringify({
    edition: source.metadata.editionId,
    chapterCounts,
    bookFiles,
    searchIndexCodeVersion,
    searchIndexVersion,
    displayBookNames: source.books.map((book) => book.displayName),
    language: source.metadata.language,
    sourceRepository: source.metadata.sourceRepository,
    sourceMetadataUrl: source.metadata.sourceMetadataUrl,
    license: source.metadata.upstreamLicense,
    versification: source.metadata.versification,
    sourceVerseCount,
  }),
);

await generateChapterData("diodati");
console.log(
  `Wrote Diodati data for ${BOOKS.length} books and ${sourceVerseCount.toLocaleString()} KJV-aligned verses.`,
);