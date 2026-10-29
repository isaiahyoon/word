import { BOOKS, bookFileName } from "./books.mjs";

const chapterKey = (book, chapter) => `${book}:${chapter}`;

export function createScriptureStore({
  fetchImpl = fetch,
  dataPath = "./scripture/kjv",
  canonicalBookNames = BOOKS,
  displayBookNames = canonicalBookNames,
  bookOrder = canonicalBookNames.map((_, index) => index + 1),
} = {}) {
  const chapters = new Map();
  const bookLoads = new Map();
  const bookIndexes = new Map();
  if (
    bookOrder.length !== canonicalBookNames.length ||
    new Set(bookOrder).size !== canonicalBookNames.length ||
    bookOrder.some((book) => !Number.isInteger(book) || book < 1 || book > canonicalBookNames.length)
  ) {
    throw new RangeError("Edition book order must be a permutation of the fixed canon");
  }
  [...canonicalBookNames, ...displayBookNames].forEach((name, index) => {
    const bookIndex = index % canonicalBookNames.length;
    bookIndexes.set(normalizeBookName(name), bookIndex + 1);
  });
  let chapterCounts = [];
  let bookFiles = [];
  let initialization;

  function initialize() {
    if (!initialization) {
      initialization = (async () => {
        const response = await fetchImpl(`${dataPath}/index.json`);
        if (!response.ok) throw new Error("Could not load scripture index");

        const index = await response.json();
        const validChapterCounts = Array.isArray(index.chapterCounts) &&
          index.chapterCounts.length === canonicalBookNames.length &&
          index.chapterCounts.every((count) => Number.isInteger(count) && count > 0);
        const validBookFiles = Array.isArray(index.bookFiles) &&
          index.bookFiles.length === canonicalBookNames.length &&
          index.bookFiles.every((fileName, index) => fileName === bookFileName(index + 1));

        if (!validChapterCounts || !validBookFiles) throw new Error("The scripture index is invalid");
        chapterCounts = index.chapterCounts;
        bookFiles = index.bookFiles;
      })().catch((error) => {
        initialization = null;
        throw error;
      });
    }
    return initialization;
  }

  function chapterCount(book) {
    return chapterCounts[book - 1] ?? 0;
  }

  function bookName(book) {
    return displayBookNames[book - 1] ?? canonicalBookNames[book - 1];
  }

  function validateBook(book) {
    if (!Number.isInteger(book) || book < 1 || book > canonicalBookNames.length || chapterCounts.length === 0) {
      throw new RangeError(`Invalid scripture book: ${book}`);
    }
  }

  function loadBook(book) {
    validateBook(book);
    if (bookLoads.has(book)) return bookLoads.get(book);

    const request = fetchImpl(`${dataPath}/books/${bookFiles[book - 1]}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load ${bookName(book)}`);
        return response.json();
      })
      .then((bookData) => {
        const entries = Object.entries(bookData);
        const loadedChapters = entries.map(([chapter, records]) => {
          const chapterNumber = Number(chapter);
          if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > chapterCount(book) || !Array.isArray(records)) {
            throw new Error(`Invalid chapter data for ${bookName(book)} ${chapter}`);
          }

          const verses = records.map((record, index) => {
            if (!Array.isArray(record) || record.length !== 2 || record[0] !== index + 1 || typeof record[1] !== "string") {
              throw new Error(`Invalid verse data for ${bookName(book)} ${chapterNumber}`);
            }
            return { book, chapter: chapterNumber, verse: record[0], text: record[1] };
          });
          return [chapterNumber, verses];
        }).sort(([left], [right]) => left - right);

        if (
          loadedChapters.length !== chapterCount(book) ||
          loadedChapters.some(([chapter], index) => chapter !== index + 1)
        ) {
          throw new Error(`Incomplete chapter data for ${bookName(book)}`);
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
    await Promise.all(canonicalBookNames.map((_, index) => loadBook(index + 1)));
  }

  async function loadChapter(book, chapter) {
    validateBook(book);
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > chapterCount(book)) {
      throw new RangeError(`Invalid chapter: ${bookName(book)} ${chapter}`);
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

    const book = bookIndexes.get(normalizeBookName(match[1]));
    if (!book) return null;

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
    for (const book of bookOrder) {
      for (let chapter = 1; chapter <= chapterCount(book); chapter += 1) {
        matches.push(...getChapter(book, chapter).filter((verse) =>
          verse.text.toLowerCase().includes(normalizedQuery)
        ));
      }
    }
    return matches;
  }

  return { initialize, chapterCount, bookName, bookOrder, loadChapter, getChapter, search };
}

function normalizeBookName(name) {
  return name.trim().toLocaleLowerCase();
}