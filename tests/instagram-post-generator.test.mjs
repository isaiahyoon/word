import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import test from "node:test";
import { createUniqueOutputDirectory } from "../tools/render-instagram-post.mjs";

test("each render gets a unique directory, even at the same timestamp", async () => {
  const root = await mkdtemp(join(tmpdir(), "instagram-render-test-"));
  const timestamp = new Date("2026-11-02T12:00:00.000Z");

  try {
    const first = await createUniqueOutputDirectory(root, "offline-storage", timestamp);
    const second = await createUniqueOutputDirectory(root, "offline-storage", timestamp);

    assert.notEqual(first, second);
    assert.deepEqual((await readdir(root)).sort(), [basename(first), basename(second)].sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});