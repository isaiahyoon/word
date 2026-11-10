const SHELL_CACHE = "the-word-shell-v8";
const EDITION_CACHE = "the-word-editions";
const FONT_CACHE = "the-word-fonts-v1";
const FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);
const SHELL_URLS = [
  "/",
  "/index.html",
  "/about.html",
  "/manifest.webmanifest",
  "/styles/theme.css",
  "/styles/about.css",
  "/styles/typography.css",
  "/styles/editions.css",
  "/styles/styles.css",
  "/styles/reader-interactions.css",
  "/styles/reader-dialogs.css",
  "/styles/reader-search-results.css",
  "/styles/reader-navigation.css",
  "/styles/reader-content.css",
  "/styles/reader-footer.css",
  "/styles/reader-effects.css",
  "/styles/reader-responsive.css",
  "/js/app.js",
  "/js/about.js",
  "/js/about-locales.mjs",
  "/js/books.mjs",
  "/js/chapter-picker.js",
  "/js/edition-picker.js",
  "/js/editions.mjs",
  "/js/keyboard-shortcuts.js",
  "/js/logger.js",
  "/js/offline.js",
  "/js/offline-control.js",
  "/js/offline-fonts.js",
  "/js/reader-feedback.js",
  "/js/reader-search.js",
  "/js/scripture-routes.mjs",
  "/js/scripture-store.js",
  "/js/ui-locales.mjs",
  "/js/verse-reference-alignment.mjs",
  "/js/verse-copy-share.js",
  "/js/visual-effects.js",
  "/js/vendor/minisearch.js",
  "/assets/favicon.png?v=4",
  "/assets/favicon-rounded.png?v=1",
  "/assets/apple-touch-icon.png?v=4",
  "/assets/pwa-icon-192.png?v=4",
  "/assets/pwa-icon-512.png?v=4",
];

const ignoreOffline = () => {};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name.startsWith("the-word-shell-") && name !== SHELL_CACHE)
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (FONT_HOSTS.has(url.hostname)) {
    event.respondWith(fontResponse(event));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/scripture/")) {
    event.respondWith(scriptureResponse(event));
  } else if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request));
  } else {
    event.respondWith(shellResponse(event));
  }
});

async function navigationResponse(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const pathname = new URL(request.url).pathname;
    const fallback = pathname === "/about" || pathname === "/about/" ? "/about.html" : "/index.html";
    const page = await caches.match(fallback, { cacheName: SHELL_CACHE });
    if (page) return page;
    throw error;
  }
}

// Code and styles stay network-first so online readers always get the latest deploy.
async function shellResponse(event) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(event.request);
    if (response.ok) event.waitUntil(cache.put(event.request, response.clone()));
    return response;
  } catch (error) {
    const cached = await cache.match(event.request);
    if (cached) return cached;
    throw error;
  }
}

// Only editions the reader chose to save are served from the cache.
async function scriptureResponse(event) {
  const cache = await caches.open(EDITION_CACHE);
  const cached = await cache.match(event.request);
  if (!cached) return fetch(event.request);

  event.waitUntil(revalidate(event.request, cache).catch(ignoreOffline));
  return cached;
}

async function fontResponse(event) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(event.request);
  const network = revalidate(event.request, cache);
  if (!cached) return network;

  event.waitUntil(network.catch(ignoreOffline));
  return cached;
}

async function revalidate(request, cache) {
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") await cache.put(request, response.clone());
  return response;
}
