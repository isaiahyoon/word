import { mkdir, readFile, writeFile } from "node:fs/promises";
import { ALM_BOOK_NAMES, ALM_BOOK_NAME_ALIASES } from "../js/editions.mjs";
import { BOOKS, bookFileName } from "../js/books.mjs";

const sourceUrl = new URL("../sources/alm1911.json", import.meta.url);
const canonicalIndexUrl = new URL("../scripture/kjv/index.json", import.meta.url);
const outputUrl = new URL("../scripture/alm1911/", import.meta.url);
const bookOutputUrl = new URL("books/", outputUrl);
const source = JSON.parse(await readFile(sourceUrl, "utf8"));
const canonicalIndex = JSON.parse(await readFile(canonicalIndexUrl, "utf8"));

if (
  source.metadata?.editionId !== "alm1911" ||
  source.metadata.language !== "pt" ||
  source.metadata.versification !== "ALM1911-native" ||
  source.metadata.sourceFileSha256 !== "a47705dc5637daaa2e65160c9fe9aadb70edbdda855179045dbaf288f6aff795" ||
  !Array.isArray(source.books) ||
  source.books.length !== BOOKS.length ||
  canonicalIndex.chapterCounts.length !== BOOKS.length ||
  ALM_BOOK_NAMES.length !== BOOKS.length ||
  ALM_BOOK_NAME_ALIASES.length !== BOOKS.length
) {
  throw new Error("The Almeida 1911 source metadata or book list is invalid");
}

const books = [];
const numberingDifferences = [];
let sourceVerseCount = 0;
let canonicalVerseCount = 0;

for (const [bookIndex, sourceBook] of source.books.entries()) {
  const bookNumber = bookIndex + 1;
  if (
    sourceBook.number !== bookNumber ||
    sourceBook.name !== BOOKS[bookIndex] ||
    sourceBook.displayName !== ALM_BOOK_NAMES[bookIndex] ||
    JSON.stringify(sourceBook.nameAliases) !== JSON.stringify(ALM_BOOK_NAME_ALIASES[bookIndex]) ||
    !Array.isArray(sourceBook.chapters) ||
    sourceBook.chapters.length !== canonicalIndex.chapterCounts[bookIndex]
  ) {
    throw new Error(`Unexpected Almeida 1911 book or chapter coverage for ${BOOKS[bookIndex]}`);
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
      sourceChapter.verses.length === 0
    ) {
      throw new Error(`Invalid Almeida 1911 chapter ${sourceBook.displayName} ${chapterNumber}`);
    }

    const verses = sourceChapter.verses.map((record, verseIndex) => {
      const verseNumber = verseIndex + 1;
      if (
        !Array.isArray(record) ||
        record.length !== 2 ||
        record[0] !== verseNumber ||
        typeof record[1] !== "string" ||
        record[1].trim() === ""
      ) {
        throw new Error(`Invalid Almeida 1911 verse ${sourceBook.displayName} ${chapterNumber}:${verseNumber}`);
      }
      return [verseNumber, record[1]];
    });

    sourceVerseCount += verses.length;
    canonicalVerseCount += canonicalChapter.length;
    if (verses.length !== canonicalChapter.length) {
      numberingDifferences.push({
        book: bookNumber,
        chapter: chapterNumber,
        sourceVerseCount: verses.length,
        kjvVerseCount: canonicalChapter.length,
      });
    }
    chapterData[chapterNumber] = verses;
  }
  books.push(chapterData);
}

const expectedNumberingDifferences = [{
  book: 47,
  chapter: 13,
  sourceVerseCount: 13,
  kjvVerseCount: 14,
}];
if (
  sourceVerseCount !== 31101 ||
  sourceVerseCount !== source.metadata.sourceVerseCount ||
  canonicalVerseCount !== 31102 ||
  JSON.stringify(numberingDifferences) !== JSON.stringify(expectedNumberingDifferences)
) {
  throw new Error("Almeida 1911 verse coverage or native numbering differs from the audited source");
}

await mkdir(bookOutputUrl, { recursive: true });
const bookFiles = BOOKS.map((_, index) => bookFileName(index + 1));
for (const [index, book] of books.entries()) {
  await writeFile(new URL(bookFiles[index], bookOutputUrl), JSON.stringify(book));
}

await writeFile(
  new URL("index.json", outputUrl),
  JSON.stringify({
    edition: source.metadata.editionId,
    chapterCounts: books.map((book) => Object.keys(book).length),
    bookFiles,
    displayBookNames: source.books.map((book) => book.displayName),
    bookNameAliases: source.books.map((book) => book.nameAliases),
    language: source.metadata.language,
    source: source.metadata.displayName,
    sourceRepository: source.metadata.sourceRepository,
    sourceFileUrl: source.metadata.sourceFileUrl,
    sourceFileSha256: source.metadata.sourceFileSha256,
    sourceTextUrl: source.metadata.sourceTextUrl,
    upstreamLicense: source.metadata.upstreamLicense,
    upstreamCopyrightNotice: source.metadata.upstreamCopyrightNotice,
    upstreamRedistributionClaim: source.metadata.upstreamRedistributionClaim,
    gutenbergRightsNote: source.metadata.gutenbergRightsNote,
    rightsNote: source.metadata.rightsNote,
    versification: source.metadata.versification,
    sourceVerseCount,
    canonicalVerseCount,
    numberingDifferences,
  }),
);

console.log(
  `Wrote Almeida 1911 data for ${BOOKS.length} books and ${sourceVerseCount.toLocaleString()} source verses; preserved ${numberingDifferences.length} native numbering difference.`,
);
