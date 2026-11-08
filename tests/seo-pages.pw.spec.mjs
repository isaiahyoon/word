import { ABOUT_LOCALES } from "../js/about-locales.mjs";
import { EDITIONS } from "../js/editions.mjs";
import { expect, test } from "./support/browser-test.mjs";

const expectedEditionPalettes = {
  kjv: ["#7654a4", "#dcd7f7", "#7654a4"],
  krv: ["#4b7395", "#bed8ea", "#4b7395"],
  diodati: ["#a94f66", "#f3cada", "#a94f66"],
  luther1912: ["#8a6c22", "#fff1bd", "#b9534b"],
  japbungo: ["#5c7655", "#d6f2b9", "#5c7655"],
  martin1744: ["#405d75", "#dce8f8", "#f5d6e2"],
  rv1865: ["#4f6448", "#d5e5ce", "#9d7839", "#f2e7c7", "#4f6448"],
  alm1911: ["#a83f4b", "#e5d6a5", "#526553"],
};

test("edition landing pages render localized, responsive content and links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const edition of Object.values(EDITIONS)) {
    const path = `/editions/${edition.routeSegment}/`;
    await page.goto(path);

    await expect(page.locator("html")).toHaveAttribute("lang", edition.language);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("main")).toContainText(edition.label);
    await expect(page.locator(".feature-card").nth(1).locator("p"))
      .toHaveText(ABOUT_LOCALES[edition.language].carryCopy);
    await expect(page.locator(".feature-card").nth(1).locator(".card-mark"))
      .toHaveClass(/card-mark--lavender/);
    await expect(page.locator(".feature-card")).toHaveCount(4);
    await expect(page.locator(".feature-card").nth(3).locator("h3"))
      .toHaveText(ABOUT_LOCALES[edition.language].placeTitle);
    await expect(page.locator(".feature-card").nth(3).locator("p"))
      .toHaveText(ABOUT_LOCALES[edition.language].placeCopy);
    await expect(page.locator('a[href^="/' + edition.routeSegment + '/b/genesis/c/1/v/1"]'))
      .toHaveCount(2);
    await expect(page.locator(".edition-directory li")).toHaveCount(Object.keys(EDITIONS).length);
    await expect(page.locator(".edition-directory a")).toHaveCount(Object.keys(EDITIONS).length);

    const featureCard = page.locator(".feature-grid > .feature-card").first();
    await featureCard.hover();
    const hoverStyles = await featureCard.evaluate((card) => ({
      transform: getComputedStyle(card).transform,
      backgroundImage: getComputedStyle(card).backgroundImage,
      borderColor: getComputedStyle(card).borderTopColor,
      themeColor: getComputedStyle(document.body).getPropertyValue("--edition-theme-color").trim(),
    }));
    expect(hoverStyles.transform).not.toBe("none");
    expect(hoverStyles.backgroundImage).toContain("linear-gradient");
    expect(hoverStyles.themeColor).toBe(edition.themeColor ?? "#f6f4f9");
    expect(hoverStyles.borderColor).not.toBe("rgba(71, 72, 67, 0.12)");

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      gridColumns: getComputedStyle(document.querySelector(".edition-directory ol")).gridTemplateColumns,
      firstLinkHeight: document.querySelector(".edition-directory a").getBoundingClientRect().height,
      firstLinkBackground: getComputedStyle(document.querySelector(".edition-directory a")).backgroundColor,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    expect(dimensions.gridColumns.split(" ")).toHaveLength(1);
    expect(dimensions.firstLinkHeight).toBeGreaterThanOrEqual(56);
    expect(dimensions.firstLinkBackground).toBe("rgba(0, 0, 0, 0)");

    const directoryLinks = page.locator(".edition-directory a");
    for (const [index, targetEdition] of Object.values(EDITIONS).entries()) {
      const link = directoryLinks.nth(index);
      expect(targetEdition.accentColors).toEqual(expectedEditionPalettes[targetEdition.id]);
      await expect(link).toHaveAttribute("style", new RegExp(
        `--edition-link-accent: ${targetEdition.accentColor.replace("#", "\\#")};`,
      ));
      for (const color of targetEdition.accentColors) {
        await expect(link).toHaveAttribute("style", new RegExp(
          color.replace("#", "\\#"),
        ));
      }
      await link.hover();
      const expectedColor = `rgb(${targetEdition.accentColor.match(/[a-f\d]{2}/giu)
        .map((channel) => Number.parseInt(channel, 16))
        .join(", ")})`;
      await expect(link).toHaveCSS("color", expectedColor);
      await expect.poll(() => link.evaluate((element) => getComputedStyle(element).backgroundColor))
        .toBe("rgba(0, 0, 0, 0)");
      await expect.poll(() => link.evaluate((element) => getComputedStyle(element).backgroundImage))
        .toContain("linear-gradient");
      await expect.poll(() => link.evaluate((element) => getComputedStyle(element).boxShadow))
        .toContain("18px");
      await expect.poll(() => link.evaluate((element) => getComputedStyle(element).boxShadow))
        .toContain("26px");
      await expect(link.locator(".edition-arrow")).toHaveCSS("color", expectedColor);
    }
  }
});

test("edition directory is a restrained two-column list on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/editions/kjv/");

  const styles = await page.locator(".edition-directory ol").evaluate((list) => ({
    columns: getComputedStyle(list).gridTemplateColumns,
    itemHeights: [...list.querySelectorAll("a")].map((link) => link.getBoundingClientRect().height),
    itemBackgrounds: [...list.querySelectorAll("a")].map((link) => getComputedStyle(link).backgroundColor),
  }));
  expect(styles.columns.split(" ")).toHaveLength(2);
  expect(styles.itemHeights.every((height) => height >= 56 && height < 100)).toBe(true);
  expect(styles.itemBackgrounds.every((background) => background === "rgba(0, 0, 0, 0)")).toBe(true);

  await page.locator(".edition-directory a").first().focus();
  await expect(page.locator(".edition-directory a").first()).toBeFocused();
  const focusOutline = await page.locator(".edition-directory a").first()
    .evaluate((link) => getComputedStyle(link).outlineStyle);
  expect(focusOutline).toBe("solid");
});
