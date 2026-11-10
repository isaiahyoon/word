import { expect, test } from "./support/browser-test.mjs";

test("cycles editions with Tab and Shift+Tab and wraps at both ends", async ({ page }) => {
  await page.goto("/");
  await page.locator("#verse-1").waitFor();
  await page.evaluate(() => document.activeElement?.blur());
  await expect.poll(() => page.evaluate(() => document.activeElement.tagName)).toBe("BODY");

  for (const [route, language] of [
    ["/krv", "ko"],
    ["/diodati", "it"],
    ["/licht", "de"],
    ["/japbungo", "ja"],
    ["/moh", "fr"],
    ["/luz", "es"],
    ["/alm", "pt"],
    ["/kjv", "en"],
  ]) {
    await page.keyboard.press("Tab");
    await expect(page).toHaveURL(new RegExp(`${route}/b/genesis/c/1/v/1$`));
    await expect(page.locator("#verse-list")).toHaveAttribute("lang", language);
    await expect.poll(() => page.evaluate(() => document.activeElement.tagName)).toBe("BODY");
  }

  for (const [route, language] of [
    ["/alm", "pt"],
    ["/luz", "es"],
    ["/moh", "fr"],
    ["/japbungo", "ja"],
    ["/licht", "de"],
    ["/diodati", "it"],
  ]) {
    await page.keyboard.press("Shift+Tab");
    await expect(page).toHaveURL(new RegExp(`${route}/b/genesis/c/1/v/1$`));
    await expect(page.locator("#verse-list")).toHaveAttribute("lang", language);
  }
});

test("styles edition cycling keycaps distinctly and preserves native Tab in controls", async ({ page }) => {
  await page.goto("/");
  await page.locator("#shortcuts-open").click();
  const nextRow = page.locator(".shortcut-row--edition-next");
  const previousRow = page.locator(".shortcut-row--edition-previous");
  const slashRow = page.locator(".shortcut-row--shortcuts");
  await expect(nextRow.locator("kbd")).toHaveText("Tab");
  await expect(previousRow.locator("kbd")).toHaveText("⇧ Tab");
  expect(await nextRow.evaluate((element) => element.nextElementSibling.classList.contains("shortcut-row--edition-previous"))).toBe(true);
  expect(await previousRow.evaluate((element) => element.nextElementSibling.classList.contains("shortcut-row--shortcuts"))).toBe(true);
  const nextKeyColor = await nextRow.locator("kbd").evaluate((element) => getComputedStyle(element).backgroundImage);
  const previousKeyColor = await previousRow.locator("kbd").evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(nextKeyColor).toContain("linear-gradient");
  expect(previousKeyColor).toContain("linear-gradient");
  expect(nextKeyColor).not.toBe(previousKeyColor);
  await page.locator("#shortcuts-close").click();
  await expect(slashRow).toHaveCount(1);
});

const pathname = (page) => () => new URL(page.url()).pathname;

test("Tab cycles editions from the focused search bar", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await page.locator("#verse-1").waitFor();
  await page.locator("#search-input").focus();

  await page.keyboard.press("Tab");
  await expect.poll(pathname(page)).toBe("/krv/b/genesis/c/1/v/1");
  await page.keyboard.press("Shift+Tab");
  await expect.poll(pathname(page)).toBe("/kjv/b/genesis/c/1/v/1");
});

test("Tab cycles editions and closes the open chapter picker", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await page.locator("#verse-1").waitFor();
  await page.locator("#chapter-select").click();
  await expect(page.locator("#chapter-select")).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Tab");
  await expect.poll(pathname(page)).toBe("/krv/b/genesis/c/1/v/1");
  await expect(page.locator("#chapter-select")).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Shift+Tab");
  await expect.poll(pathname(page)).toBe("/kjv/b/genesis/c/1/v/1");
});

test("Tab cycles editions and closes the open edition picker", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await page.locator("#verse-1").waitFor();
  await page.locator("#edition-select").click();
  await expect(page.locator("#edition-select")).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Tab");
  await expect.poll(pathname(page)).toBe("/krv/b/genesis/c/1/v/1");
  await expect(page.locator("#edition-select")).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Shift+Tab");
  await expect.poll(pathname(page)).toBe("/kjv/b/genesis/c/1/v/1");
});

test("keeps search and verses out of the Tab order", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await expect(page.locator("#search-input")).toHaveAttribute("tabindex", "-1");
  await expect(page.locator(".verse").first()).toHaveAttribute("tabindex", "-1");

  await page.locator("#verse-1").focus();
  await page.keyboard.press("Tab");
  await expect(page).toHaveURL(/\/krv\/b\/genesis\/c\/1\/v\/1$/);
  await page.keyboard.press("Shift+Tab");
  await expect(page).toHaveURL(/\/kjv\/b\/genesis\/c\/1\/v\/1$/);

  await expect(page.locator("#search-input")).not.toBeFocused();
  await expect(page.locator(".search-results")).toBeHidden();
});

test("Tab after choosing an edition does not walk the verses or focus search", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await page.locator("#edition-select").click();
  await page.locator("#edition-options [data-edition='krv']").click();
  await expect(page).toHaveURL(/\/krv\/b\/genesis\/c\/1\/v\/1$/);
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "ko");
  await expect(page.locator("#verse-list")).not.toHaveAttribute("aria-busy", "true");
  await expect(page.locator("#verse-1")).toBeVisible();

  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#search-input")).not.toBeFocused();
  await expect(page.locator(".search-results")).toBeHidden();
  await expect(page.locator(".verse:focus")).toHaveCount(0);
});

const overlays = [
  ["shortcuts dialog", async (page) => page.locator("#shortcuts-open").click()],
  ["feedback dialog", async (page) => page.locator("#feedback-open").click()],
  ["chapter picker", async (page) => page.locator("#chapter-select").click()],
  ["edition picker", async (page) => page.locator("#edition-select").click()],
  ["share language menu", async (page) => {
    await page.locator("#verse-1").click();
    await page.locator("#share-selected-verses").click();
  }],
  ["copy language menu", async (page) => {
    await page.locator("#verse-1").click();
    await page.locator("#copy-selected-verses").click();
  }],
];

for (const [name, open] of overlays) {
  test(`Tab cycles editions after closing the ${name}`, async ({ page }) => {
    await page.goto("/kjv/b/genesis/c/1/v/1");
    await page.locator("#verse-1").waitFor();
    await open(page);
    await page.keyboard.press("Escape");

    await page.keyboard.press("Tab");
    await expect(page).toHaveURL(/\/krv\/b\/genesis\/c\/1\/v\/1$/);
    await page.keyboard.press("Shift+Tab");
    await expect(page).toHaveURL(/\/kjv\/b\/genesis\/c\/1\/v\/1$/);
    await expect(page.locator("#search-input")).not.toBeFocused();
  });
}

test("Tab cycles editions after switching testament", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await page.locator("#verse-1").waitFor();
  await page.locator('.testament-tab[data-testament="new"]').click();
  await expect(page.locator('.testament-tab[data-testament="new"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('.testament-tab[data-testament="new"]')).not.toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page).toHaveURL(/\/krv\/b\/matthew\/c\/1\/v\/1$/);
  await page.keyboard.press("Shift+Tab");
  await expect(page).toHaveURL(/\/kjv\/b\/matthew\/c\/1\/v\/1$/);
  await expect(page.locator("#search-input")).not.toBeFocused();
});
