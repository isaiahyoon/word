# The Amazing Word

> “All scripture is given by inspiration of God,
> and is profitable for doctrine, for reproof,
> for correction, for instruction in righteousness:
> That the man of God may be perfect,
> thoroughly furnished unto all good works.”

> “For the word of God is quick, and powerful,
> and sharper than any twoedged sword,
> piercing even to the dividing asunder of soul and spirit,
> and of the joints and marrow,
> and is a discerner of the thoughts and intents of the heart.
> Neither is there any creature that is not manifest in his sight:
> but all things are naked and opened unto the eyes
> of him with whom we have to do.”

> “In the beginning was the Word,
> and the Word was with God,
> and the Word was God.
>
> The same was in the beginning with God.
>
> All things were made by him;
> and without him was not any thing made that was made.”

**A quiet place to read Scripture in eight language editions—with a quick way to find a passage and the option to keep editions available offline.**

The Amazing Word is free to use, asks for no account, and is built around a simple path from opening the reader to finding, reading, and carrying a passage.

## For readers

| Edition | Language |
| --- | --- |
| King James Version (KJV) | English |
| Korean Revised Version (KRV) | Korean |
| Bungo-yaku (JapBungo) | Japanese |
| Giovanni Diodati (1649) | Italian |
| Luther Bible (1912) | German |
| David Martin Bible (1744) | French |
| Reina-Valera 1865 | Spanish |
| Almeida 1911 | Portuguese |

### Find, read, and carry a passage

- Search Scripture by words or phrases, with relevant results and direct suggestions for books, chapters, and verses. Search uses the selected edition’s text and localized references.
- Move through the text with book and chapter navigation, keyboard shortcuts, or direct passage links. Same-chapter verse shortcuts, search-result navigation, and Back/Forward reuse the displayed verses rather than rebuilding the chapter. Unchanged book lists and picker options also stay mounted.
- Select verses to copy or share. When moving a passage between editions, the reader reports known alignment limits instead of presenting uncertain references as exact.
- Install The Amazing Word on desktop or mobile, and save individual editions for offline reading.
- Read a localized interface in each edition’s language. Reading position and saved editions stay in browser storage on the device; search runs locally.

The [About page](./about.html) introduces the reader, explains installation, and presents the project’s convictions in eight interface languages. See the [reader guide](./docs/reader-guide.md) for platform instructions, offline behavior, and privacy details.

### Install size

The precached app shell contains 42 unique files: about 1.41 MB raw (1,408,481 bytes), or 1.01 MB gzipped (1,010,664 bytes, summed per file). Fonts and saved Scripture editions are separate; see the [reader guide](./docs/reader-guide.md#install-size) for details.

## For engineers

### Run locally

```sh
npm install
node tools/dev-server.mjs
```

Open [http://localhost:8000](http://localhost:8000). The local server serves the reader, Scripture data, and direct passage routes.

### How the project is organized

- [`js/editions.mjs`](./js/editions.mjs) registers edition identity, language, routes, and presentation metadata.
- [`sources/`](./sources/) holds normalized source texts and provenance; [`scripture/`](./scripture/) holds generated reader data.
- [`tools/`](./tools/) contains local development and data/page build tools.
- [`tests/`](./tests/) covers reader behavior, data integrity, routes, and the development server.

### Common checks and builds

| Task | Command |
| --- | --- |
| Run linters and all test suites | `npm run test:all` |
| Rebuild edition landing pages and sitemap | `npm run build:seo` |
| Rebuild edition-specific install manifests | `npm run build:install-manifests` |
| Rebuild or inspect Scripture data | See the [Scripture data guide](./docs/scripture-data.md) |

The [contributor guide](./docs/contributing.md) covers generated routes, diagnostics, CI, tests, and design-system entry points. Search behavior and language-specific reference support are documented in the [search guide](./docs/search.md).

## Project links

- [Explore Bible editions](./editions/)
- [About The Amazing Word](./about.html)
- [License and third-party notices](./LICENSE.md) · [third-party license details](./LICENSES.md)
- [Support the project](https://www.buymeacoffee.com/isaiahyoon)

The Amazing Word’s code and design are proprietary; Scripture texts, fonts, software, and other materials remain governed by their respective licenses and notices.
