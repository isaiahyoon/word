import { ABOUT_LOCALES } from "../js/about-locales.mjs";
import { EDITIONS } from "../js/editions.mjs";
import { expect, test } from "./support/browser-test.mjs";

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
    await expect(page.locator('a[href^="/' + edition.routeSegment + '/b/genesis/c/1/v/1"]'))
      .toHaveCount(2);
    await expect(page.locator(".edition-directory li")).toHaveCount(Object.keys(EDITIONS).length);
    await expect(page.locator(".edition-directory a")).toHaveCount(Object.keys(EDITIONS).length);

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
