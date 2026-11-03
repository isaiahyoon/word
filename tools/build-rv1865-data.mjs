import { mkdir, readFile, writeFile } from "node:fs/promises";
import { BOOKS, bookFileName } from "../js/books.mjs";

const sourceUrl = new URL("../sources/rv1865.json", import.meta.url);
const canonicalIndexUrl = new URL("../scripture/kjv/index.json", import.meta.url);
const outputUrl = new URL("../scripture/rv1865/", import.meta.url);
const bookOutputUrl = new URL("books/", outputUrl);
const source = JSON.parse(await readFile(sourceUrl, "utf8"));
const canonicalIndex = JSON.parse(await readFile(canonicalIndexUrl, "utf8"));

if (
  source.metadata.editionId !== "rv1865" ||
  source.metadata.language !== "es" ||
  source.metadata.versification !== "RV1865-2018" ||
  source.books.length !== BOOKS.length ||
  canonicalIndex.chapterCounts.length !== BOOKS.length
) {
  throw new Error("RV1865 source or canonical KJV index is invalid");
}

const books = [];
const displayBookNames = [];
const numberingDifferences = [];
const alternateReferences = [];
const chapterFrontMatter = {};
const verseHeadings = [];
let sourceVerseCount = 0;
let kjvVerseCount = 0;

for (const [bookIndex, sourceBook] of source.books.entries()) {
  const bookNumber = bookIndex + 1;
  if (
    sourceBook.number !== bookNumber ||
    sourceBook.name !== BOOKS[bookIndex] ||
    !sourceBook.displayName ||
    sourceBook.chapters.length !== canonicalIndex.chapterCounts[bookIndex]
  ) {
    throw new Error(`Unexpected RV1865 book or chapter coverage for ${BOOKS[bookIndex]}`);
  }

  const chapterData = {};
  const canonicalBook = JSON.parse(await readFile(
    new URL(`../scripture/kjv/books/${canonicalIndex.bookFiles[bookIndex]}`, import.meta.url),
    "utf8",
  ));
  displayBookNames.push(sourceBook.displayName);

  for (const [chapterIndex, sourceChapter] of sourceBook.chapters.entries()) {
    const chapter = chapterIndex + 1;
    if (sourceChapter.number !== chapter) {
      throw new Error(`Invalid RV1865 chapter order for ${sourceBook.displayName}`);
    }

    const verses = [];
    for (const [verseIndex, record] of sourceChapter.verses.entries()) {
      const expectedVerse = verseIndex + 1;
      if (record.verse !== expectedVerse || typeof record.text !== "string") {
        throw new Error(`Invalid RV1865 verse ${sourceBook.displayName} ${chapter}:${expectedVerse}`);
      }
      if (record.alternateReferences) {
        alternateReferences.push({
          book: bookNumber,
          chapter,
          verse: record.verse,
          references: record.alternateReferences,
        });
      }
      verses.push([record.verse, record.text]);
    }

    sourceVerseCount += verses.length;
    kjvVerseCount += canonicalBook[chapter]?.length ?? 0;
    if (verses.length !== canonicalBook[chapter]?.length) {
      numberingDifferences.push({
        book: bookNumber,
        chapter,
        sourceVerseCount: verses.length,
        kjvVerseCount: canonicalBook[chapter]?.length ?? 0,
      });
    }
    if (sourceChapter.frontMatter) {
      chapterFrontMatter[`${bookNumber}:${chapter}`] = sourceChapter.frontMatter;
    }
    for (const heading of sourceChapter.verseHeadings ?? []) {
      verseHeadings.push({ book: bookNumber, chapter, ...heading });
    }
    chapterData[chapter] = verses;
  }
  books.push(chapterData);
}

await mkdir(bookOutputUrl, { recursive: true });
const bookFiles = BOOKS.map((_, index) => bookFileName(index + 1));
for (const [index, book] of books.entries()) {
  await writeFile(new URL(bookFiles[index], bookOutputUrl), JSON.stringify(book));
}

await writeFile(
  new URL("index.json", outputUrl),
  JSON.stringify({
    edition: "rv1865",
    chapterCounts: books.map((book) => Object.keys(book).length),
    bookFiles,
    displayBookNames,
    language: source.metadata.language,
    source: source.metadata.name,
    sourceUrl: source.metadata.sourceUrl,
    sourceCommit: source.metadata.sourceCommit,
    sourceVersion: source.metadata.sourceVersion,
    license: source.metadata.license,
    versification: source.metadata.versification,
    upstreamVersificationClaim: source.metadata.upstreamVersificationClaim,
    sourceVerseCount,
    kjvVerseCount,
    numberingDifferences,
    alternateReferences,
    chapterFrontMatter,
    verseHeadings,
  }),
);

console.log(
  `Wrote RV1865 data for ${BOOKS.length} books, ${sourceVerseCount.toLocaleString()} source verses, ${numberingDifferences.length} chapters with KJV count differences, ${alternateReferences.length} alternate references, and ${Object.keys(chapterFrontMatter).length} chapter headings.`,
);