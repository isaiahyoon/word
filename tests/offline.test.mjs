import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { EDITION_CACHE, createOfflineEditions, registerServiceWorker } from "../js/offline.js";
import { preloadEditionFonts } from "../js/offline-fonts.js";

const baseUrl = "https://example.test/";
const kjv = { id: "kjv", dataPath: "./scripture/kjv" };
const krv = { id: "krv", dataPath: "./scripture/krv" };
const bookFiles = ["1_genesis.json", "2_exodus.json", "3_leviticus.json", "4_numbers.json", "5_deuteronomy.json"];

function createCacheStorage() {
  const stores = new Map();
  return {
    stores,
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        match: async (url) => entries.get(url),
        put: async (url, response) => void entries.set(url, response),
        delete: async (request) => entries.delete(request.url ?? request),
        keys: async () => [...entries.keys()].map((url) => ({ url })),
      };
    },
  };
}

function createFetch({ failOn } = {}) {
  const requests = [];
  const respond = (body) => ({
    ok: true,
    status: 200,
    json: async () => body,
    clone() {
      return this;
    },
  });
  return {
    requests,
    fetchImpl: async (url) => {
      requests.push(url);
      if (failOn && url.endsWith(failOn)) return { ok: false, status: 500 };
      return respond(url.endsWith("index.json") ? { bookFiles } : { 1: [] });
    },
  };
}

function createOffline({ cacheStorage = createCacheStorage(), fetchOptions, preloadFonts = async () => {}, logger = { error() {} } } = {}) {
  const { fetchImpl, requests } = createFetch(fetchOptions);
  const offline = createOfflineEditions({ cacheStorage, fetchImpl, baseUrl, preloadFonts, logger });
  return { cacheStorage, offline, requests };
}

const cachedUrls = (cacheStorage) => [...(cacheStorage.stores.get(EDITION_CACHE)?.keys() ?? [])];

describe("offline editions", () => {
  it("saves every book and the index, reporting progress", async () => {
    const { cacheStorage, offline } = createOffline();
    const progress = [];

    assert.equal(await offline.isSaved(kjv), false);
    await offline.save(kjv, (done, total) => progress.push([done, total]));

    assert.equal(await offline.isSaved(kjv), true);
    assert.equal(cachedUrls(cacheStorage).length, bookFiles.length + 1);
    assert.ok(cachedUrls(cacheStorage).includes("https://example.test/scripture/kjv/books/1_genesis.json"));
    assert.deepEqual(progress[0], [0, bookFiles.length]);
    assert.deepEqual(progress.at(-1), [bookFiles.length, bookFiles.length]);
  });

  it("removes only the requested edition", async () => {
    const { cacheStorage, offline } = createOffline();
    await offline.save(kjv);
    await offline.save(krv);

    await offline.remove(kjv);

    assert.equal(await offline.isSaved(kjv), false);
    assert.equal(await offline.isSaved(krv), true);
    assert.ok(cachedUrls(cacheStorage).every((url) => url.includes("/scripture/krv/")));
  });

  it("rolls back and logs when a book cannot be downloaded", async () => {
    const errors = [];
    const { cacheStorage, offline } = createOffline({
      fetchOptions: { failOn: "3_leviticus.json" },
      logger: { error: (...details) => errors.push(details) },
    });

    await assert.rejects(offline.save(kjv), /3_leviticus\.json/);

    assert.equal(await offline.isSaved(kjv), false);
    assert.deepEqual(cachedUrls(cacheStorage), []);
    assert.equal(errors.length, 1);
    assert.equal(errors[0][1].editionId, "kjv");
  });

  it("still saves the text when font preloading fails", async () => {
    const errors = [];
    const { offline } = createOffline({
      preloadFonts: async () => { throw new Error("fonts unavailable"); },
      logger: { error: (...details) => errors.push(details) },
    });

    await offline.save(kjv);

    assert.equal(await offline.isSaved(kjv), true);
    assert.equal(errors.length, 1);
    assert.equal(errors[0][1].editionId, "kjv");
  });

  it("reports itself unsupported without the Cache API", async () => {
    const offline = createOfflineEditions({ cacheStorage: undefined, baseUrl });

    assert.equal(offline.supported, false);
    assert.equal(await offline.isSaved(kjv), false);
  });
});

describe("offline fonts", () => {
  const face = (family, weight, style = "normal") => ({
    family,
    weight,
    style,
    loaded: false,
    async load() {
      this.loaded = true;
    },
  });
  const styles = new Map([
    ["verses", { fontFamily: '"Noto Serif KR", serif', fontWeight: "400", fontStyle: "normal" }],
    ["heading", { fontFamily: "Gelasio, Georgia", fontWeight: "600", fontStyle: "normal" }],
  ]);

  it("fetches the font stylesheet and loads only the faces the reader renders", async () => {
    const fetched = [];
    const faces = [
      face("Noto Serif KR", "400"),
      face("Noto Serif KR", "600"),
      face("Gelasio", "600"),
      face("Gelasio", "400", "italic"),
      face("Noto Serif JP", "400"),
    ];
    const elements = { "#verse-list": "verses", ".chapter-heading h1": "heading" };
    const doc = {
      fonts: faces,
      querySelectorAll: () => [{ href: "https://fonts.googleapis.com/css2?family=Gelasio" }],
      querySelector: (selector) => elements[selector],
    };

    await preloadEditionFonts({
      doc,
      fetchImpl: async (url, options) => void fetched.push([url, options]),
      getStyle: (element) => styles.get(element),
    });

    assert.deepEqual(fetched, [["https://fonts.googleapis.com/css2?family=Gelasio", { mode: "no-cors" }]]);
    assert.deepEqual(faces.map((item) => item.loaded), [true, false, true, false, false]);
  });

  it("loads the nearest Cardo face used by Portuguese scripture and headings", async () => {
    const faces = [face("Cardo", "400"), face("Cardo", "700")];
    const elements = {
      "#verse-list": "verses",
      ".chapter-heading h1": "heading",
      ".book-name": "book",
    };
    const portugueseStyles = new Map([
      ["verses", { fontFamily: '"Cardo", Georgia', fontWeight: "400", fontStyle: "normal" }],
      ["heading", { fontFamily: '"Cardo", Georgia', fontWeight: "500", fontStyle: "normal" }],
      ["book", { fontFamily: '"Cardo", Georgia', fontWeight: "400", fontStyle: "normal" }],
    ]);

    await preloadEditionFonts({
      doc: {
        fonts: faces,
        querySelectorAll: () => [{ href: "https://fonts.googleapis.com/css2?family=Cardo" }],
        querySelector: (selector) => elements[selector],
      },
      fetchImpl: async () => {},
      getStyle: (element) => portugueseStyles.get(element),
    });

    assert.deepEqual(faces.map((item) => item.loaded), [true, false]);
  });
});

describe("service worker", () => {
  it("registers the root worker and logs a failed registration", async () => {
    const registered = [];
    const serviceWorker = { register: async (url) => void registered.push(url) };
    await registerServiceWorker({ serviceWorker });
    assert.deepEqual(registered, ["/sw.js"]);

    const errors = [];
    const failing = { register: async () => { throw new Error("blocked"); } };
    assert.equal(await registerServiceWorker({ serviceWorker: failing, logger: { error: (...details) => errors.push(details) } }), null);
    assert.equal(errors.length, 1);
  });

  it("precaches only files that exist", async () => {
    const source = await readFile(new URL("../sw.js", import.meta.url), "utf8");
    const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
    const list = source.match(/const SHELL_URLS = \[([\s\S]*?)\];/)[1];
    const urls = [...list.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    const stylesheetUrls = [...html.matchAll(/href="(\/styles\/[^"]+\.css)"/g)].map(([, url]) => url);

    assert.ok(urls.length > 0);
    for (const url of stylesheetUrls) {
      assert.ok(urls.includes(url), `${url} is available offline`);
    }
    for (const url of urls) {
      const path = url === "/" ? "/index.html" : url;
      await access(fileURLToPath(new URL(`..${path}`, import.meta.url)));
    }
  });

  it("precaches every reader module dependency", async () => {
    const source = await readFile(new URL("../sw.js", import.meta.url), "utf8");
    const list = source.match(/const SHELL_URLS = \[([\s\S]*?)\];/)[1];
    const urls = new Set([...list.matchAll(/"([^"]+)"/g)].map((match) => match[1]));
    const visited = new Set();

    async function visitModule(path) {
      if (visited.has(path)) return;
      visited.add(path);
      assert.ok(urls.has(path), `${path} is available offline`);
      const moduleSource = await readFile(new URL(`..${path}`, import.meta.url), "utf8");
      for (const [, specifier] of moduleSource.matchAll(/from\s+["'](\.\.?\/[^"']+)["']/g)) {
        await visitModule(new URL(specifier, `https://example.test${path}`).pathname);
      }
    }

    await visitModule("/js/app.js");
  });
});
