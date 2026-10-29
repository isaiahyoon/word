function slugifyBook(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function createScriptureRoutes(books, basePath = "/", editionIds = ["kjv"]) {
  const baseSegments = basePath.split("/").filter(Boolean);
  const normalizedBasePath = baseSegments.length === 0 ? "/" : `/${baseSegments.join("/")}/`;
  const bookNumbersBySlug = new Map(books.map((name, index) => [slugifyBook(name), index + 1]));
  const knownEditions = new Set(editionIds);

  function parse(pathname) {
    if (!pathname.startsWith(normalizedBasePath)) return null;
    const path = pathname.slice(normalizedBasePath.length).replace(/^\/+|\/+$/g, "");
    if (!path || path === "index.html") return { home: true, editionId: "kjv" };

    const pathSegments = path.split("/");
    const legacy = pathSegments[0] === "b";
    const editionId = legacy ? "kjv" : pathSegments[0];
    if (!knownEditions.has(editionId)) return null;
    if (!legacy && pathSegments.length === 1) {
      return {
        editionId,
        book: 1,
        chapter: 1,
        range: { start: 1, end: 1 },
        legacy: false,
      };
    }
    const segments = legacy ? pathSegments : pathSegments.slice(1);
    if (![2, 4, 6].includes(segments.length) || segments[0] !== "b") return null;

    let slug;
    try {
      slug = decodeURIComponent(segments[1]).toLowerCase();
    } catch {
      return null;
    }

    const book = bookNumbersBySlug.get(slug);
    if (!book) return null;

    let chapter = 1;
    let range = { start: 1, end: 1 };
    if (segments.length >= 4) {
      const compactLegacy = legacy && segments[2] !== "c";
      if (!compactLegacy && segments[2] !== "c") return null;
      chapter = Number(segments[compactLegacy ? 2 : 3]);
      if (!Number.isSafeInteger(chapter) || chapter < 1) return null;
      if (compactLegacy) {
        const verse = Number(segments[3]);
        if (!Number.isSafeInteger(verse) || verse < 1) return null;
        range = { start: verse, end: verse };
      }
    }

    if (segments.length === 6) {
      if (segments[4] !== "v") return null;
      const match = segments[5].match(/^(\d+)(?:-(\d+))?$/);
      if (!match) return null;
      range = { start: Number(match[1]), end: Number(match[2] ?? match[1]) };
    }

    return { editionId, book, chapter, range, legacy };
  }

  function buildPath(book, chapter, range, editionId = "kjv") {
    const name = books[book - 1];
    if (!name || !Number.isSafeInteger(chapter) || chapter < 1) {
      throw new RangeError("Invalid scripture reference");
    }
    if (!knownEditions.has(editionId)) throw new RangeError(`Unknown edition: ${editionId}`);

    const path = `${normalizedBasePath}${editionId}/b/${slugifyBook(name)}/c/${chapter}`;
    if (!range) return path;

    const verses = range.start === range.end ? range.start : `${range.start}-${range.end}`;
    return `${path}/v/${verses}`;
  }

  return { parse, buildPath };
}

export function normalizeVerseRange(range) {
  if (range === null) return null;
  return Number.isSafeInteger(range) ? { start: range, end: range } : range;
}

export function getVerseStep(currentVerse, verseCount, offset) {
  if (
    !Number.isSafeInteger(currentVerse) ||
    !Number.isSafeInteger(verseCount) ||
    currentVerse < 1 ||
    currentVerse > verseCount ||
    ![-1, 1].includes(offset)
  ) {
    throw new RangeError("Invalid verse step");
  }

  const nextVerse = currentVerse + offset;
  if (nextVerse >= 1 && nextVerse <= verseCount) {
    return { chapterOffset: 0, verse: nextVerse };
  }

  return { chapterOffset: offset, verse: offset > 0 ? 1 : null };
}

export function isValidVerseRange(range, verseCount) {
  return Number.isSafeInteger(range.start) &&
    Number.isSafeInteger(range.end) &&
    range.start >= 1 &&
    range.end >= range.start &&
    range.end <= verseCount;
}