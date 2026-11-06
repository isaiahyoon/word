import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ALM_BOOK_NAMES, ALM_BOOK_NAME_ALIASES } from "../js/editions.mjs";
import { BOOKS } from "../js/books.mjs";

const expectedSourceSha256 = "a47705dc5637daaa2e65160c9fe9aadb70edbdda855179045dbaf288f6aff795";
const sourceFileUrl = "https://github.com/damarals/biblias/releases/latest/download/ALM1911.json";
const sourceRepository = "https://github.com/damarals/biblias";
const sourceTextUrl = "https://www.gutenberg.org/ebooks/62383";
const abbreviations = [
  "Gn", "Êx", "Lv", "Nm", "Dt", "Js", "Jz", "Rt", "1Sm", "2Sm", "1Rs", "2Rs", "1Cr", "2Cr", "Ed", "Ne", "Et", "Jó", "Sl", "Pv", "Ec", "Ct", "Is", "Jr", "Lm", "Ez", "Dn", "Os", "Jl", "Am", "Ob", "Jn", "Mq", "Na", "Hc", "Sf", "Ag", "Zc", "Ml",
  "Mt", "Mc", "Lc", "Jo", "At", "Rm", "1Co", "2Co", "Gl", "Ef", "Fp", "Cl", "1Ts", "2Ts", "1Tm", "2Tm", "Tt", "Fm", "Hb", "Tg", "1Pe", "2Pe", "1Jo", "2Jo", "3Jo", "Jd", "Ap",
];
const inputPath = process.argv[2];

if (!inputPath) {
  throw new Error("Usage: node tools/import-alm1911-source.mjs <path-to-ALM1911.json>");
}
if (BOOKS.length !== 66 || ALM_BOOK_NAMES.length !== BOOKS.length || abbreviations.length !== BOOKS.length) {
  throw new Error("The Almeida 1911 book map does not match the fixed canon");
}

const input = await readFile(resolve(inputPath));
const sourceSha256 = createHash("sha256").update(input).digest("hex");
if (sourceSha256 !== expectedSourceSha256) {
  throw new Error(`Unexpected ALM1911 source checksum: ${sourceSha256}`);
}

const rawBooks = JSON.parse(input.toString("utf8"));
if (!Array.isArray(rawBooks) || rawBooks.length !== BOOKS.length) {
  throw new Error("The ALM1911 source does not contain the fixed 66-book canon");
}

const books = [];
let sourceVerseCount = 0;
for (const [bookIndex, rawBook] of rawBooks.entries()) {
  if (
    rawBook.abbrev !== abbreviations[bookIndex] ||
    !Array.isArray(rawBook.chapters) ||
    rawBook.chapters.length === 0
  ) {
    throw new Error(`Unexpected ALM1911 source book at position ${bookIndex + 1}`);
  }

  const chapters = rawBook.chapters.map((rawVerses, chapterIndex) => {
    if (!Array.isArray(rawVerses) || rawVerses.length === 0) {
      throw new Error(`Empty ALM1911 chapter ${bookIndex + 1}:${chapterIndex + 1}`);
    }

    const verses = rawVerses.map((text, verseIndex) => {
      if (typeof text !== "string" || text.trim() === "") {
        throw new Error(`Empty ALM1911 verse ${bookIndex + 1}:${chapterIndex + 1}:${verseIndex + 1}`);
      }
      sourceVerseCount += 1;
      return [verseIndex + 1, text];
    });

    return { number: chapterIndex + 1, verses };
  });

  books.push({
    number: bookIndex + 1,
    name: BOOKS[bookIndex],
    displayName: ALM_BOOK_NAMES[bookIndex],
    sourceAbbrev: rawBook.abbrev,
    nameAliases: ALM_BOOK_NAME_ALIASES[bookIndex],
    chapters,
  });
}

if (sourceVerseCount !== 31101) {
  throw new Error(`Unexpected ALM1911 verse count: ${sourceVerseCount}`);
}

const normalizedSource = {
  metadata: {
    editionId: "alm1911",
    displayName: "Almeida 1911",
    translator: "João Ferreira d’Almeida",
    language: "pt",
    firstEditionYear: 1900,
    reprintYear: 1911,
    historyNote: "Project Gutenberg identifies this copy as a 1911 reprint of an edition first printed in 1900; 6,000 copies were reprinted in 1911.",
    sourceRepository,
    sourceFileUrl,
    sourceFileSha256: sourceSha256,
    sourceTextUrl,
    upstreamRedistributionClaim: "The damarals/biblias catalog marks ALM1911 with † as freely redistributable.",
    upstreamLicense: "MIT License for the repository's software and data organization; not a separate license grant for the underlying Scripture text.",
    upstreamCopyrightNotice: "Copyright (c) 2022-2026 Daniel Amaral",
    gutenbergRightsNote: "Project Gutenberg identifies the eBook as public domain in the United States and advises users elsewhere to check local law.",
    rightsNote: "No worldwide public-domain claim is made. The upstream redistribution marking and MIT notice are recorded separately from the Scripture text's jurisdiction-dependent rights.",
    versification: "ALM1911-native",
    sourceVerseCount,
  },
  books,
};

const outputUrl = new URL("../sources/alm1911.json", import.meta.url);
await mkdir(new URL("../sources/", import.meta.url), { recursive: true });
await writeFile(outputUrl, `${JSON.stringify(normalizedSource, null, 2)}\n`);
console.log(`Imported ${books.length} ALM1911 books and ${sourceVerseCount.toLocaleString()} source verses.`);
