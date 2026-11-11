import { expect, test } from "./support/browser-test.mjs";

test("shares selected verse text natively and falls back to copying when sharing is unavailable", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (payload) => { window.sharedPayload = payload; },
    });
  });

  await page.locator("#verse-16").click();
  const verseText = (await page.locator("#verse-16 .verse-text").textContent()).trim();
  await page.locator("#share-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='kjv']").click();
  await expect.poll(() => page.evaluate(() => window.sharedPayload)).toEqual({
    text: `"${verseText}"\n\n- John 3:16`,
  });
  const nativeStatus = page.locator("#copy-status");
  await expect(nativeStatus).toHaveText("Shared John 3:16.");
  await expect(nativeStatus).toContainClass("is-fading");
  await expect(nativeStatus).toBeHidden();
  await expect(nativeStatus).toBeEmpty();
  await expect(page.locator("#share-selected-verses")).toHaveAttribute("aria-label", "Share 1 verse");

  await page.locator("#share-selected-verses").click();
  await expect(page.locator("#share-language-menu [data-edition]")).toHaveCount(8);
  await page.locator("#share-language-menu [data-edition='martin1744']").click();
  await expect.poll(() => page.evaluate(() => window.sharedPayload.text)).toContain("Car Dieu a tant aimé le monde");
  await expect.poll(() => page.evaluate(() => window.sharedPayload.text)).toContain("- Jean 3:16");
  await expect(page).toHaveURL(/\/kjv\//);

  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });
  await page.locator("#share-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='kjv']").click();
  await expect(page.locator("#copy-status")).toHaveText("Sharing is unavailable here. Copied John 3:16 to clipboard.");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`"${verseText}"\n\n- John 3:16`);
  const status = page.locator("#copy-status");
  await expect(status).toContainClass("is-fading");
  await expect(status).toBeHidden();
  await expect(status).toBeEmpty();
});

test("copies selected verses in another language without changing the reading edition", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#verse-16").click();

  const copyControl = page.locator("#copy-selected-verses");
  await copyControl.click();
  await expect(copyControl).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#share-language-menu")).toHaveAttribute("aria-label", "Choose a language to copy in");
  await expect(page.locator("#share-language-menu [data-edition]")).toHaveCount(8);
  await page.locator("#share-language-menu [data-edition='krv']").click();

  const copiedText = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedText).toContain("하나님이 세상을 이처럼 사랑하사");
  expect(copiedText).toMatch(/- 요한복음 3:16$/);
  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#verse-16")).toHaveAttribute("aria-pressed", "true");
  await expect(copyControl).toHaveAttribute("aria-expanded", "false");
});

async function mockNativeShare(page) {
  await page.evaluate(() => {
    window.sharedPayloads = [];
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (payload) => { window.sharedPayloads.push(payload); },
    });
  });
}

test("closes the share language menu with Escape, outside clicks, and cleared selections", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#verse-16").click();
  const shareButton = page.locator("#share-selected-verses");
  const menu = page.locator("#share-language-menu");

  await shareButton.click();
  await expect(menu).toBeVisible();
  await expect(shareButton).toHaveAttribute("aria-expanded", "true");
  await expect(menu.locator("[aria-current]")).toBeFocused();
  await expect(menu.locator("[data-edition]")).toHaveCount(8);

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(shareButton).toHaveAttribute("aria-expanded", "false");
  await expect(shareButton).toBeFocused();

  await shareButton.click();
  await expect(menu).toBeVisible();
  await page.locator(".chapter-heading").click({ position: { x: 4, y: 4 } });
  await expect(menu).toBeHidden();

  await shareButton.click();
  await expect(menu).toBeVisible();
  await page.locator("#clear-selected-verses").click();
  await expect(menu).toBeHidden();
});

test("moves through the share language menu with the arrow keys and wraps at both ends", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#verse-16").click();
  await page.locator("#share-selected-verses").click();
  const options = page.locator("#share-language-menu [data-edition]");

  await expect(options.nth(0)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(options.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(options.last()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(options.nth(0)).toBeFocused();
});

test("shares in another language without waiting on the network once the menu has warmed it", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  await mockNativeShare(page);
  await page.locator("#verse-16").click();

  const warmed = page.waitForResponse("**/scripture/luther1912/books/43_john.json");
  await page.locator("#share-selected-verses").click();
  await warmed;
  await page.route("**/scripture/**", (route) => route.abort());
  await page.locator("#share-language-menu [data-edition='luther1912']").click();

  await expect.poll(() => page.evaluate(() => window.sharedPayloads.length)).toBe(1);
  const [payload] = await page.evaluate(() => window.sharedPayloads);
  expect(payload.text).toContain("Also hat Gott die Welt geliebt");
  expect(payload.text).toMatch(/- Johannes 3:16$/);
});

test.describe("share load failures", () => {
  test.use({ serviceWorkers: "block" });

  test("reports a load failure instead of sharing when the chosen edition cannot be fetched", async ({ page }) => {
    await page.goto("/kjv/b/john/c/3/v/16");
    await mockNativeShare(page);
    await page.route("**/scripture/martin1744/**", (route) => route.abort());
    await page.locator("#verse-16").click();
    await page.locator("#share-selected-verses").click();
    await page.locator("#share-language-menu [data-edition='martin1744']").click();

    await expect(page.locator("#copy-status")).toHaveText(
      "We couldn’t open this book. Please check your network connection.",
    );
    expect(await page.evaluate(() => window.sharedPayloads.length)).toBe(0);
  });
});

test("blocks sharing a selected verse without a verified KJV reference", async ({ page }) => {
  await page.goto("/japbungo/b/3-john/c/1/v/14");
  await mockNativeShare(page);
  await page.locator("#verse-14").click();
  await page.locator("#verse-15").click();
  await page.locator("#share-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='kjv']").click();

  await expect(page.locator("#copy-status"))
    .toHaveText("選択した節を指定の版の節と確実に対応できません。コピーや共有は行われませんでした。");
  expect(await page.evaluate(() => window.sharedPayloads.length)).toBe(0);
});

test("shares the full KRV passage for a split KJV verse", async ({ page }) => {
  await page.goto("/kjv/b/3-john/c/1/v/14");
  await mockNativeShare(page);
  await page.locator("#verse-14").click();
  await page.locator("#share-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='krv']").click();

  await expect.poll(() => page.evaluate(() => window.sharedPayloads.length)).toBe(1);
  const [payload] = await page.evaluate(() => window.sharedPayloads);
  const texts = await page.evaluate(async () => {
    const response = await fetch("/scripture/krv/books/64_3_john.json");
    if (!response.ok) throw new Error("Could not load KRV test verses");
    const data = await response.json();
    return [data["1"][13][1].trim(), data["1"][14][1].trim()];
  });
  expect(payload.text).toBe(`"${texts.join("\n\n")}"\n\n- 요한3서 1:14-15\n- KJV reference: 3 John 1:14`);
});
