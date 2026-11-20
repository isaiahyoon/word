import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { BOOKS, bookFileName } from "../js/books.mjs";
import { writeEditionBooks } from "../tools/write-edition-books.mjs";

test("writes edition books and removes stale generated book files", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "word-edition-books-"));
  context.after(() => rm(root, { recursive: true, force: true }));

  const bookOutputUrl = pathToFileURL(`${join(root, "books")}${sep}`);
  await mkdir(bookOutputUrl, { recursive: true });
  await writeFile(new URL("99_stale_book.json", bookOutputUrl), "{}");
  await writeFile(new URL("keep.txt", bookOutputUrl), "unrelated");
  const books = BOOKS.map((_, index) => ({ 1: [[1, `verse ${index + 1}`]] }));

  const output = await writeEditionBooks({
    editionId: "kjv",
    books,
    bookOutputUrl,
    searchIndexCodeVersion: "a".repeat(64),
    removeStaleBookFiles: true,
  });

  assert.deepEqual(output.bookFiles, BOOKS.map((_, index) => bookFileName(index + 1)));
  assert.deepEqual(output.chapterCounts, BOOKS.map(() => 1));
  assert.match(output.searchIndexVersion, /^[a-f0-9]{64}$/u);
  assert.deepEqual(
    JSON.parse(await readFile(new URL(bookFileName(1), bookOutputUrl), "utf8")),
    books[0],
  );
  await assert.rejects(readFile(new URL("99_stale_book.json", bookOutputUrl)));
  assert.equal(await readFile(new URL("keep.txt", bookOutputUrl), "utf8"), "unrelated");
});
