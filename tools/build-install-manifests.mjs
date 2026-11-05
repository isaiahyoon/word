import { mkdir, readFile, writeFile } from "node:fs/promises";
import { EDITIONS } from "../js/editions.mjs";

const root = new URL("../", import.meta.url);
const baseManifest = JSON.parse(await readFile(new URL("manifest.webmanifest", root), "utf8"));
const directory = new URL("assets/install-manifests/", root);
await mkdir(directory, { recursive: true });

await Promise.all(Object.values(EDITIONS).map((edition) => writeFile(
  new URL(`${edition.id}.webmanifest`, directory),
  `${JSON.stringify({
    ...baseManifest,
    name: edition.appName,
    short_name: edition.appName,
    lang: edition.language,
    start_url: `/?install=${edition.id}`,
  }, null, 2)}\n`,
)));
