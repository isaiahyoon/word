const CACHE_NAME = "the-word-search-indexes-v1";
const CACHE_PATH = "/__search-indexes/";
const maxCachedIndexes = 2;

export function createScriptureSearchIndexCache({
  cacheStorage = globalThis.caches,
  origin = globalThis.location?.origin,
  logger = console,
} = {}) {
  function cacheKey(editionId, version, runtimeVersion) {
    if (!cacheStorage || !origin) return null;
    if (!/^[a-z0-9-]+$/u.test(editionId) || !/^[a-f0-9]{64}$/u.test(version)) {
      throw new RangeError("Invalid search index cache key");
    }
    const url = new URL(`${CACHE_PATH}${editionId}/${version}.json`, origin);
    if (runtimeVersion) url.searchParams.set("runtime", runtimeVersion);
    return new Request(url);
  }

  async function removeOutdated(cache, editionId) {
    const keys = await cache.keys();
    await Promise.all(keys
      .filter((request) => new URL(request.url).pathname.startsWith(`${CACHE_PATH}${editionId}/`))
      .map((request) => cache.delete(request)));
  }

  async function get(editionId, version, runtimeVersion = "") {
    const request = cacheKey(editionId, version, runtimeVersion);
    if (!request) return null;
    try {
      const cache = await cacheStorage.open(CACHE_NAME);
      const response = await cache.match(request);
      return response ? await response.text() : null;
    } catch (error) {
      logger.warn("Search index cache read failed", { editionId, error });
      return null;
    }
  }

  async function set(editionId, version, serializedIndex, runtimeVersion = "") {
    const request = cacheKey(editionId, version, runtimeVersion);
    if (!request) return;
    try {
      const cache = await cacheStorage.open(CACHE_NAME);
      await removeOutdated(cache, editionId);
      await cache.put(request, new Response(serializedIndex, {
        headers: { "Content-Type": "application/json" },
      }));
      const keys = await cache.keys();
      const indexKeys = keys.filter((key) => new URL(key.url).pathname.startsWith(CACHE_PATH));
      await Promise.all(indexKeys
        .slice(0, Math.max(0, indexKeys.length - maxCachedIndexes))
        .map((key) => cache.delete(key)));
    } catch (error) {
      logger.warn("Search index cache write failed", { editionId, error });
    }
  }

  async function remove(editionId, version, runtimeVersion = "") {
    const request = cacheKey(editionId, version, runtimeVersion);
    if (!request) return;
    try {
      const cache = await cacheStorage.open(CACHE_NAME);
      await cache.delete(request);
    } catch (error) {
      logger.warn("Search index cache removal failed", { editionId, error });
    }
  }

  return { get, set, remove };
}
