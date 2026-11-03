import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import usfm from "usfm-js";
import { BOOKS } from "../js/books.mjs";

const sourceCommit = "49887d89a88c30360234e56ef1d129ee3227a2ed";
const repositoryUrl = "https://github.com/MC1171611/valera1865";
const rawRoot = `https://raw.githubusercontent.com/MC1171611/valera1865/${sourceCommit}/USFM`;
const outputUrl = new URL("../sources/rv1865.json", import.meta.url);
const bookCodes = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI",
  "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER",
  "LAM", "EZK", "DAN", "HOS", "JOL", "AMO", "OBA", "JON", "MIC", "NAM", "HAB", "ZEP",
  "HAG", "ZEC", "MAL", "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL",
  "EPH", "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE",
  "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
];

if (bookCodes.length !== BOOKS.length) {
  throw new Error("RV1865 source book map does not match the fixed canon");
}

function normalizedText(objects, excludedTags = new Set()) {
  return objects.map((object) => {
    if (excludedTags.has(object.tag)) return "";
    const text = typeof object.text === "string" ? object.text : "";
    const children = Array.isArray(object.children)
      ? normalizedText(object.children, excludedTags)
      : "";
    return `${text}${children}`;
  }).join("").replace(/\s+/gu, " ").trim();
}

function getHeader(headers, tag) {
  return headers.find((header) => header.tag === tag)?.content?.trim() ?? "";
}

const books = [];
let sourceVerseCount = 0;
let alternateReferenceCount = 0;
let chapterFrontMatterCount = 0;
let verseHeadingCount = 0;

for (const [bookIndex, code] of bookCodes.entries()) {
  const sequence = bookIndex < 39 ? bookIndex + 1 : bookIndex + 2;
  const filename = `${String(sequence).padStart(2, "0")}_${code}_RV1865.usfm`;
  const response = await fetch(`${rawRoot}/${filename}`);
  if (!response.ok) throw new Error(`Could not download ${filename}: ${response.status}`);

  const sourceText = await response.text();
  const parsed = usfm.toJSON(sourceText);
  const sourceId = getHeader(parsed.headers ?? [], "id").split(/\s+/u)[0];
  const displayName = getHeader(parsed.headers ?? [], "toc2");
  if (sourceId !== code || !displayName) {
    throw new Error(`Unexpected USFM header in ${filename}: ${sourceId || "missing id"}`);
  }

  const chapters = [];
  for (const [chapterKey, chapterData] of Object.entries(parsed.chapters ?? {})) {
    if (chapterKey === "front") continue;
    if (!/^\d+$/u.test(chapterKey)) {
      throw new Error(`Unexpected chapter key ${chapterKey} in ${filename}`);
    }
    const chapter = Number(chapterKey);
    const frontObjects = chapterData.front?.verseObjects ?? [];
    const frontMatter = normalizedText(frontObjects.filter((object) => object.tag === "d"));
    const verses = [];
    const verseHeadings = frontObjects
      .filter((object) => object.tag === "qa")
      .map((object) => normalizedText([object]))
      .filter(Boolean)
      .map((text) => ({ beforeVerse: 1, text }));

    for (const [verseKey, verseData] of Object.entries(chapterData)) {
      if (verseKey === "front") continue;
      if (!/^\d+$/u.test(verseKey)) {
        throw new Error(`Unexpected verse key ${verseKey} in ${filename} ${chapter}`);
      }
      const verse = Number(verseKey);
      const objects = verseData.verseObjects ?? [];
      const alternateReferences = objects
        .filter((object) => object.tag === "va")
        .map((object) => object.content)
        .filter((reference) => typeof reference === "string" && reference.trim());
      const text = normalizedText(objects, new Set(["va", "qa"]));
      const headings = objects
        .filter((object) => object.tag === "qa")
        .map((object) => normalizedText([object], new Set(["va"])) )
        .filter(Boolean);

      verses.push({
        verse,
        text,
        ...(alternateReferences.length === 0 ? {} : { alternateReferences }),
      });
      verseHeadings.push(...headings.map((heading) => ({ beforeVerse: verse + 1, text: heading })));
      sourceVerseCount += 1;
      alternateReferenceCount += alternateReferences.length;
      verseHeadingCount += headings.length;
    }

    if (frontMatter) chapterFrontMatterCount += 1;
    chapters.push({
      number: chapter,
      verses: verses.sort((left, right) => left.verse - right.verse),
      ...(frontMatter ? { frontMatter } : {}),
      ...(verseHeadings.length === 0 ? {} : { verseHeadings }),
    });
  }

  books.push({
    number: bookIndex + 1,
    name: BOOKS[bookIndex],
    displayName,
    sourceId,
    sourceFile: filename,
    sourceSha256: createHash("sha256").update(sourceText).digest("hex"),
    sourceHeaders: parsed.headers ?? [],
    chapters: chapters.sort((left, right) => left.number - right.number),
  });
}

const normalizedSource = {
  metadata: {
    editionId: "rv1865",
    name: "Reina-Valera 1865",
    sourceVersion: "2018 orthography update",
    originalPublicationYear: 1865,
    digitalEditionYear: 2018,
    language: "es",
    sourceOrganization: "Ministerios Valera 1865",
    sourceRepository: repositoryUrl,
    sourceCommit,
    sourceUrl: `${repositoryUrl}/tree/${sourceCommit}/USFM`,
    license: "CC0-1.0",
    originalTextRights: "Public domain, as stated by the source project",
    versification: "RV1865-2018",
    upstreamVersificationClaim: "KJV",
    versificationNote: "Use source verse boundaries and preserve va labels; no unverified KJV crosswalk is assumed.",
    sourceVerseCount,
    alternateReferenceCount,
    chapterFrontMatterCount,
    verseHeadingCount,
  },
  books,
};

await mkdir(new URL("../sources/", import.meta.url), { recursive: true });
await writeFile(outputUrl, `${JSON.stringify(normalizedSource, null, 2)}\n`);
console.log(
  `Imported ${books.length} RV1865 books, ${sourceVerseCount.toLocaleString()} source verses, ${alternateReferenceCount} alternate references, and ${chapterFrontMatterCount} chapter headings.`,
);