# Word

## About

The Amazing Word is a quiet, free place to read Scripture on the web. It is built to make the text easy to find, move through, and carry with you, without asking you to create an account or pay to read.

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

## Features

- Read the King James Version (KJV), Korean Revised Version (KRV), Japanese Bungo-yaku (JapBungo), and Italian Giovanni Diodati (1649), with edition-aware book navigation and direct links to passages. JapBungo has a green reading theme; Diodati has a pink gradient reading theme.
- Search scripture by phrase or separate terms, with relevance ranking, fuzzy typo matching, and direct suggestions for books, chapters, and verses. Korean and Japanese searches support localized book names and references; Korean searches also support common spelling variations.
- Choose chapters with the whimsical chapter picker, or move through the text with navigation buttons and keyboard shortcuts. On mobile, swipe right from the left screen edge to open book navigation, or swipe left across the open drawer to close it. A discreet back-to-top button appears while scrolling.
- Open the shortcut guide with `/` to see Mac and Windows keys for refresh, search, navigation, Quiet Mode, and verse copying.
- Enter Quiet Mode for a calmer reading view, with subtle glimmer details throughout the interface.
- Select verses and copy them in chapter order as a quoted passage, with each verse on its own line and a compressed reference below the closing quotation mark. Clicking a verse also updates its direct link. The feedback form lets readers send a note, with passage details included only by choice.
- Shared links use a high-resolution branded preview featuring The Word's sword emblem.
- Install it as a standalone web app on Mac, iPhone, Android, or Windows using the browser's install option.

## App Installation

To install it on Mac, open the site in Safari and choose **File → Add to Dock**. On iPhone, open it in Safari, tap **Share**, then **Add to Home Screen**. On Android, open it in Chrome, open the menu, and choose **Install app** or **Add to Home screen**. On Windows, open the site in Microsoft Edge and choose **Settings and more → Apps → Install this site as an app**; in Chrome, choose **Cast, save, and share → Install page as app**. Menu labels may vary by browser version. The installed app requires an internet connection to load Scripture and other site content.

## Privacy

The Amazing Word is free to read, has no ads, and requires no account. Umami is the app's only analytics tool and is used for basic usage metrics, not advertising or ad targeting. Umami says its standard analytics process IP addresses transiently to distinguish visits and estimate approximate location, but does not store raw IPs in analytics records; its infrastructure may retain separate operational or security logs. Search runs locally in the browser rather than through an external search service.

## Run locally

Start the local server from this directory so the reader can load scripture data and open deep links:

```sh
node tools/dev-server.mjs
```

Then open [http://localhost:8000](http://localhost:8000).
If port 8000 is occupied, choose another port with `PORT=8001 node tools/dev-server.mjs`.
When deploying, configure the host to internally serve `index.html` for valid `/kjv/b/*`, `/krv/b/*`, `/diodati/b/*`, `/japbungo/b/*`, and legacy `/b/*` scripture routes while keeping the requested URL. Unknown paths should serve `404.html` with a 404 status.

Scripture links identify their edition before the book route. Omitting the chapter opens chapter 1; omitting the verse opens and highlights verse 1:

```text
/kjv/b/john
/kjv/b/john/c/3
/kjv/b/john/c/3/v/16
/kjv/b/john/c/3/v/16-18
/krv/b/john/c/3/v/16
/diodati/b/genesis/c/1/v/1
/japbungo/b/john/c/3/v/16
```

Existing unprefixed `/b/*` links continue to open KJV and are canonicalized to `/kjv/b/*`. Valid verse links scroll to the requested verses and highlight them briefly. Invalid books, chapters, or verse ranges open the 404 page, which links back to the reading room.

## Scripture data

The reader loads the selected edition's chapter-count index and current book first. Each edition has its own files under `scripture/<edition>/books/`, named by the fixed canon, such as `1_genesis.json`. Other books load when opened, and full-text search loads the remaining books when used. Rebuild the editions with:

```sh
node tools/build-kjv-data.mjs
node tools/build-krv-data.mjs
node tools/build-diodati-data.mjs
node tools/build-japbungo-data.mjs
```

The KJV source is stored in `sources/kjv.json`; the 1961 KRV source is pinned in `sources/krv-1961.json`. KRV attribution is shown when selected. Its economic copyright term has expired according to the [Bible Society of Korea](https://www.bskorea.or.kr/bbs/board.php?bo_table=copyright_faq&wr_id=5); preserve the text and provide attribution.

JapBungo is built from the public-domain [GetBible JapBungo source](https://github.com/getbible/v2/tree/master/japbungo), pinned with source metadata in `sources/japbungo.json`. It uses KJV verse numbering except for the explicit KRV fallback at 3 John 1:15. The upstream text omits Exodus 7:25, 2 Samuel 19:25, 2 Chronicles 2:13, and 3 John 1:15; those four slots use Korean KRV text and are labeled as KRV fallbacks in the reader and copied citations. Where a same-numbered KJV verse exists, the reader shows its text in a lavender reference panel and includes it when copied. KJV places the closing greeting of 3 John in verse 14, so the 3 John 1:15 fallback has no separate KJV reference. Rebuild it with `node tools/build-japbungo-data.mjs`.

Diodati text is stored in `sources/diodati.json` from the public-domain [Diodati-1649 repository](https://github.com/FordhamRamFan/public-domain-bible-translations/tree/main/Italian/Diodati-1649). Its 66 books and 31,102 verse slots follow KJV numbering. The picker code is DIO, and the Italian reader uses a pink gradient theme and Cormorant Garamond. Rebuild it with `node tools/build-diodati-data.mjs`. The [Diodati–KJV lexical comparison study](studies/beasts-in-translation.html) compares verses containing Diodati dragone/dragoni, liocorno/liocorni, or sciacallo/sciacalli with the corresponding KJV dragon/dragons or unicorn/unicorns passages. There are 34 dragon-related verse comparisons and 9 unicorn-related verse comparisons, for a total of 43 comparisons.

## Search

Search applies to the selected edition. Scripture text matching requires every query term to appear in the same verse, but the terms do not need to be adjacent. Results are ranked by relevance; longer words tolerate small spelling errors, and prefixes can match as you type. For example, `piercing sword` and `piercin sword` both find Hebrews 4:12. Search is lexical rather than semantic, so it does not infer synonyms or concepts that are absent from the verse text.

Book and passage queries also provide one direct navigation suggestion at the top of the list, followed by matching verse text. For example, `John` offers an option to open John before verses containing “John”; `John 1` offers a chapter link; and `John 1:1` places that exact verse first. The exact passage is not repeated in the text results. Book-name prefixes work when they identify a single book.

KRV search accepts Korean book names and references such as `요한복음`, `요한복음 1:1`, and `요한복음 1장 1절`. A shared prefix such as `요한` offers matching book suggestions in canon order, with text matches after them. Hangul terms of at least three syllables tolerate one-syllable typos, and common particles are normalized for matching; for example, `하느님` can find `하나님이`. Full-width digits and punctuation are normalized, and spaces between the book name and reference are optional.

JapBungo search accepts Japanese text and localized references such as `ヨハネの福音書 3:16`. Matching is lexical and uses the selected edition's Japanese text and display-book names.

Diodati search uses Italian text and localized book names and references, including `Genesi`, `Genesi 1:1`, and the prefix `Gene`. It supports separate terms, accented text, and typo tolerance for longer words.

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

Edit the shared typography tokens in `styles/typography.css`, the base color tokens in `styles/theme.css`, and component colors in `styles/styles.css`. The app and 404 page use Gelasio for display and reading with DM Sans for interface text; Diodati uses Cormorant Garamond for its Italian reading face. The base pastels are `--blue`, `--lavender`, `--yellow`, `--pink`, and `--green`; the chapter number's higher-contrast gradient stops are `--chapter-blue`, `--chapter-lavender`, `--chapter-pink`, and `--chapter-green`.

## License

This project is jointly licensed under the terms of both of the following licenses:

- **[MIT License](LICENSE.md)**
- **[Polymorph License](LICENSE.md)**

By using, copying, modifying, or distributing this software, you agree to comply with the terms, conditions, and restrictions of **both** licenses simultaneously.

Please review the full text in the linked license file included in this repository for complete compliance details.

## Support the project

If The Word has helped you find a verse faster than flipping pages, you can [buy me a coffee](https://www.buymeacoffee.com/isaiahyoon). The verses are free; caffeine, less so.
