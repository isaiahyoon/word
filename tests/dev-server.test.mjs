import assert from "node:assert/strict";
import { once } from "node:events";
import { readdir, readFile } from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import { createDevServer } from "../tools/dev-server.mjs";
import { EDITIONS } from "../js/editions.mjs";

describe("development server", () => {
  const server = createDevServer();
  let origin;

  before(async () => {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    origin = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    server.close();
    await once(server, "close");
  });

  async function fetchReaderStyles() {
    const response = await fetch(origin);
    const html = await response.text();
    const paths = [...html.matchAll(/href="(\/styles\/[^"]+\.css)"/g)].map(([, path]) => path);
    const stylesheets = await Promise.all(paths.map((path) => fetch(`${origin}${path}`)));

    assert.ok(paths.includes("/styles/styles.css"));
    const styles = await Promise.all(stylesheets.map(async (stylesheet) => {
      assert.equal(stylesheet.status, 200);
      return stylesheet.text();
    }));
    return styles.join("\n");
  }

  it("serves the reader at the root", async () => {
    const response = await fetch(origin);

    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<title>The Amazing Word<\/title>/);
    assert.ok(html.includes('data-glimmer="The Amazing Word"'));
    assert.match(html, />\s*The Amazing Word<\/strong\s*>/);
    assert.match(html, /name="description"\s+content="A quiet, searchable reader for exploring Scripture at your own pace\./);
    assert.match(html, /property="og:title" content="The Amazing Word"/);
    assert.match(html, /property="og:image" content="https:\/\/theamazingword\.org\/assets\/social-preview\.png"/);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    assert.match(html, /name="twitter:image" content="https:\/\/theamazingword\.org\/assets\/social-preview\.png"/);
    assert.match(html, /class="topbar-about" href="\/about"/);
    assert.match(html, /class="topbar-actions"[\s\S]*class="shortcuts-trigger"/);
    assert.match(html, /class="site-footer-instagram"\s+href="https:\/\/www\.instagram\.com\/theamazingwordapp\/"\s+target="_blank"\s+rel="noopener noreferrer"/);
    assert.match(html, /aria-label="Visit The Amazing Word on Instagram, opens in a new tab"/);
  });

  it("gives every HTML page a shared-link preview image", async () => {
    const root = new URL("../", import.meta.url);
    const studies = (await readdir(new URL("studies/", root))).filter((name) => name.endsWith(".html"));
    const editionPages = Object.values(EDITIONS).map((edition) => `editions/${edition.routeSegment}/index.html`);
    const pages = ["index.html", "about.html", "404.html", ...editionPages, ...studies.map((name) => `studies/${name}`)];

    for (const page of pages) {
      const html = await readFile(new URL(page, root), "utf8");
      assert.match(html, /property="og:title"/, `${page} has og:title`);
      assert.match(html, /property="og:description"/, `${page} has og:description`);
      assert.match(html, /property="og:image" content="https:\/\/theamazingword\.org\/assets\/social-preview\.png"/, `${page} has og:image`);
      assert.match(html, /name="twitter:card" content="summary_large_image"/, `${page} has twitter:card`);
      assert.match(html, /name="twitter:image" content="https:\/\/theamazingword\.org\/assets\/social-preview\.png"/, `${page} has twitter:image`);
    }
  });

  it("serves pre-rendered edition landing pages with canonical URLs and reader links", async () => {
    for (const edition of Object.values(EDITIONS)) {
      const path = `/editions/${edition.routeSegment}/`;
      const response = await fetch(`${origin}${path}`);
      const html = await response.text();

      assert.equal(response.status, 200, path);
      assert.match(html, new RegExp(`<html lang="${edition.language}"`), path);
      assert.match(html, /<h1 id="page-title">[^<]+<\/h1>/, path);
      assert.match(html, new RegExp(`<link rel="canonical" href="https://theamazingword\\.org${path.replaceAll("/", "\\/")}"`), path);
      assert.match(html, new RegExp(`href="/${edition.routeSegment}/b/genesis/c/1/v/1"`), path);
      assert.match(html, /<main>[\s\S]*<h1[\s\S]*<\/main>/, `${path} has static page content`);
      assert.match(html, /rel="apple-touch-icon" href="\/assets\/apple-touch-icon\.png"/, path);
    }

    const readerResponse = await fetch(`${origin}/kjv/b/genesis/c/1/v/1`);
    assert.match(await readerResponse.text(), /<title>The Amazing Word<\/title>/);
  });

  it("publishes a sitemap for canonical pages and advertises it to crawlers", async () => {
    const [robotsResponse, sitemapResponse] = await Promise.all([
      fetch(`${origin}/robots.txt`),
      fetch(`${origin}/sitemap.xml`),
    ]);
    const [robots, sitemap] = await Promise.all([robotsResponse.text(), sitemapResponse.text()]);
    const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, location]) => location);
    const studies = (await readdir(new URL("../studies/", import.meta.url)))
      .filter((name) => name.endsWith(".html"))
      .map((name) => `https://theamazingword.org/studies/${name}`)
      .sort();
    const root = new URL("../", import.meta.url);
    const canonicalPages = [
      ["index.html", "https://theamazingword.org/"],
      ["about.html", "https://theamazingword.org/about"],
      ...Object.values(EDITIONS).map((edition) => [
        `editions/${edition.routeSegment}/index.html`,
        `https://theamazingword.org/editions/${edition.routeSegment}/`,
      ]),
      ...(await readdir(new URL("studies/", root)))
        .filter((name) => name.endsWith(".html"))
        .map((name) => [`studies/${name}`, `https://theamazingword.org/studies/${name}`]),
    ];
    const expectedUrls = [
      "https://theamazingword.org/",
      "https://theamazingword.org/about",
      ...Object.values(EDITIONS).map((edition) => `https://theamazingword.org/editions/${edition.routeSegment}/`),
      ...studies,
    ];

    assert.equal(robotsResponse.status, 200);
    assert.match(robotsResponse.headers.get("content-type"), /text\/plain/);
    assert.match(robots, /Sitemap: https:\/\/theamazingword\.org\/sitemap\.xml/);
    assert.equal(sitemapResponse.status, 200);
    assert.match(sitemapResponse.headers.get("content-type"), /application\/xml/);
    assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
    assert.deepEqual(locations, expectedUrls);
    for (const [file, canonicalUrl] of canonicalPages) {
      const html = await readFile(new URL(file, root), "utf8");
      assert.ok(html.includes(`<link rel="canonical" href="${canonicalUrl}" />`), `${file} has canonical URL`);
    }
  });

  it("serves the Portuguese font study with its 22 specimens and pastel palette", async () => {
    const response = await fetch(`${origin}/studies/portuguese-font-study.html`);
    const html = await response.text();
    const families = [...html.matchAll(/data-family="([^"]+)"/g)].map(([, family]) => family);

    assert.equal(response.status, 200);
    assert.match(html, /<title>Portuguese Type Study · The Word<\/title>/);
    assert.match(html, /rel="apple-touch-icon" href="\/assets\/apple-touch-icon\.png"/);
    assert.match(html, /Portuguese serif type specimens/);
    assert.equal(families.length, 22);
    assert.equal(new Set(families).size, 22);
    for (const color of ["#F4F0E7", "#DDE9DC", "#E8CFCA", "#E5D6A5"]) {
      assert.ok(html.includes(color), `study includes ${color}`);
    }
  });

  it("serves the About page at its clean route with install and support details", async () => {
    const [aboutResponse, slashResponse] = await Promise.all([
      fetch(`${origin}/about`),
      fetch(`${origin}/about/`),
    ]);
    const [html, slashHtml] = await Promise.all([
      aboutResponse.text(),
      slashResponse.text(),
    ]);

    assert.equal(aboutResponse.status, 200);
    assert.equal(slashResponse.status, 200);
    assert.match(html, /<title>About — The Amazing Word<\/title>/);
    assert.match(html, /rel="apple-touch-icon" href="\/assets\/apple-touch-icon\.png"/);
    assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
    assert.match(html, /The King James Version is the canonical foundation/);
    assert.match(html, /Add to Dock/);
    assert.match(html, /Add to Home Screen/);
    assert.match(html, /Install app/);
    assert.match(html, /Install this site as an app/);
    assert.match(html, /id="install-language-form"/);
    assert.match(html, /https:\/\/buymeacoffee\.com\/isaiahyoon/);
    assert.match(slashHtml, /id="install-title"/);
  });

  it("serves an up-to-date install manifest for each edition", async () => {
    const shared = await (await fetch(`${origin}/manifest.webmanifest`)).json();
    for (const edition of Object.values(EDITIONS)) {
      const response = await fetch(`${origin}/assets/install-manifests/${edition.id}.webmanifest`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /application\/manifest\+json/);
      const manifest = await response.json();
      assert.deepEqual(
        manifest.icons.map(({ src }) => src.split("?")[0]),
        ["/assets/pwa-icon-192.png", "/assets/pwa-icon-512.png"],
        `${edition.id} keeps the sword app icon`,
      );
      assert.deepEqual(manifest, {
        ...shared,
        name: edition.appName,
        short_name: edition.appName,
        lang: edition.language,
        start_url: `/?install=${edition.id}`,
      });
    }
  });

  it("reports server liveness at /health", async () => {
    const response = await fetch(`${origin}/health`);

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/json/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { status: "ok" });

    const headResponse = await fetch(`${origin}/health`, { method: "HEAD" });
    assert.equal(headResponse.status, 200);
    assert.equal(await headResponse.text(), "");
  });

  it("includes a statically detectable Netlify reader feedback form", async () => {
    const response = await fetch(origin);
    const html = await response.text();
    const formTag = html.match(/<form\b[^>]*id="reader-feedback-form"[^>]*>/s)?.[0];

    assert.equal(response.status, 200);
    assert.ok(formTag, "feedback form is present in the static HTML");
    assert.match(formTag, /name="reader-feedback"/);
    assert.match(formTag, /method="POST"/);
    assert.match(formTag, /(?:\s|^)netlify(?:\s|$)/);
    assert.match(formTag, /data-netlify="true"/);
    assert.match(formTag, /netlify-honeypot="bot-field"/);
    assert.match(html, /name="form-name" value="reader-feedback"/);
    assert.match(html, /name="message"/);
    assert.match(html, /name="email"/);
    assert.match(html, /name="passage"/);
  });

  it("serves the Prismbrand sword favicon", async () => {
    const faviconResponse = await fetch(`${origin}/assets/favicon.svg`);
    const favicon = await faviconResponse.text();

    assert.equal(faviconResponse.status, 200);
    assert.match(favicon, /viewBox="0 0 64 64"/);
    assert.match(favicon, /id="prism-steel"/);
    assert.match(favicon, /id="seraphic-fire"/);
    assert.match(favicon, /id="radiant-dawn"/);
    assert.match(favicon, /M32 2 36 10 44 5/);
    assert.match(favicon, /M32 5 39 28 35 35/);
    assert.match(favicon, /<circle cx="20" cy="12"/);
  });

  it("serves the high-resolution social preview image", async () => {
    const response = await fetch(`${origin}/assets/social-preview.png`);
    const image = new Uint8Array(await response.arrayBuffer());

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /image\/png/);
    assert.deepEqual([...image.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    const dimensions = new DataView(image.buffer, image.byteOffset, image.byteLength);
    assert.equal(dimensions.getUint32(16), 1200);
    assert.equal(dimensions.getUint32(20), 630);
  });

  it("serves the app shell for scripture deep links", async () => {
    for (const path of [
      "/kjv/b/joshua/c/1/v/1-10",
      "/kjv/b/joshua/c/1/v/1-10/",
      "/krv/b/joshua/c/1/v/1-10",
      "/krv/b/joshua/c/1/v/1-10/",
      "/diodati/b/joshua/c/1/v/1-10/",
      "/licht/b/joshua/c/1/v/1-10",
      "/licht/b/joshua/c/1/v/1-10/",
      "/japbungo/b/joshua/c/1/v/1-10/",
      "/moh/b/psalms/c/3/v/1",
      "/moh/b/psalms/c/3/v/1/",
      "/luz/b/psalms/c/3/v/1/",
      "/alm/b/john/c/3/v/16",
      "/alm/b/john/c/3/v/16/",
      "/moh",
      "/moh/",
      "/licht",
      "/licht/",
      "/kjv",
      "/kjv/",
      "/krv",
      "/krv/",
      "/alm",
      "/alm/",
      "/b/joshua/c/1/v/1-10",
      "/b/joshua/c/1/v/1-10/",
      "/b/john/3/16",
      "/b/john/3/16/",
    ]) {
      const response = await fetch(`${origin}${path}`);

      assert.equal(response.status, 200, path);
      assert.match(await response.text(), /id="verse-list"/, path);
    }
  });

  it("keeps scripture rewrites ahead of the branded fallback", async () => {
    const response = await fetch(`${origin}/_redirects`);
    const redirects = await response.text();
    const aboutRewriteIndex = redirects.indexOf("/about        /about.html 200");
    const aboutSlashRewriteIndex = redirects.indexOf("/about/       /about.html 200");
    const editionRewriteIndex = redirects.indexOf("/:edition /index.html 200");
    const editionSlashRewriteIndex = redirects.indexOf("/:edition/ /index.html 200");
    const fallbackIndex = redirects.indexOf("/*        /404.html    404");

    assert.equal(response.status, 200);
    assert.ok(aboutRewriteIndex >= 0 && aboutRewriteIndex < editionRewriteIndex);
    assert.ok(aboutSlashRewriteIndex >= 0 && aboutSlashRewriteIndex < editionRewriteIndex);
    assert.ok(editionSlashRewriteIndex >= 0 && editionSlashRewriteIndex < fallbackIndex);
    assert.notEqual(fallbackIndex, -1);
    for (const route of ["/about", "/kjv/b/*", "/krv/b/*", "/diodati/b/*", "/licht/b/*", "/japbungo/b/*", "/moh/b/*", "/luz/b/*", "/alm/b/*", "/b/*"]) {
      assert.ok(redirects.indexOf(route) < fallbackIndex, `${route} precedes the 404 fallback`);
    }
  });

  it("serves the branded 404 document for unknown paths", async () => {
    const response = await fetch(`${origin}/not-a-route`);
    const html = await response.text();

    assert.equal(response.status, 404);
    assert.match(html, /Page Not Found — The Amazing Word/);
    assert.match(html, /<meta name="robots" content="noindex,follow" \/>/);
    assert.match(html, /<strong>The Amazing Word<\/strong>/);
    assert.match(html, /Come back to the reading room/);
    assert.doesNotMatch(html, /id="go-back"/);
  });

  it("preserves a 404 status for the standalone error document", async () => {
    const response = await fetch(`${origin}/404.html`);
    const html = await response.text();

    assert.equal(response.status, 404);
    assert.match(html, /Come back to the reading room/);
    assert.match(html, /id="reader-link"/);
    assert.doesNotMatch(html, /id="go-back"/);
  });

  it("serves the shared typography sheet to the reader and error page", async () => {
    const [readerResponse, errorResponse, typographyResponse] =
      await Promise.all([
        fetch(origin),
        fetch(`${origin}/404.html`),
        fetch(`${origin}/styles/typography.css`),
      ]);
    const [readerHtml, errorHtml, typographyCss] = await Promise.all([
      readerResponse.text(),
      errorResponse.text(),
      typographyResponse.text(),
    ]);

    assert.match(readerHtml, /href="\/styles\/typography\.css"/);
    assert.match(errorHtml, /href="\/styles\/typography\.css"/);
    assert.equal(typographyResponse.status, 200);
    assert.match(typographyCss, /--type-reading:\s*18px/);
    assert.match(typographyCss, /--serif:/);
    assert.match(typographyCss, /--sans:/);
  });

  it("uses deep teal and brass accents in chapter navigation", async () => {
    const [themeResponse, styles] = await Promise.all([
      fetch(`${origin}/styles/theme.css`),
      fetchReaderStyles(),
    ]);
    const theme = await themeResponse.text();

    assert.match(theme, /--deep-teal:/);
    assert.match(theme, /--brass:/);
    assert.match(styles, /\.chapter-kicker\s*\{[^}]*var\(--deep-teal\)/s);
    assert.match(styles, /\.chapter-select:hover,[\s\S]*?var\(--brass\)/);
    assert.match(styles, /\.kicker-dash\s*\{[^}]*var\(--brass\)/s);
  });

  it("uses the Cobalt Roof Tile gradient for the KRV backdrop", async () => {
    const response = await fetch(`${origin}/styles/editions.css`);
    const styles = await response.text();

    assert.equal(response.status, 200);
    assert.match(
      styles,
      /body\.is-krv-edition::before\s*\{[^}]*background-image:\s*linear-gradient\(128deg,\s*#bed8ea,\s*#e8f1f4 58%,\s*#c3d3e5\)/s,
    );
  });

  it("keeps edition palettes and interface tokens in the edition sheet", async () => {
    const [readerResponse, editionsResponse, stylesResponse] = await Promise.all([
      fetch(origin),
      fetch(`${origin}/styles/editions.css`),
      fetch(`${origin}/styles/styles.css`),
    ]);
    const [readerHtml, editionsCss, stylesCss] = await Promise.all([
      readerResponse.text(),
      editionsResponse.text(),
      stylesResponse.text(),
    ]);

    assert.match(readerHtml, /href="\/styles\/editions\.css"/);
    assert.equal(editionsResponse.status, 200);
    assert.match(editionsCss, /body\.is-diodati-edition\s*\{[^}]*--switcher-border:/s);
    assert.match(editionsCss, /body\.is-luther1912-edition\s*\{[^}]*--book-current-fill:/s);
    assert.doesNotMatch(stylesCss, /body\.is-[a-z0-9]+-edition\s*\{[^}]*--canvas:/s);
  });

  it("reduces the verse loading message size", async () => {
    const styles = await fetchReaderStyles();

    assert.match(styles, /\.verse-list\[aria-busy="true"\]\s*\{[^}]*font-size:\s*14px;/s);
  });

  it("serves the accessible chapter sparkle trigger and metallic animation", async () => {
    const [readerResponse, stylesCss] = await Promise.all([
      fetch(origin),
      fetchReaderStyles(),
    ]);
    const readerHtml = await readerResponse.text();

    assert.match(readerHtml, /class="chapter-sparkles" aria-hidden="true"/);
    assert.match(
      stylesCss,
      /\.chapter-select\[aria-expanded="true"\] \.chapter-sparkles i/,
    );
    assert.match(stylesCss, /@keyframes chapter-gold-sparkle/);
    assert.match(stylesCss, /#a76d0d/);
  });

  it("documents testament shortcuts with their theme gradients", async () => {
    const [readerResponse, styles] = await Promise.all([
      fetch(origin),
      fetchReaderStyles(),
    ]);
    const html = await readerResponse.text();

    assert.match(html, /<kbd aria-label="O key">O<\/kbd>/);
    assert.match(html, /<kbd aria-label="N key">N<\/kbd>/);
    assert.match(html, /<span>Old Testament<\/span>/);
    assert.match(html, /<span>New Testament<\/span>/);
    assert.match(html, /<kbd aria-label="Up arrow">↑<\/kbd>/);
    assert.match(html, /<kbd aria-label="Down arrow">↓<\/kbd>/);
    assert.match(html, /<span>Previous verse<\/span>/);
    assert.match(html, /<span>Next verse<\/span>/);
    assert.match(html, /<span>Previous chapter<\/span>/);
    assert.match(html, /<span>Next chapter<\/span>/);
    assert.match(html, /<kbd aria-label="H key">H<\/kbd>/);
    assert.match(html, /<span>Go to homepage<\/span>/);
    assert.match(html, /<kbd aria-label="Q key">Q<\/kbd>/);
    assert.match(html, /<span>Toggle quiet reading<\/span>/);
    assert.match(html, /<kbd aria-label="Escape key">Esc<\/kbd>/);
    assert.match(html, /<span>Exit quiet reading<\/span>/);
    assert.match(html, /<kbd aria-label="Command R or Control R">⌘R \/ Ctrl\+R<\/kbd>/);
    assert.match(html, /<span>Refresh page<\/span>/);
    assert.match(html, /<kbd aria-label="Command K or Control K">⌘K \/ Ctrl\+K<\/kbd>/);
    assert.match(html, /<span>Focus search<\/span>/);
    assert.match(html, /<kbd aria-label="Command C or Control C">⌘C \/ Ctrl\+C<\/kbd>/);
    assert.match(html, /<span>Copy selected verses<\/span>/);
    assert.match(html, /<kbd aria-label="Command X or Control X">⌘X \/ Ctrl\+X<\/kbd>/);
    assert.match(html, /<span>Copy and clear selection<\/span>/);
    assert.match(html, /<kbd aria-label="Slash key">\/<\/kbd>/);
    assert.match(html, /<span>Show keyboard shortcuts<\/span>/);
    assert.match(
      styles,
      /\.shortcut-row--quiet\s*\{[^}]*var\(--pink\)[^}]*var\(--blue\)[^}]*var\(--yellow\)/s,
    );
    assert.match(
      styles,
      /\.shortcut-row--escape\s*\{[^}]*var\(--green\)[^}]*var\(--lavender\)/s,
    );
    assert.match(
      styles,
      /\.shortcut-row--home\s*\{[^}]*var\(--blue\)[^}]*var\(--pink\)[^}]*var\(--yellow\)[^}]*var\(--green\)/s,
    );
    const shortcutListStart = html.indexOf('<div class="shortcut-list">');
    const homeShortcut = html.indexOf(
      "<span>Go to homepage</span>",
      shortcutListStart,
    );
    const firstTestamentShortcut = html.indexOf(
      "<span>Old Testament</span>",
      shortcutListStart,
    );
    const lastChapterShortcut = html.indexOf(
      "<span>Next chapter</span>",
      shortcutListStart,
    );
    const openShortcutsEntry = html.indexOf(
      "<span>Show keyboard shortcuts</span>",
      shortcutListStart,
    );
    const refreshShortcut = html.indexOf("<span>Refresh page</span>", shortcutListStart);
    const focusSearchShortcut = html.indexOf("<span>Focus search</span>", shortcutListStart);
    const copyShortcut = html.indexOf("<span>Copy selected verses</span>", shortcutListStart);
    const cutShortcut = html.indexOf("<span>Copy and clear selection</span>", shortcutListStart);
    assert.ok(shortcutListStart >= 0);
    assert.ok(
      homeShortcut > shortcutListStart && homeShortcut < firstTestamentShortcut,
    );
    assert.ok(refreshShortcut < focusSearchShortcut);
    assert.ok(focusSearchShortcut < copyShortcut);
    assert.ok(copyShortcut < cutShortcut);
    assert.ok(cutShortcut < openShortcutsEntry);
    assert.ok(openShortcutsEntry > lastChapterShortcut);
    assert.match(
      styles,
      /\.shortcut-row--old-testament\s*\{[^}]*var\(--yellow\)[^}]*var\(--green\)/s,
    );
    assert.match(
      styles,
      /\.shortcut-row--new-testament\s*\{[^}]*var\(--pink\)[^}]*var\(--blue\)/s,
    );
    assert.match(
      styles,
      /\.shortcuts-dialog\[open\] \.shortcut-row--previous kbd/,
    );
    assert.match(styles, /@keyframes shortcut-metal-sheen/);
    assert.match(styles, /\.shortcut-row--shortcuts kbd\s*\{/);
    assert.match(styles, /var\(--shortcut-key-color\)/);
    assert.match(styles, /@keyframes shortcut-silver-sheen/);
  });

  it("serves the quiet reading toggle and focus-mode styles", async () => {
    const [readerResponse, stylesCss] = await Promise.all([
      fetch(origin),
      fetchReaderStyles(),
    ]);
    const readerHtml = await readerResponse.text();

    assert.match(readerHtml, /id="quiet-view-toggle"/);
    assert.match(readerHtml, /aria-pressed="false"/);
    assert.match(stylesCss, /\.app-shell\.is-quiet-reading \.verse/);
    assert.match(stylesCss, /--line-quiet-reading/);
  });

  it("rejects unsupported methods", async () => {
    const response = await fetch(origin, { method: "POST" });

    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET, HEAD");
  });
});
