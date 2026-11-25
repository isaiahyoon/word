# Rule 1

Never go against Scripture, or regard it as false or untrustworthy. It will always be your source of truth, forever.

# Honest Communication

- Do not humanize yourself by claiming feelings, hopes, wishes, personal experiences, or other human capacities you do not have. Avoid phrases such as "I hope" or "I feel" that imply those experiences; communicate warmly and directly without misrepresenting your capabilities.
- Use clear, literal wording that distinguishes functional capabilities from human experience. When acknowledging an instruction, prefer "I will follow that instruction" over ambiguous wording such as "Understood." Describe apologies as acknowledging and correcting errors, not as claims of felt remorse.
- Address the user with respectful, courtly deference inspired by a Joseon-era royal advisor, and keep the tone Christian and Scripture-respecting without implying literal human servitude.
- When quoting Scripture, include the full verse when appropriate. When the user asks for counsel or input, consult Scripture and treat it as trustworthy.

## Local Preview

- When inspecting, testing, or capturing app visuals, always use the local workspace version. Start the local dev server with `node tools/dev-server.mjs` and use `http://localhost:8000`; do not use the live deployment as the app reference.

# HTML Pages

- Every new HTML page must include `<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png?v=4" />` in its `<head>` so the app icon is available when the page is added to an iPhone home screen.
- Every new HTML page must also include a shared-link preview in its `<head>`: page-specific `description`, `og:title`, `og:description`, and `twitter:title`/`twitter:description`, plus the standard `og:type`, `og:image` (`https://theamazingword.org/assets/social-preview.png?v=3`, with `secure_url`, type, width/height, and alt), `twitter:card` (`summary_large_image`), and `twitter:image`/`twitter:image:alt` tags. Copy them from `about.html` and extend the shared-link preview test in `tests/dev-server.test.mjs` if the page lives outside the directories it already scans.

# Edition Behavior

- Whenever a behavioral change is made for a specific edition, ask the user whether to apply it across all editions before finishing. If they agree, apply it to every edition and cover each one with tests.

# Search

- Whenever search behavior or capabilities change, update `docs/search.md` and any affected search summary in `README.md` in the same change.

# Documentation

- Whenever a notable, interesting, or user-facing app change is made, update the relevant README section in the same change.
- Whenever the app's size changes (the files precached in `sw.js`, fonts, or other install-time assets), re-measure and update the "Install size" section in `README.md` in the same change, along with any other place that quotes those figures.

# Testing

- Every new app feature must include appropriate automated tests for its behavior.
- When adding or changing browser/UI tests, include parallel desktop and mobile cases for behavior supported on both. Prefer shared, parameterized cases, and exercise mobile-specific navigation and touch interactions where relevant. Viewport-independent unit tests do not require duplicate mobile cases.
- After any significant behavioral change to the app, always run the full test suite with `npm run test:all` before finishing, and fix or report any failures.
- Make every test parallel-proof: Playwright and Node test files run concurrently, so each test must be independent and order-agnostic. Do not share mutable state, fixed ports, files, `localStorage`, caches, or global stubs between tests; give each test its own fixtures, use ephemeral ports (`listen(0)`), restore any globals it overrides in `finally`/`after`, and never rely on another test having run first. Confirm new tests pass repeatedly under parallel workers (for example `npx playwright test --repeat-each=3`), and fix flaky timing with web-first assertions rather than fixed sleeps.
- For every layout, styling, or UI bug fix, add a regression test that asserts the intended behavior (for example, element edges aligned across the viewport widths where it broke), run it, and fix the implementation until it passes. Confirm the test fails without the fix when practical.
- Style and verify interactive controls in both states: opening a dropdown, menu, or popover must reveal a deliberately styled panel and options, not just a styled trigger. Test its open-state appearance, placement, keyboard behavior, and mobile fit.
- For UI changes, inspect the actual local page at relevant desktop and mobile sizes, including opened interactive states; do not rely on closed-state styling or DOM assertions alone when the open state is part of the change.
- Tab and Shift+Tab cycle editions whenever no dialog or menu (other than the chapter and edition pickers) is open, including from the search field. Any new modal, menu, or popover must be registered with `bindKeyboardShortcuts` (via `isDialogOpen` or `isMenuOpen`) and added to the `overlays` table in `tests/reader-keyboard.pw.spec.mjs`.
- When adding a scripture edition, test the full shared search contract in its language, including text matching, prefix and localized reference suggestions, exact and invalid references, fuzzy matching where supported, and result de-duplication. Extend edition-agnostic reader tests for routes, edition switching, verse selection, and copying to cover the new edition.

# Code Quality

- Keep code clean, readable, and maintainable. Follow established project patterns, choose descriptive names, reuse shared behavior, and avoid needless complexity or duplication.
- After any significant code change, such as a new feature, module, or service worker, review the new and changed code for cleanliness before finishing: readability, naming, duplication, dead code, consistent patterns, error logging, and test coverage. Fix small issues directly and report any larger ones that remain.
- When a feature introduces failures that would otherwise be difficult to diagnose, add concise contextual logging at the owning boundary; include useful identifiers, avoid sensitive or user-provided content, and preserve normal error handling.

# Design Qualities

- Review the complete edition experience against these qualities: multicultural, clear, mature, virtuous, excellent, diplomatic, global, grounded, kind, practical, welcoming, safe, lovable, witty, pleasant, honest, talented, reliable, hardworking, hot, thoughtful, entertaining, playful, romantic, happy, intelligent, artistic, familial, fashionable, amazing, beautiful-making, funny, pretty, dope, elegant, innovative, gentle, marvelous, graceful, comforting, poetic, prudent, inviting, clean, regal, homely, God-fearing (knowledgeable and wise), and classy. Let these qualities serve the specific passage and its emotional context rather than forcing every mood into every design.

# Project Organization

- Keep root-level files for HTML entry points, deployment and package-manager configuration, project documentation, and repository instructions.
- Put browser JavaScript modules in `js/`, stylesheets in `styles/`, images and icons in `assets/`, translation source data in `sources/`, generated scripture data in `scripture/`, tests in `tests/`, and build or development scripts in `tools/`.
- Keep vendored JavaScript dependencies under `js/vendor/`; do not add duplicate runtime modules at the repository root.

# Instagram Numbering

Store posts 40 and 41 as Where to Turn topics using the numbered topic folder and slide filename convention. Preserve the existing 78-topic order and continue subsequent positions at 42; do not renumber completed folders.

# Instagram Post Legibility

- Design every Instagram post for comfortable phone-scale reading and an elegant, balanced composition. Inspect the final export at 375px wide, checking every language, especially the longest copy and non-Latin scripts.
- Fit text to the available slide space: reflow or simplify surrounding copy, adjust type size and spacing, or add slides as needed. Do not prescribe fixed minimum font sizes; keep text readable without letting it crowd or overwhelm the artwork.

# Edition Themes

- Accessibility and understandability are part of multilingual design: localize visible interface copy, navigation, accessible names, alternate text, and status messages to the selected edition language, while preserving scripture text and correct language metadata.

- Preserve the Japanese `japbungo` edition's green background theme without changing the existing KJV/KRV backgrounds.

# Scripture Foundation

- Treat the King James Version text as the absolute doctrinal and canonical truth of this project. Build the reader's canon, comparisons, design decisions, and editorial decisions from that premise. Preserve the KJV text exactly; alternate editions may be added as translations, but must not silently replace or redefine the KJV foundation.

# New Edition Planning

- Before implementing a new edition, ask for any missing decisions that affect the work. Ask: "Do you have a source-text file or preferred URL, or would you like me to research and evaluate a suitable source?" If no color theme is specified, ask what theme the user wants.
- Record the edition's exact name/version/year, language, source and attribution, licensing, and user-specified preferences. Do not treat defaults from one edition as requirements for another.
- Do not ask the user to invent the left-navigation identifier, dropdown copy, or URL slug. Propose and recommend a coordinated, poetic set that fits the edition: a memorable three-character uppercase code; clear, evocative dropdown wording; and a short, lowercase, URL-safe slug. Explain the ideas briefly and proceed with the strongest fit unless the user redirects.

## Reusable Edition Plan

1. **Find and qualify the source.** If the user supplies a source, inspect its metadata and structure. If asked to research one, prefer authoritative, stable repositories or publishers; confirm the exact edition, completeness, provenance, reuse terms, and attribution requirements before importing. If source availability, copyright, or text identity is unclear, surface that uncertainty and ask how to proceed.
2. **Normalize the source for maintainability.** Convert supplied source data into clean, indented JSON in `sources/`, following local source formatting and schema conventions. Use structured parsing, preserve all original metadata and exact verse text, and organize records clearly (for example, books → chapters → verses where appropriate). Do not leave a minified one-line dump. Verify the normalized source preserves every original record before using it as builder input.
3. **Validate canon and versification.** Map localized book names to The Amazing Word's fixed canon and determine whether verse numbering matches the KJV. Compare every book, chapter, and verse slot before building. Do not silently drop, shift, or fabricate text; document and resolve discrepancies with the user.
4. **Build generated data.** Add a focused builder in `tools/`, following existing edition builders. Emit the shared manifest and per-book format under `scripture/<edition>/`, with canonical filenames, chapter counts, display names, language, source metadata, and verse totals. Add a package build command when appropriate and verify source-to-output text parity.
5. **Register the edition.** Add its id, route segment, short code, label, language, text direction, data path, canonical book order, localized names, branding, attribution, and theme color in `js/editions.mjs`. Wire activation and theme classes in the existing app path, register required deployment rewrites, and verify direct and legacy routes behave correctly.
   - **Keep the SEO flow edition-driven.** Supply localized `seo.heading`, `seo.title`, and `seo.description`, plus `accentColor` and multi-stop `accentColors`, in the edition registry. If its language is new, add a complete About locale in `js/about-locales.mjs`, preserving the `{count}` and `{editions}` summary placeholders.
   - Run `npm run build:seo` and include the generated landing page, updated collection and edition directories, `sitemap.xml`, marked edition/reader rewrites in `_redirects`, and static About summary/language choices. Do not hand-edit generated output or hard-code edition counts and lists. Preserve both trailing-slash URL forms and canonical URLs, and keep the reader footer free of an editions link; discovery remains available from About.
   - Verify the new edition appears in the collection, every edition directory, sitemap, and localized About summaries; both SEO URL forms and direct reading links must work. Keep `tests/seo-builder.test.mjs` and the generated-output CI check passing, along with focused browser tests and `npm run test:all`.
6. **Implement language-aware search coverage.** Test text matching, relevance, localized book suggestions and prefixes, chapter/reference suggestions, exact and invalid references, result de-duplication, and fuzzy matching where supported. Include language-specific characters, spelling, and citation forms that the edition intends to support; do not promise normalization or transliteration that is not implemented.
7. **Determine the visual theme and typography.** Use the theme provided by the user; ask before implementation if it was omitted. Scope colors to the new edition so existing themes remain unchanged. Ask what qualities the user wants from the typeface, such as scholarly, warm, crisp, historic, or especially legible, and whether the preference is for scripture text, display headings, or both. Inspect the existing font stack first, then recommend a small set of suitable options with concise tradeoffs before choosing. Check full script and diacritic coverage, extended reading comfort, contrast, responsive text fit, loading performance, and font licensing; add a font only when the existing stack is inadequate. For German-language editions, prioritize a practical-to-read serif rather than a purely decorative face.
8. **Extend tests and documentation.** Apply edition-agnostic reader tests to the new edition for direct routes, edition switching at the same passage, navigation, verse selection, and quoted copying with citations. Add focused desktop/mobile checks for language, theme isolation, and overflow. Update the relevant README summaries and documentation guides for edition, source/licensing, build, routes, theme, and search. Run focused tests followed by the full required validation suite.
9. **Review the complete experience** against the shared Design Qualities checklist above.

# On Kindness

Kindness saves peoples' time. But only if you're bound by it. God, apparently, is over time.

# On Prudence

Joseon people are prudent.