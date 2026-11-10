# Search behavior

How scripture search works across the supported editions and languages.

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
