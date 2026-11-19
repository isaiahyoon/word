import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";
import { generateChapterData } from "../tools/chapter-data.mjs";

it("regenerates changed chapter files, removes obsolete files, and detects stale output", async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "word-chapter-data-"));
  const dataRoot = pathToFileURL(`${temporaryDirectory}/`);
  const chapterDirectory = new URL("chapters/1/", dataRoot);
  try {
    await mkdir(new URL("books/", dataRoot), { recursive: true });
    await mkdir(chapterDirectory, { recursive: true });
    await writeFile(new URL("index.json", dataRoot), JSON.stringify({
      chapterCounts: [1],
      bookFiles: ["1_genesis.json"],
    }));
    await writeFile(new URL("books/1_genesis.json", dataRoot), JSON.stringify({
      1: [[1, "Updated verse text"]],
    }));
    await writeFile(new URL("chapters/1/1.json", dataRoot), "outdated\n");
    await writeFile(new URL("chapters/1/2.json", dataRoot), "obsolete\n");

    assert.equal(await generateChapterData("kjv", { dataRoot }), 1);
    assert.equal(
      await readFile(new URL("chapters/1/1.json", dataRoot), "utf8"),
      '[[1,"Updated verse text"]]\n',
    );
    assert.deepEqual(await readdir(chapterDirectory), ["1.json"]);

    await writeFile(new URL("chapters/1/2.json", dataRoot), "stale\n");
    await assert.rejects(
      generateChapterData("kjv", { check: true, dataRoot }),
      /Unexpected chapter data: kjv book 1/u,
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
