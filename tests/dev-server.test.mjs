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

  it("rejects unsupported methods", async () => {
    const response = await fetch(origin, { method: "POST" });

    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET, HEAD");
  });
});
