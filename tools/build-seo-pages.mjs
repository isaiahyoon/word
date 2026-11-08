import { mkdir, readdir, writeFile } from "node:fs/promises";
import { ABOUT_LOCALES } from "../js/about-locales.mjs";
import { EDITIONS } from "../js/editions.mjs";

const root = new URL("../", import.meta.url);
const siteUrl = "https://theamazingword.org";
const previewImage = `${siteUrl}/assets/social-preview.png`;
const editionSearchDetails = {
  kjv: {
    heading: "King James Version",
    title: "King James Version Bible Online | The Amazing Word",
    description: "Read the King James Version online in a free Bible reader. Search by phrase or reference, open direct passage links, and read at your own pace.",
  },
  krv: {
    heading: "개역한글 1961 성경",
    title: "개역한글 1961 온라인 성경 읽기 | 놀라운 말씀",
    description: "무료 성경 읽기 서비스에서 개역한글 1961을 읽어 보세요. 구절과 장절을 검색하고 직접 링크로 이동하며 편안한 속도로 읽을 수 있습니다.",
  },
  diodati: {
    heading: "Bibbia Giovanni Diodati (1649)",
    title: "Bibbia Giovanni Diodati 1649 online | La Parola Meravigliosa",
    description: "Leggi online la Bibbia di Giovanni Diodati del 1649. Cerca parole o riferimenti, apri link diretti ai passi e leggi al tuo ritmo.",
  },
  luther1912: {
    heading: "Lutherbibel (1912)",
    title: "Lutherbibel 1912 online lesen | Das Wunderbare Wort",
    description: "Lies die Lutherbibel von 1912 kostenlos online. Suche nach Wörtern oder Bibelstellen, öffne direkte Verslinks und lies in deinem Tempo.",
  },
  japbungo: {
    heading: "文語訳聖書",
    title: "文語訳聖書をオンラインで読む | 驚くべき御言葉",
    description: "文語訳聖書を無料でオンラインで読めます。語句や聖書箇所を検索し、聖句への直接リンクから自分のペースで読み進められます。",
  },
  martin1744: {
    heading: "Bible de David Martin (1744)",
    title: "Bible de David Martin 1744 en ligne | La Parole Merveilleuse",
    description: "Lisez gratuitement la Bible de David Martin de 1744 en ligne. Recherchez des mots ou des références, ouvrez des liens directs et lisez à votre rythme.",
  },
  rv1865: {
    heading: "Reina-Valera 1865",
    title: "Biblia Reina-Valera 1865 en línea | La Palabra Asombrosa",
    description: "Lee gratis la Biblia Reina-Valera 1865 en línea. Busca palabras o referencias, abre enlaces directos a los pasajes y lee a tu ritmo.",
  },
  alm1911: {
    heading: "Bíblia Almeida 1911",
    title: "Bíblia Almeida 1911 online | A Palavra Maravilhosa",
    description: "Leia a Bíblia Almeida 1911 gratuitamente online. Pesquise palavras ou referências, abra links diretos para passagens e leia no seu ritmo.",
  },
};

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

function renderEditionPage(edition) {
  const { heading, title, description } = editionSearchDetails[edition.id];
  const locale = ABOUT_LOCALES[edition.language];
  const canonicalUrl = `${siteUrl}/editions/${edition.routeSegment}/`;
  const readerUrl = `/${edition.routeSegment}/b/genesis/c/1/v/1`;
  const language = escapeHtml(edition.language);
  const themeColor = escapeHtml(edition.themeColor ?? "#f6f4f9");
  const escapedTitle = escapeHtml(title);
  const escapedHeading = escapeHtml(heading);
  const escapedDescription = escapeHtml(description);
  const escapedAppName = escapeHtml(edition.appName);

  return `<!doctype html>
<html lang="${language}" dir="${edition.direction}">
  <head>
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
  </head>
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
          <nav class="edition-directory" aria-label="${escapeHtml(locale.editionsTitle)}">
            <ol>
${Object.values(EDITIONS).map((otherEdition, index) => `              <li><a href="/editions/${escapeHtml(otherEdition.routeSegment)}/" style="${escapeHtml(editionLinkStyle(otherEdition))}"><span class="edition-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><span class="edition-name">${escapeHtml(otherEdition.label)}</span><span class="edition-arrow" aria-hidden="true">↗</span></a></li>`).join("\n")}
            </ol>
          </nav>
        </section>
      </main>

      <footer class="about-footer">
        <span>${escapeHtml(locale.footerBrand)}</span>
        <a href="/about">${escapeHtml(locale.pageTitle)}</a>
      </footer>
    </div>
  </body>
</html>
`;
}

const editionPages = Object.values(EDITIONS).map((edition) => ({
  path: `/editions/${edition.routeSegment}/`,
  output: new URL(`editions/${edition.routeSegment}/index.html`, root),
  html: renderEditionPage(edition),
}));

await Promise.all(editionPages.map(async ({ output, html }) => {
  await mkdir(new URL("./", output), { recursive: true });
  await writeFile(output, html);
}));

const studiesDirectory = new URL("studies/", root);
const studies = (await readdir(studiesDirectory))
  .filter((name) => name.endsWith(".html"))
  .sort()
  .map((name) => `/studies/${name}`);
const sitemapPaths = [
  "/",
  "/about",
  ...editionPages.map(({ path }) => path),
  ...studies,
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPaths.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`).join("\n")}
</urlset>
`;

await writeFile(new URL("sitemap.xml", root), sitemap);
