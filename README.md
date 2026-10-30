# Word

## About

An application that allows you to easily navigate the word of God.

```
"All scripture is given by inspiration of God,
and is profitable for doctrine, for reproof,
for correction, for instruction in righteousness:
That the man of God may be perfect,
thoroughly furnished unto all good works."
```

```
"For the word of God is quick, and powerful,
and sharper than any twoedged sword,
piercing even to the dividing asunder of soul and spirit,
and of the joints and marrow,
and is a discerner of the thoughts and intents of the heart.
Neither is there any creature that is not manifest in his sight:
but all things are naked and opened unto the eyes
of him with whom we have to do."
```

```
In the beginning was the Word,
and the Word was with God,
and the Word was God.

The same was in the beginning with God.

All things were made by him;
and without him was not any thing made that was made.
```

## Run locally

Start the local server from this directory so the reader can load scripture data and open deep links:

```sh
node tools/dev-server.mjs
```

Then open [http://localhost:8000](http://localhost:8000).
If port 8000 is occupied, choose another port with `PORT=8001 node tools/dev-server.mjs`.
When deploying, configure the host to internally serve `index.html` for valid `/kjv/b/*`, `/krv/b/*`, and legacy `/b/*` scripture routes while keeping the requested URL. Unknown paths should serve `404.html` with a 404 status.

Scripture links identify their edition before the book route. Omitting the chapter opens chapter 1; omitting the verse opens and highlights verse 1:

```text
/kjv/b/john
/kjv/b/john/c/3
/kjv/b/john/c/3/v/16
/kjv/b/john/c/3/v/16-18
/krv/b/john/c/3/v/16
```

Existing unprefixed `/b/*` links continue to open KJV and are canonicalized to `/kjv/b/*`. Valid verse links scroll to the requested verses and highlight them briefly. Invalid books, chapters, or verse ranges open the 404 page, which links back to the reading room.

## Scripture data

The reader loads the selected edition's chapter-count index and current book first. Each edition has its own files under `scripture/<edition>/books/`, named by the fixed canon, such as `1_genesis.json`. Other books load when opened, and full-text search loads the remaining books when used. Rebuild the editions with:

```sh
node tools/build-kjv-data.mjs
node tools/build-krv-data.mjs
```

The 1961 KRV source is pinned in `sources/krv-1961.json`; attribution is shown when KRV is selected. Its economic copyright term has expired according to the [Bible Society of Korea](https://www.bskorea.or.kr/bbs/board.php?bo_table=copyright_faq&wr_id=5); preserve the text and provide attribution.

## Search

Search applies to the selected edition. Scripture text matching requires every query term to appear in the same verse, but the terms do not need to be adjacent. Results are ranked by relevance; longer words tolerate small spelling errors, and prefixes can match as you type. For example, `piercing sword` and `piercin sword` both find Hebrews 4:12. Search is lexical rather than semantic, so it does not infer synonyms or concepts that are absent from the verse text.

Book and passage queries also provide one direct navigation suggestion at the top of the list, followed by matching verse text. For example, `John` offers an option to open John before verses containing “John”; `John 1` offers a chapter link; and `John 1:1` places that exact verse first. The exact passage is not repeated in the text results. Book-name prefixes work when they identify a single book.

KRV search accepts Korean book names and references such as `요한복음`, `요한복음 1:1`, and `요한복음 1장 1절`. Full-width digits and punctuation are normalized, and spaces between the book name and reference are optional.

The first text search loads and indexes the selected edition's verses in the browser. The index is reused for later searches in that edition; no search query is sent to an external search service. Results are shown 12 at a time as the list is scrolled. The index is separate for each edition.

## Tests

Run the CSS linter and the route, keyboard-shortcut, scripture-store,
source-data parity, and development-server tests with Node's built-in test
runner, then install Chromium once and run the browser interaction tests:

```sh
npm run lint:css
npm test
npx playwright install chromium
npm run test:ui
```

Run the CSS lint and both test suites together with `npm run test:all`.

## Customize the palette

Edit the shared typography tokens in `typography.css` and the color custom properties at the top of `styles.css`. The app and 404 page share the Gelasio display/reading face and DM Sans interface face. The base pastels are `--blue`, `--lavender`, `--yellow`, `--pink`, and `--green`; the chapter number's higher-contrast gradient stops are `--chapter-blue`, `--chapter-lavender`, `--chapter-pink`, and `--chapter-green`.

## License

This project is jointly licensed under the terms of both of the following licenses:

- **[MIT License](LICENSE.md)**
- **[Polymorph License](LICENSE.md)**

By using, copying, modifying, or distributing this software, you agree to comply with the terms, conditions, and restrictions of **both** licenses simultaneously.

Please review the full text in the linked license file included in this repository for complete compliance details.

## Support the project

If The Word has helped you find a verse faster than flipping pages, you can [buy me a coffee](https://www.buymeacoffee.com/isaiahyoon). The verses are free; caffeine, less so.
