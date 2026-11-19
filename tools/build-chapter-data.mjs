import { generateChapterData } from "./chapter-data.mjs";
import { EDITIONS } from "../js/editions.mjs";

const check = process.argv.includes("--check");
let count = 0;

for (const editionId of Object.keys(EDITIONS)) {
  count += await generateChapterData(editionId, { check });
}

console.log(`${check ? "Verified" : "Wrote"} ${count} chapter files across ${Object.keys(EDITIONS).length} editions.`);
