import { BOOKS, bookFileName } from "./books.mjs";

const chapterKey = (book, chapter) => `${book}:${chapter}`;

export function createScriptureStore() {
  const chapters = new Map();
  const bookLoads = new Map();
  let chapterCounts = [];
  let bookFiles = [];

  async function initialize() {
    const response = await fetch("./scripture/index.json");
    if (!response.ok) throw new Error("Could not load scripture index");

    const index = await response.json();
    const validChapterCounts = Array.isArray(index.chapterCounts) &&
      index.chapterCounts.length === BOOKS.length &&
      index.chapterCounts.every((count) => Number.isInteger(count) && count > 0);
    const validBookFiles = Array.isArray(index.bookFiles) &&
      index.bookFiles.length === BOOKS.length &&
      index.bookFiles.every((fileName, index) => fileName === bookFileName(index + 1));

    if (!validChapterCounts || !validBookFiles) throw new Error("The scripture index is invalid");
    chapterCounts = index.chapterCounts;
    bookFiles = index.bookFiles;
  }

  function chapterCount(book) {
    return chapterCounts[book - 1] ?? 0;
  }

  function validateBook(book) {
    if (!Number.isInteger(book) || book < 1 || book > BOOKS.length || chapterCounts.length === 0) {
      throw new RangeError(`Invalid scripture book: ${book}`);
    }
  }

  function loadBook(book) {
    validateBook(book);
    if (bookLoads.has(book)) return bookLoads.get(book);

    const request = fetch(`./scripture/books/${bookFiles[book - 1]}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load ${BOOKS[book - 1]}`);
        return response.json();
      })
      .then((bookData) => {
        const entries = Object.entries(bookData);
        const loadedChapters = entries.map(([chapter, records]) => {
          const chapterNumber = Number(chapter);
          if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > chapterCount(book) || !Array.isArray(records)) {
            throw new Error(`Invalid chapter data for ${BOOKS[book - 1]} ${chapter}`);
          }

          const verses = records.map((record, index) => {
            if (!Array.isArray(record) || record.length !== 2 || record[0] !== index + 1 || typeof record[1] !== "string") {
              throw new Error(`Invalid verse data for ${BOOKS[book - 1]} ${chapterNumber}`);
            }
            return { book, chapter: chapterNumber, verse: record[0], text: record[1] };
          });
          return [chapterNumber, verses];
        }).sort(([left], [right]) => left - right);

        if (
          loadedChapters.length !== chapterCount(book) ||
          loadedChapters.some(([chapter], index) => chapter !== index + 1)
        ) {
          throw new Error(`Incomplete chapter data for ${BOOKS[book - 1]}`);
        }

        loadedChapters.forEach(([chapter, verses]) => chapters.set(chapterKey(book, chapter), verses));
      })
      .catch((error) => {
        bookLoads.delete(book);
        throw error;
      });

    bookLoads.set(book, request);
    return request;
  }

  async function loadAllBooks() {
    await Promise.all(BOOKS.map((_, index) => loadBook(index + 1)));
  }

  async function loadChapter(book, chapter) {
    validateBook(book);
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > chapterCount(book)) {
      throw new RangeError(`Invalid chapter: ${BOOKS[book - 1]} ${chapter}`);
    }
    await loadBook(book);
    return chapters.get(chapterKey(book, chapter)) ?? [];
  }

  function getChapter(book, chapter) {
    return chapters.get(chapterKey(book, chapter)) ?? [];
  }

  function parseReference(query) {
    const match = query.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    if (!match) return null;

    const book = BOOKS.findIndex((name) => name.toLowerCase() === match[1].toLowerCase()) + 1;
    if (book === 0) return null;

    return {
      book,
      chapter: Number(match[2]),
      verse: match[3] === undefined ? null : Number(match[3])
    };
  }

  async function search(query) {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 2) return [];

    const reference = parseReference(query.trim());
    if (reference) {
      if (reference.chapter < 1 || reference.chapter > chapterCount(reference.book)) return [];
      const verses = await loadChapter(reference.book, reference.chapter);
      return verses.filter((verse) => reference.verse === null || verse.verse === reference.verse);
    }

    await loadAllBooks();
    const matches = [];
    for (let book = 1; book <= BOOKS.length; book += 1) {
      for (let chapter = 1; chapter <= chapterCount(book); chapter += 1) {
        matches.push(...getChapter(book, chapter).filter((verse) =>
          verse.text.toLowerCase().includes(normalizedQuery)
        ));
      }
    }
    return matches;
  }

  return { initialize, chapterCount, loadChapter, getChapter, search };
}