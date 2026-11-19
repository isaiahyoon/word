import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { EDITIONS } from "../js/editions.mjs";

const versionedFiles = [
  ["minisearch", new URL("../js/vendor/minisearch.js", import.meta.url)],
  ["version-generator", new URL("./search-index-version.mjs", import.meta.url)],
];
const runtimeVersionUrl = new URL("../js/scripture-search-index-version.mjs", import.meta.url);
const scriptureStoreUrl = new URL("../js/scripture-store.js", import.meta.url);

export async function getSearchIndexCodeVersion() {
  const hash = createHash("sha256");
  const scriptureStore = await readFile(scriptureStoreUrl, "utf8");
  const indexingUtilitiesStart = scriptureStore.indexOf("const searchBatchSize =");
  const storeFactoryStart = scriptureStore.indexOf("export function createScriptureStore(");
  const indexBuilderStart = scriptureStore.indexOf("  async function getTextSearchIndex()");
  const searchPreparationStart = scriptureStore.indexOf("  async function prepareSearch(", indexBuilderStart);
  if (
    indexingUtilitiesStart < 0 ||
    storeFactoryStart < 0 ||
    indexBuilderStart < 0 ||
    searchPreparationStart < 0
  ) {
    throw new Error("Could not locate scripture search index implementation");
  }
  const indexImplementation = scriptureStore.slice(indexingUtilitiesStart, storeFactoryStart) +
    scriptureStore.slice(indexBuilderStart, searchPreparationStart);
  hash.update(`scripture-search-index:${indexImplementation.length}:`);
  hash.update(indexImplementation);
  for (const [name, fileUrl] of versionedFiles) {
    const contents = await readFile(fileUrl);
    hash.update(`${name}:${contents.byteLength}:`);
    hash.update(contents);
  }
  return hash.digest("hex");
}

export async function writeSearchIndexCodeVersion() {
  const version = await getSearchIndexCodeVersion();
  await writeFile(runtimeVersionUrl, `export const SCRIPTURE_SEARCH_INDEX_CODE_VERSION = "${version}";\n`);
  return version;
}

export async function createSearchIndexVersion({
  editionId,
  bookFiles,
  bookOutputUrl,
  searchIndexCodeVersion,
}) {
  const edition = EDITIONS[editionId];
  if (!edition) throw new RangeError(`Unknown search index edition: ${editionId}`);
  if (!/^[a-f0-9]{64}$/u.test(searchIndexCodeVersion ?? "")) {
    throw new TypeError("A valid search index code version is required");
  }

  const hash = createHash("sha256");
  hash.update(JSON.stringify({
    editionId,
    language: edition.language,
    bookOrder: edition.bookOrder,
    searchIndexCodeVersion,
  }));
  for (const file of bookFiles) {
    const contents = await readFile(new URL(file, bookOutputUrl));
    hash.update(`${file}:${contents.byteLength}:`);
    hash.update(contents);
  }
  return hash.digest("hex");
}
