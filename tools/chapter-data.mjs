import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { EDITIONS } from "../js/editions.mjs";

export async function generateChapterData(editionId, { check = false, dataRoot } = {}) {
  const edition = EDITIONS[editionId];
  if (!edition) throw new RangeError(`Unknown chapter-data edition: ${editionId}`);

  const root = dataRoot ?? new URL(`${edition.dataPath}/`, new URL("../", import.meta.url));
  const manifest = JSON.parse(await readFile(new URL("index.json", root), "utf8"));
  if (
    !Array.isArray(manifest.chapterCounts) ||
    !Array.isArray(manifest.bookFiles) ||
    manifest.chapterCounts.length !== manifest.bookFiles.length
  ) {
    throw new Error(`Invalid chapter-data manifest for ${editionId}`);
  }

  let count = 0;
  for (const [bookIndex, file] of manifest.bookFiles.entries()) {
    const book = JSON.parse(await readFile(new URL(`books/${file}`, root), "utf8"));
    const chapterCount = manifest.chapterCounts[bookIndex];
    if (
      !Number.isInteger(chapterCount) ||
      chapterCount < 1 ||
      Object.keys(book).length !== chapterCount
    ) {
      throw new Error(`Unexpected chapter coverage: ${editionId} book ${bookIndex + 1}`);
    }

    const directory = new URL(`chapters/${bookIndex + 1}/`, root);
    if (!check) await mkdir(directory, { recursive: true });
    const expectedFiles = new Set();
    for (let chapter = 1; chapter <= chapterCount; chapter += 1) {
      const records = book[chapter];
      if (!Array.isArray(records) || records.length === 0) {
        throw new Error(`Missing chapter: ${editionId} ${bookIndex + 1}:${chapter}`);
      }

      const fileName = `${chapter}.json`;
      expectedFiles.add(fileName);
      const output = `${JSON.stringify(records)}\n`;
      const url = new URL(fileName, directory);
      if (check) {
        if (await readFile(url, "utf8") !== output) {
          throw new Error(`Stale chapter data: ${editionId} ${bookIndex + 1}:${chapter}`);
        }
      } else {
        await writeFile(url, output);
      }
      count += 1;
    }

    const generatedFiles = (await readdir(directory)).filter((name) => /^\d+\.json$/u.test(name));
    const staleFiles = generatedFiles.filter((name) => !expectedFiles.has(name));
    if (staleFiles.length > 0) {
      if (check) {
        throw new Error(`Unexpected chapter data: ${editionId} book ${bookIndex + 1}`);
      }
      await Promise.all(staleFiles.map((name) => unlink(new URL(name, directory))));
    }
  }

  return count;
}
