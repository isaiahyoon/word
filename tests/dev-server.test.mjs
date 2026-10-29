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
    assert.match(await response.text(), /The Word — King James Version/);
  });

  it("serves the app shell for scripture deep links", async () => {
    const response = await fetch(`${origin}/b/joshua/c/1/v/1-10`);

    assert.equal(response.status, 200);
    assert.match(await response.text(), /id="verse-list"/);
  });

  it("serves the branded 404 document for unknown paths", async () => {
    const response = await fetch(`${origin}/not-a-route`);
    const html = await response.text();

    assert.equal(response.status, 404);
    assert.match(html, /Page Not Found — The Word/);
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
        fetch(`${origin}/typography.css`),
      ]);
    const [readerHtml, errorHtml, typographyCss] = await Promise.all([
      readerResponse.text(),
      errorResponse.text(),
      typographyResponse.text(),
    ]);

    assert.match(readerHtml, /href="typography\.css"/);
    assert.match(errorHtml, /href="typography\.css"/);
    assert.equal(typographyResponse.status, 200);
    assert.match(typographyCss, /--type-reading:\s*18px/);
    assert.match(typographyCss, /--serif:/);
    assert.match(typographyCss, /--sans:/);
  });

  it("serves the accessible chapter sparkle trigger and metallic animation", async () => {
    const [readerResponse, stylesResponse] = await Promise.all([
      fetch(origin),
      fetch(`${origin}/styles.css`),
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
      fetch(`${origin}/styles.css`),
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
    assert.ok(shortcutListStart >= 0);
    assert.ok(
      homeShortcut > shortcutListStart && homeShortcut < firstTestamentShortcut,
    );
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
      fetch(`${origin}/styles.css`),
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
