# Contributing and operations

Local development, generated pages, diagnostics, validation, and design-system pointers.

## Run locally

Start the local server from this directory so the reader can load scripture data and open deep links:

```sh
node tools/dev-server.mjs
```

Then open [http://localhost:8000](http://localhost:8000).
If port 8000 is occupied, choose another port with `PORT=8001 node tools/dev-server.mjs`.
Check that the development server is running with `curl http://localhost:8000/health`.
When deploying, configure the host to internally serve `index.html` for valid `/kjv/b/*`, `/krv/b/*`, `/diodati/b/*`, `/licht/b/*`, `/japbungo/b/*`, `/moh/b/*`, `/luz/b/*`, `/alm/b/*`, and legacy `/b/*` scripture routes while keeping the requested URL. These reader routes accept an optional trailing slash. Serve `/about` and `/about/` from `about.html`; unknown paths should serve `404.html` with a 404 status.

## SEO pages and sitemap

The edition landing pages under `/editions/` contain localized, pre-rendered descriptions and links into the reader, so their content and metadata are available without running JavaScript. Edition links echo their full palette with a soft gradient and glow on hover and keyboard focus. Register each edition's localized `seo.heading`, `seo.title`, and `seo.description`, route, language, and palette in `js/editions.mjs`, and supply its About locale in `js/about-locales.mjs` if the language is new. Missing SEO metadata, locales, or valid palettes cause an explicit build error rather than an incomplete page.

Regenerate the pages, sitemap, marked deployment edition/reader rewrites, About language choices, and static About edition summary after changing editions or study pages:

```sh
npm run build:seo
```

The collection page at `/editions/` introduces every edition in its own language, with links to edition introductions and direct reading shortcuts. Each entry shows its edition heading above a smaller native-language label; Portuguese appears as “Bíblia Almeida (1911)” with “Português” below, while the reader picker uses “Almeida · Português”. Both `/editions` and `/editions/` work, as do edition landing URLs with or without a trailing slash; canonical URLs consistently include the slash.
The localized “Explore editions” link on the About page connects readers and crawlers to the collection, without adding a link to the reader footer.

The sitemap lists the homepage, About page, edition collection, every registered edition landing page, and the HTML studies. Counts and edition lists are registry-driven in the collection, landing pages, and every About locale. CI checks that generated pages and routes are current. `robots.txt` points crawlers to the sitemap. The landing pages are separate from reader routes, which continue to open the interactive app directly.

Scripture links identify their edition before the book route. Omitting the chapter opens chapter 1; omitting the verse opens and highlights verse 1:

```text
/kjv/b/john
/kjv/b/john/c/3
/kjv/b/john/c/3/v/16
/kjv/b/john/c/3/v/16-18
/krv/b/john/c/3/v/16
/diodati/b/genesis/c/1/v/1
/licht/b/john/c/3/v/16
/japbungo/b/john/c/3/v/16
/moh/b/psalms/c/3/v/1
/luz/b/psalms/c/3/v/1
/alm/b/john/c/3/v/16
```

Existing unprefixed `/b/*` links continue to open KJV and are canonicalized to `/kjv/b/*`. Valid verse links scroll to the requested verses and highlight them briefly. Invalid books, chapters, or verse ranges open the 404 page, which links back to the reading room.

## Diagnostics

Failures such as a chapter that cannot load, a failed search, or a failed copy are written to the browser console as `[the-word]` messages with identifiers like the edition, book, and chapter. Search text is never logged, and nothing is sent to an external service. To see how long chapter loads and searches take, run `localStorage.setItem("the-word.debug", "1")` in the console and reload; remove the key to turn timing off.

## Tests

Run both linters and the route, keyboard-shortcut, scripture-store,
source-data parity, and development-server tests with Node's built-in test
runner, then install Chromium once and run the browser interaction tests:

```sh
npm run lint:css
npm run lint:js
npm test
npx playwright install chromium
npm run test:ui
```

Run both linters and both test suites together with `npm run test:all`.
Playwright uses two workers in CI and 50% of available workers locally; pass
`--workers=N` to `npm run test:ui` to override the local default. GitHub Actions
runs the full check on every push and pull request.

CI jobs use the official Playwright container with browsers and Linux dependencies
preinstalled, rather than installing Chromium in every job. The exact
`@playwright/test` version in `package.json`, its lockfile entries, and both
container image tags in `.github/workflows/ci.yml` must match; a Node test enforces
this. Container startup still requires downloading the image, so compare actual
CI timings rather than assuming a speedup.
The checks job explicitly trusts only `$GITHUB_WORKSPACE` in Git's global
configuration before checking generated files, accommodating container ownership
without disabling Git's ownership protection for other directories.

`.github/renovate.json` limits automated updates to Playwright and groups its npm
package and CI images in one pull request, with no automatic merging. Enable the
[Renovate GitHub App](https://github.com/apps/renovate) for this repository to
activate updates; the configuration alone does not install the app. Review and
merge upgrades only after the full CI check passes. For manual upgrades, update
the exact package version, regenerate `package-lock.json` with `npm install`,
update both image tags to the same published version, and run `npm run test:all`.

## Customize the palette

Edit the shared typography tokens in `styles/typography.css`, the base color tokens in `styles/theme.css`, each edition's palette, switcher and current-book tokens in `styles/editions.css`, and reader component styles in `styles/reader-*.css`. The reader stylesheets are linked in cascade order in `index.html`: `styles.css` provides shared foundations, followed by interactions, dialogs, search results, navigation, reading content, footer, effects, and responsive rules. The reader interface uses DM Sans, with Japanese sans-serif UI text in Noto Sans JP; Scripture and selected display text retain their edition-specific serif faces. The About link uses the edition-specific serif through `--about-link-serif`. Diodati uses Cormorant Garamond for its Italian reading face, Martin uses EB Garamond for French, and Reina-Valera uses Petrona for Spanish Scripture and edition headings. The French font comparison is available in the [font study](../studies/french-font-study.html). The base pastels are `--blue`, `--lavender`, `--yellow`, `--pink`, and `--green`; the chapter number's higher-contrast gradient stops are `--chapter-blue`, `--chapter-lavender`, `--chapter-pink`, and `--chapter-green`.
