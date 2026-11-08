import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { ABOUT_LOCALES, getEditionSummary } from "../js/about-locales.mjs";
import { EDITIONS } from "../js/editions.mjs";

const root = new URL("../", import.meta.url);
const siteUrl = "https://theamazingword.org";
const previewImage = `${siteUrl}/assets/social-preview.png`;

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function editionLinkStyle(edition) {
  const stops = edition.accentColors
    .map((color, index, colors) => {
      const position = Math.round(index / (colors.length - 1) * 100);
      return `color-mix(in srgb, ${color} 22%, transparent) ${position}%`;
    })
    .join(", ");
  const glow = `color-mix(in srgb, ${edition.accentColor} 68%, transparent)`;
  const secondaryGlow = `color-mix(in srgb, ${edition.accentColors.at(-1)} 48%, transparent)`;
  return `--edition-link-accent: ${edition.accentColor}; --edition-link-gradient: linear-gradient(115deg, ${stops}); --edition-link-glow: ${glow}; --edition-link-glow-secondary: ${secondaryGlow}`;
}

function renderPageHead({ title, description, canonicalUrl, themeColor = "#f6f4f9" }) {
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);
  return `  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="${themeColor}" />
    <meta name="description" content="${escapedDescription}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="${previewImage}" />
    <meta property="og:image:secure_url" content="${previewImage}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="The Amazing Word prism sword emblem beside the Scripture reader name" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    <meta name="twitter:image" content="${previewImage}" />
    <meta name="twitter:image:alt" content="The Amazing Word prism sword emblem beside the Scripture reader name" />
    <title>${escapedTitle}</title>
    <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
    <link rel="stylesheet" href="/styles/theme.css" />
    <link rel="stylesheet" href="/styles/typography.css" />
    <link rel="stylesheet" href="/styles/editions.css" />
    <link rel="stylesheet" href="/styles/about.css" />
  </head>`;
}

function renderEditionDirectory(editions, locales, { detailed = false, label = "Scripture editions" } = {}) {
  const entries = Object.values(editions).map((edition, index) => {
    const style = escapeHtml(editionLinkStyle(edition));
    const heading = edition.seo.heading;
    const nameAttributes = detailed ? ` lang="${edition.language}" dir="${edition.direction}"` : "";
    const languageName = detailed ? `<small>${escapeHtml(edition.languageName)}</small>` : "";
    const readerLabel = locales[edition.language].openReader;
    const readerLink = detailed ? `
                <a class="edition-read-link" href="/${edition.routeSegment}/b/genesis/c/1/v/1" lang="${edition.language}" aria-label="${escapeHtml(`${readerLabel} · ${heading}`)}">${escapeHtml(readerLabel)} <span aria-hidden="true">→</span></a>` : "";
    return `              <li${detailed ? ` style="${style}"` : ""}>
                <a href="/editions/${escapeHtml(edition.routeSegment)}/" style="${style}"><span class="edition-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><span class="edition-name"${nameAttributes}>${escapeHtml(detailed ? heading : edition.label)}${languageName}</span><span class="edition-arrow" aria-hidden="true">↗</span></a>${readerLink}
              </li>`;
  });
  return `          <nav class="edition-directory${detailed ? " edition-collection-directory" : ""}" aria-label="${escapeHtml(label)}">
            <ol>
${entries.join("\n")}
            </ol>
          </nav>`;
}

function renderEditionPage(edition, editions, locales) {
  const { heading, title, description } = edition.seo;
  const locale = getEditionSummary(locales[edition.language], edition.language, editions);
  const canonicalUrl = `${siteUrl}/editions/${edition.routeSegment}/`;
  const readerUrl = `/${edition.routeSegment}/b/genesis/c/1/v/1`;
  const language = escapeHtml(edition.language);
  const themeColor = escapeHtml(edition.themeColor ?? "#f6f4f9");
  const escapedHeading = escapeHtml(heading);
  const escapedAppName = escapeHtml(edition.appName);

  return `<!doctype html>
<html lang="${language}" dir="${edition.direction}">
${renderPageHead({ title, description, canonicalUrl, themeColor })}
  <body class="is-${escapeHtml(edition.id)}-edition edition-landing" style="--edition-theme-color: ${themeColor}">
    <div class="about-shell">
      <header class="about-header">
        <a class="brand" href="/" aria-label="${escapeHtml(locale.brandHome)}">
          <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span class="brand-name">
            <strong>${escapedAppName}</strong>
            <small>${escapeHtml(locale.brandDescriptor)}</small>
          </span>
        </a>
        <a class="return-link" href="${readerUrl}">
          <span>${escapeHtml(locale.returnToReading)}</span>
          <span aria-hidden="true">→</span>
        </a>
      </header>

      <main>
        <section class="about-hero" aria-labelledby="page-title">
          <p class="eyebrow"><span aria-hidden="true">✦</span><span>${escapeHtml(edition.label)}</span></p>
          <h1 id="page-title">${escapedHeading}</h1>
          <p class="hero-copy">${escapeHtml(description)}</p>
          <a class="primary-link" href="${readerUrl}">
            <span>${escapeHtml(locale.openReader)}</span>
            <span aria-hidden="true">→</span>
          </a>
          <div class="hero-rule" aria-hidden="true"><i></i><i></i><i></i></div>
        </section>

        <section class="content-section" aria-labelledby="features-title">
          <div class="section-heading">
            <p class="eyebrow">${escapeHtml(locale.featuresEyebrow)}</p>
            <h2 id="features-title">${escapeHtml(locale.featuresTitle)}</h2>
          </div>
          <div class="feature-grid">
            <article class="feature-card">
              <span class="card-mark card-mark--rose" aria-hidden="true">01</span>
              <h3>${escapeHtml(locale.findTitle)}</h3>
              <p>${escapeHtml(locale.findCopy)}</p>
            </article>
            <article class="feature-card">
              <span class="card-mark card-mark--lavender" aria-hidden="true">02</span>
              <h3>${escapeHtml(locale.carryTitle)}</h3>
              <p>${escapeHtml(locale.carryCopy)}</p>
            </article>
            <article class="feature-card">
              <span class="card-mark card-mark--gold" aria-hidden="true">03</span>
              <h3>${escapeHtml(locale.paceTitle)}</h3>
              <p>${escapeHtml(locale.paceCopy)}</p>
            </article>
            <article class="feature-card">
              <span class="card-mark card-mark--blue" aria-hidden="true">04</span>
              <h3>${escapeHtml(locale.placeTitle)}</h3>
              <p>${escapeHtml(locale.placeCopy)}</p>
            </article>
          </div>
        </section>

        <section class="content-section" aria-labelledby="editions-title">
          <div class="section-heading">
            <h2 id="editions-title">${escapeHtml(locale.editionsTitle)}</h2>
          </div>
${renderEditionDirectory(editions, locales, { label: locale.editionsTitle })}
        </section>
      </main>

      <footer class="about-footer">
        <span>${escapeHtml(locale.footerBrand)}</span>
        <a href="/editions/">${escapeHtml(locale.editionsTitle)}</a>
        <a href="/about">${escapeHtml(locale.pageTitle)}</a>
      </footer>
    </div>
  </body>
</html>
`;
}

function renderCollectionPage(editions, locales) {
  const count = Object.keys(editions).length;
  const title = "Bible editions and languages | The Amazing Word";
  const description = `Explore ${count} Scripture editions in their own languages. Choose an edition, read freely, and share the same passage across languages with The Amazing Word.`;
  return `<!doctype html>
<html lang="en" dir="ltr">
${renderPageHead({ title, description, canonicalUrl: `${siteUrl}/editions/` })}
  <body class="edition-collection">
    <div class="about-shell">
      <header class="about-header">
        <a class="brand" href="/" aria-label="The Amazing Word home">
          <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span class="brand-name"><strong>The Amazing Word</strong><small>BIBLE READER</small></span>
        </a>
        <a class="return-link" href="/">Open the reader <span aria-hidden="true">→</span></a>
      </header>
      <main>
        <section class="about-hero" aria-labelledby="page-title">
          <p class="eyebrow"><span aria-hidden="true">✦</span> SCRIPTURE, ACROSS LANGUAGES</p>
          <h1 id="page-title">One Word.<br />${count} editions.</h1>
          <p class="hero-copy">A familiar passage. Another language. Explore the editions below, or step straight into reading.</p>
          <div class="hero-rule" aria-hidden="true"><i></i><i></i><i></i></div>
        </section>
        <section class="content-section" aria-labelledby="editions-title">
          <div class="section-heading">
            <p class="eyebrow">FIND YOUR READING LANGUAGE</p>
            <h2 id="editions-title">A place for your words.</h2>
          </div>
${renderEditionDirectory(editions, locales, { detailed: true })}
        </section>
        <section class="content-section" aria-labelledby="languages-title">
          <div class="section-heading"><h2 id="languages-title">The same passage. A wider conversation.</h2></div>
          <p class="section-intro">Switch editions in the reader without losing your passage or selected verses. Copy or share that selection with a citation in another supported language.</p>
          <p class="section-intro">The King James Version is this project's canonical foundation. Other editions are translations for reading and comparison, not replacements for that foundation.</p>
        </section>
      </main>
      <footer class="about-footer"><span>THE AMAZING WORD / SCRIPTURE READER</span><a href="/about">About The Amazing Word</a></footer>
    </div>
  </body>
</html>
`;
}

export async function buildSeoPages({ projectRoot = root, editions = EDITIONS, locales = ABOUT_LOCALES } = {}) {
  const routes = new Set();
  for (const [id, edition] of Object.entries(editions)) {
    if (edition.id !== id || typeof edition.routeSegment !== "string"
      || !/^[a-z0-9-]+$/.test(edition.routeSegment) || routes.has(edition.routeSegment)) {
      throw new Error(`Invalid or duplicate SEO edition route: ${id}`);
    }
    routes.add(edition.routeSegment);
    for (const field of ["heading", "title", "description"]) {
      if (typeof edition.seo?.[field] !== "string" || !edition.seo[field].trim()) {
        throw new Error(`Missing SEO ${field} for edition: ${id}`);
      }
    }
    if (!Object.hasOwn(locales, edition.language)) {
      throw new Error(`Missing About locale for edition: ${id} (${edition.language})`);
    }
    for (const key of Object.keys(ABOUT_LOCALES.en)) {
      if (typeof locales[edition.language][key] !== "string" || !locales[edition.language][key].trim()) {
        throw new Error(`Missing About locale ${key} for edition: ${id} (${edition.language})`);
      }
    }
    if (!locales[edition.language].editionsTitle.includes("{count}")
      || !locales[edition.language].editionsCopy.includes("{editions}")) {
      throw new Error(`About edition summary needs count and edition placeholders: ${edition.language}`);
    }
    for (const field of ["label", "languageName", "appName"]) {
      if (typeof edition[field] !== "string" || !edition[field].trim()) {
        throw new Error(`Missing SEO edition ${field}: ${id}`);
      }
    }
    if (!["ltr", "rtl"].includes(edition.direction)) {
      throw new Error(`Invalid SEO edition text direction: ${id}`);
    }
    if (!Array.isArray(edition.accentColors) || edition.accentColors.length < 2
      || ![edition.accentColor, ...edition.accentColors].every((color) => /^#[\da-f]{6}$/i.test(color))) {
      throw new Error(`SEO edition palette needs valid colors and at least two stops: ${id}`);
    }
  }
  const editionPages = Object.values(editions).map((edition) => ({
    path: `/editions/${edition.routeSegment}/`,
    output: new URL(`editions/${edition.routeSegment}/index.html`, projectRoot),
    html: renderEditionPage(edition, editions, locales),
  }));
  editionPages.unshift({
    path: "/editions/",
    output: new URL("editions/index.html", projectRoot),
    html: renderCollectionPage(editions, locales),
  });

  const studiesDirectory = new URL("studies/", projectRoot);
  const studies = (await readdir(studiesDirectory))
    .filter((name) => name.endsWith(".html"))
    .sort()
    .map((name) => `/studies/${name}`);
  const sitemapPaths = ["/", "/about", ...editionPages.map(({ path }) => path), ...studies];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPaths.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`).join("\n")}
</urlset>
`;

  const redirectsUrl = new URL("_redirects", projectRoot);
  const redirects = await readFile(redirectsUrl, "utf8");
  const generatedRoutes = [
    "# BEGIN GENERATED EDITION ROUTES",
    "/editions /editions/index.html 200!",
    "/editions/ /editions/index.html 200!",
    ...Object.values(editions).flatMap(({ routeSegment }) => [
      `/editions/${routeSegment} /editions/${routeSegment}/index.html 200`,
      `/editions/${routeSegment}/ /editions/${routeSegment}/index.html 200`,
    ]),
    "# END GENERATED EDITION ROUTES",
  ].join("\n");
  const routeBlock = /# BEGIN GENERATED EDITION ROUTES[\s\S]*?# END GENERATED EDITION ROUTES/;
  if (!routeBlock.test(redirects)) throw new Error("Missing generated edition route markers in _redirects");
  const readerRouteBlock = /# BEGIN GENERATED READER ROUTES[\s\S]*?# END GENERATED READER ROUTES/;
  if (!readerRouteBlock.test(redirects)) throw new Error("Missing generated reader route markers in _redirects");
  const readerRoutes = [
    "# BEGIN GENERATED READER ROUTES",
    ...Object.values(editions).map(({ routeSegment }) => `/${routeSegment}/b/*  /index.html  200`),
    "# END GENERATED READER ROUTES",
  ].join("\n");

  const aboutUrl = new URL("about.html", projectRoot);
  let about = await readFile(aboutUrl, "utf8");
  const summary = getEditionSummary(locales.en, "en", editions);
  for (const key of ["editionsTitle", "editionsCopy"]) {
    const pattern = new RegExp(`(<(?:h3|p) data-about="${key}">)[\\s\\S]*?(</(?:h3|p)>)`);
    if (!pattern.test(about)) throw new Error(`Missing About edition summary: ${key}`);
    about = about.replace(pattern, (_, open, close) => `${open}${escapeHtml(summary[key])}${close}`);
  }
  const languageMenuPattern = /(<div\s+id="about-language-options"[\s\S]*?>)[\s\S]*?(<\/div>)/;
  if (!languageMenuPattern.test(about)) throw new Error("Missing About language menu");
  const languages = new Map(Object.values(editions).map((edition) => [edition.language, edition]));
  const options = [...languages.values()].map(({ language, languageName, direction }) =>
    `            <button type="button" class="language-option" role="option" data-language="${language}" lang="${language}" dir="${direction}" aria-selected="${language === "en"}">${escapeHtml(languageName)}</button>`,
  ).join("\n");
  about = about.replace(languageMenuPattern, (_, open, close) => `${open}\n${options}\n          ${close}`);

  await Promise.all([
    ...editionPages.map(async ({ output, html }) => {
      await mkdir(new URL("./", output), { recursive: true });
      await writeFile(output, html);
    }),
    writeFile(new URL("sitemap.xml", projectRoot), sitemap),
    writeFile(redirectsUrl, redirects.replace(routeBlock, generatedRoutes).replace(readerRouteBlock, readerRoutes)),
    writeFile(aboutUrl, about),
  ]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildSeoPages();
}
