import { expect, test } from "./support/browser-test.mjs";

test("switches editions at the same passage and canonicalizes legacy KJV links", async ({ page }) => {
  await page.goto("/b/john/c/3/v/16");
  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/16$/);

  await page.goto("/b/john/3/16");
  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "en");

  await page.locator("#edition-select").click();
  await expect(page.locator("#edition-options")).toBeVisible();
  await page.locator("#edition-option-krv").click();
  await expect(page).toHaveURL(/\/krv\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#edition-options")).toBeHidden();
  await expect.poll(() => page.locator("#reader").evaluate((reader) =>
    reader.getAnimations().some((animation) => animation.effect.getTiming().duration === 620),
  )).toBe(true);
  await expect(page.locator("#verse-16")).toBeFocused();
  await page.reload();
  await expect(page).toHaveURL(/\/krv\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("body")).toHaveClass(/is-krv-edition/);
  await expect.poll(() => page.locator("body").evaluate((element) =>
    getComputedStyle(element, "::before").opacity,
  )).toBe("1");
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "ko");
  await expect(page.locator("#verse-16 .verse-text")).toContainText("하나님이 세상을 이처럼 사랑하사");
  await expect(page.locator("#verse-16 .verse-text")).toHaveJSProperty("lang", "ko");
  expect(await page.locator("#verse-16 .verse-text").evaluate((element) =>
    getComputedStyle(element).fontFamily.includes("Helvetica Neue"),
  )).toBe(true);
  expect(await page.locator(".edition-trigger-label").evaluate((element) =>
    getComputedStyle(element).fontFamily.includes("Noto Serif KR"),
  )).toBe(true);
  expect(await page.locator(".book-name").first().evaluate((element) =>
    getComputedStyle(element).fontFamily.includes("Noto Serif KR"),
  )).toBe(true);
  expect(await page.locator(".chapter-option").first().evaluate((element) =>
    getComputedStyle(element).fontFamily.includes("Noto Serif KR"),
  )).toBe(true);
  await expect(page.locator("#edition-attribution")).toContainText("대한성서공회");

  await page.keyboard.press("ArrowDown");
  await expect(page).toHaveURL(/\/krv\/b\/john\/c\/3\/v\/17$/);
  await expect(page.locator("#verse-17")).toHaveClass(/is-focused/);

  await page.locator("#edition-select").click();
  await page.locator("#edition-option-kjv").click();
  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/17$/);
  await expect(page.locator("body")).not.toHaveClass(/is-krv-edition/);
  await expect.poll(() => page.locator("body").evaluate((element) =>
    getComputedStyle(element, "::before").opacity,
  )).toBe("0");
  await expect(page.locator("#verse-16 .verse-text")).toContainText("For God so loved the world");
  await expect(page.locator("#edition-attribution")).toBeHidden();

  await page.locator("#edition-select").click();
  await page.locator("#edition-option-luther1912").click();
  await expect(page).toHaveURL(/\/licht\/b\/john\/c\/3\/v\/17$/);
  await expect(page.locator("body")).toHaveClass(/is-luther1912-edition/);
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "de");
  await expect(page.locator("#verse-17 .verse-text")).toContainText("Denn Gott hat seinen Sohn nicht gesandt");

  await page.locator("#edition-select").click();
  await page.locator("#edition-option-alm1911").click();
  await expect(page).toHaveURL(/\/alm\/b\/john\/c\/3\/v\/17$/);
  await expect(page.locator("body")).toHaveClass(/is-alm1911-edition/);
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "pt");
  await expect(page.locator("#verse-17 .verse-text")).toContainText("Porque Deus enviou o seu Filho");
  await expect(page.locator("#edition-attribution")).toHaveText(
    "Project Gutenberg · dados: damarals/biblias† · estrutura MIT · direitos do texto variam por jurisdição.",
  );
});

test("keeps highlighted verses selected when switching to another language for copying", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#verse-16").click();
  await expect(page.locator("#verse-16")).toHaveAttribute("aria-pressed", "true");

  await page.locator("#edition-select").click();
  await page.locator("#edition-option-krv").click();

  await expect(page).toHaveURL(/\/krv\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#verse-16")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#verse-16")).toHaveClass(/is-copy-selected/);
  await expect(page.locator("#verse-16 .verse-text")).toContainText("하나님이 세상을 이처럼 사랑하사");
  await expect(page.locator("#copy-selected-verses")).toHaveText("1절 복사");

  await page.locator("#copy-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='krv']").click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("하나님이 세상을 이처럼 사랑하사");
});

test("switches a selected passage to Almeida 1911 and copies its Portuguese citation", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#verse-16").click();
  await page.locator("#edition-select").click();
  await page.locator("#edition-option-alm1911").click();

  await expect(page).toHaveURL(/\/alm\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "pt");
  await expect(page.locator("#verse-16")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#copy-selected-verses")).toHaveText("Copiar 1 versículo");

  const verseText = (await page.locator("#verse-16 .verse-text").textContent()).trim();
  await page.locator("#copy-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='alm1911']").click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`"${verseText}"\n\n- João 3:16`);
});

for (const route of ["/kjv/b/john/c/3/v/16", "/krv/b/john/c/3/v/16"]) {
  test(`keeps desktop verse actions within the viewport on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(route);
    await page.locator("#verse-16").click();
    await expect(page.locator("#verse-actions")).toHaveClass(/is-visible/);
    await expect(page.locator("#verse-actions")).toHaveCSS("flex-wrap", "nowrap");

    const boxes = await page.locator("#verse-actions > button").evaluateAll((buttons) =>
      buttons.map((button) => {
        const { left, right, top, bottom } = button.getBoundingClientRect();
        return { left, right, top, bottom };
      }),
    );
    expect(boxes).toHaveLength(4);
    for (const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(1280);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThanOrEqual(800);
    }
  });
}

test("opens the Martin edition with native Psalm numbering and the French pastel theme", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/moh/b/psalms/c/3/v/1");

  await expect(page).toHaveURL(/\/moh\/b\/psalms\/c\/3\/v\/1$/);
  await expect(page.locator("#edition-select-code")).toHaveText("MOH");
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "fr");
  await expect(page.locator("body")).toHaveClass(/is-martin1744-edition/);
  await expect(page.locator("#verse-1 .verse-text")).toContainText("Psaume de David");
  await expect(page.locator("#verse-2 .verse-text")).toContainText("Ô Eternel!");
  await page.evaluate(() => document.fonts.load('18px "EB Garamond"'));
  expect(await page.locator("#verse-1 .verse-text").evaluate((element) =>
    getComputedStyle(element).fontFamily,
  )).toContain("EB Garamond");

  const gradient = await page.locator("body").evaluate((element) =>
    getComputedStyle(element, "::before").backgroundImage,
  );
  expect(gradient).toContain("rgb(220, 232, 248)");
  expect(gradient).toContain("rgb(255, 255, 255)");
  expect(gradient).toContain("rgb(245, 214, 226)");
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);

  await page.locator("#verse-2").click();
  await expect(page).toHaveURL(/\/moh\/b\/psalms\/c\/3\/v\/2$/);
  await expect(page.locator("#verse-2")).toHaveClass(/is-copy-selected/);
  await page.locator("#copy-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='martin1744']").click();
  const verseText = (await page.locator("#verse-2 .verse-text").textContent()).trim();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`"${verseText}"\n\n- Psaumes 3:2`);

  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#menu-toggle").click();
  await page.locator("#edition-select").click();
  await page.locator("#edition-option-martin1744").click();
  await expect(page).toHaveURL(/\/moh\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#verse-16 .verse-text")).toContainText("Car Dieu a tant aimé le monde");
});

test("opens the RV1865 LUZ edition with source headings, Petrona, and Spanish citations", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/luz/b/psalms/c/3/v/1");

  await expect(page).toHaveURL(/\/luz\/b\/psalms\/c\/3\/v\/1$/);
  await expect(page.locator("#edition-select-code")).toHaveText("LUZ");
  await expect(page.locator("#edition-select-label")).toHaveText("Reina-Valera · Español");
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "es");
  await expect(page.locator("body")).toHaveClass(/is-rv1865-edition/);
  await expect(page.locator("#chapter-source-heading")).toHaveText("Salmo de David, cuando huía de delante de Absalom su hijo.");
  await expect(page.locator("#verse-1 .verse-text")).toContainText("Jehová, ¡cuánto se han multiplicado mis enemigos!");
  await page.evaluate(() => document.fonts.load('18px "Petrona"'));
  expect(await page.locator("#verse-1 .verse-text").evaluate((element) =>
    getComputedStyle(element).fontFamily,
  )).toContain("Petrona");
  expect(await page.locator("body").evaluate((element) =>
    getComputedStyle(element, "::before").backgroundImage,
  )).toContain("rgba(174, 197, 159");

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);

  await page.locator("#verse-1").click();
  await expect(page).toHaveURL(/\/luz\/b\/psalms\/c\/3\/v\/1$/);
  await page.locator("#copy-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='rv1865']").click();
  const verseText = (await page.locator("#verse-1 .verse-text").textContent()).trim();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`"${verseText}"\n\n- Salmos 3:1`);

  await page.goto("/luz/b/psalms/c/119/v/9");
  await expect(page.locator(".verse-section-heading").first()).toHaveText("ALEF.");
  await expect(page.locator(".verse-section-heading").nth(1)).toHaveText("BET.");
  await expect(page.locator(".verse-section-heading")).toHaveCount(22);
  expect(await page.locator(".verse-section-heading").first().evaluate((element) =>
    element.closest("button"),
  )).toBeNull();

  await page.goto("/kjv/b/john/c/3/v/16");
  await expect(page.locator("body")).not.toHaveClass(/is-rv1865-edition/);
  await page.locator("#menu-toggle").click();
  await page.locator("#edition-select").click();
  await page.locator("#edition-option-rv1865").click();
  await expect(page).toHaveURL(/\/luz\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#verse-16 .verse-text")).toContainText("Porque de tal manera amó Dios al mundo");
});

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

test("leaves out selected verses that the chosen edition does not contain", async ({ page }) => {
  await page.goto("/moh/b/3-john/c/1/v/14");
  await mockNativeShare(page);
  await page.locator("#verse-14").click();
  await page.locator("#verse-15").click();
  await page.locator("#share-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='kjv']").click();

  await expect.poll(() => page.evaluate(() => window.sharedPayloads.length)).toBe(1);
  const [payload] = await page.evaluate(() => window.sharedPayloads);
  expect(payload.text).toMatch(/- 3 John 1:14$/);
});

test("keeps selected-verse actions on one row inside the viewport in every edition", async ({ page }) => {
  test.setTimeout(120_000);
  for (const edition of ["kjv", "krv", "moh", "licht", "diodati", "luz", "japbungo", "alm"]) {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`/${edition}/b/john/c/3/v/16`);
    await page.locator("#verse-16").click();
    await expect(page.locator("#verse-actions")).toHaveClass(/is-visible/);
    for (const width of [320, 390, 540, 700]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(page.locator("#share-selected-verses")).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
      const buttons = await page.locator("#verse-actions > button").evaluateAll((elements) =>
        elements.map((element) => {
          const { left, right, top } = element.getBoundingClientRect();
          return { left, right, top };
        }),
      );
      expect(new Set(buttons.map((button) => button.top)).size, `${edition} ${width}`).toBe(1);
      expect(await page.evaluate(() => document.body.scrollWidth), `${edition} ${width}`).toBeLessThanOrEqual(width);
      for (const button of buttons) {
        expect(button.left, `${edition} ${width}`).toBeGreaterThanOrEqual(0);
        expect(button.right, `${edition} ${width}`).toBeLessThanOrEqual(width);
      }
    }
  }
});

test("keeps selected-verse actions inside small mobile viewports across edition themes", async ({ page }) => {
  const editions = ["kjv", "krv", "moh", "alm"];
  const viewports = [
    { width: 320, height: 568 },
    { width: 360, height: 780 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 402, height: 874 },
    { width: 430, height: 932 },
    { width: 568, height: 320 },
  ];

  for (const edition of editions) {
    await page.setViewportSize(viewports[0]);
    await page.goto(`/${edition}/b/john/c/3/v/16`);
    await page.locator("#verse-16").click();
    await expect(page.locator("#verse-actions")).toBeVisible();
    await expect(page.locator("#verse-actions")).toHaveCSS("flex-wrap", "nowrap");
    await expect(page.locator("#clear-selected-verses")).toHaveCSS("min-height", "44px");
    await expect(page.locator("#clear-selected-verses")).toHaveCSS("border-radius", "6px");

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect(page.locator("#share-selected-verses")).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
      await expect(page.locator("#clear-selected-verses")).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
      const [actions, bottomNavigation, shareButton, clearButton, clearIcon, clearLabel, actionButtons] = await Promise.all([
        page.locator("#verse-actions").boundingBox(),
        page.locator(".bottom-navigation").boundingBox(),
        page.locator("#share-selected-verses").boundingBox(),
        page.locator("#clear-selected-verses").boundingBox(),
        page.locator(".clear-control-icon").boundingBox(),
        page.locator("#clear-selected-verses > span:last-child").boundingBox(),
        page.locator("#verse-actions > button").evaluateAll((buttons) =>
          buttons.map((button) => {
            const { left, right, top, bottom } = button.getBoundingClientRect();
            return { left, right, top, bottom };
          }),
        ),
      ]);
      expect(actions).not.toBeNull();
      expect(bottomNavigation).not.toBeNull();
      expect(shareButton).not.toBeNull();
      expect(actions.x).toBeGreaterThanOrEqual(0);
      expect(actions.x + actions.width).toBeLessThanOrEqual(viewport.width);
      expect(actions.y + actions.height).toBeLessThanOrEqual(viewport.height);
      expect(bottomNavigation.y + bottomNavigation.height).toBeLessThanOrEqual(actions.y);
      expect(shareButton.width).toBeGreaterThanOrEqual(44);
      expect(shareButton.height).toBeGreaterThanOrEqual(44);
      expect(Math.abs(clearIcon.y + clearIcon.height / 2 - clearButton.y - clearButton.height / 2)).toBeLessThan(1);
      expect(Math.abs(clearLabel.y + clearLabel.height / 2 - clearButton.y - clearButton.height / 2)).toBeLessThan(1);
      expect(new Set(actionButtons.map((button) => button.top)).size).toBe(1);
      for (const button of actionButtons) {
        expect(button.left).toBeGreaterThanOrEqual(0);
        expect(button.right).toBeLessThanOrEqual(viewport.width);
        expect(button.top).toBeGreaterThanOrEqual(0);
        expect(button.bottom).toBeLessThanOrEqual(viewport.height);
      }
      expect(await page.locator("body").evaluate((element) => element.scrollWidth))
        .toBeLessThanOrEqual(viewport.width);
      if (viewport.width === 402) {
        const rows = new Set(actionButtons.map((button) => button.top));
        expect(rows.size).toBeLessThanOrEqual(2);
        if (rows.size === 2) {
          expect(actionButtons[0].top).toBeLessThan(actionButtons[1].top);
          expect(new Set(actionButtons.slice(1).map((button) => button.top)).size).toBe(1);
        }
      }
    }
  }
});

test("renders the KRV brand before its scripture index finishes loading", async ({ page }) => {
  await page.route("**/scripture/krv/index.json", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });

  await page.goto("/krv/b/john/c/3/v/16", { waitUntil: "domcontentloaded" });

  await expect(page.locator("#brand-edition-primary")).toHaveText("개역한글");
  await expect(page.locator("#brand-edition-secondary")).toHaveText("1961");
  await expect(page.locator("#brand-edition-primary")).not.toHaveText("KING JAMES");
  await expect(page.locator("#verse-16 .verse-text")).toContainText("하나님이 세상을 이처럼 사랑하사");
});

test("uses a two-pixel smaller verse size only for KJV", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  await expect(page.locator("#verse-16")).toHaveCSS("font-size", "17px");
  await page.locator("#quiet-view-toggle").click();
  await expect(page.locator("#verse-16")).toHaveCSS("font-size", "18px");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#verse-16")).toHaveCSS("font-size", "16px");

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/diodati/b/genesis/c/1/v/1");
  await expect(page.locator("#verse-1")).toHaveCSS("font-size", "19px");
});

test("auto-scrolls long edition labels only while the mobile sidebar is open", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/licht");
  const triggerLabel = page.locator("#edition-select-label");
  await expect(triggerLabel).toHaveClass(/is-overflowing/);
  const triggerTrack = triggerLabel.locator(".edition-scroll-text");
  await expect(triggerTrack).toHaveCSS("animation-name", "none");
  await page.locator("#menu-toggle").click();
  await expect(triggerTrack).toHaveCSS("animation-name", "edition-label-scroll");

  await page.locator("#edition-select").click();
  const lutherOption = page.locator("#edition-option-luther1912");
  const longOptionTitle = lutherOption.locator(".edition-option-description strong.is-overflowing .edition-scroll-text");
  await expect(longOptionTitle).toHaveCount(1);
  await expect(longOptionTitle).toHaveCSS("animation-name", "edition-label-scroll");

  await page.locator(".sidebar-scrim").click({ position: { x: 310, y: 400 } });
  await expect(page.locator(".sidebar")).not.toHaveClass(/is-open/);
  await expect(triggerTrack).toHaveCSS("animation-name", "none");
});

test("scrolls long edition labels only when hovered on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/licht");
  await page.addStyleTag({
    content: `
      #edition-select-label,
      #edition-option-luther1912 .edition-option-description strong {
        width: 80px;
      }
    `,
  });
  await expect(page.locator("#edition-select-label")).toHaveClass(/is-overflowing/);
  const desktopTrack = page.locator("#edition-select-label .edition-scroll-text");
  await expect(desktopTrack).toHaveCSS("animation-name", "none");
  await page.locator("#edition-select").focus();
  await expect(desktopTrack).toHaveCSS("animation-name", "none");
  await page.locator("#edition-select").hover();
  await expect(desktopTrack).toHaveCSS("animation-name", "edition-label-scroll");
  await page.locator("#edition-select").click();
  const longOptionTitle = page.locator(
    "#edition-option-luther1912 .edition-option-description strong.is-overflowing .edition-scroll-text",
  );
  await expect(longOptionTitle).toHaveCSS("animation-name", "none");
  await page.locator("#edition-option-luther1912").hover();
  await expect(longOptionTitle).toHaveCSS("animation-name", "edition-label-scroll");
  const endGap = await longOptionTitle.evaluate(async (track) => {
    const animation = track.getAnimations()[0];
    animation.pause();
    animation.currentTime = 1000;
    await new Promise(requestAnimationFrame);
    const range = document.createRange();
    range.selectNodeContents(track);
    return track.parentElement.getBoundingClientRect().right - range.getBoundingClientRect().right;
  });
  expect(endGap).toBeGreaterThanOrEqual(3);
});

test("uses a compact JAP edition code while keeping the full Bungo name", async ({ page }) => {
  await page.goto("/japbungo");
  await expect(page.locator("#edition-select-code")).toHaveText("JAP");
  await expect(page.locator("#edition-select-label")).toHaveText("Bungo-yaku · 日本語");

  await page.locator("#edition-select").click();
  await expect(page.locator("#edition-option-japbungo .edition-option-mark")).toHaveText("JAP");
  await expect(page.locator("#edition-option-japbungo .edition-option-description small")).toHaveText("Bungo-yaku (文語訳)");
});

test("loads Diodati with the DIO code, Italian typography, and pink theme", async ({ page }) => {
  await page.goto("/diodati/b/genesis/c/1/v/1");

  await expect(page).toHaveURL(/\/diodati\/b\/genesis\/c\/1\/v\/1$/);
  await expect(page.locator("#edition-select-code")).toHaveText("DIO");
  await expect(page.locator("#edition-select-label")).toHaveText("Diodati · Italiano");
  await page.locator("#edition-select").click();
  await expect(page.locator("#edition-option-diodati .edition-option-mark")).toHaveText("DIO");
  await expect(page.locator("#edition-option-diodati .edition-option-description small")).toHaveText("Giovanni Diodati (1649)");
  await page.locator("#edition-select").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(page.locator("body")).toHaveClass(/is-diodati-edition/);
  await expect(page.locator("#verse-1 .verse-text")).toContainText("NEL principio Iddio creò il cielo e la terra.");
  expect(await page.locator("#verse-1 .verse-text").evaluate((element) =>
    getComputedStyle(element).fontFamily.includes("Cormorant Garamond"),
  )).toBe(true);
  expect(await page.locator("body").evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--canvas").trim(),
  )).toBe("#f8edf1");
  expect(await page.locator("body").evaluate((element) =>
    getComputedStyle(element, "::before").backgroundImage.includes("linear-gradient"),
  )).toBe(true);

  const searchInput = page.locator("#search-input");
  const firstResult = page.locator("#search-results .search-result").first();
  await searchInput.fill("Gene");
  await expect(firstResult).toHaveAttribute("data-search-type", "book");
  await expect(firstResult).toContainText("LIBRO · Genesi");

  await searchInput.fill("Genesi 1");
  await expect(firstResult).toHaveAttribute("data-search-type", "chapter");
  await expect(firstResult).toContainText("CAPITOLO · Genesi 1");

  await searchInput.fill("Genesi 1:1");
  await expect(firstResult).toHaveAttribute("data-search-type", "reference");
  await expect(firstResult).toContainText("BRANO ESATTO · Genesi 1:1");
  await firstResult.click();
  await expect(page).toHaveURL(/\/diodati\/b\/genesis\/c\/1\/v\/1$/);

  await searchInput.fill("principo cielo");
  const fuzzyResult = page.locator("#search-results .search-result").filter({ hasText: "Genesi 1:1" });
  await expect(fuzzyResult).toHaveCount(1);
  await expect(fuzzyResult).toContainText("NEL principio");
});

test("loads Luther with the LUX code, German search, and yellow-red theme", async ({ page }) => {
  await page.goto("/licht/b/genesis/c/1/v/1");

  await expect(page).toHaveURL(/\/licht\/b\/genesis\/c\/1\/v\/1$/);
  await expect(page.locator("#edition-select-code")).toHaveText("LUX");
  await expect(page.locator("#edition-select-label")).toHaveText("Lutherbibel · Deutsch");
  await page.locator("#edition-select").click();
  await expect(page.locator("#edition-option-luther1912 .edition-option-mark")).toHaveText("LUX");
  await expect(page.locator("#edition-option-luther1912 .edition-option-description small")).toHaveText("Luther Bible (1912)");
  await page.locator("#edition-select").click();

  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.locator("body")).toHaveClass(/is-luther1912-edition/);
  await expect(page.locator("#verse-1 .verse-text")).toHaveText("Am Anfang schuf Gott Himmel und Erde.");
  await expect(page.locator("#edition-attribution a")).toHaveAttribute(
    "href",
    "https://ebible.org/details.php?id=deu1912",
  );
  expect(await page.locator("#verse-1 .verse-text").evaluate((element) =>
    getComputedStyle(element).fontFamily.includes("Gelasio"),
  )).toBe(true);
  expect(await page.locator("body").evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--canvas").trim(),
  )).toBe("#fff8df");
  const backdrop = await page.locator("body").evaluate((element) =>
    getComputedStyle(element, "::before").backgroundImage,
  );
  expect(backdrop).toContain("linear-gradient");
  expect(backdrop).toContain("185, 83, 75");

  const searchInput = page.locator("#search-input");
  const firstResult = page.locator("#search-results .search-result").first();
  await searchInput.fill("1 Mo");
  await expect(firstResult).toHaveAttribute("data-search-type", "book");
  await expect(firstResult).toContainText("BUCH · 1 Mose");

  await searchInput.fill("Johannes 3");
  await expect(firstResult).toHaveAttribute("data-search-type", "chapter");
  await expect(firstResult).toContainText("KAPITEL · Johannes 3");

  await searchInput.fill("Johannes 3:16");
  await expect(firstResult).toHaveAttribute("data-search-type", "reference");
  await expect(firstResult).toContainText("GENAUE TEXTSTELLE · Johannes 3:16");
  await firstResult.click();
  await expect(page).toHaveURL(/\/licht\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#verse-16 .verse-text")).toContainText("Also hat Gott die Welt geliebt");

  await searchInput.fill("wüst schwebte");
  await expect(page.locator("#search-results .search-result").filter({ hasText: "1 Mose 1:2" }).first())
    .toContainText("wüst und leer");

  await searchInput.fill("Anfangg Erde");
  await expect(page.locator("#search-results .search-result").filter({ hasText: "1 Mose 1:1" }))
    .toHaveCount(1);
});

test("supports Japanese JapBungo search", async ({ page }) => {
  await page.goto("/japbungo");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator("body")).toHaveClass(/is-japbungo-edition/);
  await page.locator("#search-input").fill("ニコデモ");
  await expect(page.locator("#search-results .search-result").first()).toContainText("ニコデモ");
});

test("labels and copies Korean JapBungo fallback verses", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const fallbackCases = [
    ["exodus", 7, 25, true],
    ["2-samuel", 19, 25, true],
    ["2-chronicles", 2, 13, true],
    ["3-john", 1, 15, false],
  ];

  for (const [book, chapter, verse, hasKJVReference] of fallbackCases) {
    await page.goto(`/japbungo/b/${book}/c/${chapter}/v/${verse}`);
    const fallbackText = page.locator(`#verse-${verse} .verse-text`);
    await expect(fallbackText).toHaveAttribute("lang", "ko");
    const krvFallback = fallbackText.locator(".verse-source-panel--krv");
    await expect(krvFallback.locator(".verse-source-label")).toHaveText("KRV代替本文");
    await expect(krvFallback).toHaveCSS("background-image", /linear-gradient/);
    const koreanVerse = (await krvFallback.locator(".verse-source-panel-text").textContent()).trim();
    const kjvReference = fallbackText.locator(".verse-kjv-reference");
    let englishVerse = "";
    if (hasKJVReference) {
      await expect(kjvReference).toHaveAttribute("lang", "en");
      await expect(kjvReference.locator(".verse-kjv-reference-label")).toHaveText("KJV参照");
      await expect(kjvReference).toHaveCSS("background-color", "rgb(246, 244, 249)");
      await expect(kjvReference).toHaveCSS("font-family", /Gelasio/);
      englishVerse = (await kjvReference.locator(".verse-source-panel-text").textContent()).trim();
    } else {
      await expect(kjvReference).toHaveCount(0);
    }

    await page.locator(`#verse-${verse}`).click();
    await page.locator("#copy-selected-verses").click();
    await page.locator("#share-language-menu [data-edition='japbungo']").click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("[KRV代替本文]");
    const copiedText = await page.evaluate(() => navigator.clipboard.readText());
    const citation = copiedText.split("\n\n").at(-1);
    const expectedVerseText = hasKJVReference
      ? `${koreanVerse} [KRV代替本文]\n\n${englishVerse} [KJV参照]`
      : `${koreanVerse} [KRV代替本文]`;
    expect(copiedText).toBe(`"${expectedVerseText}"\n\n${citation}`);
    expect(citation).toMatch(/^- .+ \d+:\d+$/u);
  }
});
