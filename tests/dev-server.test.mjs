import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, describe, it } from "node:test";
import { createDevServer } from "../tools/dev-server.mjs";

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

  it("serves the reader at the root", async () => {
    const response = await fetch(origin);

    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<title>The Word<\/title>/);
    assert.ok(html.includes('data-glimmer="The Word"'));
    assert.match(html, />\s*The Word<\/strong\s*>/);
    assert.match(html, /name="description"\s+content="A quiet, searchable reader for exploring Scripture at your own pace\./);
    assert.match(html, /property="og:title" content="The Word"/);
    assert.match(html, /property="og:image" content="https:\/\/theamazingword\.org\/assets\/social-preview\.png"/);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    assert.match(html, /name="twitter:image" content="https:\/\/theamazingword\.org\/assets\/social-preview\.png"/);
    assert.match(html, /class="site-footer-instagram"\s+href="https:\/\/www\.instagram\.com\/theamazingwordapp\/"\s+target="_blank"\s+rel="noopener noreferrer"/);
    assert.match(html, /aria-label="Visit The Word on Instagram, opens in a new tab"/);
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
      "/krv/b/joshua/c/1/v/1-10",
      "/licht/b/joshua/c/1/v/1-10",
      "/moh/b/psalms/c/3/v/1",
      "/moh",
      "/licht",
      "/kjv",
      "/krv",
      "/b/joshua/c/1/v/1-10",
      "/b/john/3/16",
    ]) {
      const response = await fetch(`${origin}${path}`);

      assert.equal(response.status, 200, path);
      assert.match(await response.text(), /id="verse-list"/, path);
    }
  });

  it("keeps scripture rewrites ahead of the branded fallback", async () => {
    const response = await fetch(`${origin}/_redirects`);
    const redirects = await response.text();
    const fallbackIndex = redirects.indexOf("/*        /404.html    404");

    assert.equal(response.status, 200);
    assert.notEqual(fallbackIndex, -1);
    for (const route of ["/kjv/b/*", "/krv/b/*", "/diodati/b/*", "/licht/b/*", "/japbungo/b/*", "/moh/b/*", "/b/*"]) {
      assert.ok(redirects.indexOf(route) < fallbackIndex, `${route} precedes the 404 fallback`);
    }
  });

  it("serves the branded 404 document for unknown paths", async () => {
    const response = await fetch(`${origin}/not-a-route`);
    const html = await response.text();

    assert.equal(response.status, 404);
    assert.match(html, /Page Not Found — The Word/);
    assert.match(html, /<strong>The Word<\/strong>/);
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
    const [themeResponse, stylesResponse] = await Promise.all([
      fetch(`${origin}/styles/theme.css`),
      fetch(`${origin}/styles/styles.css`),
    ]);
    const [theme, styles] = await Promise.all([
      themeResponse.text(),
      stylesResponse.text(),
    ]);

    assert.match(theme, /--deep-teal:/);
    assert.match(theme, /--brass:/);
    assert.match(styles, /\.chapter-kicker\s*\{[^}]*var\(--deep-teal\)/s);
    assert.match(styles, /\.chapter-select:hover,[\s\S]*?var\(--brass\)/);
    assert.match(styles, /\.kicker-dash\s*\{[^}]*var\(--brass\)/s);
  });

  it("uses the Cobalt Roof Tile gradient for the KRV backdrop", async () => {
    const response = await fetch(`${origin}/styles/styles.css`);
    const styles = await response.text();

    assert.equal(response.status, 200);
    assert.match(
      styles,
      /body\.is-krv-edition::before\s*\{[^}]*background-image:\s*linear-gradient\(128deg,\s*#bed8ea,\s*#e8f1f4 58%,\s*#c3d3e5\)/s,
    );
  });

  it("reduces the verse loading message size", async () => {
    const response = await fetch(`${origin}/styles/styles.css`);
    const styles = await response.text();

    assert.equal(response.status, 200);
    assert.match(styles, /\.verse-list\[aria-busy="true"\]\s*\{[^}]*font-size:\s*14px;/s);
  });

  it("serves the accessible chapter sparkle trigger and metallic animation", async () => {
    const [readerResponse, stylesResponse] = await Promise.all([
      fetch(origin),
      fetch(`${origin}/styles/styles.css`),
    ]);
    const [readerHtml, stylesCss] = await Promise.all([
      readerResponse.text(),
      stylesResponse.text(),
    ]);

    assert.match(readerHtml, /class="chapter-sparkles" aria-hidden="true"/);
    assert.match(
      stylesCss,
      /\.chapter-select\[aria-expanded="true"\] \.chapter-sparkles i/,
    );
    assert.match(stylesCss, /@keyframes chapter-gold-sparkle/);
    assert.match(stylesCss, /#a76d0d/);
  });

  it("documents testament shortcuts with their theme gradients", async () => {
    const [readerResponse, stylesResponse] = await Promise.all([
      fetch(origin),
      fetch(`${origin}/styles/styles.css`),
    ]);
    const [html, styles] = await Promise.all([
      readerResponse.text(),
      stylesResponse.text(),
    ]);

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
    const [readerResponse, stylesResponse] = await Promise.all([
      fetch(origin),
      fetch(`${origin}/styles/styles.css`),
    ]);
    const [readerHtml, stylesCss] = await Promise.all([
      readerResponse.text(),
      stylesResponse.text(),
    ]);

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
