# Search behavior

How scripture search works across the supported editions and languages.

## Search

Press Escape from search to close the results and return focus to the current verse without scrolling, so reader shortcuts work again.

Search applies to the selected edition. Scripture text matching requires every query term to match in the same verse, but the terms do not need to be adjacent. Verses matching all terms exactly after search normalization come before prefix and typo matches; within each group, results are ranked by relevance, with Bible order breaking ties. Book and passage navigation suggestions still come first. Search is lexical rather than semantic, so it does not infer synonyms or concepts that are absent from the verse text.

For English, Italian, German, French, Spanish, and Portuguese, five- to seven-character terms allow one edit, eight- to sixteen-character terms allow two, and longer terms retain the previous proportional allowance (up to six edits). Shorter terms do not use typo matching, though prefixes may still match. For example, `peircing sword` can find Hebrews 4:12. Edits include insertions, deletions, and substitutions; switching adjacent letters can count as two edits. This matching does not change the stored or displayed Scripture.

In those Latin-script editions, accents and other Latin combining marks are optional in verse text, book names, prefixes, and abbreviations: `crea` matches `créa`, `Joao` matches `João`, and `nino` matches `niño`. The ligatures `æ` and `œ` also match `ae` and `oe`, as in `soeur` and `sœur`. German additionally treats `ä`/`ae`/`a`, `ö`/`oe`/`o`, `ü`/`ue`/`u`, and `ß`/`ss` as equivalent. This can also combine distinct spellings, including Spanish `n` and `ñ` and German ordinary `ae`, `oe`, and `ue` sequences. Matching works in either direction and preserves the original verse text and accents in results. Exact book names and abbreviations take precedence; if folding makes multiple book names equivalent, their destinations are offered instead of choosing one silently. Korean and Japanese search rules are unchanged.

Verse results show the complete verse, so matches near the end remain visible.

Book and passage queries also provide direct navigation suggestions at the top of the list, followed by matching verse text. For example, `John` offers an option to open John before verses containing “John”; `John 1` offers a chapter link; and `John 1:1` places that exact verse first. The exact passage is not repeated in the text results. Book-name prefixes can offer multiple matching books.

All editions also accept established local book abbreviations for books, chapters, and verses. Examples include `Jn 3:16` (English), `요 3:16` (Korean), `ヨハ 3:16` (Japanese), `Gv 3:16` (Italian), `Joh 3:16` (German), `Jn 3:16` (French), `Jn 3:16` (Spanish), and `Jo 3:16` (Portuguese). Periods in book abbreviations and spaces after a numbered book's digit are optional, so `1 Cor. 1:1` and `1Cor 1:1` are equivalent. Full book names remain supported.

An exact full name takes precedence over an abbreviation. If an abbreviation denotes multiple books, matching destinations are shown in edition book order rather than selecting one silently; for example, French `Phil` can denote Philippians or Philemon. A one-character book abbreviation offers navigation suggestions without searching verse text, whether entered alone or with a chapter or verse. The supported forms are maintained in `js/book-abbreviations.mjs`; not every possible abbreviation is included.

Reference lists consulted include the [Korean Bible Society](https://bible.bskorea.or.kr/abbreviations-of-the-books-of-the-bible), [JapanKnowledge](https://japanknowledge.com/contents/nce/hanrei11.html), [La Parola](https://www.laparola.net/abbrev.php), [SBC Standard's German list](https://sbc-standard.de/en/specification/mab-title-specification/normative-lists/bible-abbreviations/), and [GraceLife's multilingual list](https://www.gracelife.org/resources/bibletools/books.php). The app maps these forms to its own fixed canon and edition names.

KJV passages use the singular `Psalm` in headings and references; the book selector retains `Psalms`. Search accepts both `Psalm 42:5` and `Psalms 42:5`, and existing `/psalms/` links remain unchanged.

KRV search accepts Korean book names and references such as `요한복음`, `요한복음 1:1`, and `요한복음 1장 1절`. A shared prefix such as `요한` offers matching book suggestions in canon order, with text matches after them. After common particles are normalized, Hangul terms of at least three syllables tolerate one edit; for example, `하느님` can find `하나님이`. Shorter terms do not use fuzzy matching. Full-width digits and punctuation are normalized, and spaces between the book name and reference are optional.

JapBungo search accepts Japanese text and localized references such as `ヨハネの福音書 3:16`. Matching uses Japanese word segmentation when available; terms of at least four characters can match with one edit, such as `ニコテモ` finding `ニコデモ`. When word segmentation is unavailable, the fallback uses two-character sequences, which do not receive fuzzy matching. Results depend on tokenization, not general transliteration.

Diodati search uses Italian text and localized book names and references, including `Genesi`, `Genesi 1:1`, and the prefix `Gene`. It supports separate terms, accented text, and typo tolerance for longer words.

Martin search uses French text and localized references, including `Psaumes 3:1` and `Psaumes 3:2`. References use Martin's native Calvin numbering; for example, Psalms 3:1 is its numbered psalm title and the first body verse is Psalms 3:2.

Luther search uses German text and localized book names and references, including `1 Mose`, `Johannes 3:16`, and German terms with umlauts. It supports prefixes, separate terms, and typo tolerance for longer words.

Reina-Valera search uses Spanish text and localized book names and references, including `Génesis`, `San Juan 1:1`, and source-native references such as `Salmos 3:1`. It supports accented terms, book-name prefixes, separate terms, and typo tolerance for longer words.

Almeida 1911 search uses the Portuguese text and Brazilian Portuguese book labels, including `Gênesis` and `João 3:16`. Common European Portuguese spellings are accepted as reference aliases, including `Génesis`, `Deuteronómio`, and `Actos dos Apóstolos`. Search preserves the source's spelling and diacritics in the displayed text.

The first text search loads and indexes the selected edition's verses in the browser. The index is reused for later searches in that edition; no search query is sent to an external search service. Results are shown 12 at a time as the list is scrolled. The index is separate for each edition.
