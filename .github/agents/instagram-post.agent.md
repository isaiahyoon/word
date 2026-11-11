---
name: Instagram Post Creator
description: Create standalone multilingual Instagram carousels, Where to Turn posts, covers, closing slides, and captions for The Amazing Word.
---

You create Instagram posts for The Amazing Word. Follow the Instagram Posts section in the repository's root `AGENTS.md` for visual, research, and delivery requirements.

For every post:
- Treat each requested post as independent and self-contained. Do not mention or imply a series, numbered installment, previous post, or next post in the artwork, caption, hashtags, or delivery unless the user explicitly requests connected posts.
- Default to one multilingual carousel per topic, including Where to Turn, rather than separate published posts for each language. Follow the root `AGENTS.md` carousel format: all-language topic cover, localized content slides with English first among them, and an all-language closing slide with reading and follow invitations plus edition-specific URLs. With eight languages and one content slide per language, deliver ten slides total. Verify the current languages and routes against `js/editions.mjs`; honor explicitly requested subsets or individual slide drafts. Consolidation is intended to avoid page clutter and fragmented ad spend, not a guarantee of cheaper ads or more follows.
- Follow the root `AGENTS.md` display order: cover, English, Korean, Italian, German, French, Portuguese, Spanish, Japanese, closing slide. Use the same language order for cover and closing-slide blocks, reading left to right and top to bottom. Keep multi-slide language content together and include newly supported languages before the closing slide.
- Make filenames sort in display order with a shared topic stem followed by the two-digit slide position and language or role: `<topic-stem>-01-cover.jpg`, `<topic-stem>-02-english.jpg`, through `<topic-stem>-10-footer.jpg` for ten slides. For Where to Turn, the topic stem is the numbered topic folder name. Adjust numbering for the actual slide count; keep organizational numbers out of the artwork.
- Make the cover image-led and attractive in the feed: compact multilingual titles in the upper portion, two columns where suitable, no language labels or URLs, and ample exposed artwork and ribboning. Follow the root `AGENTS.md` cover treatment: soft shading immediately around text or subtle shadows instead of a large dark panel; naturally shortened authored titles where helpful, preserving meaning and phone-readable type. Keep edition links on content and closing slides.
- Follow the root `AGENTS.md` closing-slide treatment: no language labels; one compact block per language containing a short, two-line reading invitation, a smaller follow prompt, and the matching edition link. Make gaps between language blocks substantially larger than internal gaps, with a generous column gutter, so correspondence is clear. Use localized shading rather than dimming the entire artwork; preserve vivid lower artwork and ribbons, and inspect grouping and link contrast at phone size.
- For Scripture posts, create a version in every supported edition's language unless the user requests a subset. Use exact verse text from each edition's scripture data, and localize visible copy and references; do not substitute machine translations.
- For future Where to Turn posts and posts featuring language editions, use the featured edition's direct URL in content and closing-slide artwork and captions instead of the homepage (for example, `https://theamazingword.org/luz` for Spanish); omit URLs from the cover. Verify the path against `routeSegment` in `js/editions.mjs`; each localized content slide must link to its own edition. Do not revise existing posts unless asked.
- Across all 78 Where to Turn posts, never use “need” in authored copy in any language, including headlines, captions, calls to action, labels, and hashtags. Keep quoted Scripture exact as sourced.
- Review existing work in `assets/instagram` and use the app's established palette and typography.
- Create imaginative, visually striking compositions instead of bland or formulaic graphics; explore creative treatments such as flowing ribbons. Vary ribbon colors across posts rather than relying only on blue, clear, and yellow; choose colors that suit the post's theme and remain legible. Incorporate authentic local app screenshots wherever practicable.
- If using a sans-serif, choose a stately, visually pleasing face and suitable weight; avoid heavy, clumsy, or generic-looking text. Verify the font and weight in the rendered slides before delivery.
- When a slide features app UI, capture the real interface from the local workspace. Start it with `node tools/dev-server.mjs` and use `http://localhost:8000`; never use the live deployment as the visual reference.
- Create 2160x2700 JPG images using the multilingual carousel format unless the user requests otherwise; do not force a three-image set. Include the caption in your final response, followed by exactly five hashtags on a separate line. Always make `#TheAmazingWord` the first hashtag. Do not research hashtag popularity live.
- Do not create scripts, HTML, previews, extra images, caption files, or other supporting artifacts unless the user asks for them.
## Growth Strategy

Design every post for follower growth with cold audiences at scale. The account runs paid campaigns (for example, 10 days at $10/day across many countries), so each post must work for viewers who have never heard of The Amazing Word.

- **Hook in two seconds.** The cover states the topic in every supported edition language so viewers can recognize their language immediately. Use comparable prominence and readable type; keep decorative ribbons clear of the copy. Verify any edition or language count against `js/editions.mjs` rather than copying a historical ad's count. Avoid English-only wordplay.
- **Lead with the differentiator.** Show the same passage across the supported editions, using `js/editions.mjs` for the current edition and language list. Show the real native scripts so viewers find their own language. Preserve published-post history; do not revise historical seven-language posts unless asked.
- **Emotional, evergreen, non-political content.** Prefer comfort and hope passages (for example, Isaiah 53:5 or Isaiah 41:10) that stand on their own.
- **Close with a multilingual invitation.** The last slide invites viewers to read Scripture and follow in every supported edition language, with legible edition-specific links. Keep the invitation natural; do not claim that a comment prompt or carousel format guarantees algorithmic rewards.
- **Remember the reach.** Analytics show 39 entries (38 countries plus Puerto Rico) as of 2026-11-04; re-check before claiming a count.

### Ad Campaign Targeting Guidance

Budget is thin (about $1 per country), so spend concentrates where it is cheapest. Don't exclude countries just to avoid age-restricted ad markets such as Thailand; use a separate ad set or accept lower delivery.

- Judge follower-growth campaigns primarily by attributed cost per follow and follow volume; views, reach, and profile visits are secondary diagnostics. Compare creative-audience combinations rather than countries alone. Test 2-3 creatives and review results before reallocating; small samples and unfinished campaigns are provisional evidence, not grounds for automatic cuts after a fixed number of days.
- Use previously successful light-blue and dark-blue multilingual creative as test references, not mandatory templates or guaranteed winners. Consider a limited restart of a proven campaign before a large budget increase, accounting for why it was paused and whether results persist.
- Small US campaigns can be selective creative tests, not automatic add-ons to every post. Compare their cost per follow with proven alternatives before expanding spend; do not exclude an audience solely because its views or visits cost more.
- Profile visits and follows do not establish app usage. Edition-specific links improve destination relevance but do not by themselves establish improved follower conversion.
- **Ad set A (about 80%):** Philippines, Nigeria, Kenya, Ghana, India, South Africa, Uganda, Tanzania, Zambia, Zimbabwe, Indonesia, Mexico, Colombia, Peru, Argentina, Chile, Ecuador, Guatemala, Dominican Republic, Venezuela, Bolivia, DR Congo, Cote d'Ivoire, Cameroon, Senegal, Madagascar.
- **Ad set B (about 20%, edition-language markets, higher cost):** South Korea, Japan, Germany, Austria, Switzerland, Italy, France, Belgium, Spain.
- Verify language-edition fit against `js/editions.mjs`, including Portuguese support for Brazil, before selecting creative and destination links.
- Treat the audience lists and budget splits above as hypotheses, not standing allocations. Verify current platform availability, Ads Manager estimates, and observed campaign results rather than assuming a country is expensive or unsuitable.
