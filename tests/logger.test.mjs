import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOOKS, BOOK_TITLES } from "../js/books.mjs";
import { createLogger } from "../js/logger.js";

function createSink() {
  const calls = [];
  const record = (level) => (...args) => calls.push([level, ...args]);
  return { calls, error: record("error"), warn: record("warn"), debug: record("debug") };
}

describe("logger", () => {
  it("prefixes errors and warnings with their context", () => {
    const sink = createSink();
    const logger = createLogger({ sink, debugEnabled: false });
    const error = new Error("boom");

    logger.error("Chapter load failed", { book: 1, error });
    logger.warn("Careful", { book: 2 });

    assert.deepEqual(sink.calls, [
      ["error", "[the-word] Chapter load failed", { book: 1, error }],
      ["warn", "[the-word] Careful", { book: 2 }],
    ]);
  });

  it("stays silent for debug output and timing unless debugging is enabled", async () => {
    const sink = createSink();
    const logger = createLogger({ sink, debugEnabled: false });

    logger.debug("hidden");
    const result = await logger.measure("Search", {}, async () => "done");

    assert.equal(result, "done");
    assert.deepEqual(sink.calls, []);
  });

  it("reports how long an operation took when debugging is enabled", async () => {
    const sink = createSink();
    const times = [100, 142];
    const logger = createLogger({ sink, debugEnabled: true, now: () => times.shift() });

    const result = await logger.measure("Chapter load", { book: 1 }, async () => 7);

    assert.equal(result, 7);
    assert.deepEqual(sink.calls, [["debug", "[the-word] Chapter load took 42ms", { book: 1 }]]);
  });

  it("reports timing and rethrows when the operation fails", async () => {
    const sink = createSink();
    const times = [0, 5];
    const logger = createLogger({ sink, debugEnabled: true, now: () => times.shift() });

    await assert.rejects(
      logger.measure("Search", {}, async () => { throw new Error("nope"); }),
      /nope/,
    );
    assert.equal(sink.calls.length, 1);
  });

  it("reads the debug flag from storage and tolerates unavailable storage", async () => {
    const { createLogger: freshLogger } = await import("../js/logger.js");
    const sink = createSink();
    const original = globalThis.localStorage;
    try {
      globalThis.localStorage = { getItem: () => { throw new Error("denied"); } };
      freshLogger({ sink }).debug("hidden");
      assert.deepEqual(sink.calls, []);

      globalThis.localStorage = { getItem: (key) => (key === "the-word.debug" ? "1" : null) };
      freshLogger({ sink }).debug("shown", {});
      assert.equal(sink.calls.length, 1);
    } finally {
      if (original === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = original;
    }
  });
});

describe("book titles", () => {
  it("provides one non-empty formal title for every book", () => {
    assert.equal(BOOK_TITLES.length, BOOKS.length);
    assert.ok(BOOK_TITLES.every((title) => title.trim().length > 0));
  });
});
