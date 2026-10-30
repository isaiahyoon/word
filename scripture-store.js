import { BOOKS, bookFileName } from "./books.mjs";
import MiniSearch from "./vendor/minisearch.js";

const chapterKey = (book, chapter) => `${book}:${chapter}`;
const searchBatchSize = 2048;
const maxBookSuggestions = 5;
const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

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
  const bookOrderIndexes = new Map(bookOrder.map((book, index) => [book, index]));
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
  const bookNamesByLength = [...bookIndexes.keys()].sort((left, right) => right.length - left.length);
  let chapterCounts = [];
  let bookFiles = [];
  let initialization;
  let textSearchIndex;
  let textSearchIndexPromise;

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

  function resolveBookNames(name) {
    const normalizedName = normalizeBookName(name);
    const exactBook = bookIndexes.get(normalizedName);
    if (exactBook) return [{ book: exactBook, name: normalizedName }];

    const matches = bookNamesByLength.filter((bookName) => bookName.startsWith(normalizedName));
    const matchingBooks = [...new Set(matches.map((bookName) => bookIndexes.get(bookName)))];
    return matchingBooks
      .sort((left, right) => bookOrderIndexes.get(left) - bookOrderIndexes.get(right))
      .slice(0, maxBookSuggestions)
      .map((book) => ({ book, name: normalizeBookName(bookName(book)) }));
  }

  function parseNavigationQuery(query) {
    const normalizedQuery = normalizeBookName(query);
    const exactBook = resolveBookNames(normalizedQuery);
    if (exactBook.length === 1 && exactBook[0].name === normalizedQuery) {
      return { searchType: "book", books: exactBook, bookQuery: normalizedQuery };
    }

    const match = normalizedQuery.match(/^(.*?)\s*(\d+)(?::(\d+)|\s*장(?:\s*(\d+)\s*절?)?)?$/u);
    if (match) {
      const resolvedBooks = resolveBookNames(match[1]);
      if (resolvedBooks.length > 0) {
        const verse = match[3] ?? match[4];
        return {
          searchType: verse === undefined ? "chapter" : "reference",
          books: resolvedBooks,
          chapter: Number(match[2]),
          verse: verse === undefined ? null : Number(verse),
          bookQuery: match[1].trim(),
        };
      }
    }

    return exactBook.length > 0
      ? { searchType: "book", books: exactBook, bookQuery: normalizedQuery }
      : null;
  }

  async function getNavigationResult(navigationQuery) {
    if (!navigationQuery) return [];
    const { searchType, books, chapter, verse } = navigationQuery;

    if (searchType === "book") {
      return books.map(({ book }) => ({ searchType, book, chapter: 1, verse: 1, text: "", matchedTerms: [] }));
    }
    if (chapter < 1) return [];

    const results = [];
    for (const { book } of books) {
      if (chapter > chapterCount(book)) continue;
      const verses = await loadChapter(book, chapter);
      if (searchType === "chapter") {
        results.push({ searchType, book, chapter, verse: 1, text: "", matchedTerms: [] });
        continue;
      }

      const exactVerse = verses.find((item) => item.verse === verse);
      if (exactVerse) results.push({ ...exactVerse, searchType, matchedTerms: [] });
    }
    return results;
  }

  async function getTextSearchIndex() {
    if (textSearchIndex) return textSearchIndex;
    if (!textSearchIndexPromise) {
      textSearchIndexPromise = (async () => {
        await loadAllBooks();
        const index = new MiniSearch({ fields: ["text"] });
        let batch = [];

        for (const book of bookOrder) {
          for (let chapter = 1; chapter <= chapterCount(book); chapter += 1) {
            for (const verse of getChapter(book, chapter)) {
              batch.push({
                id: `${book}:${chapter}:${verse.verse}`,
                text: verse.text,
              });
              if (batch.length < searchBatchSize) continue;

              index.addAll(batch);
              batch = [];
              await yieldToBrowser();
            }
          }
        }

        if (batch.length > 0) index.addAll(batch);
        textSearchIndex = index;
        return index;
      })().catch((error) => {
        textSearchIndexPromise = null;
        throw error;
      });
    }
    return textSearchIndexPromise;
  }

  async function search(query) {
    const normalizedQuery = query.normalize("NFKC").trim();
    if (normalizedQuery.length < 2) return [];

    await initialize();
    const navigationQuery = parseNavigationQuery(normalizedQuery);
    const navigationResults = await getNavigationResult(navigationQuery);
    const textQuery = navigationQuery?.bookQuery ?? normalizedQuery;

    const index = await getTextSearchIndex();
    const matches = index.search(textQuery, {
      combineWith: "AND",
      prefix: (term) => term.length >= 3 || /\p{Script=Hangul}/u.test(term),
      fuzzy: (term) => term.length >= 6 ? 0.15 : false,
    });

    matches.sort((left, right) => {
      const scoreDifference = right.score - left.score;
      if (scoreDifference !== 0) return scoreDifference;

      const [leftBook, leftChapter, leftVerse] = left.id.split(":").map(Number);
      const [rightBook, rightChapter, rightVerse] = right.id.split(":").map(Number);
      return bookOrderIndexes.get(leftBook) - bookOrderIndexes.get(rightBook) ||
        leftChapter - rightChapter ||
        leftVerse - rightVerse;
    });

    const verseMatches = matches.map((match) => {
      const [book, chapter, verseNumber] = match.id.split(":").map(Number);
      return {
        ...getChapter(book, chapter)[verseNumber - 1],
        searchType: "text",
        matchedTerms: Object.keys(match.match),
      };
    });

    const navigationReferences = new Set(navigationResults
      .filter((result) => result.searchType === "reference")
      .map(({ book, chapter, verse }) => `${book}:${chapter}:${verse}`));
    const textResults = verseMatches.filter((verse) =>
      !navigationReferences.has(`${verse.book}:${verse.chapter}:${verse.verse}`)
    );
    return [...navigationResults, ...textResults];
  }

  return { initialize, chapterCount, bookName, bookOrder, loadChapter, getChapter, search };
}

function normalizeBookName(name) {
  return name.normalize("NFKC").trim().toLocaleLowerCase();
}