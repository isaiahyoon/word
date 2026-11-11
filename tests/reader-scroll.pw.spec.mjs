import { expect, test } from "./support/browser-test.mjs";
import { EDITIONS, EDITION_IDS } from "../js/editions.mjs";

test.use({ serviceWorkers: "block" });

for (const width of [1440, 390]) {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    test(`edition and verse hotkeys never detour to the page top at ${width}px with ${reducedMotion}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/kjv/b/psalms/c/119/v/80");
      await expect(page.locator("#verse-80")).toHaveClass(/is-focused/);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await page.locator("#verse-80").evaluate((row) => row.scrollIntoView({ block: "center", behavior: "instant" }));
      await page.emulateMedia({ reducedMotion });

      for (const editionId of [...EDITION_IDS.slice(1), "kjv"]) {
        await page.evaluate(() => {
          const probe = { samples: [window.scrollY], running: true };
          window.scrollProbe = probe;
          const sample = () => {
            probe.samples.push(window.scrollY);
            if (probe.running) requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        });
        await page.keyboard.press("Tab");
        await expect(page).toHaveURL(new RegExp(`/${EDITIONS[editionId].routeSegment}/b/psalms/c/119/v/80$`));
        await expect(page.locator("#verse-list")).not.toHaveAttribute("aria-busy", "true");
        await expect(page.locator("#verse-80")).toHaveClass(/is-focused/);
        await page.locator("#reader").evaluate(async (reader) => {
          await Promise.all(reader.getAnimations().map((animation) => animation.finished));
        });
        for (const [key, verse] of [["ArrowDown", 81], ["ArrowUp", 80]]) {
          await page.keyboard.press(key);
          await expect(page).toHaveURL(new RegExp(`/v/${verse}$`));
          await expect(page.locator(`#verse-${verse}`)).toBeInViewport({ ratio: 1 });
          await page.evaluate(() => new Promise((resolve) => {
            let previous = window.scrollY;
            let stableFrames = 0;
            const settled = () => {
              stableFrames = Math.abs(window.scrollY - previous) < 1 ? stableFrames + 1 : 0;
              previous = window.scrollY;
              if (stableFrames >= 3) resolve();
              else requestAnimationFrame(settled);
            };
            requestAnimationFrame(settled);
          }));
        }
        const scroll = await page.evaluate(() => {
          const probe = window.scrollProbe;
          probe.running = false;
          return {
            minimum: Math.min(...probe.samples),
            maximum: Math.max(...probe.samples),
            start: probe.samples[0],
            end: window.scrollY,
          };
        });
        expect(scroll.minimum).toBeGreaterThanOrEqual(Math.min(scroll.start, scroll.end) - 100);
        expect(scroll.maximum).toBeLessThanOrEqual(Math.max(scroll.start, scroll.end) + 200);
      }
    });
  }
}

test("keeps the previous chapter visible while an edition downloads", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/kjv/b/psalms/c/119/v/80");
  await expect(page.locator("#verse-80")).toHaveClass(/is-focused/);
  await page.locator("#verse-80").evaluate((row) => row.scrollIntoView({ block: "center", behavior: "instant" }));
  let releaseDownload;
  const download = new Promise((resolve) => { releaseDownload = resolve; });
  let requested;
  const requestStarted = new Promise((resolve) => { requested = resolve; });
  await page.route("**/scripture/krv/books/*psalms*.json", async (route) => {
    requested();
    await download;
    await route.continue();
  });
  try {
    await page.keyboard.press("Tab");
    await requestStarted;
    await expect(page.locator("#verse-80")).toHaveClass(/is-focused/);
    await expect(page.locator("#verse-80")).toBeInViewport();
    await expect(page.locator("#verse-list")).toHaveAttribute("lang", "en");
  } finally {
    releaseDownload();
  }
  await expect(page).toHaveURL(/\/krv\/b\/psalms\/c\/119\/v\/80$/);
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "ko");
});

test("a failed edition download preserves the visible passage and verse hotkeys", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/kjv/b/psalms/c/119/v/80");
  await expect(page.locator("#verse-80")).toHaveClass(/is-focused/);
  await page.route("**/scripture/krv/books/*psalms*.json", (route) => route.abort());
  await page.keyboard.press("Tab");
  await expect(page.locator("#edition-notice")).toBeVisible();
  await expect(page.locator("#verse-list")).not.toHaveAttribute("aria-busy", "true");
  await expect(page.locator("#verse-80")).toBeInViewport();
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "en");
  await page.keyboard.press("ArrowDown");
  await expect(page).toHaveURL(/\/kjv\/b\/psalms\/c\/119\/v\/81$/);
  await expect(page.locator("#verse-81")).toBeInViewport();
});

test("positions replacement text only after its font metrics are ready", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/kjv/b/psalms/c/119/v/80");
  await expect(page.locator("#verse-80")).toHaveClass(/is-focused/);
  await page.evaluate(() => {
    const original = document.fonts.load;
    let release;
    const ready = new Promise((resolve) => { release = resolve; });
    window.fontLoadStarted = false;
    window.originalVerse = document.querySelector("#verse-80");
    document.fonts.load = function (...args) {
      window.fontLoadStarted = true;
      return ready.then(() => original.apply(this, args));
    };
    window.releaseReaderFont = () => {
      document.fonts.load = original;
      document.querySelector("#verse-list").style.setProperty("--type-reading", "24px");
      release();
    };
  });
  try {
    await page.keyboard.press("Tab");
    await expect.poll(() => page.evaluate(() => window.fontLoadStarted)).toBe(true);
    expect(await page.evaluate(() => window.originalVerse.isConnected)).toBe(true);
    await expect(page).toHaveURL(/\/kjv\/b\/psalms\/c\/119\/v\/80$/);
  } finally {
    await page.evaluate(() => window.releaseReaderFont());
  }
  await expect(page).toHaveURL(/\/krv\/b\/psalms\/c\/119\/v\/80$/);
  await expect(page.locator("#verse-80")).toBeInViewport({ ratio: 1 });
  await expect.poll(() => page.locator("#verse-80").evaluate((row) => {
    const bounds = row.getBoundingClientRect();
    return Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
  })).toBeLessThan(32);
});
