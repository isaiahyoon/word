import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createScriptureSearchClient } from "../js/scripture-search-client.js";

class SearchWorker extends EventTarget {
  messages = [];
  terminated = false;

  postMessage(message) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  respond(data) {
    this.dispatchEvent(new MessageEvent("message", { data }));
  }
}

function createClient() {
  const workers = [];
  const client = createScriptureSearchClient({
    createWorker: () => {
      const worker = new SearchWorker();
      workers.push(worker);
      return worker;
    },
  });
  return { client, workers };
}

describe("scripture search client", () => {
  it("reuses an edition worker and ignores superseded responses", async () => {
    const { client, workers } = createClient();
    const first = client.search("kjv", "love");
    const cancelled = assert.rejects(first, { name: "AbortError" });
    const second = client.search("kjv", "peace");
    await cancelled;
    assert.equal(workers.length, 1);
    workers[0].respond({ requestId: 1, matches: ["stale"] });
    workers[0].respond({ requestId: 2, matches: ["current"] });
    assert.deepEqual(await second, ["current"]);
  });

  it("terminates the old edition worker without letting its errors break the new one", async () => {
    const { client, workers } = createClient();
    const first = client.search("kjv", "love");
    const cancelled = assert.rejects(first, { name: "AbortError" });
    const second = client.search("krv", "사랑");
    await cancelled;
    assert.equal(workers[0].terminated, true);
    workers[0].dispatchEvent(new Event("messageerror"));
    workers[1].respond({ requestId: 2, matches: ["Korean result"] });
    assert.deepEqual(await second, ["Korean result"]);
    assert.equal(workers[1].terminated, false);
  });

  it("rejects failed searches and creates a new worker on retry", async () => {
    const { client, workers } = createClient();
    const first = client.search("kjv", "love");
    const failure = assert.rejects(first, /Could not load scripture/);
    workers[0].respond({ requestId: 1, error: { name: "Error", message: "Could not load scripture" } });
    await failure;
    assert.equal(workers[0].terminated, true);
    const retry = client.search("kjv", "love");
    workers[1].respond({ requestId: 2, matches: ["result"] });
    assert.deepEqual(await retry, ["result"]);
  });

  it("rejects worker startup failures instead of leaving a search pending", async () => {
    const { client, workers } = createClient();
    const result = client.search("kjv", "love");
    const failure = assert.rejects(result, /Search worker failed/);
    workers[0].dispatchEvent(new Event("error", { cancelable: true }));
    await failure;
    assert.equal(workers[0].terminated, true);
  });

  it("logs the compatibility path once when workers are unavailable", async () => {
    const warnings = [];
    const client = createScriptureSearchClient({
      createWorker: () => null,
      fallbackSearch: async (query) => [query],
      logger: { warn: (...args) => warnings.push(args) },
    });
    assert.deepEqual(await client.search("kjv", "love"), ["love"]);
    assert.deepEqual(await client.search("kjv", "peace"), ["peace"]);
    assert.equal(warnings.length, 1);
  });
});
