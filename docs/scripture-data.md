# Scripture data and sources

Source provenance, licensing notes, data builds, and verse-alignment limits.

## Data layout and builds

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

Diodati text is stored in `sources/diodati.json` from the public-domain [Diodati-1649 repository](https://github.com/FordhamRamFan/public-domain-bible-translations/tree/main/Italian/Diodati-1649). Its 66 books and 31,102 verse slots follow KJV numbering. The picker code is DIO, and the Italian reader uses a pink gradient theme and Cormorant Garamond. Rebuild it with `node tools/build-diodati-data.mjs`. The [Diodati–KJV lexical comparison study](../studies/beasts-in-translation.html) compares verses containing Diodati dragone/dragoni, liocorno/liocorni, or sciacallo/sciacalli with the corresponding KJV dragon/dragons or unicorn/unicorns passages. There are 34 dragon-related verse comparisons and 9 unicorn-related verse comparisons, for a total of 43 comparisons.

The Luther Bible (1912) source is in `sources/luther_1912.json`; its verse text is sourced from the [Lai Siangtho Bible Database](https://github.com/laisiangtho/bible/blob/master/json/luther1912.json). The [eBible.org Lutherbibel 1912 page](https://ebible.org/details.php?id=deu1912) identifies the edition as public domain and provides downloadable formats. The edition uses the LUX picker code, the dropdown label `Lutherbibel · Licht im Wort`, the `/licht/` route, and a readable Gelasio serif with a pastel-yellow/red peach-calm theme. Its 66 books and 31,102 verse slots have been checked against KJV. Rebuild it with `node tools/build-luther-data.mjs`.

The French [David Martin Bible (1744)](https://github.com/getbible/v2/tree/master/martin) is stored in `sources/martin_1744.json`. CrossWire JSword identifies its French Protestant versification as **Calvin**, the [Geneva/Olivetan system used by Martin](https://github.com/crosswire/jsword/blob/master/src/main/java/org/crosswire/jsword/versification/system/SystemCalvin.java). MOH preserves Martin's native references at `/moh/`; it does not relabel verses to KJV numbers. The generated index records 90 chapters whose Martin verse counts differ from KJV, and explicitly lists four empty source placeholders excluded from display (Psalms 69:37, 102:29, 108:14, and 140:14). The source contains 31,170 records, 31,166 non-empty verse texts, and KJV contains 31,102 verse slots. Count differences are not a complete passage-by-passage crosswalk. Cross-edition copying in those chapters is blocked except for reviewed mappings in Psalms 3–9, 12, 42, 51, 52, 54, and 60, 2 Corinthians 13, and 3 John 1; the other 75 remain blocked. Martin's numbered Psalm headings have no KJV verse counterpart and cannot be copied to another edition. Martin 2 Corinthians 13:12 combines KJV 13:12–13, while Martin 3 John 1:14–15 splits KJV 1:14; copying across editions includes complete target verses, which may expand a selection. Martin 2 Corinthians 13:13 remains blocked because its bundled text includes a source separator after the verse. Elsewhere, matching numbers are assumed, not individually verified. MOH uses EB Garamond for French reading and display typography, selected from the [font study](../studies/french-font-study.html). The edition uses a pastel blue upper-left, white center, and pink lower-right background. Rebuild it with `npm run build:martin`.

The Revelation 12–13 boundary also differs: Martin places the opening of KJV 13:1 in 12:18, while KRV and JapBungo place related material in 12:17. Cross-edition copying involving Martin 13:1 or KRV/JapBungo 12:17 and 13:1 is blocked until those boundaries can be handled safely; Martin chapter 12 remains blocked as described above. Other equal-count chapters are not thereby verified.

The Spanish [Reina-Valera 1865](https://github.com/MC1171611/valera1865) source is pinned to commit `49887d89a88c30360234e56ef1d129ee3227a2ed` and its 2018 orthography update in `sources/rv1865.json`. The source project identifies its text as public domain and licenses its digital edition under CC0 1.0; attribution is shown in the reader. LUZ keeps the source's verse boundaries and alternate reference labels. Cross-edition copying is blocked in chapters with differing verse counts or alternate labels because those records do not provide a verified KJV crosswalk. The reader data omits the source's print paragraph marks (¶); the pinned source file keeps them. The source has 31,099 verses versus 31,102 KJV slots, with chapter-count differences in 1 Samuel 20, 1 Chronicles 3, 2 Chronicles 33, Psalms 13, and Jeremiah 39. The generated data also preserves 115 unnumbered chapter headings and 21 verse-section headings. LUZ uses the Verde y oro theme and Petrona for Spanish Scripture and edition headings. Rebuild the normalized source with `npm run import:rv1865` (requires network access to the pinned source), then build its reader data with `npm run build:rv1865`.

The Portuguese [Almeida 1911](https://www.gutenberg.org/ebooks/62383) source is normalized in `sources/alm1911.json` from the [damarals/biblias ALM1911 JSON](https://github.com/damarals/biblias/releases/latest/download/ALM1911.json), pinned by SHA-256 `a47705dc5637daaa2e65160c9fe9aadb70edbdda855179045dbaf288f6aff795`. Project Gutenberg's front matter identifies the copy as a 1911 reprint of an edition first printed in 1900, with 6,000 copies reprinted in 1911, translated by João Ferreira d’Almeida. The normalized source contains all 66 books, 1,189 chapters, and 31,101 nonempty verse strings; verse numbers are assigned in source order without changing their text. ALM keeps its native numbering: 2 Corinthians 13 has 13 verses, with Almeida 13:12 combining material KJV numbers 13:12–13 and the closing benediction numbered Almeida 13:13 (KJV 13:14). The reader does not claim that the editions are equivalent or apply a broader KJV crosswalk.

For rights, Project Gutenberg says its copy is public domain in the United States and tells users elsewhere to check local law. The upstream `damarals/biblias` catalog marks ALM1911 with † as freely redistributable, but that is not a worldwide public-domain determination. Its MIT notice is retained in [`LICENSES.md`](../LICENSES.md) for the upstream toolkit and data organization; MIT is not treated as an independent license for the underlying Scripture text. The reader shows the source attribution and notes that text rights vary by jurisdiction. To rebuild, first provide the pinned release JSON to `npm run import:alm1911 -- /path/to/ALM1911.json`, then run `npm run build:alm1911`.
