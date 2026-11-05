import { ABOUT_LOCALES } from "../js/about-locales.mjs";
import { EDITIONS } from "../js/editions.mjs";
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
    await expect(page.locator(".install-language-options legend")).toHaveText(locale.installLanguageTitle);
    await expect(page.locator(".install-language-intro")).toHaveText(locale.installLanguageIntro);
    await expect(page.locator(".install-language-submit")).toHaveText(locale.installLanguageContinue);
    await expect(page.locator(".install-language-option")).toHaveCount(Object.keys(EDITIONS).length);
    for (const edition of Object.values(EDITIONS)) {
      await expect(page.locator(`.install-language-option input[value="${edition.id}"] + span`))
        .toHaveAttribute("lang", edition.language);
      await expect(page.locator(`.install-language-option input[value="${edition.id}"] + span`))
        .toHaveText(edition.languageName);
    }
    await expect(page.locator('[data-about="ethosCopyOne"]')).toHaveText(locale.ethosCopyOne);
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

test("saves the chosen install language and opens the reader in that edition", async ({ page }) => {
  await page.goto("/about?lang=en");

  await page.locator('input[name="install-language"][value="rv1865"]').check();
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = async () => {
      window.installPromptRequested = true;
    };
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: ABOUT_LOCALES.en.installLanguageContinue }).click();

  await expect(page.locator("#install-language-status")).toHaveText(ABOUT_LOCALES.en.installLanguageSaved);
  await expect.poll(() => page.evaluate(() => window.installPromptRequested)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("the-word.default-edition.v1")))
    .toBe("rv1865");

  await page.goto("/");
  await expect(page.locator("#verse-1")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator("#edition-select-label")).toContainText("Reina-Valera · Español");

  await page.locator("#edition-select").click();
  await page.locator('#edition-options [data-edition="krv"]').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("the-word.default-edition.v1")))
    .toBe("krv");
});

test("saves the install language when the browser uses manual installation steps", async ({ page }) => {
  await page.goto("/about?lang=fr");
  await page.locator('input[name="install-language"][value="japbungo"]').check();
  await page.getByRole("button", { name: ABOUT_LOCALES.fr.installLanguageContinue }).click();

  await expect(page.locator("#install-language-status"))
    .toHaveText(ABOUT_LOCALES.fr.installLanguageSaved);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("the-word.default-edition.v1")))
    .toBe("japbungo");
});

test("supports keyboard selection of the default install language", async ({ page }) => {
  await page.goto("/about");
  const english = page.locator('.install-language-option input[value="kjv"]');
  const korean = page.locator('.install-language-option input[value="krv"]');

  await english.focus();
  await english.press("ArrowRight");
  await expect(korean).toBeFocused();
  await expect(korean).toBeChecked();
});

test("keeps sans-serif body copy and localized display typefaces on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const expectedFonts = { ko: "Noto Serif KR", it: "Cormorant Garamond", ja: "Noto Serif JP", fr: "EB Garamond", es: "Petrona", de: "Gelasio" };
  const expectedInterfaceFonts = { ko: "Noto Sans KR", it: "DM Sans", ja: "Noto Sans JP", fr: "DM Sans", es: "DM Sans", de: "DM Sans" };

  for (const [language, font] of Object.entries(expectedFonts)) {
    await page.goto(`/about?lang=${language}`);
    const fontFamily = await page.locator("#page-title").evaluate((element) => getComputedStyle(element).fontFamily);
    expect(fontFamily).toContain(font);
    const interfaceFontFamily = await page.locator("body").evaluate((element) => getComputedStyle(element).fontFamily);
    expect(interfaceFontFamily).toContain(expectedInterfaceFonts[language]);
  }
});

test("uses the saved reader edition and keeps an explicit About language in the URL", async ({ page }) => {
  await page.goto("/about/");

  for (const edition of Object.values(EDITIONS)) {
    await page.evaluate((editionId) => {
      window.localStorage.setItem("the-word.reader-state.v1:/", JSON.stringify({
        version: 1,
        editionId,
      }));
    }, edition.id);
    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("lang", edition.language);
    await expect(page).toHaveTitle(ABOUT_LOCALES[edition.language].pageTitle);
    await expect(page.locator('[data-about="ethosCopyOne"]'))
      .toHaveText(ABOUT_LOCALES[edition.language].ethosCopyOne);
  }

  await page.locator("#about-language").click();
  await page.getByRole("option", { name: "한국어" }).click();

  await expect(page).toHaveURL(/\/about\/\?lang=ko$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.locator("#page-title")).toHaveText(localizedHeadings.ko);
});

test("keeps About controls clear of each other and the viewport across mobile and desktop", async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 360, height: 780 },
    { width: 390, height: 844 },
    { width: 700, height: 900 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/about?lang=ko");

    await expect(page.locator(".feature-card")).toHaveCount(4);
    await expect(page.locator("#install-language-form")).toBeVisible();
    expect(await page.locator("html").evaluate((element) => element.scrollWidth))
      .toBeLessThanOrEqual(viewport.width);
    const featureColumnCount = await page.locator(".feature-grid")
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    expect(featureColumnCount).toBe(viewport.width <= 640 ? 1 : 2);

    const headerLayout = await page.evaluate(() => {
      const bounds = (selector) => {
        const { x, y, right, bottom, height } = document.querySelector(selector).getBoundingClientRect();
        return { x, y, right, bottom, height };
      };
      return {
        brand: bounds(".brand"),
        language: bounds(".language-control"),
        returnLink: bounds(".return-link"),
      };
    });

    if (viewport.width <= 640) {
      expect(headerLayout.brand.right).toBeLessThanOrEqual(headerLayout.language.x);
      expect(headerLayout.brand.bottom).toBeLessThanOrEqual(headerLayout.returnLink.y);
      expect(headerLayout.language.bottom).toBeLessThanOrEqual(headerLayout.returnLink.y);
      await expect(page.locator("#about-language")).toHaveCSS("min-height", "44px");
      const currentLanguageHeight = await page.locator(".language-current")
        .evaluate((element) => element.getBoundingClientRect().height);
      expect(currentLanguageHeight).toBeLessThanOrEqual(20);
      expect(headerLayout.returnLink.bottom - headerLayout.returnLink.y).toBeGreaterThanOrEqual(42);
    } else {
      expect(headerLayout.brand.right).toBeLessThanOrEqual(headerLayout.language.x);
      expect(headerLayout.language.right).toBeLessThanOrEqual(headerLayout.returnLink.x);
      const verticalCenter = ({ y, height }) => y + height / 2;
      expect(Math.abs(verticalCenter(headerLayout.brand) - verticalCenter(headerLayout.language))).toBeLessThanOrEqual(1);
      expect(Math.abs(verticalCenter(headerLayout.language) - verticalCenter(headerLayout.returnLink))).toBeLessThanOrEqual(1);
    }

    await page.locator("#about-language").click();
    const languageMenu = page.locator("#about-language-options");
    const languageTrigger = page.locator("#about-language");
    await expect(languageMenu).toBeVisible();
    const menuBounds = await languageMenu.boundingBox();
    expect(menuBounds).not.toBeNull();
    expect(menuBounds.x).toBeGreaterThanOrEqual(0);
    expect(menuBounds.x + menuBounds.width).toBeLessThanOrEqual(viewport.width);
    await expect(languageMenu).toHaveCSS("background-color", "rgb(255, 253, 249)");
    await expect(languageMenu).toHaveCSS("box-shadow", /rgba/);
    await expect(languageMenu.locator('[data-language="de"]')).toHaveCSS("min-height", "40px");
    await expect(languageTrigger).toHaveCSS("border-color", "rgb(127, 157, 184)");
    await expect(languageTrigger).toHaveCSS("background-image", /rgb\(190, 216, 234\)/);
    await expect(languageMenu.locator('[data-language="ko"]')).toHaveCSS("background-image", /rgb\(190, 216, 234\)/);
    await page.locator("#about-language").click();
    await expect(languageMenu).toBeHidden();

    const installBounds = await page.locator("#install-language-form").boundingBox();
    expect(installBounds).not.toBeNull();
    expect(installBounds.x).toBeGreaterThanOrEqual(0);
    expect(installBounds.x + installBounds.width).toBeLessThanOrEqual(viewport.width);
    const installButtonBounds = await page.locator(".install-language-submit").boundingBox();
    expect(installButtonBounds).not.toBeNull();
    expect(Math.abs(
      installButtonBounds.x + installButtonBounds.width / 2 -
      (installBounds.x + installBounds.width / 2),
    )).toBeLessThanOrEqual(1);
    await page.locator('input[name="install-language"][value="kjv"]').check();
    await expect(page.locator('label.install-language-option:has(input[value="kjv"])'))
      .toHaveCSS("background-image", /linear-gradient/);
    await expect(page.locator('label.install-language-option:has(input[value="kjv"])'))
      .toHaveCSS("border-color", "rgba(127, 157, 184, 0.75)");
  }

  const firstCard = page.locator(".feature-card").first();
  const borderBackgrounds = await page.locator(".card-mark").evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).backgroundImage),
  );
  expect(borderBackgrounds).toHaveLength(4);
  for (const borderBackground of borderBackgrounds) {
    expect(borderBackground.match(/linear-gradient/g)).toHaveLength(2);
  }

  const ethosSection = page.locator(".ethos-section");
  await expect(ethosSection).toHaveCSS("border-radius", "12px");
  await expect(ethosSection).toHaveCSS("box-shadow", /rgba/);
  const ethosCopySizes = await ethosSection.locator("p:not(.eyebrow)").evaluateAll((elements) =>
    elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  );
  expect(ethosCopySizes[0]).toBeGreaterThan(ethosCopySizes[1]);

  const openReaderLink = page.locator(".primary-link");
  await expect(openReaderLink).toHaveCSS("min-height", "48px");
  await expect(openReaderLink).toHaveCSS("border-color", "rgb(226, 195, 109)");
  await expect(openReaderLink).toHaveCSS("background-image", /linear-gradient/);
  await expect(openReaderLink).toHaveCSS("box-shadow", /rgb\(212, 184, 110\)/);

  await firstCard.hover();
  await expect.poll(() => firstCard.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe("none");

  const returnLink = page.locator(".return-link");
  await returnLink.hover();
  await expect(returnLink).toHaveCSS("background-image", /rgb\(190, 216, 234\)/);
  await expect(returnLink).toHaveCSS("border-color", "rgb(127, 157, 184)");
  await expect(returnLink).toHaveCSS("color", "rgb(52, 79, 104)");
  await expect(returnLink).toHaveCSS("box-shadow", /rgba/);
  await expect(page.locator("body")).toHaveCSS("background-image", /radial-gradient/);
  await expect(firstCard).toHaveCSS("background-image", /linear-gradient/);
});

test("supports keyboard navigation and selection in the styled language menu", async ({ page }) => {
  await page.goto("/about?lang=de");

  const trigger = page.locator("#about-language");
  const menu = page.getByRole("listbox", { name: ABOUT_LOCALES.de.languageLabel });
  await trigger.focus();
  await page.keyboard.press("Enter");

  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("option", { name: "Deutsch" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "日本語" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.getByRole("option", { name: "English" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: "Español" })).toBeFocused();
  await page.keyboard.press("Escape");

  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.click();
  await page.getByRole("option", { name: "한국어" }).click();

  await expect(page).toHaveURL(/\/about\?lang=ko$/);
  await expect(trigger).toContainText("한국어");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator('.language-option[data-language="ko"]')).toHaveAttribute("aria-selected", "true");
});
