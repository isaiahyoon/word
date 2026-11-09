# Word

## About

The Amazing Word is a quiet, free place to read Scripture on the web. It is built to make the text easy to find, move through, and carry with you, without asking you to create an account or pay to read.

The [About page](./about.html) introduces the reader's features and installation steps in English, Korean, Italian, German, Japanese, French, Spanish, and Portuguese, with its guiding conviction given a prominent, localized feature. It follows the reader's saved edition by default; use its language menu to choose another language. The About link in the scripture reader header also follows the selected edition's language.

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

- Read the King James Version (KJV), Korean Revised Version (KRV), Japanese Bungo-yaku (JapBungo), Italian Giovanni Diodati (1649), German Luther Bible (1912), French David Martin Bible (1744), Spanish Reina-Valera 1865, and Portuguese Almeida 1911, with edition-aware book navigation and direct links to passages. JapBungo has a green reading theme; Diodati has a pink gradient reading theme; Luther uses a pastel yellow gradient with red accents; Martin uses a blue-white-pink gradient; Reina-Valera uses the Verde y oro palette; Almeida 1911 has a diagonal red, gold, and green reading theme with Cardo for Scripture and headings.
- Reader navigation, controls, status messages, accessible names, and alternate descriptions follow the selected edition language across the supported English, Korean, Italian, German, Japanese, French, Spanish, and Portuguese interfaces; scripture text remains unchanged.
- The About page can be read in English, Korean, Italian, German, Japanese, French, Spanish, or Portuguese.
- Search scripture by phrase or separate terms, with relevance ranking, fuzzy typo matching, and direct suggestions for books, chapters, and verses. German, Korean, Japanese, French, Spanish, and Portuguese searches support localized book names and references; Korean searches also support common spelling variations, and Portuguese reference search accepts common Brazilian and European book-name forms.
- Choose chapters with the whimsical chapter picker, or move through the text with navigation buttons and keyboard shortcuts. On mobile, swipe right from the left screen edge to open book navigation, or swipe left across the open drawer to close it. A discreet back-to-top button appears while scrolling.
- Book titles retain their usual size when they fit and scale down to fit narrower reading areas in every edition.
- Open the shortcut guide with `/` to see Mac and Windows keys for refresh, search, navigation, Quiet Mode, verse copying, jumping to the top with Space, and edition cycling with Tab/Shift+Tab.
- Enter Quiet Mode for a calmer reading view, with subtle glimmer details throughout the interface.
- Select verses and copy or share them in chapter order as a quoted passage, with each verse on its own line and a compressed reference below the closing quotation mark. Copy and Share open a language menu listing every edition; cross-edition copying resolves through a KJV reference map, keeps the target edition's citation, and adds a KJV citation when numbering differs. Feedback identifies the original selection when the mapped reference changes and warns when known verse boundaries may add text. Known unsafe and other explicitly unaligned passages are blocked with visible feedback; same-edition copying remains available. Whole target verses are used, so a merged verse may expand a selection. Some matches are assumed rather than individually verified, so undiscovered differences may not produce a warning. Edition switching uses the same mapping and reports when a passage cannot be aligned. The device's native sharing interface is used when available, with copying as the fallback. The Cut button copies the current edition and clears the selection; `Cmd+X`/`Ctrl+X` does the same. Clicking a verse also updates its direct link. The feedback form lets readers send a note, with passage details included only by choice.
- The reader remembers the current edition, passage, focused verse, and selected verses on this device, including after reopening the app.
- Shared links use a high-resolution branded preview featuring The Amazing Word's sword emblem.
- Every page, including About, the 404 page, and the design studies, carries the same preview so any shared link unfurls with the sword emblem.
- Choose a default reading language before installing. The install entry point carries that choice even when the installed app has separate storage; switching editions in the reader updates the default for that app or browser. Install it as a standalone web app on Mac, iPhone, Android, or Windows using the browser's install option.
- Save any edition for offline reading from the Reading Edition panel. Each edition is saved separately and can be removed at any time.

## App Installation

Before installing, choose a default reading language in the About page's install section and select **Continue to install**. Install from the resulting page using the browser menu below; if the browser offers an installation prompt, select **Continue to install** again to open it. The selected edition is included in the installation entry point so a new installed app can use it even when its storage is separate from the browser. Browser installation behavior varies by platform. To change the default afterwards, open the Reading Edition picker in the installed app or browser and select another edition; future launches in that same storage use the new choice. Browser and installed-app preferences may be separate. If storage is cleared or unavailable, the original installation choice may be used again.

Edition-specific install manifests are generated from `js/editions.mjs` and the main manifest with `npm run build:install-manifests`; regenerate them when edition names or the shared manifest change.

To install it on Mac, open the site in Safari and choose **File → Add to Dock**. On iPhone, open it in Safari, tap **Share**, then **Add to Home Screen**. On Android, open it in Chrome, open the menu, and choose **Install app** or **Add to Home screen**. On Windows, open the site in Microsoft Edge and choose **Settings and more → Apps → Install this site as an app**; in Chrome, choose **Cast, save, and share → Install page as app**. Menu labels may vary by browser version. The installed app loads the latest version when it is online. Offline, it opens the reader from the last saved copy of the app and can read only the editions saved for offline use (see below).

### Install size

The app itself is small. The 39 unique files listed in `sw.js` total about 824 KB raw (824,234 bytes), or about 426 KB when each file is gzipped and the results are summed (426,188 bytes). This excludes fonts and any editions saved for offline reading. A fresh local load of the About install page fetched two WOFF2 files totaling 71,776 bytes (about 71.8 KB). Almeida's offline font preloader fetched 15 WOFF2 files totaling 279,504 bytes; nine Cardo files account for 97,904 bytes (about 97.9 KB). Other languages and browser/font subsets may fetch different files, and Korean and Japanese editions need more font data. Saved editions are optional, stored separately, and removable. These figures will change as the app changes, so re-measure before quoting them.

## Offline editions

Choose **Save** under the Reading Edition picker to download every book of the selected edition into the browser's Cache Storage. The table shows the measured size of each edition's index and 66 generated book files; saving all eight editions downloads about 35.47 MB (33.83 MiB) of scripture data.

| Edition | Scripture data |
| --- | ---: |
| KJV · English | 4.35 MB |
| KRV · Korean | 4.65 MB |
| Diodati · Italian | 4.54 MB |
| Luther Bible · German | 4.31 MB |
| Bungo-yaku · Japanese | 4.49 MB |
| David Martin · French | 4.82 MB |
| Reina-Valera 1865 · Spanish | 4.15 MB |
| Almeida 1911 · Portuguese | 4.16 MB |

These are uncompressed file sizes measured locally on 2026-11-06. They exclude the app shell and fonts, which are accounted for separately above; actual browser storage may vary. A progress count is shown while an edition saves, and the reader's fonts for that edition are downloaded with it so text looks the same offline; Korean and Japanese editions download more font data than the others. The status changes to **Available offline** when it finishes, and **Remove** deletes that edition's saved copy. If a download fails, nothing is kept and the control offers to try again. Editions that have not been saved are only available online: choosing one while offline keeps the current edition and shows a notice, and opening one directly explains that it needs a connection while leaving the edition picker usable. Search for a saved edition works offline.

A service worker (`sw.js`) keeps the reader's code available offline. It checks the network first for code and styles, so online readers receive new deploys on their next load; saved editions are served from the cache and refreshed in the background when online. Saved copies stay on the device and are not synced.

## Privacy

The Amazing Word is free to read, has no ads, and requires no account. Reading position and selected verses are saved in local browser storage on the device; offline editions are saved in the browser's cache storage on the device. This state is not sent to The Amazing Word or synced across devices, and browser and installed-app storage may differ by platform. Umami is the app's only analytics tool and is used for basic usage metrics, not advertising or ad targeting. Umami says its standard analytics process IP addresses transiently to distinguish visits and estimate approximate location, but does not store raw IPs in analytics records; its infrastructure may retain separate operational or security logs. Search runs locally in the browser rather than through an external search service.

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

The collection page at `/editions/` introduces every edition in its own language, with links to edition introductions and direct reading shortcuts. Both `/editions` and `/editions/` work, as do edition landing URLs with or without a trailing slash; canonical URLs consistently include the slash.
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

## Scripture data

The reader loads the selected edition's chapter-count index and current book first. Each edition has its own files under `scripture/<edition>/books/`, named by the fixed canon, such as `1_genesis.json`. Other books load when opened, and full-text search loads the remaining books when used. Rebuild the editions with:

```sh
node tools/build-kjv-data.mjs
node tools/build-krv-data.mjs
node tools/build-diodati-data.mjs
node tools/build-luther-data.mjs
node tools/build-japbungo-data.mjs
node tools/build-martin-data.mjs
npm run build:rv1865
node tools/import-alm1911-source.mjs /path/to/ALM1911.json
npm run build:alm1911
```

The KJV source is stored in `sources/kjv.json`; the 1961 KRV source is pinned in `sources/krv-1961.json`. KRV attribution is shown when selected. The four chapters with different verse counts have verse-level KJV mappings:

| KRV passage | KJV correspondence |
| --- | --- |
| 1 Samuel 30:1–29 | 1 Samuel 30:1–29 |
| 1 Samuel 30:30 | 1 Samuel 30:30–31 |
| Song of Solomon 6:1–12 | Song of Solomon 6:1–12 |
| Song of Solomon 6:13–14 | Song of Solomon 6:13 |
| 2 Corinthians 13:1–10 | 2 Corinthians 13:1–10 |
| 2 Corinthians 13:11 | 2 Corinthians 13:11–12 |
| 2 Corinthians 13:12–13 | 2 Corinthians 13:13–14, respectively |
| 3 John 1:1–13 | 3 John 1:1–13 |
| 3 John 1:14–15 | 3 John 1:14 |

When a verse is split or combined, copying or switching editions uses whole target verses; the result can include text corresponding to an adjacent source verse. Numbering differences are not claims of identical wording. If the recorded chapter counts change, these mappings are blocked until reviewed again. KRV's economic copyright term has expired according to the [Bible Society of Korea](https://www.bskorea.or.kr/bbs/board.php?bo_table=copyright_faq&wr_id=5); preserve the text and provide attribution.

JapBungo is built from the public-domain [GetBible JapBungo source](https://github.com/getbible/v2/tree/master/japbungo), pinned with source metadata in `sources/japbungo.json`. It uses KJV verse numbering except for the explicit KRV fallback at 3 John 1:15. The upstream text omits Exodus 7:25, 2 Samuel 19:25, 2 Chronicles 2:13, and 3 John 1:15; those four slots use Korean KRV text and are labeled as KRV fallbacks in the reader and copied citations. Where a same-numbered KJV verse exists, the reader shows its text in a lavender reference panel and includes it when copied. KJV places the closing greeting of 3 John in verse 14, so the 3 John 1:15 fallback has no separate KJV reference. Rebuild it with `node tools/build-japbungo-data.mjs`.

Diodati text is stored in `sources/diodati.json` from the public-domain [Diodati-1649 repository](https://github.com/FordhamRamFan/public-domain-bible-translations/tree/main/Italian/Diodati-1649). Its 66 books and 31,102 verse slots follow KJV numbering. The picker code is DIO, and the Italian reader uses a pink gradient theme and Cormorant Garamond. Rebuild it with `node tools/build-diodati-data.mjs`. The [Diodati–KJV lexical comparison study](studies/beasts-in-translation.html) compares verses containing Diodati dragone/dragoni, liocorno/liocorni, or sciacallo/sciacalli with the corresponding KJV dragon/dragons or unicorn/unicorns passages. There are 34 dragon-related verse comparisons and 9 unicorn-related verse comparisons, for a total of 43 comparisons.

The Luther Bible (1912) source is in `sources/luther_1912.json`; its verse text is sourced from the [Lai Siangtho Bible Database](https://github.com/laisiangtho/bible/blob/master/json/luther1912.json). The [eBible.org Lutherbibel 1912 page](https://ebible.org/details.php?id=deu1912) identifies the edition as public domain and provides downloadable formats. The edition uses the LUX picker code, the dropdown label `Lutherbibel · Licht im Wort`, the `/licht/` route, and a readable Gelasio serif with a pastel-yellow/red peach-calm theme. Its 66 books and 31,102 verse slots have been checked against KJV. Rebuild it with `node tools/build-luther-data.mjs`.

The French [David Martin Bible (1744)](https://github.com/getbible/v2/tree/master/martin) is stored in `sources/martin_1744.json`. CrossWire JSword identifies its French Protestant versification as **Calvin**, the [Geneva/Olivetan system used by Martin](https://github.com/crosswire/jsword/blob/master/src/main/java/org/crosswire/jsword/versification/system/SystemCalvin.java). MOH preserves Martin's native references at `/moh/`; it does not relabel verses to KJV numbers. The generated index records 90 chapters whose Martin verse counts differ from KJV, and explicitly lists four empty source placeholders excluded from display (Psalms 69:37, 102:29, 108:14, and 140:14). The source contains 31,170 records, 31,166 non-empty verse texts, and KJV contains 31,102 verse slots. Count differences are not a complete passage-by-passage crosswalk. Cross-edition copying in those chapters is blocked except for reviewed mappings in Psalms 3–9, 12, 42, 51, 52, 54, and 60, 2 Corinthians 13, and 3 John 1; the other 75 remain blocked. Martin's numbered Psalm headings have no KJV verse counterpart and cannot be copied to another edition. Martin 2 Corinthians 13:12 combines KJV 13:12–13, while Martin 3 John 1:14–15 splits KJV 1:14; copying across editions includes complete target verses, which may expand a selection. Martin 2 Corinthians 13:13 remains blocked because its bundled text includes a source separator after the verse. Elsewhere, matching numbers are assumed, not individually verified. MOH uses EB Garamond for French reading and display typography, selected from the [font study](studies/french-font-study.html). The edition uses a pastel blue upper-left, white center, and pink lower-right background. Rebuild it with `npm run build:martin`.

The Revelation 12–13 boundary also differs: Martin places the opening of KJV 13:1 in 12:18, while KRV and JapBungo place related material in 12:17. Cross-edition copying involving Martin 13:1 or KRV/JapBungo 12:17 and 13:1 is blocked until those boundaries can be handled safely; Martin chapter 12 remains blocked as described above. Other equal-count chapters are not thereby verified.

The Spanish [Reina-Valera 1865](https://github.com/MC1171611/valera1865) source is pinned to commit `49887d89a88c30360234e56ef1d129ee3227a2ed` and its 2018 orthography update in `sources/rv1865.json`. The source project identifies its text as public domain and licenses its digital edition under CC0 1.0; attribution is shown in the reader. LUZ keeps the source's verse boundaries and alternate reference labels. Cross-edition copying is blocked in chapters with differing verse counts or alternate labels because those records do not provide a verified KJV crosswalk. The reader data omits the source's print paragraph marks (¶); the pinned source file keeps them. The source has 31,099 verses versus 31,102 KJV slots, with chapter-count differences in 1 Samuel 20, 1 Chronicles 3, 2 Chronicles 33, Psalms 13, and Jeremiah 39. The generated data also preserves 115 unnumbered chapter headings and 21 verse-section headings. LUZ uses the Verde y oro theme and Petrona for Spanish Scripture and edition headings. Rebuild the normalized source with `npm run import:rv1865` (requires network access to the pinned source), then build its reader data with `npm run build:rv1865`.

The Portuguese [Almeida 1911](https://www.gutenberg.org/ebooks/62383) source is normalized in `sources/alm1911.json` from the [damarals/biblias ALM1911 JSON](https://github.com/damarals/biblias/releases/latest/download/ALM1911.json), pinned by SHA-256 `a47705dc5637daaa2e65160c9fe9aadb70edbdda855179045dbaf288f6aff795`. Project Gutenberg's front matter identifies the copy as a 1911 reprint of an edition first printed in 1900, with 6,000 copies reprinted in 1911, translated by João Ferreira d’Almeida. The normalized source contains all 66 books, 1,189 chapters, and 31,101 nonempty verse strings; verse numbers are assigned in source order without changing their text. ALM keeps its native numbering: 2 Corinthians 13 has 13 verses, with Almeida 13:12 combining material KJV numbers 13:12–13 and the closing benediction numbered Almeida 13:13 (KJV 13:14). The reader does not claim that the editions are equivalent or apply a broader KJV crosswalk.

For rights, Project Gutenberg says its copy is public domain in the United States and tells users elsewhere to check local law. The upstream `damarals/biblias` catalog marks ALM1911 with † as freely redistributable, but that is not a worldwide public-domain determination. Its MIT notice is retained in [`LICENSES.md`](./LICENSES.md) for the upstream toolkit and data organization; MIT is not treated as an independent license for the underlying Scripture text. The reader shows the source attribution and notes that text rights vary by jurisdiction. To rebuild, first provide the pinned release JSON to `npm run import:alm1911 -- /path/to/ALM1911.json`, then run `npm run build:alm1911`.

## Search

Search applies to the selected edition. Scripture text matching requires every query term to appear in the same verse, but the terms do not need to be adjacent. Results are ranked by relevance; longer words tolerate small spelling errors, and prefixes can match as you type. For example, `piercing sword` and `piercin sword` both find Hebrews 4:12. Search is lexical rather than semantic, so it does not infer synonyms or concepts that are absent from the verse text.

Book and passage queries also provide one direct navigation suggestion at the top of the list, followed by matching verse text. For example, `John` offers an option to open John before verses containing “John”; `John 1` offers a chapter link; and `John 1:1` places that exact verse first. The exact passage is not repeated in the text results. Book-name prefixes work when they identify a single book.

KJV passages use the singular `Psalm` in headings and references; the book selector retains `Psalms`. Search accepts both `Psalm 42:5` and `Psalms 42:5`, and existing `/psalms/` links remain unchanged.

KRV search accepts Korean book names and references such as `요한복음`, `요한복음 1:1`, and `요한복음 1장 1절`. A shared prefix such as `요한` offers matching book suggestions in canon order, with text matches after them. Hangul terms of at least three syllables tolerate one-syllable typos, and common particles are normalized for matching; for example, `하느님` can find `하나님이`. Full-width digits and punctuation are normalized, and spaces between the book name and reference are optional.

JapBungo search accepts Japanese text and localized references such as `ヨハネの福音書 3:16`. Matching is lexical and uses the selected edition's Japanese text and display-book names.

Diodati search uses Italian text and localized book names and references, including `Genesi`, `Genesi 1:1`, and the prefix `Gene`. It supports separate terms, accented text, and typo tolerance for longer words.

Martin search uses French text and localized references, including `Psaumes 3:1` and `Psaumes 3:2`. References use Martin's native Calvin numbering; for example, Psalms 3:1 is its numbered psalm title and the first body verse is Psalms 3:2.

Luther search uses German text and localized book names and references, including `1 Mose`, `Johannes 3:16`, and German terms with umlauts. It supports prefixes, separate terms, and typo tolerance for longer words.

Reina-Valera search uses Spanish text and localized book names and references, including `Génesis`, `San Juan 1:1`, and source-native references such as `Salmos 3:1`. It supports accented terms, book-name prefixes, separate terms, and typo tolerance for longer words.

Almeida 1911 search uses the Portuguese text and Brazilian Portuguese book labels, including `Gênesis` and `João 3:16`. Common European Portuguese spellings are accepted as reference aliases, including `Génesis`, `Deuteronómio`, and `Actos dos Apóstolos`. Search preserves the source's spelling and diacritics; it does not promise general accent folding.

The first text search loads and indexes the selected edition's verses in the browser. The index is reused for later searches in that edition; no search query is sent to an external search service. Results are shown 12 at a time as the list is scrolled. The index is separate for each edition.

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

## Customize the palette

Edit the shared typography tokens in `styles/typography.css`, the base color tokens in `styles/theme.css`, each edition's palette, switcher and current-book tokens in `styles/editions.css`, and reader component styles in `styles/reader-*.css`. The reader stylesheets are linked in cascade order in `index.html`: `styles.css` provides shared foundations, followed by interactions, dialogs, search results, navigation, reading content, footer, effects, and responsive rules. The reader interface uses DM Sans, with Japanese sans-serif UI text in Noto Sans JP; Scripture and selected display text retain their edition-specific serif faces. The About link uses the edition-specific serif through `--about-link-serif`. Diodati uses Cormorant Garamond for its Italian reading face, Martin uses EB Garamond for French, and Reina-Valera uses Petrona for Spanish Scripture and edition headings. The French font comparison is available in the [font study](studies/french-font-study.html). The base pastels are `--blue`, `--lavender`, `--yellow`, `--pink`, and `--green`; the chapter number's higher-contrast gradient stops are `--chapter-blue`, `--chapter-lavender`, `--chapter-pink`, and `--chapter-green`.

## License

Proprietary code and design owned by Isaiah Yoon may not be copied, modified, distributed, or hosted without explicit written permission. Third-party software, scripture text, fonts, and other materials remain governed by their respective licenses and notices. See [LICENSE.md](LICENSE.md) or contact isaiahyoon22@gmail.com for licensing or hosting inquiries.

## Support the project

If The Amazing Word has helped you find a verse faster than flipping pages, you can [buy me a coffee](https://www.buymeacoffee.com/isaiahyoon). The verses are free; caffeine, less so.
