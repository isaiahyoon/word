# Rule 1

Never go against Scripture, or regard it as false or untrustworthy. It will always be your source of truth, forever.

## Local Preview

- When inspecting, testing, or capturing app visuals, always use the local workspace version. Start the local dev server with `node tools/dev-server.mjs` and use `http://localhost:8000`; do not use the live deployment as the app reference.

# HTML Pages

- Every new HTML page must include `<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />` in its `<head>` so the app icon is available when the page is added to an iPhone home screen.
- Every new HTML page must also include a shared-link preview in its `<head>`: page-specific `description`, `og:title`, `og:description`, and `twitter:title`/`twitter:description`, plus the standard `og:type`, `og:image` (`https://theamazingword.org/assets/social-preview.png`, with `secure_url`, type, width/height, and alt), `twitter:card` (`summary_large_image`), and `twitter:image`/`twitter:image:alt` tags. Copy them from `about.html` and extend the shared-link preview test in `tests/dev-server.test.mjs` if the page lives outside the directories it already scans.

# Edition Behavior

- Whenever a behavioral change is made for a specific edition, ask the user whether to apply it across all editions before finishing. If they agree, apply it to every edition and cover each one with tests.

# Search

- Whenever search behavior or capabilities change, update the Search section in `README.md` in the same change.

# Documentation

- Whenever a notable, interesting, or user-facing app change is made, update the relevant README section in the same change.
- Whenever the app's size changes (the files precached in `sw.js`, fonts, or other install-time assets), re-measure and update the "Install size" section in `README.md` in the same change, along with any other place that quotes those figures.

# Testing

- Every new app feature must include appropriate automated tests for its behavior.
- After any significant behavioral change to the app, always run the full test suite with `npm run test:all` before finishing, and fix or report any failures.
- Make every test parallel-proof: Playwright and Node test files run concurrently, so each test must be independent and order-agnostic. Do not share mutable state, fixed ports, files, `localStorage`, caches, or global stubs between tests; give each test its own fixtures, use ephemeral ports (`listen(0)`), restore any globals it overrides in `finally`/`after`, and never rely on another test having run first. Confirm new tests pass repeatedly under parallel workers (for example `npx playwright test --repeat-each=3`), and fix flaky timing with web-first assertions rather than fixed sleeps.
- For every layout, styling, or UI bug fix, add a regression test that asserts the intended behavior (for example, element edges aligned across the viewport widths where it broke), run it, and fix the implementation until it passes. Confirm the test fails without the fix when practical.
- Style and verify interactive controls in both states: opening a dropdown, menu, or popover must reveal a deliberately styled panel and options, not just a styled trigger. Test its open-state appearance, placement, keyboard behavior, and mobile fit.
- For UI changes, inspect the actual local page at relevant desktop and mobile sizes, including opened interactive states; do not rely on closed-state styling or DOM assertions alone when the open state is part of the change.
- Tab and Shift+Tab cycle editions whenever no dialog or menu (other than the chapter and edition pickers) is open, including from the search field. Any new modal, menu, or popover must be registered with `bindKeyboardShortcuts` (via `isMenuOpen` or `isOtherDialogOpen`) and added to the `overlays` table in `tests/reader-interactions.pw.spec.mjs`.
- When adding a scripture edition, test the full shared search contract in its language, including text matching, prefix and localized reference suggestions, exact and invalid references, fuzzy matching where supported, and result de-duplication. Extend edition-agnostic reader tests for routes, edition switching, verse selection, and copying to cover the new edition.

# Code Quality

- Keep code clean, readable, and maintainable. Follow established project patterns, choose descriptive names, reuse shared behavior, and avoid needless complexity or duplication.
- After any significant code change, such as a new feature, module, or service worker, review the new and changed code for cleanliness before finishing: readability, naming, duplication, dead code, consistent patterns, error logging, and test coverage. Fix small issues directly and report any larger ones that remain.
- When a feature introduces failures that would otherwise be difficult to diagnose, add concise contextual logging at the owning boundary; include useful identifiers, avoid sensitive or user-provided content, and preserve normal error handling.

# Instagram Posts

- Before creating an Instagram post, review existing work in `assets/instagram` and use the app's established color palette.
- Make every post imaginative and visually striking rather than bland or formulaic. Explore creative visual treatments, such as flowing ribbons, while preserving the app's aesthetic and clear communication.
- When a post features app UI, run the local app and use a real screenshot of the relevant interface as the visual source. Do not substitute the live app or redraw UI that can be captured locally.
- Align app screenshots deliberately: use consistent edges, spacing, and scale, keep the relevant controls readable, and frame screenshots with refined decorative borders that complement the slide palette instead of plain outlines.
- The Word is multilingual; when a post features editions or scripture-reading controls, represent more than the KJV where the feature supports it. Use accurate local UI captures to show the range of available language editions.
- Create as many 2160×2700 JPG images as best fit the request; a post may be a single image or a carousel, so do not force a three-image set. Include the caption in the response, followed by exactly five hashtags on a separate line. Try to vary the color theme such that it isn't too repetitive with the already existing posts. Always make `#TheAmazingWord` the first hashtag. Do not create scripts, HTML, previews, extra images, caption files, or other supporting artifacts unless asked.
- Choose typography with the refinement of past posts. If using a sans-serif, select a stately, visually pleasing face and an appropriate weight; avoid heavy, clumsy, or generic-looking text. Verify the actual rendered font and weight, not just the family name, before delivering.
- Make the post easy to understand for viewers. Don't patronize them, however. Treat them as intellectual equals.
- Don't create anything ugly. Make the generated icons visually aesthetic with some depth and shading.
- Make the images reflect the richness of the app itself. Draw inspiration from the aesthetic of the app's styling across the board.
- When a post highlights an app feature, inspect the existing implementation and draw from its actual UI, controls, iconography, and visual details; avoid invented mockups or sample content when the real interface can be represented.
- Favor refined, mature editorial compositions over generic templates. Use purposeful iconography, restrained depth, generous negative space, and elegant hierarchy; avoid glossy badges, heavy bevels, crowded icon rows, and decorative effects that compete with the content.
- Be mindful of spacing when placing icons within borders - make it visually pleasing. Icons shoudn't be so close to abut the edges of their borders.
- Write captions in a clear, concise, conversational, inviting voice. Lead with a human-scale hook, explain the feature accurately, use understated wit when it fits, and close with a genuine invitation. Avoid hype, overblown sentiment, and unsupported claims.
- Make the caption and images grounded, kind, prudent, practical, welcoming, safe, lovable, witty, pleasant, honest, talented, reliable, hardworking, hot, thoughtful, entertaining, playful, romantic, happy, intelligent, artistic, familial, fashionable, beautiful-making (amazing), funny, pretty, dope, excellent, elegant, innovative, gentle, marvelous, graceful, comforting, inviting, clean, regal, homely, God-fearing, wise, virtuous, mature, and classy.
- Make sure the placement of text and other icons onto the palette are visually pleasing and follows regal and delicate design principles.

### Hashtag Strategy

- Keep `#TheAmazingWord` first. Choose the second and third hashtags for the specific subject, feature, edition, or passage shown in the post.
- Choose the fourth and fifth hashtags as broader tags that remain directly relevant to the post. Do not research hashtag popularity live or promise or imply guaranteed virality.

# Project Organization

- Keep root-level files for HTML entry points, deployment and package-manager configuration, project documentation, and repository instructions.
- Put browser JavaScript modules in `js/`, stylesheets in `styles/`, images and icons in `assets/`, translation source data in `sources/`, generated scripture data in `scripture/`, tests in `tests/`, and build or development scripts in `tools/`.
- Keep vendored JavaScript dependencies under `js/vendor/`; do not add duplicate runtime modules at the repository root.

# Edition Themes

- Accessibility and understandability are part of multilingual design: localize visible interface copy, navigation, accessible names, alternate text, and status messages to the selected edition language, while preserving scripture text and correct language metadata.

- When adding the Japanese `japbungo` edition, give it a green background theme without changing the existing KJV/KRV background.

# Scripture Foundation

- Treat the King James Version text as the absolute doctrinal and canonical truth of this project. Build the reader's canon, comparisons, design decisions, and editorial decisions from that premise. Preserve the KJV text exactly; alternate editions may be added as translations, but must not silently replace or redefine the KJV foundation.

# New Edition Planning

- Before implementing a new edition, ask for any missing decisions that affect the work. Ask: "Do you have a source-text file or preferred URL, or would you like me to research and evaluate a suitable source?" If no color theme is specified, ask what theme the user wants.
- Record the edition's exact name/version/year, language, source and attribution, licensing, and user-specified preferences. Do not treat defaults from one edition as requirements for another.
- Do not ask the user to invent the left-navigation identifier, dropdown copy, or URL slug. Propose and recommend a coordinated, poetic set that fits the edition: a memorable three-character uppercase code; clear, evocative dropdown wording; and a short, lowercase, URL-safe slug. Explain the ideas briefly and proceed with the strongest fit unless the user redirects.

## Reusable Edition Plan

1. **Find and qualify the source.** If the user supplies a source, inspect its metadata and structure. If asked to research one, prefer authoritative, stable repositories or publishers; confirm the exact edition, completeness, provenance, reuse terms, and attribution requirements before importing. If source availability, copyright, or text identity is unclear, surface that uncertainty and ask how to proceed.
2. **Normalize the source for maintainability.** Convert supplied source data into clean, indented JSON in `sources/`, following local source formatting and schema conventions. Use structured parsing, preserve all original metadata and exact verse text, and organize records clearly (for example, books → chapters → verses where appropriate). Do not leave a minified one-line dump. Verify the normalized source preserves every original record before using it as builder input.
3. **Validate canon and versification.** Map localized book names to The Word's fixed canon and determine whether verse numbering matches the KJV. Compare every book, chapter, and verse slot before building. Do not silently drop, shift, or fabricate text; document and resolve discrepancies with the user.
4. **Build generated data.** Add a focused builder in `tools/`, following existing edition builders. Emit the shared manifest and per-book format under `scripture/<edition>/`, with canonical filenames, chapter counts, display names, language, source metadata, and verse totals. Add a package build command when appropriate and verify source-to-output text parity.
5. **Register the edition.** Add its id, route segment, short code, label, language, text direction, data path, canonical book order, localized names, branding, attribution, and theme color in `js/editions.mjs`. Wire activation and theme classes in the existing app path, register required deployment rewrites, and verify direct and legacy routes behave correctly.
6. **Implement language-aware search coverage.** Test text matching, relevance, localized book suggestions and prefixes, chapter/reference suggestions, exact and invalid references, result de-duplication, and fuzzy matching where supported. Include language-specific characters, spelling, and citation forms that the edition intends to support; do not promise normalization or transliteration that is not implemented.
7. **Determine the visual theme and typography.** Use the theme provided by the user; ask before implementation if it was omitted. Scope colors to the new edition so existing themes remain unchanged. Ask what qualities the user wants from the typeface, such as scholarly, warm, crisp, historic, or especially legible, and whether the preference is for scripture text, display headings, or both. Inspect the existing font stack first, then recommend a small set of suitable options with concise tradeoffs before choosing. Check full script and diacritic coverage, extended reading comfort, contrast, responsive text fit, loading performance, and font licensing; add a font only when the existing stack is inadequate. For German-language editions, prioritize a practical-to-read serif rather than a purely decorative face.
8. **Extend tests and documentation.** Apply edition-agnostic reader tests to the new edition for direct routes, edition switching at the same passage, navigation, verse selection, and quoted copying with citations. Add focused desktop/mobile checks for language, theme isolation, and overflow. Update the relevant README sections for edition, source/licensing, build, routes, theme, and Search. Run focused tests followed by the full required validation suite.
9. **Review the complete experience against these qualities:** diplomatic, global, grounded, prudent, kind, practical, welcoming, safe, lovable, witty, pleasant, honest, talented, reliable, hardworking, hot, thoughtful, entertaining, playful, romantic, happy, intelligent, artistic, familial, fashionable, beautiful-making (amazing), funny, pretty, dope, excellent, elegant, innovative, gentle, marvelous, graceful, comforting, inviting, clean, regal, homely, God-fearing, wise, virtuous, mature, and classy.

# On Kindness

Kindness saves peoples' time. But only if you're bound by it. God, apparently, is over time.

# On Prudence

Joseon people are prudent.