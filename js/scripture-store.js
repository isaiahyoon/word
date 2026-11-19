import { BOOKS, bookFileName } from "./books.mjs";
import { BOOK_ABBREVIATIONS } from "./book-abbreviations.mjs";
import MiniSearch from "./vendor/minisearch.js";

const chapterKey = (book, chapter) => `${book}:${chapter}`;
const searchBatchSize = 2048;
const maxBookSuggestions = 5;
const hangulTermPattern = /\p{Script=Hangul}/u;
const japaneseCharacterPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const koreanParticlePattern = /(?:께서|에서|으로|에게|한테|부터|까지|처럼|보다|은|는|이|가|을|를|의|에|로|와|과|도|만|께)$/u;
const latinSearchLanguages = new Set(["en", "it", "de", "fr", "es", "pt"]);
const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

export function foldLatinSearchText(text, language) {
  if (!latinSearchLanguages.has(language)) return text;
  const folded = text.normalize("NFD")
    .replace(/(\p{Script=Latin})\p{M}+/gu, "$1")
    .normalize("NFC")
    .replace(/æ/gu, "ae")
    .replace(/œ/gu, "oe");
  return language === "de"
    ? folded.replace(/ß/gu, "ss").replace(/([aou])e/gu, "$1")
    : folded;
}

function createJapaneseTokenizer() {
  const segmenter = typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("ja", { granularity: "word" })
    : null;

  return (text) => {
    if (segmenter) {
      return [...segmenter.segment(text)]
        .filter((part) => part.isWordLike)
        .map((part) => part.segment);
    }

    const runs = text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+|[\p{L}\p{N}]+/gu) ?? [];
    return runs.flatMap((run) => {
      if (!japaneseCharacterPattern.test(run)) return [run];
      const characters = Array.from(run);
      if (characters.length < 2) return characters;
      return characters.slice(0, -1).map((_, index) => characters.slice(index, index + 2).join(""));
    });
  };
}

function normalizeSearchTerm(term, language) {
  const normalizedTerm = term.normalize("NFKC").toLocaleLowerCase();
  if (!hangulTermPattern.test(normalizedTerm)) return foldLatinSearchText(normalizedTerm, language);

  const stem = normalizedTerm.replace(koreanParticlePattern, "");
  return stem.length >= 2 ? stem : normalizedTerm;
}

export function createScriptureStore({
  fetchImpl = fetch,
  dataPath = "./scripture/kjv",
  editionId = "unknown",
  logger = console,
  language = "en",
  canonicalBookNames = BOOKS,
  displayBookNames = canonicalBookNames,
  bookOrder = canonicalBookNames.map((_, index) => index + 1),
} = {}) {
  const chapters = new Map();
  const bookLoads = new Map();
  const bookIndexes = new Map();
  const abbreviationIndexes = new Map();
  const foldedBookIndexes = new Map();
  const foldedAbbreviationIndexes = new Map();
  const bookOrderIndexes = new Map(bookOrder.map((book, index) => [book, index]));
  let activeDisplayBookNames = displayBookNames;
  let activeBookNameAliases = [];
  let bookNamesByLength = [];
  const japaneseTokenizer = language === "ja" ? createJapaneseTokenizer() : null;
  if (
    bookOrder.length !== canonicalBookNames.length ||
    new Set(bookOrder).size !== canonicalBookNames.length ||
    bookOrder.some((book) => !Number.isInteger(book) || book < 1 || book > canonicalBookNames.length)
  ) {
    throw new RangeError("Edition book order must be a permutation of the fixed canon");
  }
  function rebuildBookNameIndex() {
    bookIndexes.clear();
    abbreviationIndexes.clear();
    [...canonicalBookNames, ...activeDisplayBookNames].forEach((name, index) => {
      const bookIndex = index % canonicalBookNames.length;
      bookIndexes.set(normalizeBookName(name), bookIndex + 1);
    });
    activeBookNameAliases.forEach((aliases, bookIndex) => {
      for (const name of aliases) {
        bookIndexes.set(normalizeBookName(name), bookIndex + 1);
      }
    });
    (BOOK_ABBREVIATIONS[editionId] ?? []).forEach((aliases, bookIndex) => {
      for (const name of aliases) {
        const key = normalizeBookName(name);
        const books = abbreviationIndexes.get(key) ?? new Set();
        books.add(bookIndex + 1);
        abbreviationIndexes.set(key, books);
      }
    });
    foldedBookIndexes.clear();
    foldedAbbreviationIndexes.clear();
    for (const [source, target] of [
      [bookIndexes, foldedBookIndexes],
      [abbreviationIndexes, foldedAbbreviationIndexes],
    ]) {
      for (const [name, value] of source) {
        const key = foldLatinSearchText(name, language);
        const books = target.get(key) ?? new Set();
        for (const book of value instanceof Set ? value : [value]) books.add(book);
        target.set(key, books);
      }
    }
    bookNamesByLength = [...bookIndexes.keys()].sort((left, right) => right.length - left.length);
  }
  rebuildBookNameIndex();
  let chapterCounts = [];
  let bookFiles = [];
  let chapterFrontMatter = new Map();
  let verseHeadings = new Map();
  let referenceMetadata = { numberingDifferences: [], alternateReferences: [] };
  let initialization;
  let textSearchIndex;
  let textSearchIndexPromise;

  function logLoadError(operation, error, book) {
    logger.error("Scripture data loading failed", {
      operation,
      editionId,
      ...(book === undefined ? {} : { book: { id: book, name: bookName(book) } }),
      error,
    });
  }

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
        const validDisplayBookNames = index.displayBookNames === undefined || (
          Array.isArray(index.displayBookNames) &&
          index.displayBookNames.length === canonicalBookNames.length &&
          index.displayBookNames.every((name) => typeof name === "string" && name.trim().length > 0)
        );
        const validBookNameAliases = index.bookNameAliases === undefined || (
          Array.isArray(index.bookNameAliases) &&
          index.bookNameAliases.length === canonicalBookNames.length &&
          index.bookNameAliases.every((aliases) =>
            Array.isArray(aliases) &&
            aliases.every((name) => typeof name === "string" && name.trim().length > 0)
          )
        );
        const indexChapterFrontMatter = index.chapterFrontMatter ?? {};
        const indexVerseHeadings = index.verseHeadings ?? [];
        const validChapterFrontMatter = typeof indexChapterFrontMatter === "object" &&
          !Array.isArray(indexChapterFrontMatter) &&
          Object.entries(indexChapterFrontMatter).every(([key, text]) =>
            /^\d+:\d+$/.test(key) && typeof text === "string"
          );
        const validVerseHeadings = Array.isArray(indexVerseHeadings) &&
          indexVerseHeadings.every(({ book, chapter, beforeVerse, text }) =>
            Number.isInteger(book) && book >= 1 && book <= canonicalBookNames.length &&
            Number.isInteger(chapter) && chapter >= 1 &&
            Number.isInteger(beforeVerse) && beforeVerse >= 1 &&
            typeof text === "string"
          );
        const numberingDifferences = index.numberingDifferences ?? [];
        const alternateReferences = index.alternateReferences ?? [];
        const validReferenceMetadata =
          Array.isArray(numberingDifferences) &&
          numberingDifferences.every(({ book, chapter }) =>
            Number.isInteger(book) && book >= 1 && book <= canonicalBookNames.length &&
            Number.isInteger(chapter) && chapter >= 1
          ) &&
          Array.isArray(alternateReferences) &&
          alternateReferences.every(({ book, chapter, verse, references }) =>
            Number.isInteger(book) && book >= 1 && book <= canonicalBookNames.length &&
            Number.isInteger(chapter) && chapter >= 1 &&
            Number.isInteger(verse) && verse >= 1 &&
            Array.isArray(references) && references.every((reference) => typeof reference === "string")
          );

        if (
          !validChapterCounts ||
          !validBookFiles ||
          !validDisplayBookNames ||
          !validBookNameAliases ||
          !validChapterFrontMatter ||
          !validVerseHeadings ||
          !validReferenceMetadata
        ) {
          throw new Error("The scripture index is invalid");
        }
        chapterCounts = index.chapterCounts;
        bookFiles = index.bookFiles;
        chapterFrontMatter = new Map(Object.entries(indexChapterFrontMatter));
        referenceMetadata = { numberingDifferences, alternateReferences };
        verseHeadings = new Map();
        for (const heading of indexVerseHeadings) {
          const key = `${heading.book}:${heading.chapter}:${heading.beforeVerse}`;
          verseHeadings.set(key, [...(verseHeadings.get(key) ?? []), heading.text]);
        }
        if (index.displayBookNames) {
          activeDisplayBookNames = index.displayBookNames;
        }
        if (index.bookNameAliases) {
          activeBookNameAliases = index.bookNameAliases;
        }
        if (index.displayBookNames || index.bookNameAliases) {
          rebuildBookNameIndex();
        }
      })().catch((error) => {
        initialization = null;
        logLoadError("initialize", error);
        throw error;
      });
    }
    return initialization;
  }

  function chapterCount(book) {
    return chapterCounts[book - 1] ?? 0;
  }

  function bookName(book) {
    return activeDisplayBookNames[book - 1] ?? canonicalBookNames[book - 1];
  }

  function referenceBookName(book) {
    return editionId === "kjv" && book === 19 ? "Psalm" : bookName(book);
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
            if (
              !Array.isArray(record) ||
              (record.length !== 2 && record.length !== 3 && record.length !== 4) ||
              record[0] !== index + 1 ||
              typeof record[1] !== "string" ||
              (record.length >= 3 && typeof record[2] !== "string") ||
              (record.length === 4 && typeof record[3] !== "string")
            ) {
              throw new Error(`Invalid verse data for ${bookName(book)} ${chapterNumber}`);
            }
            const verse = { book, chapter: chapterNumber, verse: record[0], text: record[1] };
            if (record[2]) {
              verse.sourceEdition = record[2];
              verse.textLanguage = record[2] === "krv" ? "ko" : language;
            }
            if (record.length === 4) {
              verse.referenceText = record[3];
              verse.referenceTextLanguage = "en";
            }
            return verse;
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
        logLoadError("loadBook", error, book);
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

  function getChapterFrontMatter(book, chapter) {
    return chapterFrontMatter.get(chapterKey(book, chapter)) ?? "";
  }

  function getVerseHeadings(book, chapter, beforeVerse) {
    return verseHeadings.get(`${book}:${chapter}:${beforeVerse}`) ?? [];
  }

  function resolveBookNames(name) {
    const normalizedName = normalizeBookName(name);
    const exactBook = bookIndexes.get(normalizedName);
    if (exactBook) return [{ book: exactBook, name: normalizedName }];

    const abbreviatedBooks = abbreviationIndexes.get(normalizedName);
    if (abbreviatedBooks) {
      return [...abbreviatedBooks]
        .sort((left, right) => bookOrderIndexes.get(left) - bookOrderIndexes.get(right))
        .map((book) => ({ book, name: normalizedName }));
    }

    const foldedName = foldLatinSearchText(normalizedName, language);
    const foldedBooks = foldedBookIndexes.get(foldedName) ?? foldedAbbreviationIndexes.get(foldedName);
    if (foldedBooks) {
      return [...foldedBooks]
        .sort((left, right) => bookOrderIndexes.get(left) - bookOrderIndexes.get(right))
        .map((book) => ({ book, name: normalizedName }));
    }

    const matches = bookNamesByLength.filter((bookName) => bookName.startsWith(normalizedName));
    const matchingBooks = new Set(matches.map((bookName) => bookIndexes.get(bookName)));
    for (const [name, books] of foldedBookIndexes) {
      if (name.startsWith(foldedName)) {
        for (const book of books) matchingBooks.add(book);
      }
    }
    return [...matchingBooks]
      .sort((left, right) => bookOrderIndexes.get(left) - bookOrderIndexes.get(right))
      .slice(0, maxBookSuggestions)
      .map((book) => ({ book, name: normalizeBookName(bookName(book)) }));
  }

  function parseNavigationQuery(query) {
    const normalizedQuery = normalizeBookName(query);
    const exactBook = resolveBookNames(normalizedQuery);
    if (exactBook.length > 0 && exactBook.every(({ name }) => name === normalizedQuery)) {
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
      if (searchType === "chapter") {
        results.push({ searchType, book, chapter, verse: 1, text: "", matchedTerms: [] });
        continue;
      }

      const verses = await loadChapter(book, chapter);
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
        const indexOptions = { fields: ["text"], processTerm: (term) => normalizeSearchTerm(term, language) };
        if (japaneseTokenizer) indexOptions.tokenize = japaneseTokenizer;
        const index = new MiniSearch(indexOptions);
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

  async function prepareSearch(query) {
    const normalizedQuery = query.normalize("NFKC").trim();
    if (!normalizedQuery) return { navigationResults: [], textQuery: "" };

    await initialize();
    if (Array.from(normalizedQuery).length === 1) {
      const name = normalizeBookName(normalizedQuery);
      const recognized = abbreviationIndexes.has(name) ||
        foldedAbbreviationIndexes.has(foldLatinSearchText(name, language));
      const navigationResults = recognized
        ? await getNavigationResult({ searchType: "book", books: resolveBookNames(name) })
        : [];
      return { navigationResults, textQuery: "" };
    }
    const navigationQuery = parseNavigationQuery(normalizedQuery);
    const navigationResults = await getNavigationResult(navigationQuery);
    const textQuery = navigationQuery?.bookQuery ?? normalizedQuery;
    return { navigationResults, textQuery: Array.from(textQuery).length < 2 ? "" : textQuery };
  }

  async function search(query) {
    const { navigationResults, textQuery } = await prepareSearch(query);
    if (!textQuery) return navigationResults;

    const index = await getTextSearchIndex();
    const exactMatches = index.search(textQuery, { combineWith: "AND" });
    const exactById = new Map(exactMatches.map((match) => [match.id, match]));
    const searchOptions = {
      combineWith: "AND",
      prefix: (term) => term.length >= 3 || hangulTermPattern.test(term) ||
        (language === "ja" && Array.from(term).length >= 2),
      fuzzy: (term) => {
        if (hangulTermPattern.test(term)) return term.length >= 3 ? 1 / term.length : false;
        if (language === "ja") return Array.from(term).length >= 4 ? 1 : false;
        if (term.length >= 17) return Math.min(6, Math.round(term.length * 0.15));
        if (term.length >= 8) return 2;
        return term.length >= 5 ? 1 : false;
      },
    };
    const matches = index.search(textQuery, searchOptions);
    const approximateIds = new Set(matches.filter(({ id }) => !exactById.has(id)).map(({ id }) => id));
    const termsById = new Map();
    const queryTerms = [...new Set(matches[0]?.queryTerms ?? [])];
    // Attribute matches per query term so an exact word suppresses its own fuzzy highlights.
    if (queryTerms.length > 1 && approximateIds.size > 0) {
      for (const term of queryTerms) {
        const termMatches = index.search(term, {
          ...searchOptions,
          tokenize: (value) => [value],
          processTerm: (value) => value,
          filter: ({ id }) => approximateIds.has(id),
        });
        for (const match of termMatches) {
          const words = Object.keys(match.match);
          const selectedWords = words.includes(term) ? [term] : words;
          const selected = termsById.get(match.id) ?? new Set();
          selectedWords.forEach((word) => selected.add(word));
          termsById.set(match.id, selected);
        }
      }
    }

    matches.sort((left, right) => {
      const exactDifference = Number(exactById.has(right.id)) - Number(exactById.has(left.id));
      if (exactDifference !== 0) return exactDifference;
      const scoreDifference = (exactById.get(right.id)?.score ?? right.score) -
        (exactById.get(left.id)?.score ?? left.score);
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
        matchedTerms: exactById.has(match.id)
          ? Object.keys(exactById.get(match.id).match)
          : [...(termsById.get(match.id) ?? Object.keys(match.match))],
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

  return {
    initialize,
    chapterCount,
    bookName,
    referenceBookName,
    bookOrder,
    loadChapter,
    getChapter,
    getChapterFrontMatter,
    getVerseHeadings,
    getReferenceMetadata: () => referenceMetadata,
    prepareSearch,
    search,
  };
}

function normalizeBookName(name) {
  return name.normalize("NFKC").trim().toLocaleLowerCase()
    .replace(/\./gu, "")
    .replace(/^(\d+)\s+(?=\p{L})/u, "$1")
    .replace(/\s+/gu, " ");
}