const chapterKey = (book, chapter) => `${book}:${chapter}`;
const verseKey = (book, chapter, verse) => `${book}:${chapter}:${verse}`;
const KRV_CHAPTER_COUNTS = new Map([
  ["9:30", [30, 31]],
  ["22:6", [14, 13]],
  ["47:13", [13, 14]],
  ["64:1", [15, 14]],
]);

export class VerseReferenceAlignmentError extends Error {
  constructor() {
    super("A selected verse has no verified reference alignment");
    this.name = "VerseReferenceAlignmentError";
  }
}

export function createVerseReferenceAlignment(editionId, metadata = {}, chapterCounts = {}) {
  const unavailableChapters = new Set();
  for (const difference of metadata.numberingDifferences ?? []) {
    unavailableChapters.add(chapterKey(difference.book, difference.chapter));
  }
  for (const alternate of metadata.alternateReferences ?? []) {
    unavailableChapters.add(chapterKey(alternate.book, alternate.chapter));
  }

  if (editionId === "martin1744") unavailableChapters.delete(chapterKey(19, 42));
  if (editionId === "alm1911") unavailableChapters.delete(chapterKey(47, 13));
  if (editionId === "japbungo") unavailableChapters.delete(chapterKey(64, 1));
  const { book, chapter, verseCount, kjvVerseCount } = chapterCounts;
  const measuredMismatch = Number.isInteger(book) &&
    Number.isInteger(chapter) &&
    Number.isInteger(verseCount) &&
    Number.isInteger(kjvVerseCount) &&
    verseCount !== kjvVerseCount;
  const krvCounts = editionId === "krv" ? KRV_CHAPTER_COUNTS.get(chapterKey(book, chapter)) : null;
  if (krvCounts && (verseCount !== krvCounts[0] || kjvVerseCount !== krvCounts[1])) {
    unavailableChapters.add(chapterKey(book, chapter));
  }
  const knownMismatch = (
    editionId === "martin1744" && book === 19 && chapter === 42
  ) || (
    editionId === "alm1911" && book === 47 && chapter === 13
  ) || (
    editionId === "japbungo" && book === 64 && chapter === 1
  ) || (
    krvCounts && verseCount === krvCounts[0] && kjvVerseCount === krvCounts[1]
  );
  if (measuredMismatch && !knownMismatch) unavailableChapters.add(chapterKey(book, chapter));

  function isChapterAligned(book, chapter) {
    return !unavailableChapters.has(chapterKey(book, chapter));
  }

  function toKjvReferences(book, chapter, verse) {
    if (!isChapterAligned(book, chapter)) return null;

    if (editionId === "krv") {
      const counts = KRV_CHAPTER_COUNTS.get(chapterKey(book, chapter));
      if (counts && (!Number.isInteger(verse) || verse < 1 || verse > counts[0])) return null;
      if (book === 9 && chapter === 30 && verse === 30) return [[book, chapter, 30], [book, chapter, 31]];
      if (book === 22 && chapter === 6 && verse === 14) return [[book, chapter, 13]];
      if (book === 47 && chapter === 13) {
        if (verse === 11) return [[book, chapter, 11], [book, chapter, 12]];
        if (verse >= 12) return [[book, chapter, verse + 1]];
      }
      if (book === 64 && chapter === 1 && verse === 15) return [[book, chapter, 14]];
    }

    if (editionId === "japbungo" && book === 64 && chapter === 1 && verse === 15) return [];
    if (editionId === "martin1744" && book === 19 && chapter === 42) {
      return verse === 1 ? [] : [[book, chapter, verse - 1]];
    }

    if (editionId === "alm1911" && book === 47 && chapter === 13) {
      if (verse === 12) return [[book, chapter, 12], [book, chapter, 13]];
      if (verse === 13) return [[book, chapter, 14]];
    }

    return [[book, chapter, verse]];
  }

  function findNativeVerses(book, chapter, canonicalReferences, verses) {
    if (!isChapterAligned(book, chapter)) return null;
    const wantedReferences = new Set(canonicalReferences.map(([refBook, refChapter, refVerse]) =>
      verseKey(refBook, refChapter, refVerse)
    ));
    return verses.filter((verse) => {
      const references = toKjvReferences(verse.book, verse.chapter, verse.verse);
      return references?.some(([refBook, refChapter, refVerse]) =>
        wantedReferences.has(verseKey(refBook, refChapter, refVerse))
      );
    });
  }

  return { isChapterAligned, toKjvReferences, findNativeVerses };
}

export function sameVerseReferences(left, right) {
  const keys = (references) => [...new Set(references.map(([book, chapter, verse]) =>
    verseKey(book, chapter, verse)
  ))].sort();
  const leftKeys = keys(left);
  const rightKeys = keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index]);
}
