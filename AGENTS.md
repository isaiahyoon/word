# HTML Pages

- Every new HTML page must include `<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />` in its `<head>` so the app icon is available when the page is added to an iPhone home screen.

# Search

- Whenever search behavior or capabilities change, update the Search section in `README.md` in the same change.

# Documentation

- Whenever a notable, interesting, or user-facing app change is made, update the relevant README section in the same change.

# Testing

- Every new app feature must include appropriate automated tests for its behavior.
- When adding a scripture edition, test the full shared search contract in its language, including text matching, prefix and localized reference suggestions, exact and invalid references, fuzzy matching where supported, and result de-duplication. Extend edition-agnostic reader tests for routes, edition switching, verse selection, and copying to cover the new edition.

# Code Quality

- Keep code clean, readable, and maintainable. Follow established project patterns, choose descriptive names, reuse shared behavior, and avoid needless complexity or duplication.

# Instagram Posts

- Before creating an Instagram post, review existing work in `assets/instagram` and use the app's established color palette.
- Deliver only three separate 1080×1350 JPG images with distinct color themes and the caption in the response, followed by exactly three hashtags on a separate line. Always make `#TheAmazingWord` the first hashtag. Do not create scripts, HTML, previews, extra images, caption files, or other supporting artifacts unless asked.
- Make the caption and images together grounded, kind, welcoming, safe, lovable, witty, pleasant, honest, talented, reliable, hardworking, hot, thoughtful, entertaining, playful, romantic, happy, intelligent, artistic, familial, fashionable, beautiful-making (amazing), funny, pretty, dope, elegant, innovative, gentle, marvelous, graceful, comforting, inviting, clean, regal, homely, God-fearing, wise, and classy.

# Project Organization

- Keep root-level files for HTML entry points, deployment and package-manager configuration, project documentation, and repository instructions.
- Put browser JavaScript modules in `js/`, stylesheets in `styles/`, images and icons in `assets/`, translation source data in `sources/`, generated scripture data in `scripture/`, tests in `tests/`, and build or development scripts in `tools/`.
- Keep vendored JavaScript dependencies under `js/vendor/`; do not add duplicate runtime modules at the repository root.

# Edition Themes

- When adding the Japanese `japbungo` edition, give it a green background theme without changing the existing KJV/KRV background.

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
9. **Review the complete experience against these qualities:** diplomatic, global, grounded, kind, welcoming, safe, lovable, witty, pleasant, honest, talented, reliable, hardworking, hot, thoughtful, entertaining, playful, romantic, happy, intelligent, artistic, familial, fashionable, beautiful-making (amazing), funny, pretty, dope, elegant, innovative, gentle, marvelous, graceful, comforting, inviting, clean, regal, homely, God-fearing, wise, and classy.
