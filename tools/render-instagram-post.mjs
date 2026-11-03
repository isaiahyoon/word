import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const layouts = new Set(["single", "rows", "device"]);

export async function createUniqueOutputDirectory(outputRoot, campaign, date = new Date()) {
  if (!/^[a-z0-9-]+$/.test(campaign)) {
    throw new TypeError("Campaign names may contain lowercase letters, numbers, and hyphens.");
  }

  await mkdir(outputRoot, { recursive: true });
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  return mkdtemp(join(outputRoot, `${campaign}-${timestamp}-`));
}

function validateConfig(config) {
  if (!config.name || !/^[a-z0-9-]+$/.test(config.name)) {
    throw new TypeError("Config needs a lowercase campaign name.");
  }
  if (!config.baseUrl || !Array.isArray(config.slides) || !config.slides.length) {
    throw new TypeError("Config needs a baseUrl and at least one slide.");
  }
  if (!config.captures || !Object.keys(config.captures).length) {
    throw new TypeError("Config needs at least one named browser capture.");
  }

  for (const [id, capture] of Object.entries(config.captures)) {
    if (!capture.route || !capture.selector) {
      throw new TypeError(`Capture "${id}" needs a route and selector.`);
    }
  }

  for (const slide of config.slides) {
    if (!layouts.has(slide.layout) || !slide.file || basename(slide.file) !== slide.file) {
      throw new TypeError("Each slide needs a supported layout and a filename.");
    }
    if (!slide.file.endsWith(".jpg") || !config.palettes?.[slide.palette]) {
      throw new TypeError(`Slide "${slide.file}" needs a JPG filename and a known palette.`);
    }
    if (slide.layout === "single" && !config.captures[slide.capture]) {
      throw new TypeError(`Slide "${slide.file}" references an unknown capture.`);
    }
    if (slide.layout === "rows" && (!slide.captures?.length || slide.captures.some((row) =>
      !row.label || !config.captures[row.capture]))) {
      throw new TypeError(`Slide "${slide.file}" needs labeled, valid captures.`);
    }
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function slideStyles(palette) {
  return `
    *{box-sizing:border-box}
    html,body{margin:0;width:1080px;height:1350px}
    body{font-family:"DM Sans",sans-serif;color:${palette.ink}}
    .poster{position:relative;width:1080px;height:1350px;overflow:hidden;padding:58px 62px;background:radial-gradient(ellipse at 92% 10%,${palette.wash} 0,transparent 42%),${palette.bg}}
    .frame{position:absolute;inset:18px;border:1px solid ${palette.line};pointer-events:none}
    .frame:after{content:"";position:absolute;inset:7px;border:1px solid ${palette.line};opacity:.42}
    .header{height:45px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1}
    .identity{display:flex;align-items:center;gap:15px;font-size:14px;font-weight:700;letter-spacing:2px}
    .identity img{width:37px;height:37px;border-radius:8px}
    .count{font-size:13px;letter-spacing:2px;opacity:.72}
    .main{position:absolute;left:62px;right:62px;top:270px}
    .eyebrow{display:flex;align-items:center;gap:15px;color:${palette.accent};font-size:14px;letter-spacing:2px;font-weight:700;margin-bottom:26px}
    .eyebrow:before{content:"";width:36px;height:1px;background:${palette.accent}}
    h1{font-family:"Cormorant Garamond",Georgia,serif;font-size:75px;line-height:.98;font-weight:500;white-space:pre-line;margin:0 0 23px}
    .bodycopy{font-size:20px;line-height:1.55;max-width:730px;margin:0;opacity:.8}
    .decorated{position:relative;background:${palette.wash};border:1px solid ${palette.line};box-shadow:inset 0 0 0 5px ${palette.wash},inset 0 0 0 6px ${palette.line},0 12px 30px #172f3214}
    .decorated:before{content:"";position:absolute;inset:10px;border:1px solid ${palette.line};opacity:.5;pointer-events:none}
    .decorated:after{content:"";position:absolute;inset:6px;pointer-events:none;background:linear-gradient(${palette.accent},${palette.accent}) left top/26px 2px no-repeat,linear-gradient(${palette.accent},${palette.accent}) left top/2px 26px no-repeat,linear-gradient(${palette.accent},${palette.accent}) right top/26px 2px no-repeat,linear-gradient(${palette.accent},${palette.accent}) right top/2px 26px no-repeat,linear-gradient(${palette.accent},${palette.accent}) left bottom/26px 2px no-repeat,linear-gradient(${palette.accent},${palette.accent}) left bottom/2px 26px no-repeat,linear-gradient(${palette.accent},${palette.accent}) right bottom/26px 2px no-repeat,linear-gradient(${palette.accent},${palette.accent}) right bottom/2px 26px no-repeat}
    .single{margin:38px auto 0;width:810px;padding:26px;background:linear-gradient(140deg,${palette.wash},${palette.bg})}
    .single img{position:relative;z-index:1;display:block;width:100%;height:auto}
    .note{font-size:17px;line-height:1.5;opacity:.8;margin:22px 0 0}
    .rows{margin-top:30px;display:grid;gap:15px}
    .row{height:140px;padding:15px 20px;display:grid;grid-template-columns:190px minmax(0,1fr);align-items:center;gap:20px}
    .row label{font-size:12px;font-weight:700;letter-spacing:1.2px;color:${palette.accent}}
    .row img{position:relative;z-index:1;display:block;width:100%;max-height:105px;object-fit:contain;object-position:right center}
    .device{margin:42px auto 0;width:700px;height:390px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
    .rings{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:340px;height:340px;border:1px solid ${palette.line};border-radius:50%;opacity:.42}
    .rings:after{content:"";position:absolute;inset:34px;border:1px solid ${palette.line};border-radius:50%;opacity:.8}
    .device-screen{width:310px;height:250px;position:relative;z-index:1;border:1px solid ${palette.line};background:${palette.bg};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}
    .device-screen img{width:92px;height:92px;border-radius:20px}
    .device-screen span{font-size:16px;font-weight:700;letter-spacing:2px}
    .device-screen small{font-size:10px;letter-spacing:1.5px;opacity:.7}
    .device-footer{position:absolute;bottom:18px;left:0;right:0;z-index:2;display:flex;align-items:center;justify-content:center;gap:17px;font-size:12px;letter-spacing:1.5px;color:${palette.accent};font-weight:700}
    .device-footer i{display:block;width:4px;height:4px;border-radius:50%;background:${palette.line}}
    .footer{position:absolute;bottom:62px;left:62px;right:62px;padding-top:15px;border-top:1px solid ${palette.line};display:flex;justify-content:space-between;font-size:12px;letter-spacing:1.5px;opacity:.75}
    .footer span:last-child{text-align:right}
  `;
}

function slideContent(slide, images, brandIcon) {
  if (slide.layout === "single") {
    return `<div class="decorated single"><img src="${images[slide.capture]}" /></div>`;
  }
  if (slide.layout === "rows") {
    const rows = slide.captures.map(({ capture, label }) =>
      `<div class="decorated row"><label>${escapeHtml(label)}</label><img src="${images[capture]}" /></div>`).join("");
    return `<div class="rows">${rows}</div>`;
  }

  return `<div class="decorated device"><div class="rings"></div><div class="device-screen"><img src="${brandIcon}" /><span>THE WORD</span><small>SCRIPTURE · SAVED HERE</small></div><div class="device-footer"><span>NO ACCOUNT</span><i></i><span>NO SYNC</span><i></i><span>YOUR DEVICE</span></div></div>`;
}

function slideDocument(config, slide, index, images, brandIcon) {
  const palette = config.palettes[slide.palette];
  const note = slide.note ? `<p class="note">${escapeHtml(slide.note)}</p>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><style>${slideStyles(palette)}</style></head><body><div class="poster"><div class="frame"></div><header class="header"><div class="identity"><img src="${brandIcon}" /><span>THE WORD</span></div><span class="count">${String(index + 1).padStart(2, "0")} / ${String(config.slides.length).padStart(2, "0")}</span></header><main class="main"><div class="eyebrow">${escapeHtml(slide.eyebrow)}</div><h1>${escapeHtml(slide.title)}</h1><p class="bodycopy">${escapeHtml(slide.body)}</p>${slideContent(slide, images, brandIcon)}${note}</main><footer class="footer"><span>THE AMAZING WORD</span><span>${escapeHtml(slide.footer ?? "SCRIPTURE · WHEREVER THE DAY TAKES YOU")}</span></footer></div></body></html>`;
}

export async function renderPost(configPath) {
  const absoluteConfigPath = resolve(configPath);
  const config = JSON.parse(await readFile(absoluteConfigPath, "utf8"));
  validateConfig(config);

  const browser = await chromium.launch({ headless: true });
  try {
    const capturePage = await browser.newPage({
      viewport: config.captureViewport ?? { width: 1440, height: 1100 },
      deviceScaleFactor: config.captureScale ?? 5,
    });
    const images = {};
    let activeRoute;
    for (const [id, capture] of Object.entries(config.captures)) {
      if (capture.route !== activeRoute) {
        await capturePage.goto(new URL(capture.route, config.baseUrl).href, { waitUntil: "domcontentloaded" });
        await capturePage.locator("#edition-offline:not([hidden])").waitFor({ state: "visible" });
        await capturePage.evaluate(() => document.fonts.ready);
        activeRoute = capture.route;
      }
      const screenshot = await capturePage.locator(capture.selector).screenshot({ animations: "disabled" });
      images[id] = `data:image/png;base64,${screenshot.toString("base64")}`;
    }

    const iconPath = resolve(projectRoot, config.brandIcon ?? "assets/app-icon-1024.png");
    const brandIcon = `data:image/png;base64,${(await readFile(iconPath)).toString("base64")}`;
    const outputRoot = resolve(projectRoot, config.outputDirectory ?? dirname(absoluteConfigPath));
    const outputDirectory = await createUniqueOutputDirectory(outputRoot, config.name);
    const designPage = await browser.newPage({
      viewport: { width: 1080, height: 1350 },
      deviceScaleFactor: 2,
    });

    for (const [index, slide] of config.slides.entries()) {
      await designPage.setContent(slideDocument(config, slide, index, images, brandIcon), {
        waitUntil: "domcontentloaded",
      });
      await designPage.evaluate(() => document.fonts.ready);
      await designPage.screenshot({
        path: join(outputDirectory, slide.file),
        type: "jpeg",
        quality: config.jpegQuality ?? 94,
      });
    }
    return outputDirectory;
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) {
    console.error("Usage: node tools/render-instagram-post.mjs <post-config.json>");
    process.exitCode = 2;
  } else {
    try {
      console.log(`Created Instagram slides in ${await renderPost(process.argv[2])}`);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}