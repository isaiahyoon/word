import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { BOOKS, bookFileName } from "../js/books.mjs";
import { createSearchIndexVersion } from "./search-index-version.mjs";

export async function writeEditionBooks({
  editionId,
  books,
  bookOutputUrl,
  searchIndexCodeVersion,
  removeStaleBookFiles = false,
}) {
  if (books.length !== BOOKS.length) {
    throw new RangeError(`Expected ${BOOKS.length} books for ${editionId}, found ${books.length}`);
  }

  await mkdir(bookOutputUrl, { recursive: true });
  if (removeStaleBookFiles) {
    for (const file of await readdir(bookOutputUrl)) {
      if (/^\d+_[a-z0-9_]+\.json$/u.test(file)) await unlink(new URL(file, bookOutputUrl));
    }
  }

  const bookFiles = BOOKS.map((_, index) => bookFileName(index + 1));
  const chapterCounts = books.map((book) => Object.keys(book).length);
  for (const [index, book] of books.entries()) {
    await writeFile(new URL(bookFiles[index], bookOutputUrl), JSON.stringify(book));
  }

  const searchIndexVersion = await createSearchIndexVersion({
    editionId,
    bookFiles,
    bookOutputUrl,
    searchIndexCodeVersion,
  });
  return { bookFiles, chapterCounts, searchIndexVersion };
}
