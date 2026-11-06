import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { BOOKS, bookFileName } from "../js/books.mjs";
import { ALM_BOOK_NAMES, ALM_BOOK_NAME_ALIASES, KRV_BOOK_NAMES, MARTIN_BOOK_NAMES } from "../js/editions.mjs";
import { createScriptureStore } from "../js/scripture-store.js";

function createMockFetch(dataPath = "./scripture/kjv", indexMetadata = {}) {
  const requests = [];
  const chapterCounts = BOOKS.map((_, index) => (index === 42 ? 3 : 1));
  const bookFiles = BOOKS.map((_, index) => bookFileName(index + 1));
  const books = BOOKS.map((name, index) => ({
    1: [
      [
        1,
        index === 0
          ? "In the beginning God created the heaven and the earth"
          : `${name} first verse`,
      ],
    ],
  }));
  books[42] = {
    1: [[1, "In the beginning was the Word"]],
    2: [[1, "John chapter two"]],
    3: Array.from({ length: 16 }, (_, index) => [
      index + 1,
      index === 15
        ? "For God so loved the world"
        : `John chapter three verse ${index + 1}`,
    ]),
  };

  return {
    requests,
    fetchImpl: async (url) => {
      requests.push(url);
      const value =
        url === `${dataPath}/index.json`
          ? { chapterCounts, bookFiles, ...indexMetadata }
          : books[bookFiles.indexOf(url.split("/").at(-1))];
      if (!value) return { ok: false };
      return { ok: true, json: async () => value };
    },
  };
}

describe("scripture store", () => {
  it("loads optional frontmatter and section headings without numbering them as verses", async () => {
    const mock = createMockFetch("./scripture/rv1865", {
      chapterFrontMatter: { "19:3": "Salmo de David, cuando huía de delante de Absalom su hijo." },
      verseHeadings: [{ book: 19, chapter: 119, beforeVerse: 9, text: "BET." }],
    });
    const store = createScriptureStore({
      fetchImpl: mock.fetchImpl,
      dataPath: "./scripture/rv1865",
    });

    await store.initialize();

    assert.equal(store.getChapterFrontMatter(19, 3), "Salmo de David, cuando huía de delante de Absalom su hijo.");
    assert.deepEqual(store.getVerseHeadings(19, 119, 9), ["BET."]);
    assert.deepEqual(store.getVerseHeadings(19, 119, 8), []);
    assert.deepEqual(store.getChapter(19, 3), []);
  });

  it("loads a book once and returns the requested chapter", async () => {
    const mock = createMockFetch();
    const store = createScriptureStore({ fetchImpl: mock.fetchImpl });
    await store.initialize();

    const firstLoad = await store.loadChapter(43, 3);
    const secondLoad = await store.loadChapter(43, 3);

    assert.equal(firstLoad.length, 16);
    assert.equal(secondLoad[15].text, "For God so loved the world");
    assert.equal(
      mock.requests.filter((url) => url.endsWith("43_john.json")).length,
      1,
    );
  });

  it("loads localized KRV references from the KRV edition path", async () => {
    const mock = createMockFetch("./scripture/krv");
    const store = createScriptureStore({
      fetchImpl: mock.fetchImpl,
      dataPath: "./scripture/krv",
      displayBookNames: KRV_BOOK_NAMES,
    });
    await store.initialize();

    assert.equal(store.bookName(43), "요한복음");
    const koreanPrefixMatches = await store.search("요한");
    assert.deepEqual(
      koreanPrefixMatches
        .filter((match) => match.searchType === "book")
        .map(({ book }) => book),
      [43, 62, 63, 64, 66],
    );
    assert.equal(koreanPrefixMatches[0].book, 43);
    const bookMatches = await store.search("요한복음");
    assert.equal(bookMatches[0].searchType, "book");
    assert.equal(bookMatches[0].book, 43);
    const chapterMatches = await store.search("요한복음 3장");
    assert.equal(chapterMatches[0].searchType, "chapter");
    assert.equal(chapterMatches[0].chapter, 3);
    for (const query of ["요한복음 3:16", "요한복음3:16", "요한복음 ３：１６", "요한복음 3장 16절"]) {
      const matches = await store.search(query);
      assert.equal(matches[0].searchType, "reference", query);
      assert.deepEqual(
        { book: matches[0].book, chapter: matches[0].chapter, verse: matches[0].verse },
        { book: 43, chapter: 3, verse: 16 },
        query,
      );
    }
    assert.ok(mock.requests.includes("./scripture/krv/index.json"));
    assert.ok(mock.requests.includes("./scripture/krv/books/43_john.json"));
  });

  it("searches Portuguese text, Brazilian and European book names, references, and typos", async () => {
    const dataPath = "./scripture/alm1911";
    const mock = createMockFetch(dataPath, {
      displayBookNames: ALM_BOOK_NAMES,
      bookNameAliases: ALM_BOOK_NAME_ALIASES,
    });
    const fetchImpl = async (url) => {
      if (url === `${dataPath}/books/1_genesis.json`) {
        return {
          ok: true,
          json: async () => ({
            1: [[1, "No principio creou Deus os céus e a terra; e o Espírito de Deus se movia sobre as águas."]],
          }),
        };
      }
      if (url === `${dataPath}/books/43_john.json`) {
        return {
          ok: true,
          json: async () => ({
            1: [[1, "No princípio era o Verbo."]],
            2: [[1, "Jesus foi convidado para as bodas."]],
            3: Array.from({ length: 16 }, (_, index) => [
              index + 1,
              index === 15
                ? "Porque Deus amou o mundo de tal maneira."
                : `Versículo de João, número ${index + 1}.`,
            ]),
          }),
        };
      }
      return mock.fetchImpl(url);
    };
    const store = createScriptureStore({
      fetchImpl,
      dataPath,
      editionId: "alm1911",
      language: "pt",
      displayBookNames: ALM_BOOK_NAMES,
    });
    await store.initialize();

    assert.equal(store.bookName(1), "Gênesis");
    const brazilianPrefix = await store.search("Gên");
    assert.equal(brazilianPrefix[0].searchType, "book");
    assert.equal(brazilianPrefix[0].book, 1);
    const europeanPrefix = await store.search("Gén");
    assert.equal(europeanPrefix[0].searchType, "book");
    assert.equal(europeanPrefix[0].book, 1);
    const europeanBookName = await store.search("Deuteronómio");
    assert.equal(europeanBookName[0].searchType, "book");
    assert.equal(europeanBookName[0].book, 5);
    const europeanMultiwordBookName = await store.search("Actos dos Apóstolos");
    assert.equal(europeanMultiwordBookName[0].searchType, "book");
    assert.equal(europeanMultiwordBookName[0].book, 44);

    const textMatches = await store.search("creou");
    assert.deepEqual(
      textMatches.map(({ book, chapter, verse }) => ({ book, chapter, verse })),
      [{ book: 1, chapter: 1, verse: 1 }],
    );
    const fuzzyMatches = await store.search("principioo");
    assert.ok(fuzzyMatches.some(({ book, chapter, verse, searchType }) =>
      book === 1 && chapter === 1 && verse === 1 && searchType === "text"
    ));

    const exactReference = await store.search("João 3:16");
    assert.equal(exactReference[0].searchType, "reference");
    assert.deepEqual(
      { book: exactReference[0].book, chapter: exactReference[0].chapter, verse: exactReference[0].verse },
      { book: 43, chapter: 3, verse: 16 },
    );
    assert.equal(exactReference.filter(({ book, chapter, verse }) =>
      book === 43 && chapter === 3 && verse === 16).length, 1);
    const europeanReference = await store.search("Génesis 1:1");
    assert.equal(europeanReference[0].searchType, "reference");
    assert.deepEqual(
      { book: europeanReference[0].book, chapter: europeanReference[0].chapter, verse: europeanReference[0].verse },
      { book: 1, chapter: 1, verse: 1 },
    );

    for (const query of ["João 3:99", "João 22:1"]) {
      const matches = await store.search(query);
      assert.ok(matches.every((match) => match.searchType !== "reference"), query);
    }
  });

  it("searches exact references and rejects missing verses", async () => {
    const store = createScriptureStore({
      fetchImpl: createMockFetch().fetchImpl,
    });
    await store.initialize();

    const exactReference = await store.search("John 3:16");
    assert.equal(exactReference[0].searchType, "reference");
    assert.deepEqual(
      { book: exactReference[0].book, chapter: exactReference[0].chapter, verse: exactReference[0].verse },
      { book: 43, chapter: 3, verse: 16 },
    );
    assert.ok(exactReference.slice(1).every((match) => match.searchType === "text"));
    assert.equal(exactReference.filter(({ book, chapter, verse }) => book === 43 && chapter === 3 && verse === 16).length, 1);

    for (const query of ["John 3:99", "John 22:1"]) {
      const matches = await store.search(query);
      assert.ok(matches.every((match) => match.searchType === "text"));
    }
  });

  it("prioritizes one book, chapter, or verse destination before text matches", async () => {
    const mock = createMockFetch();
    const fetchImpl = async (url) => {
      if (url.endsWith("1_genesis.json")) {
        return { ok: true, json: async () => ({ 1: [[1, "John appears in this verse"]] }) };
      }
      if (url.endsWith("43_john.json")) {
        return {
          ok: true,
          json: async () => ({
            1: [[1, "John opens this chapter"], [2, "John appears again"]],
            2: [[1, "John chapter two"]],
            3: Array.from({ length: 16 }, (_, index) => [
              index + 1,
              index === 15 ? "For God so loved the world" : `John chapter three verse ${index + 1}`,
            ]),
          }),
        };
      }
      return mock.fetchImpl(url);
    };
    const store = createScriptureStore({ fetchImpl });
    await store.initialize();

    const bookMatches = await store.search("John");
    assert.equal(bookMatches[0].searchType, "book");
    assert.equal(bookMatches[0].book, 43);
    assert.ok(bookMatches.some((match) => match.searchType === "text"));

    const chapterMatches = await store.search("John 1");
    assert.equal(chapterMatches[0].searchType, "chapter");
    assert.equal(chapterMatches[0].chapter, 1);
    assert.ok(chapterMatches.some((match) => match.searchType === "text"));

    const verseMatches = await store.search("John 1:1");
    assert.equal(verseMatches[0].searchType, "reference");
    assert.equal(verseMatches[0].verse, 1);
    assert.equal(verseMatches.filter(({ book, chapter, verse }) => book === 43 && chapter === 1 && verse === 1).length, 1);
    assert.ok(verseMatches.some((match) => match.searchType === "text" && match.book === 1));
  });

  it("searches verse text across books", async () => {
    const store = createScriptureStore({
      fetchImpl: createMockFetch().fetchImpl,
    });
    await store.initialize();

    const matches = await store.search("in the beginning");
    assert.deepEqual(
      matches.map(({ book, chapter, verse }) => ({ book, chapter, verse })),
      [
        { book: 43, chapter: 1, verse: 1 },
        { book: 1, chapter: 1, verse: 1 },
      ],
    );
  });

  it("matches separated and misspelled words without fuzzy short-word collisions", async () => {
    const mock = createMockFetch();
    const fetchImpl = async (url) => {
      if (url.endsWith("1_genesis.json")) {
        return { ok: true, json: async () => ({ 1: [[1, "the word is good"]] }) };
      }
      if (url.endsWith("58_hebrews.json")) {
        return { ok: true, json: async () => ({ 1: [[1, "a piercing sword"]] }) };
      }
      return mock.fetchImpl(url);
    };
    const store = createScriptureStore({ fetchImpl });
    await store.initialize();

    const separated = await store.search("piercing sword");
    assert.deepEqual(
      separated.map(({ book, chapter, verse }) => ({ book, chapter, verse })),
      [{ book: 58, chapter: 1, verse: 1 }],
    );
    assert.deepEqual(separated[0].matchedTerms.sort(), ["piercing", "sword"]);

    const misspelled = await store.search("piercin sword");
    assert.deepEqual(
      misspelled.map(({ book, chapter, verse }) => ({ book, chapter, verse })),
      [{ book: 58, chapter: 1, verse: 1 }],
    );
    assert.deepEqual(await store.search("piercing word"), []);
  });

  it("searches JapBungo Japanese text and localized references", async () => {
    const fetchImpl = async (path) => {
      const fileUrl = new URL(`../${path.replace(/^\.\//, "")}`, import.meta.url);
      return { ok: true, json: async () => JSON.parse(await readFile(fileUrl, "utf8")) };
    };
    const store = createScriptureStore({
      fetchImpl,
      dataPath: "./scripture/japbungo",
      language: "ja",
    });
    await store.initialize();

    assert.equal(store.bookName(43), "ヨハネの福音書");
    const matches = await store.search("ニコデモ");
    const nicodemusVerse = matches.find((verse) => verse.book === 43 && verse.chapter === 3 && verse.verse === 1);
    assert.ok(nicodemusVerse);
    assert.ok(nicodemusVerse.matchedTerms.includes("ニコデモ"));

    const reference = await store.search("ヨハネの福音書 3:16");
    assert.equal(reference[0].searchType, "reference");
    assert.equal(reference[0].book, 43);
    assert.equal(reference[0].chapter, 3);
    assert.equal(reference[0].verse, 16);
  });

  it("searches Diodati Italian text, prefixes, and localized references", async () => {
    const fetchImpl = async (path) => {
      const fileUrl = new URL(`../${path.replace(/^\.\//, "")}`, import.meta.url);
      return { ok: true, json: async () => JSON.parse(await readFile(fileUrl, "utf8")) };
    };
    const store = createScriptureStore({
      fetchImpl,
      dataPath: "./scripture/diodati",
      language: "it",
    });
    await store.initialize();

    assert.equal(store.bookName(1), "Genesi");

    const bookPrefix = await store.search("Gene");
    assert.equal(bookPrefix[0].searchType, "book");
    assert.equal(bookPrefix[0].book, 1);

    const chapter = await store.search("Genesi 1");
    assert.equal(chapter[0].searchType, "chapter");
    assert.equal(chapter[0].chapter, 1);

    const reference = await store.search("Genesi 1:1");
    assert.equal(reference[0].searchType, "reference");
    assert.deepEqual(
      { book: reference[0].book, chapter: reference[0].chapter, verse: reference[0].verse },
      { book: 1, chapter: 1, verse: 1 },
    );
    assert.equal(reference.filter(({ book, chapter: chapterNumber, verse }) =>
      book === 1 && chapterNumber === 1 && verse === 1).length, 1);

    const separatedTerms = await store.search("Iddio terra");
    const creationVerse = separatedTerms.find(({ book, chapter: chapterNumber, verse }) =>
      book === 1 && chapterNumber === 1 && verse === 1);
    assert.ok(creationVerse);
    assert.deepEqual(creationVerse.matchedTerms.map((term) => term.toLocaleLowerCase()).sort(), ["iddio", "terra"]);

    const rankedTerms = await store.search("Iddio creò cielo terra");
    assert.deepEqual(
      { book: rankedTerms[0].book, chapter: rankedTerms[0].chapter, verse: rankedTerms[0].verse },
      { book: 1, chapter: 1, verse: 1 },
    );

    const accentedTerm = await store.search("CREÒ");
    assert.ok(accentedTerm.some(({ book, chapter: chapterNumber, verse }) =>
      book === 1 && chapterNumber === 1 && verse === 1));

    const crossBook = await store.search("principio");
    assert.ok(crossBook.some(({ book, chapter: chapterNumber, verse }) =>
      book === 1 && chapterNumber === 1 && verse === 1));
    assert.ok(crossBook.some(({ book, chapter: chapterNumber, verse }) =>
      book === 43 && chapterNumber === 1 && verse === 1));

    const misspelled = await store.search("principo cielo");
    assert.ok(misspelled.some(({ book, chapter: chapterNumber, verse }) =>
      book === 1 && chapterNumber === 1 && verse === 1));
    assert.deepEqual(await store.search("principo xyz"), []);

    for (const query of ["Genesi 1:99", "Genesi 99:1"]) {
      const matches = await store.search(query);
      assert.ok(matches.every((match) => match.searchType !== "reference"), query);
    }
  });

  it("searches Martin French text, localized references, and native verse numbers", async () => {
    const fetchImpl = async (path) => {
      const fileUrl = new URL(`../${path.replace(/^\.\//, "")}`, import.meta.url);
      return { ok: true, json: async () => JSON.parse(await readFile(fileUrl, "utf8")) };
    };
    const store = createScriptureStore({
      fetchImpl,
      dataPath: "./scripture/martin1744",
      language: "fr",
      displayBookNames: MARTIN_BOOK_NAMES,
    });
    await store.initialize();

    assert.equal(store.bookName(19), "Psaumes");
    const bookPrefix = await store.search("Psaum");
    assert.equal(bookPrefix[0].searchType, "book");
    assert.equal(bookPrefix[0].book, 19);

    const title = await store.search("Psaumes 3:1");
    assert.equal(title[0].searchType, "reference");
    assert.equal(title[0].text, "Psaume de David au sujet de sa fuite de devant Absalom son fils.");
    assert.equal(title.filter(({ book, chapter, verse }) => book === 19 && chapter === 3 && verse === 1).length, 1);

    const scriptureVerse = await store.search("Psaumes 3:2");
    assert.equal(scriptureVerse[0].searchType, "reference");
    assert.equal(scriptureVerse[0].verse, 2);
    assert.ok(scriptureVerse[0].text.startsWith("Ô Eternel!"));

    const textMatch = await store.search("Au commencement");
    assert.ok(textMatch.some(({ book, chapter, verse }) => book === 1 && chapter === 1 && verse === 1));
    const fuzzyMatch = await store.search("commencemant");
    assert.ok(fuzzyMatch.some(({ book, chapter, verse }) => book === 1 && chapter === 1 && verse === 1));

    const invalidReference = await store.search("Psaumes 3:10");
    assert.ok(invalidReference.every((match) => match.searchType !== "reference"));
  });

  it("searches Luther German text, prefixes, and localized references", async () => {
    const fetchImpl = async (path) => {
      const fileUrl = new URL(`../${path.replace(/^\.\//, "")}`, import.meta.url);
      return { ok: true, json: async () => JSON.parse(await readFile(fileUrl, "utf8")) };
    };
    const store = createScriptureStore({
      fetchImpl,
      dataPath: "./scripture/luther1912",
      language: "de",
    });
    await store.initialize();

    assert.equal(store.bookName(1), "1 Mose");
    assert.equal(store.bookName(43), "Johannes");

    const bookPrefix = await store.search("1 Mo");
    assert.equal(bookPrefix[0].searchType, "book");
    assert.equal(bookPrefix[0].book, 1);

    const chapter = await store.search("Johannes 3");
    assert.equal(chapter[0].searchType, "chapter");
    assert.equal(chapter[0].book, 43);
    assert.equal(chapter[0].chapter, 3);

    const reference = await store.search("Johannes 3:16");
    assert.equal(reference[0].searchType, "reference");
    assert.deepEqual(
      { book: reference[0].book, chapter: reference[0].chapter, verse: reference[0].verse },
      { book: 43, chapter: 3, verse: 16 },
    );
    assert.equal(reference.filter(({ book, chapter: chapterNumber, verse }) =>
      book === 43 && chapterNumber === 3 && verse === 16).length, 1);

    const separatedTerms = await store.search("Gott Erde");
    assert.ok(separatedTerms.some(({ book, chapter, verse }) => book === 1 && chapter === 1 && verse === 1));

    const umlautMatch = await store.search("wüst");
    assert.ok(umlautMatch.some(({ book, chapter, verse }) => book === 1 && chapter === 1 && verse === 2));

    const rankedTerms = await store.search("Anfang schuf Himmel Erde");
    assert.deepEqual(
      { book: rankedTerms[0].book, chapter: rankedTerms[0].chapter, verse: rankedTerms[0].verse },
      { book: 1, chapter: 1, verse: 1 },
    );

    const misspelled = await store.search("Anfangg Erde");
    assert.ok(misspelled.some(({ book, chapter, verse }) => book === 1 && chapter === 1 && verse === 1));
    assert.deepEqual(await store.search("Anfangg xyz"), []);

    for (const query of ["Johannes 3:99", "Johannes 99:1"]) {
      const matches = await store.search(query);
      assert.ok(matches.every((match) => match.searchType !== "reference"), query);
    }
  });

  it("searches RV1865 Spanish text, prefixes, localized references, and source numbering", async () => {
    const fetchImpl = async (path) => {
      const fileUrl = new URL(`../${path.replace(/^\.\//, "")}`, import.meta.url);
      return { ok: true, json: async () => JSON.parse(await readFile(fileUrl, "utf8")) };
    };
    const store = createScriptureStore({
      fetchImpl,
      dataPath: "./scripture/rv1865",
      language: "es",
    });
    await store.initialize();

    assert.equal(store.bookName(1), "Génesis");
    assert.equal(store.bookName(43), "San Juan");
    assert.equal(store.bookName(19), "Salmos");

    const bookPrefix = await store.search("Géne");
    assert.equal(bookPrefix[0].searchType, "book");
    assert.equal(bookPrefix[0].book, 1);

    const chapter = await store.search("San Juan 1");
    assert.equal(chapter[0].searchType, "chapter");
    assert.equal(chapter[0].book, 43);
    assert.equal(chapter[0].chapter, 1);

    const reference = await store.search("San Juan 1:1");
    assert.equal(reference[0].searchType, "reference");
    assert.deepEqual(
      { book: reference[0].book, chapter: reference[0].chapter, verse: reference[0].verse },
      { book: 43, chapter: 1, verse: 1 },
    );
    assert.equal(reference.filter(({ book, chapter: chapterNumber, verse }) =>
      book === 43 && chapterNumber === 1 && verse === 1).length, 1);

    const textMatch = await store.search("vida luz");
    assert.ok(textMatch.some(({ book, chapter: chapterNumber, verse }) =>
      book === 43 && chapterNumber === 1 && verse === 4));
    const fuzzyMatch = await store.search("tinieblaz");
    assert.ok(fuzzyMatch.some(({ book, chapter: chapterNumber, verse }) =>
      book === 43 && chapterNumber === 1 && verse === 5));

    const psalmReference = await store.search("Salmos 3:1");
    assert.equal(psalmReference[0].searchType, "reference");
    assert.equal(psalmReference[0].book, 19);
    assert.equal(psalmReference[0].text, "Jehová, ¡cuánto se han multiplicado mis enemigos! muchos se levantan contra mí.");

    for (const query of ["Salmos 13:6", "San Juan 1:99", "Génesis 99:1"]) {
      const matches = await store.search(query);
      assert.ok(matches.every((match) => match.searchType !== "reference"), query);
    }
  });

  it("searches KRV text with the edition-specific index", async () => {
    const mock = createMockFetch("./scripture/krv");
    const fetchImpl = async (url) => {
      if (url.endsWith("58_hebrews.json")) {
        return { ok: true, json: async () => ({ 1: [[1, "날선 검으로"]] }) };
      }
      return mock.fetchImpl(url);
    };
    const store = createScriptureStore({
      fetchImpl,
      dataPath: "./scripture/krv",
      displayBookNames: KRV_BOOK_NAMES,
    });
    await store.initialize();

    const matches = await store.search("날선 검");
    assert.deepEqual(
      matches.map(({ book, chapter, verse }) => ({ book, chapter, verse })),
      [{ book: 58, chapter: 1, verse: 1 }],
    );
    assert.deepEqual(matches[0].matchedTerms.sort(), ["검으로", "날선"]);
  });

  it("fuzzy-matches KRV typos after common Korean particles", async () => {
    const mock = createMockFetch("./scripture/krv");
    const fetchImpl = async (url) => {
      if (url.endsWith("58_hebrews.json")) {
        return {
          ok: true,
          json: async () => ({ 1: [[1, "하나님이 세상을 사랑하사"], [2, "하나님께서 말씀하시니"]] }),
        };
      }
      return mock.fetchImpl(url);
    };
    const store = createScriptureStore({
      fetchImpl,
      dataPath: "./scripture/krv",
      displayBookNames: KRV_BOOK_NAMES,
    });
    await store.initialize();

    const matches = await store.search("하느님");
    assert.deepEqual(
      matches.map(({ book, chapter, verse }) => ({ book, chapter, verse }))
        .sort((left, right) => left.verse - right.verse),
      [
        { book: 58, chapter: 1, verse: 1 },
        { book: 58, chapter: 1, verse: 2 },
      ],
    );
    assert.deepEqual(matches[0].matchedTerms, ["하나님"]);
    assert.deepEqual(await store.search("하느"), []);
  });

  it("keeps warm searches responsive for a Bible-sized index", async () => {
    const verseCount = 31_000;
    const verses = Array.from({ length: verseCount }, (_, index) => [
      index + 1,
      index === verseCount - 1 ? "piercing sword" : `verse text ${index + 1}`,
    ]);
    const fetchImpl = async (url) => {
      if (url === "./scripture/kjv/index.json") {
        return { ok: true, json: async () => ({ chapterCounts: [1], bookFiles: ["1_genesis.json"] }) };
      }
      if (url === "./scripture/kjv/books/1_genesis.json") {
        return { ok: true, json: async () => ({ 1: verses }) };
      }
      return { ok: false };
    };
    const store = createScriptureStore({
      fetchImpl,
      canonicalBookNames: ["Genesis"],
      displayBookNames: ["Genesis"],
      bookOrder: [1],
    });
    await store.initialize();

    const coldStart = performance.now();
    const firstSearch = await store.search("piercing sword");
    const coldSearchDuration = performance.now() - coldStart;
    assert.equal(firstSearch.length, 1);
    assert.ok(coldSearchDuration < 5000, `Cold index build took ${coldSearchDuration.toFixed(1)} ms`);

    const warmStart = performance.now();
    for (let count = 0; count < 30; count += 1) {
      assert.equal((await store.search("piercing sword")).length, 1);
    }
    const warmSearchDuration = performance.now() - warmStart;
    assert.ok(warmSearchDuration < 1500, `Thirty warm searches took ${warmSearchDuration.toFixed(1)} ms`);
  });

  it("searches in the selected edition's book order", async () => {
    const mock = createMockFetch();
    const bookOrder = Array.from({ length: BOOKS.length }, (_, index) => BOOKS.length - index);
    const store = createScriptureStore({ fetchImpl: mock.fetchImpl, bookOrder });
    await store.initialize();

    assert.deepEqual(
      (await store.search("in the beginning")).map(({ book }) => book),
      [43, 1],
    );
  });

  it("rejects invalid chapter references", async () => {
    const store = createScriptureStore({
      fetchImpl: createMockFetch().fetchImpl,
    });
    await store.initialize();

    await assert.rejects(store.loadChapter(43, 4), RangeError);
    assert.equal(store.chapterCount(43), 3);
  });

  it("retries a book after its first fetch fails", async () => {
    const mock = createMockFetch();
    const errors = [];
    let bookAttempts = 0;
    const store = createScriptureStore({
      editionId: "kjv",
      logger: { error: (...args) => errors.push(args) },
      fetchImpl: async (url) => {
        if (url.endsWith("43_john.json") && ++bookAttempts === 1)
          return { ok: false };
        return mock.fetchImpl(url);
      },
    });
    await store.initialize();

    await assert.rejects(store.loadChapter(43, 1), /Could not load John/);
    assert.equal(errors.length, 1);
    assert.equal(errors[0][0], "Scripture data loading failed");
    assert.equal(errors[0][1].operation, "loadBook");
    assert.equal(errors[0][1].editionId, "kjv");
    assert.deepEqual(errors[0][1].book, { id: 43, name: "John" });
    const chapter = await store.loadChapter(43, 1);

    assert.equal(bookAttempts, 2);
    assert.equal(errors.length, 1);
    assert.equal(chapter[0].text, "In the beginning was the Word");
  });

  it("logs edition context and retries after scripture index initialization fails", async () => {
    const mock = createMockFetch();
    const errors = [];
    let indexAttempts = 0;
    const store = createScriptureStore({
      editionId: "luther1912",
      logger: { error: (...args) => errors.push(args) },
      fetchImpl: async (url) => {
        if (url.endsWith("/index.json") && ++indexAttempts === 1) return { ok: false };
        return mock.fetchImpl(url);
      },
    });

    await assert.rejects(store.initialize(), /Could not load scripture index/);

    assert.equal(errors.length, 1);
    assert.equal(errors[0][0], "Scripture data loading failed");
    assert.equal(errors[0][1].operation, "initialize");
    assert.equal(errors[0][1].editionId, "luther1912");
    assert.match(errors[0][1].error.message, /Could not load scripture index/);

    await store.initialize();
    assert.equal(indexAttempts, 2);
  });
});
