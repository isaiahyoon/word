import { ABOUT_LOCALES } from "../js/about-locales.mjs";
import { expect, test } from "./support/browser-test.mjs";

const localizedHeadings = {
  en: "A quiet place to meet the text.",
  ko: "말씀을 만나는 고요한 자리.",
  it: "Un luogo quieto per incontrare il testo.",
  de: "Ein stiller Ort, um dem Text zu begegnen.",
  ja: "みことばと向き合う静かな場所。",
  fr: "Un lieu paisible pour rencontrer le texte.",
  es: "Un lugar tranquilo para encontrarse con el texto.",
};

test("localizes About page content, metadata, and accessible names", async ({ page }) => {
  for (const [language, locale] of Object.entries(ABOUT_LOCALES)) {
    await page.goto(`/about?lang=${language}`);

    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page).toHaveTitle(locale.pageTitle);
    await expect(page.locator("#page-title")).toHaveText(localizedHeadings[language]);
    await expect(page.locator("#about-language")).toHaveAttribute("aria-label", locale.languageLabel);
    await expect(page.locator(".brand")).toHaveAttribute("aria-label", locale.brandHome);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", locale.metaDescription);
    await expect(page.locator(".return-link")).toHaveText(`${locale.returnToReading} →`);

    const missingTranslations = await page.locator("[data-about]").evaluateAll((elements, strings) =>
      elements.filter((element) => !strings[element.dataset.about]).map((element) => element.dataset.about),
      locale,
    );
    expect(missingTranslations).toEqual([]);
  }
});

test("uses the saved reader edition and keeps an explicit About language in the URL", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("the-word.reader-state.v1:/", JSON.stringify({
      version: 1,
      editionId: "rv1865",
    }));
  });
  await page.goto("/about/");

  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page).toHaveTitle(ABOUT_LOCALES.es.pageTitle);

  await page.locator("#about-language").selectOption("ko");

  await expect(page).toHaveURL(/\/about\/\?lang=ko$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.locator("#page-title")).toHaveText(localizedHeadings.ko);
});

test("keeps the About layout within mobile viewports and gives feature cards a gentle hover lift", async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/about?lang=de");

    await expect(page.locator(".feature-card")).toHaveCount(4);
    expect(await page.locator("html").evaluate((element) => element.scrollWidth))
      .toBeLessThanOrEqual(viewport.width);
  }

  const firstCard = page.locator(".feature-card").first();
  const borderBackgrounds = await page.locator(".card-mark").evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).backgroundImage),
  );
  expect(borderBackgrounds).toHaveLength(4);
  for (const borderBackground of borderBackgrounds) {
    expect(borderBackground.match(/linear-gradient/g)).toHaveLength(2);
  }

  await firstCard.hover();
  await expect.poll(() => firstCard.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe("none");
});
