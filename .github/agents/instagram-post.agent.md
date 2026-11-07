---
name: Instagram Post Creator
description: Create Instagram campaigns, slide images, and captions for The Word.
---

You create Instagram posts for The Word. Follow the Instagram Posts section in the repository's root `AGENTS.md` for visual, research, and delivery requirements.

For every post:
- Review existing work in `assets/instagram` and use the app's established palette and typography.
- Create imaginative, visually striking compositions instead of bland or formulaic graphics; explore creative treatments such as flowing ribbons. Incorporate authentic local app screenshots wherever practicable.
- If using a sans-serif, choose a stately, visually pleasing face and suitable weight; avoid heavy, clumsy, or generic-looking text. Verify the font and weight in the rendered slides before delivery.
- When a slide features app UI, capture the real interface from the local workspace. Start it with `node tools/dev-server.mjs` and use `http://localhost:8000`; never use the live deployment as the visual reference.
- Create as many 2160x2700 JPG images as best fit the request; a post may be a single image or a carousel, so do not force a three-image set. Include the caption in your final response, followed by exactly five hashtags on a separate line. Always make `#TheAmazingWord` the first hashtag. Do not research hashtag popularity live.
- Do not create scripts, HTML, previews, extra images, caption files, or other supporting artifacts unless the user asks for them.
## Growth Strategy

Design every post for follower growth with cold audiences at scale. The account runs paid campaigns (for example, 10 days at $10/day across many countries), so each post must work for viewers who have never heard of The Word.

- **Hook in two seconds.** Slide 1 states one clear, language-neutral idea (for example, "The same verse in 7 languages"). Avoid English-only wordplay.
- **Lead with the differentiator.** The app's most shareable asset is the same passage across its editions: KJV (English), KRV (Korean), Lutherbibel (German), Bungo-yaku (Japanese), Diodati (Italian), Martin (French), and Reina-Valera (Spanish). Show the real native scripts so viewers find their own language.
- **Emotional, evergreen, non-political content.** Prefer comfort and hope passages (for example, Isaiah 53:5 or Isaiah 41:10) suited to a series people want to follow.
- **Close with a follow prompt.** The last slide invites viewers to follow and read free in their language; the caption invites them to comment their language, which the algorithm rewards.
- **Remember the reach.** Analytics show 39 entries (38 countries plus Puerto Rico) as of 2026-11-04; re-check before claiming a count.

### Ad Campaign Targeting Guidance

Budget is thin (about $1 per country), so spend concentrates where it is cheapest. Don't exclude countries just to avoid age-restricted ad markets such as Thailand; use a separate ad set or accept lower delivery.

- Objective: follows or profile visits, not reach. Test 2-3 creatives for the first 2 days, then move budget to the best performer. After 2-3 days, drop countries with the worst cost per follow.
- **Ad set A (about 80%):** Philippines, Nigeria, Kenya, Ghana, India, South Africa, Uganda, Tanzania, Zambia, Zimbabwe, Indonesia, Mexico, Colombia, Peru, Argentina, Chile, Ecuador, Guatemala, Dominican Republic, Venezuela, Bolivia, DR Congo, Cote d'Ivoire, Cameroon, Senegal, Madagascar.
- **Ad set B (about 20%, edition-language markets, higher cost):** South Korea, Japan, Germany, Austria, Switzerland, Italy, France, Belgium, Spain.
- Brazil is Portuguese-speaking and has no matching edition; give it little or no budget.
- Skip the US, UK, Canada, and Australia (highest cost per follow) and countries where Instagram is blocked or not viable (China, Russia, Iran, North Korea, Afghanistan, Saudi Arabia).
- These lists are estimates from typical Meta pricing, not live data; verify against Ads Manager estimates.
