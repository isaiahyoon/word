import { mkdir, readFile, writeFile } from "node:fs/promises";
import { BOOKS, bookFileName } from "../js/books.mjs";

const sourceFileUrl = new URL("../sources/luther_1912.json", import.meta.url);
const canonicalIndexUrl = new URL("../scripture/kjv/index.json", import.meta.url);
const outputUrl = new URL("../scripture/luther1912/", import.meta.url);
const bookOutputUrl = new URL("books/", outputUrl);
const source = JSON.parse(await readFile(sourceFileUrl, "utf8"));
const canonicalIndex = JSON.parse(await readFile(canonicalIndexUrl, "utf8"));

if (
  source.metadata?.module !== "luther_1912" ||
  source.metadata.lang_short !== "de" ||
  Number(source.metadata.year) !== 1912 ||
  source.metadata.copyright !== 0 ||
  source.metadata.copyright_statement !== "This Bible is in the Public Domain." ||
  !Array.isArray(source.verses)
) {
  throw new Error("The Luther source metadata or verse list is invalid");
}

if (
  canonicalIndex.chapterCounts.length !== BOOKS.length ||
  canonicalIndex.bookFiles.length !== BOOKS.length
) {
  throw new Error("The canonical KJV index is invalid");
}

const sourceBooks = Array.from({ length: BOOKS.length }, () => ({ name: null, chapters: new Map() }));
for (const record of source.verses) {
  const { book, book_name: displayName, chapter, verse, text } = record;
  if (
    !Number.isInteger(book) ||
    book < 1 ||
    book > BOOKS.length ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    !Number.isInteger(verse) ||
    verse < 1 ||
    typeof displayName !== "string" ||
    displayName.trim() === "" ||
    typeof text !== "string" ||
    text.length === 0
  ) {
    throw new Error(`Invalid Luther verse record: ${JSON.stringify(record)}`);
  }

  const sourceBook = sourceBooks[book - 1];
  if (sourceBook.name !== null && sourceBook.name !== displayName) {
    throw new Error(`Inconsistent Luther book name for ${BOOKS[book - 1]}`);
  }
  sourceBook.name = displayName;
  if (!sourceBook.chapters.has(chapter)) sourceBook.chapters.set(chapter, new Map());
  const chapterVerses = sourceBook.chapters.get(chapter);
  if (chapterVerses.has(verse)) {
    throw new Error(`Duplicate Luther verse ${BOOKS[book - 1]} ${chapter}:${verse}`);
  }
  chapterVerses.set(verse, text);
}

const books = [];
const displayBookNames = [];
let sourceVerseCount = 0;

for (const [bookIndex, sourceBook] of sourceBooks.entries()) {
  const bookNumber = bookIndex + 1;
  if (sourceBook.name === null || sourceBook.chapters.size !== canonicalIndex.chapterCounts[bookIndex]) {
    throw new Error(`Unexpected Luther book or chapter coverage for ${BOOKS[bookIndex]}`);
  }

  const canonicalBook = JSON.parse(await readFile(
    new URL(`../scripture/kjv/books/${canonicalIndex.bookFiles[bookIndex]}`, import.meta.url),
    "utf8",
  ));
  const chapterData = {};

  for (let chapter = 1; chapter <= canonicalIndex.chapterCounts[bookIndex]; chapter += 1) {
    const sourceVerses = sourceBook.chapters.get(chapter);
    const canonicalVerseCount = canonicalBook[chapter]?.length ?? 0;
    if (!sourceVerses || sourceVerses.size !== canonicalVerseCount) {
      throw new Error(`Unexpected Luther verse count for ${BOOKS[bookIndex]} ${chapter}`);
    }

    const verses = [];
    for (let verse = 1; verse <= canonicalVerseCount; verse += 1) {
      const text = sourceVerses.get(verse);
      if (text === undefined) {
        throw new Error(`Missing Luther verse ${BOOKS[bookIndex]} ${chapter}:${verse}`);
      }
      verses.push([verse, text]);
      sourceVerseCount += 1;
    }
    chapterData[chapter] = verses;
  }

  books.push(chapterData);
  displayBookNames.push(sourceBook.name);
}

const expectedVerseCount = canonicalIndex.chapterCounts.reduce((total, count, bookIndex) => {
  return total + Object.values(books[bookIndex]).reduce((bookTotal, verses) => bookTotal + verses.length, 0);
}, 0);
if (sourceVerseCount !== expectedVerseCount || sourceVerseCount !== source.verses.length) {
  throw new Error(`Luther source parity failed: read ${sourceVerseCount} of ${source.verses.length} verses`);
}

await mkdir(bookOutputUrl, { recursive: true });
const bookFiles = BOOKS.map((_, index) => bookFileName(index + 1));
const chapterCounts = books.map((book) => Object.keys(book).length);
for (const [index, book] of books.entries()) {
  await writeFile(new URL(bookFiles[index], bookOutputUrl), JSON.stringify(book));
}

await writeFile(
  new URL("index.json", outputUrl),
  JSON.stringify({
    edition: "luther1912",
    chapterCounts,
    bookFiles,
    displayBookNames,
    language: source.metadata.lang_short,
    source: source.metadata.name,
    sourceUrl: "http://unbound.biola.edu/",
    rightsUrl: "https://ebible.org/details.php?id=deu1912",
    sourceModule: source.metadata.module,
    sourceModuleVersion: source.metadata.module_version,
    year: Number(source.metadata.year),
    license: source.metadata.copyright_statement,
    versification: "KJV",
    sourceVerseCount,
  }),
);

console.log(
  `Wrote Luther data for ${BOOKS.length} books and ${sourceVerseCount.toLocaleString()} KJV-aligned verses.`,
);