import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { ABOUT_LOCALES, getEditionSummary } from "../js/about-locales.mjs";
import { EDITIONS } from "../js/editions.mjs";
import { buildSeoPages } from "../tools/build-seo-pages.mjs";
import { createDevServer } from "../tools/dev-server.mjs";

const repository = new URL("../", import.meta.url);

async function createFixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "word-seo-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = pathToFileURL(`${directory}/`);
  await mkdir(new URL("studies/", root));
  const studies = (await readdir(new URL("studies/", repository)))
    .filter((name) => name.endsWith(".html"));
  await Promise.all(["_redirects", "about.html", "404.html", ...studies.map((name) => `studies/${name}`)]
    .map(async (path) => writeFile(new URL(path, root), await readFile(new URL(path, repository)))));
  return { directory, root };
}

test("registered SEO output stays reproducible and current", async (t) => {
  const { root } = await createFixture(t);
  await buildSeoPages({ projectRoot: root });
  const paths = [
    "_redirects", "about.html", "sitemap.xml", "editions/index.html",
    ...Object.values(EDITIONS).map(({ routeSegment }) => `editions/${routeSegment}/index.html`),
  ];
  for (const path of paths) {
    assert.equal(await readFile(new URL(path, root), "utf8"), await readFile(new URL(path, repository), "utf8"), path);
  }
  await buildSeoPages({ projectRoot: root });
  for (const path of paths) {
    assert.equal(await readFile(new URL(path, root), "utf8"), await readFile(new URL(path, repository), "utf8"), `${path} is idempotent`);
  }
});

test("a new edition automatically joins pages, palettes, counts, sitemap and both route forms", async (t) => {
  const { root, directory } = await createFixture(t);
  const extra = {
    ...EDITIONS.kjv,
    id: "testedition",
    routeSegment: "test-edition",
    label: "Test Edition",
    accentColor: "#112233",
    accentColors: ["#112233", "#aabbcc", "#ddeeff"],
    seo: {
      heading: "Test & Edition",
      title: "Test edition online",
      description: "A fixture edition for testing automatic discovery.",
    },
  };
  const editions = { ...EDITIONS, [extra.id]: extra };
  await buildSeoPages({ projectRoot: root, editions });
  const count = Object.keys(editions).length;
  const collection = await readFile(new URL("editions/index.html", root), "utf8");
  assert.ok(collection.includes(`One Word.<br />${count} editions.`));
  assert.ok(collection.includes('href="/editions/test-edition/"'));
  assert.ok(collection.includes('href="/test-edition/b/genesis/c/1/v/1"'));
  assert.ok(collection.includes("#ddeeff"));
  const page = await readFile(new URL("editions/test-edition/index.html", root), "utf8");
  assert.ok(page.includes("<h1 id=\"page-title\">Test &amp; Edition</h1>"));
  assert.ok(page.includes(extra.seo.description));
  for (const edition of Object.values(editions)) {
    const landing = await readFile(new URL(`editions/${edition.routeSegment}/index.html`, root), "utf8");
    assert.ok(landing.includes('href="/editions/test-edition/"'), edition.id);
  }
  for (const [language, locale] of Object.entries(ABOUT_LOCALES)) {
    const summary = getEditionSummary(locale, language, editions);
    assert.ok(summary.editionsTitle.includes(new Intl.NumberFormat(language).format(count)), language);
    assert.ok(summary.editionsCopy.includes(extra.label), language);
    assert.ok(!summary.editionsCopy.includes("{editions}"), language);
  }
  const about = await readFile(new URL("about.html", root), "utf8");
  assert.ok(about.includes(`data-about="editionsTitle">${count} editions`));
  assert.ok(about.includes(extra.label));
  assert.equal([...about.matchAll(/data-language="en"/g)].length, 1, "same-language editions do not duplicate language options");
  const sitemap = await readFile(new URL("sitemap.xml", root), "utf8");
  assert.equal([...sitemap.matchAll(/<loc>https:\/\/theamazingword.org\/editions\/test-edition\/<\/loc>/g)].length, 1);
  const redirects = await readFile(new URL("_redirects", root), "utf8");
  for (const slash of ["", "/"]) {
    assert.ok(redirects.includes(`/editions/test-edition${slash} /editions/test-edition/index.html 200`));
  }
  assert.ok(redirects.includes("/test-edition/b/*  /index.html  200"));
  assert.ok(redirects.includes("/about        /about.html 200"), "unrelated rewrites survive");

  const server = createDevServer(directory);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const slash of ["", "/"]) {
    const response = await fetch(`${origin}/editions/test-edition${slash}`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), page);
  }
});

test("incomplete edition registrations fail explicitly before writing output", async (t) => {
  const { root } = await createFixture(t);
  const cases = [
    [{ seo: undefined }, /Missing SEO heading/],
    [{ language: "xx" }, /Missing About locale/],
    [{ routeSegment: "kjv" }, /duplicate SEO edition route/],
    [{ routeSegment: "../escape" }, /Invalid or duplicate SEO edition route/],
    [{ routeSegment: undefined }, /Invalid or duplicate SEO edition route/],
    [{ accentColors: ["#112233"] }, /palette needs valid colors/],
    [{ accentColors: ["red", "blue"] }, /palette needs valid colors/],
  ];
  for (const [invalid, message] of cases) {
    const extra = { ...EDITIONS.kjv, id: "testedition", routeSegment: "test-edition", ...invalid };
    await assert.rejects(buildSeoPages({ projectRoot: root, editions: { ...EDITIONS, testedition: extra } }), message);
  }
  await assert.rejects(readFile(new URL("sitemap.xml", root)), { code: "ENOENT" });
});

test("a newly supported language gets a native-language About option and landing page", async (t) => {
  const { root } = await createFixture(t);
  const extra = {
    ...EDITIONS.kjv,
    id: "britishfixture",
    routeSegment: "british-fixture",
    language: "en-GB",
    languageName: "English (UK)",
    label: "British English fixture",
  };
  const editions = { ...EDITIONS, [extra.id]: extra };
  const locales = { ...ABOUT_LOCALES, "en-GB": { ...ABOUT_LOCALES.en } };
  await buildSeoPages({ projectRoot: root, editions, locales });
  const about = await readFile(new URL("about.html", root), "utf8");
  assert.ok(about.includes('data-language="en-GB" lang="en-GB" dir="ltr" aria-selected="false">English (UK)</button>'));
  const page = await readFile(new URL("editions/british-fixture/index.html", root), "utf8");
  assert.ok(page.includes('<html lang="en-GB" dir="ltr">'));
  assert.ok(page.includes("British English fixture"));
  await assert.rejects(buildSeoPages({
    projectRoot: root,
    editions,
    locales: { ...locales, "en-GB": { ...locales["en-GB"], openReader: "" } },
  }), /Missing About locale openReader/);
});
