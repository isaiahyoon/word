# HTML Pages

- Every new HTML page must include `<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />` in its `<head>` so the app icon is available when the page is added to an iPhone home screen.

# Search

- Whenever search behavior or capabilities change, update the Search section in `README.md` in the same change.

# Documentation

- Whenever a notable, interesting, or user-facing app change is made, update the relevant README section in the same change.

# Testing

- Every new app feature must include appropriate automated tests for its behavior.

# Project Organization

- Keep root-level files for HTML entry points, deployment and package-manager configuration, project documentation, and repository instructions.
- Put browser JavaScript modules in `js/`, stylesheets in `styles/`, images and icons in `assets/`, translation source data in `sources/`, generated scripture data in `scripture/`, tests in `tests/`, and build or development scripts in `tools/`.
- Keep vendored JavaScript dependencies under `js/vendor/`; do not add duplicate runtime modules at the repository root.