import { logger as defaultLogger } from "./logger.js";
import { preloadEditionFonts } from "./offline-fonts.js";

export const EDITION_CACHE = "the-word-editions";
const downloadConcurrency = 4;

export function registerServiceWorker({
  serviceWorker = globalThis.navigator?.serviceWorker,
  logger = defaultLogger,
} = {}) {
  if (!serviceWorker) return Promise.resolve(null);
  return serviceWorker.register("/sw.js").catch((error) => {
    logger.error("Service worker registration failed", { error });
    return null;
  });
}

export function createOfflineEditions({
  cacheStorage = globalThis.caches,
  fetchImpl = fetch,
  baseUrl = globalThis.document?.baseURI,
  preloadFonts = preloadEditionFonts,
  logger = defaultLogger,
} = {}) {
  const supported = Boolean(cacheStorage);
  const resolve = (path) => new URL(path, baseUrl).href;
  const indexUrl = (edition) => resolve(`${edition.dataPath}/index.json`);

  async function fetchChecked(url) {
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`Could not download ${url} (${response.status})`);
    return response;
  }

  async function isSaved(edition) {
    if (!supported) return false;
    try {
      const cache = await cacheStorage.open(EDITION_CACHE);
      return Boolean(await cache.match(indexUrl(edition)));
    } catch (error) {
      logger.error("Offline edition check failed", { editionId: edition.id, error });
      return false;
    }
  }

  // The index is stored last, so its presence means every book was saved.
  async function save(edition, onProgress = () => {}) {
    const stored = [];
    let cache;
    try {
      cache = await cacheStorage.open(EDITION_CACHE);
      const indexResponse = await fetchChecked(indexUrl(edition));
      const { bookFiles } = await indexResponse.clone().json();
      if (!Array.isArray(bookFiles) || bookFiles.length === 0) throw new Error("The scripture index is invalid");

      const bookUrls = bookFiles.map((fileName) => resolve(`${edition.dataPath}/books/${fileName}`));
      let nextBook = 0;
      let completed = 0;
      let aborted = false;
      onProgress(0, bookUrls.length);

      const download = async () => {
        try {
          while (!aborted && nextBook < bookUrls.length) {
            const url = bookUrls[nextBook++];
            await cache.put(url, await fetchChecked(url));
            stored.push(url);
            onProgress(++completed, bookUrls.length);
          }
        } catch (error) {
          aborted = true;
          throw error;
        }
      };
      const results = await Promise.allSettled(
        Array.from({ length: Math.min(downloadConcurrency, bookUrls.length) }, download),
      );
      const failure = results.find((result) => result.status === "rejected");
      if (failure) throw failure.reason;

      // Fonts are cosmetic, so a failed preload must not block saving the text.
      await preloadFonts().catch((error) => {
        logger.error("Offline font preload failed", { editionId: edition.id, error });
      });
      await cache.put(indexUrl(edition), indexResponse);
    } catch (error) {
      await Promise.all(stored.map((url) => cache.delete(url)));
      logger.error("Offline edition save failed", { editionId: edition.id, error });
      throw error;
    }
  }

  async function remove(edition) {
    try {
      const cache = await cacheStorage.open(EDITION_CACHE);
      await cache.delete(indexUrl(edition));
      const editionPrefix = resolve(`${edition.dataPath}/`);
      const requests = await cache.keys();
      await Promise.all(requests
        .filter((request) => request.url.startsWith(editionPrefix))
        .map((request) => cache.delete(request)));
    } catch (error) {
      logger.error("Offline edition removal failed", { editionId: edition.id, error });
    }
  }

  return { supported, isSaved, save, remove };
}
