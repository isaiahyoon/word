---
description: "Use when adding or changing reader features, supported editions, offline behavior, project convictions, installation guidance, or About page copy. Keep The Word's About page accurate and in step with meaningful user-facing changes."
---
# About Page

- When a meaningful user-facing change alters what readers can do, what the project stands for, or how readers install or use it offline, update `about.html` when that information belongs there.
- Keep claims accurate to the current implementation; verify feature, edition, privacy, and installation details before describing them.
- Whenever an edition is added or removed, update the About page's edition count and description in every supported locale; update its language choices only when the set of supported About-page languages changes, and cover the copy with focused tests.
- Do not edit the About page for unrelated internal refactors or changes that do not affect its content.
- When a relevant change also affects the README, update both in the same change and keep their descriptions consistent.
- Preserve the page's restrained visual style, accessible markup, and mobile layout. Add or adjust focused tests when its content, links, or layout behavior changes.
- Style the opened state of every About-page dropdown or popover, including its panel, options, selected state, focus state, and dismissal behavior; styling only the trigger is incomplete.
- Verify About-page interactive controls while open at mobile and desktop widths using the local app, and cover their visual bounds and keyboard interaction in focused browser tests.
