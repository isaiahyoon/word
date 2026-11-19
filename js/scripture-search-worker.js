import { EDITIONS } from "./editions.mjs";
import { createScriptureStore } from "./scripture-store.js";

let store;
let activeEditionId;
let latestRequestId;

self.addEventListener("message", async ({ data: { requestId, editionId, query } }) => {
  latestRequestId = requestId;
  try {
    const edition = EDITIONS[editionId];
    if (!edition) throw new RangeError("Unknown search edition");
    if (!store || activeEditionId !== editionId) {
      store = createScriptureStore({
        editionId,
        language: edition.language,
        displayBookNames: edition.displayBookNames,
        bookOrder: edition.bookOrder,
        dataPath: new URL(edition.dataPath, new URL("../", import.meta.url)).href,
      });
      activeEditionId = editionId;
    }
    const matches = await store.search(query);
    if (requestId === latestRequestId) self.postMessage({ requestId, matches });
  } catch (error) {
    if (requestId === latestRequestId) {
      self.postMessage({ requestId, error: { name: error.name, message: error.message } });
    }
  }
});
