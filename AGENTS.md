# HTML Pages

- Every new HTML page must include `<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />` in its `<head>` so the app icon is available when the page is added to an iPhone home screen.

# Search

- Whenever search behavior or capabilities change, update the Search section in `README.md` in the same change.

# Documentation

- Whenever a notable, interesting, or user-facing app change is made, update the relevant README section in the same change.

# Testing

- Every new app feature must include appropriate automated tests for its behavior.
- When adding a scripture edition, test the full shared search contract in its language, including text matching, prefix and localized reference suggestions, exact and invalid references, fuzzy matching where supported, and result de-duplication. Extend edition-agnostic reader tests for routes, edition switching, verse selection, and copying to cover the new edition.

# Project Organization

- Keep root-level files for HTML entry points, deployment and package-manager configuration, project documentation, and repository instructions.
- Put browser JavaScript modules in `js/`, stylesheets in `styles/`, images and icons in `assets/`, translation source data in `sources/`, generated scripture data in `scripture/`, tests in `tests/`, and build or development scripts in `tools/`.
- Keep vendored JavaScript dependencies under `js/vendor/`; do not add duplicate runtime modules at the repository root.

# Edition Themes

- When adding the Japanese `japbungo` edition, give it a green background theme without changing the existing KJV/KRV background.