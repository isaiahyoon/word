import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { BOOKS, bookFileName } from "../books.mjs";

const sourceUrl = new URL("../kjv.json", import.meta.url);
const outputUrl = new URL("../scripture/books/", import.meta.url);
const manifestUrl = new URL("../scripture/index.json", import.meta.url);
const source = JSON.parse(await readFile(sourceUrl, "utf8"));
const books = Array.from({ length: BOOKS.length }, () => new Map());

for (const { field } of source.contents) {
  const [id, book, chapter, verse, text] = field;
  if (!Number.isInteger(book) || book < 1 || book > books.length) {
    throw new Error(`Invalid book number in scripture record ${id}`);
  }

  const chapters = books[book - 1];
  if (!chapters.has(chapter)) chapters.set(chapter, []);
  chapters.get(chapter).push([verse, text]);
}

await mkdir(outputUrl, { recursive: true });
for (const existingFile of await readdir(outputUrl)) {
  if (/^(?:\d{2}|\d+_[a-z0-9_]+)\.json$/.test(existingFile)) {
    await unlink(new URL(existingFile, outputUrl));
  }
}

const chapterCounts = [];
const bookFiles = [];

for (const [index, chapters] of books.entries()) {
  if (chapters.size === 0) throw new Error(`No scripture records found for book ${index + 1}`);

  const bookData = Object.fromEntries(
    [...chapters.entries()].sort(([left], [right]) => left - right)
  );
  const fileName = bookFileName(index + 1);
  await writeFile(new URL(fileName, outputUrl), JSON.stringify(bookData));
  chapterCounts.push(chapters.size);
  bookFiles.push(fileName);
}

await writeFile(manifestUrl, JSON.stringify({ chapterCounts, bookFiles }));
console.log(`Wrote ${books.length} book files and a chapter-count manifest.`);