export function createScriptureSearchClient({
  createWorker = () => typeof Worker === "function"
    ? new Worker(new URL("./scripture-search-worker.js", import.meta.url), { type: "module" })
    : null,
  fallbackSearch,
  logger,
}) {
  let worker;
  let activeEditionId;
  let requestId = 0;
  let pending;
  let fallbackReported = false;

  function cancel() {
    if (!pending) return;
    pending.reject(new DOMException("Search superseded", "AbortError"));
    pending = null;
  }

  function fail(error) {
    worker?.terminate();
    worker = null;
    activeEditionId = null;
    pending?.reject(error);
    pending = null;
  }

  function search(editionId, query) {
    cancel();
    if (worker && activeEditionId !== editionId) {
      worker.terminate();
      worker = null;
    }
    if (!worker) {
      worker = createWorker();
      if (!worker) {
        if (!fallbackReported) {
          logger.warn("Search workers are unavailable; using local main-thread search");
          fallbackReported = true;
        }
        return fallbackSearch(query);
      }
      activeEditionId = editionId;
      const activeWorker = worker;
      worker.addEventListener("message", ({ data }) => {
        if (activeWorker !== worker || data.requestId !== pending?.requestId) return;
        if (data.error) {
          const error = new Error(data.error.message);
          error.name = data.error.name;
          fail(error);
          return;
        }
        pending.resolve(data.matches);
        pending = null;
      });
      worker.addEventListener("error", (event) => {
        event.preventDefault();
        if (activeWorker !== worker) return;
        fail(new Error("Search worker failed", { cause: event.error }));
      });
      worker.addEventListener("messageerror", () => {
        if (activeWorker === worker) fail(new Error("Search worker response could not be read"));
      });
    }
    return new Promise((resolve, reject) => {
      pending = { requestId: ++requestId, resolve, reject };
      try {
        worker.postMessage({ requestId, editionId, query });
      } catch (error) {
        fail(error);
      }
    });
  }

  return { search, cancel };
}
