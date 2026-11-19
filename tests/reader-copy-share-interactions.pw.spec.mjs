import { expect, test } from "./support/browser-test.mjs";

for (const { label, viewport, touch } of [
  { label: "desktop", viewport: { width: 1280, height: 900 }, touch: false },
  { label: "mobile", viewport: { width: 390, height: 844 }, touch: true },
]) {
  test.describe(`${label} copy/share interactions`, () => {
    test.use({ viewport, hasTouch: touch, isMobile: touch, serviceWorkers: "block" });

    const activate = (locator) => touch ? locator.tap() : locator.click();

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        window.copyShareProbe = { copies: [], shares: [] };
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: async (text) => { window.copyShareProbe.copies.push(text); } },
        });
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: async (payload) => { window.copyShareProbe.shares.push(payload); },
        });
      });
      await page.goto("/kjv/b/john/c/3/v/16");
      await expect(page.locator("#verse-16")).toHaveAttribute("aria-pressed", "false");
      await activate(page.locator("#verse-16"));
    });

    for (const action of ["copy", "share"]) {
      for (const editionId of ["kjv", "krv"]) {
        test(`${action} in ${editionId} activates exactly once`, async ({ page }) => {
          const response = await page.request.get(`/scripture/${editionId}/books/43_john.json`);
          expect(response.ok()).toBe(true);
          const data = await response.json();
          const reference = editionId === "kjv" ? "John 3:16" : "요한복음 3:16";
          const text = `"${data["3"][15][1].trim()}"\n\n- ${reference}`;

          await activate(page.locator(`#${action}-selected-verses`));
          await activate(page.locator(`#share-language-menu [data-edition='${editionId}']`));

          await expect.poll(() => page.evaluate(() => window.copyShareProbe)).toEqual({
            copies: action === "copy" ? [text] : [],
            shares: action === "share" ? [{ text }] : [],
          });
          await expect(page.locator("#copy-status")).toContainText(reference);
          await expect(page.locator("#share-language-menu")).toBeHidden();
          await expect(page.locator("#verse-16")).toHaveAttribute("aria-pressed", "true");
          await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/16$/);
        });
      }

      test(`${action} menu fits and retains keyboard and outside-click dismissal`, async ({ page }) => {
        const trigger = page.locator(`#${action}-selected-verses`);
        const menu = page.locator("#share-language-menu");
        const options = menu.getByRole("menuitem");
        await activate(trigger);
        await expect(menu).toBeVisible();
        await expect(options.first()).toBeFocused();
        const bounds = await menu.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
        await page.keyboard.press("ArrowUp");
        await expect(options.last()).toBeFocused();
        await page.keyboard.press("ArrowDown");
        await expect(options.first()).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();
        await expect(trigger).toBeFocused();

        await activate(trigger);
        await activate(trigger);
        await expect(menu).toBeHidden();
        await expect(trigger).toHaveAttribute("aria-expanded", "false");

        await activate(trigger);
        await activate(page.locator(".chapter-heading"));
        await expect(menu).toBeHidden();

        await activate(trigger);
        await options.last().focus();
        await page.keyboard.press("Tab");
        await expect(menu).toBeHidden();
        await expect(menu.locator("[data-edition]").last()).not.toBeFocused();
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        expect(await page.evaluate(() => window.copyShareProbe)).toEqual({ copies: [], shares: [] });
      });
    }

    test("share falls back to copying when native sharing is unavailable", async ({ page }) => {
      await page.evaluate(() => {
        Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
      });
      const text = (await page.locator("#verse-16 .verse-text").textContent()).trim();
      await activate(page.locator("#share-selected-verses"));
      await activate(page.locator("#share-language-menu [data-edition='kjv']"));
      await expect.poll(() => page.evaluate(() => window.copyShareProbe.copies))
        .toEqual([`"${text}"\n\n- John 3:16`]);
      await expect(page.locator("#copy-status"))
        .toHaveText("Sharing is unavailable here. Copied John 3:16 to clipboard.");
    });

    test("Cut copies once and clears the selection", async ({ page }) => {
      const text = (await page.locator("#verse-16 .verse-text").textContent()).trim();
      await activate(page.locator("#cut-selected-verses"));
      await expect.poll(() => page.evaluate(() => window.copyShareProbe.copies))
        .toEqual([`"${text}"\n\n- John 3:16`]);
      await expect(page.locator("#verse-16")).toHaveAttribute("aria-pressed", "false");
      await expect(page.locator("#verse-actions")).toBeHidden();
      await expect(page.locator("#copy-status")).toHaveText("Copied John 3:16 and cleared selected verses.");
    });
  });
}
