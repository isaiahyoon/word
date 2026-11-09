import { expect, test } from "./support/browser-test.mjs";

test("copies consecutive verses on every edition as separate lines with a compressed citation", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const editions = [
    ["kjv", "kjv", "John"],
    ["krv", "krv", "요한복음"],
    ["diodati", "diodati", "Giovanni"],
    ["luther1912", "licht", "Johannes"],
    ["japbungo", "japbungo", "ヨハネの福音書"],
    ["alm1911", "alm", "João"],
  ];

  for (const [editionId, routeSegment, displayBook] of editions) {
    await page.goto(`/${routeSegment}/b/john/c/3/v/16`);
    const verses = [16, 17, 18];
    const expectedLines = await Promise.all(verses.map(async (number) =>
      (await page.locator(`#verse-${number} .verse-text`).textContent()).trim(),
    ));

    for (const number of verses) await page.locator(`#verse-${number}`).click();
    await page.locator("#copy-selected-verses").click();
    await page.locator(`#share-language-menu [data-edition='${editionId}']`).click();

    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`"${expectedLines.join("\n\n")}"\n\n- ${displayBook} 3:16-18`);
  }
});

test("copies a KJV psalm with a singular citation", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/psalms/c/3/v/1");
  const text = (await page.locator("#verse-1 .verse-text").textContent()).trim();
  await page.locator("#verse-1").click();
  await page.locator("#copy-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='kjv']").click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`"${text}"\n\n- Psalm 3:1`);
});

test("copies the French Martin verse aligned to KJV Psalm 42:5 with both references", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/psalms/c/42/v/5");
  await page.locator("#verse-5").click();
  await page.locator("#copy-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='martin1744']").click();

  const frenchVerse = await page.evaluate(async () => {
    const data = await (await fetch("/scripture/martin1744/books/19_psalms.json")).json();
    return data["42"][5][1].trim();
  });
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`"${frenchVerse}"\n\n- Psaumes 42:6\n- KJV reference: Psalm 42:5`);
});

test("copies Almeida's combined 2 Corinthians verse with its full KJV reference", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/2-corinthians/c/13/v/12");
  await page.locator("#verse-12").click();
  await page.locator("#copy-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='alm1911']").click();

  const portugueseVerse = await page.evaluate(async () => {
    const data = await (await fetch("/scripture/alm1911/books/47_2_corinthians.json")).json();
    return data["13"][11][1].trim();
  });
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`"${portugueseVerse}"\n\n- 2 Coríntios 13:12\n- KJV reference: 2 Corinthians 13:12-13`);
});

test("blocks cross-edition copying where verse alignment is not verified", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/numbers/c/12/v/1");
  await page.evaluate(() => navigator.clipboard.writeText("unchanged"));
  await page.locator("#verse-1").click();
  await page.locator("#copy-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='martin1744']").click();

  await expect(page.locator("#copy-status"))
    .toHaveText("These verses cannot be matched confidently to the chosen edition. Nothing was copied or shared.");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("unchanged");
});

for (const example of [
  { route: "kjv/b/psalms/c/3/v/1", source: [1], target: "martin1744", file: "19_psalms.json", chapter: 3, verses: [2], citation: "Psaumes 3:2\n- KJV reference: Psalm 3:1" },
  { route: "moh/b/psalms/c/3/v/2", source: [2], target: "kjv", file: "19_psalms.json", chapter: 3, verses: [1], citation: "Psalm 3:1" },
  { route: "kjv/b/psalms/c/51/v/10", source: [10], target: "martin1744", file: "19_psalms.json", chapter: 51, verses: [12], citation: "Psaumes 51:12\n- KJV reference: Psalm 51:10" },
  { route: "moh/b/psalms/c/51/v/12", source: [12], target: "kjv", file: "19_psalms.json", chapter: 51, verses: [10], citation: "Psalm 51:10" },
  { route: "kjv/b/2-corinthians/c/13/v/13", source: [13], target: "martin1744", file: "47_2_corinthians.json", chapter: 13, verses: [12], citation: "2 Corinthiens 13:12\n- KJV reference: 2 Corinthians 13:12-13" },
  { route: "moh/b/2-corinthians/c/13/v/12", source: [12], target: "kjv", file: "47_2_corinthians.json", chapter: 13, verses: [12, 13], citation: "2 Corinthians 13:12-13" },
  { route: "kjv/b/3-john/c/1/v/14", source: [14], target: "martin1744", file: "64_3_john.json", chapter: 1, verses: [14, 15], citation: "3 Jean 1:14-15\n- KJV reference: 3 John 1:14" },
  { route: "moh/b/3-john/c/1/v/15", source: [15], target: "kjv", file: "64_3_john.json", chapter: 1, verses: [14], citation: "3 John 1:14" },
  { route: "kjv/b/1-samuel/c/30/v/1", source: [1], target: "krv", file: "9_1_samuel.json", chapter: 30, verses: [1], citation: "사무엘상 30:1" },
  { route: "kjv/b/1-samuel/c/30/v/31", source: [31], target: "krv", file: "9_1_samuel.json", chapter: 30, verses: [30], citation: "사무엘상 30:30\n- KJV reference: 1 Samuel 30:30-31" },
  { route: "krv/b/1-samuel/c/30/v/30", source: [30], target: "kjv", file: "9_1_samuel.json", chapter: 30, verses: [30, 31], citation: "1 Samuel 30:30-31" },
  { route: "kjv/b/song-of-solomon/c/6/v/13", source: [13], target: "krv", file: "22_song_of_solomon.json", chapter: 6, verses: [13, 14], citation: "아가 6:13-14\n- KJV reference: Song of Solomon 6:13" },
  { route: "krv/b/song-of-solomon/c/6/v/14", source: [14], target: "kjv", file: "22_song_of_solomon.json", chapter: 6, verses: [13], citation: "Song of Solomon 6:13" },
  { route: "kjv/b/2-corinthians/c/13/v/12", source: [12], target: "krv", file: "47_2_corinthians.json", chapter: 13, verses: [11], citation: "고린도후서 13:11\n- KJV reference: 2 Corinthians 13:11-12" },
  { route: "krv/b/2-corinthians/c/13/v/12", source: [12], target: "kjv", file: "47_2_corinthians.json", chapter: 13, verses: [13], citation: "2 Corinthians 13:13" },
  { route: "kjv/b/3-john/c/1/v/14", source: [14], target: "krv", file: "64_3_john.json", chapter: 1, verses: [14, 15], citation: "요한3서 1:14-15\n- KJV reference: 3 John 1:14" },
  { route: "krv/b/3-john/c/1/v/15", source: [15], target: "kjv", file: "64_3_john.json", chapter: 1, verses: [14], citation: "3 John 1:14" },
  { route: "krv/b/3-john/c/1/v/15", source: [15], target: "japbungo", file: "64_3_john.json", chapter: 1, verses: [14], citation: "ヨハネの手紙Ⅲ 1:14" },
]) {
  test(`copies aligned verses from ${example.route} to ${example.target}`, async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/${example.route}`);
    for (const verse of example.source) await page.locator(`#verse-${verse}`).click();
    await page.locator("#copy-selected-verses").click();
    await page.locator(`#share-language-menu [data-edition='${example.target}']`).click();

    const text = await page.evaluate(async ({ target, file, chapter, verses }) => {
      const response = await fetch(`/scripture/${target}/books/${file}`);
      if (!response.ok) throw new Error(`Could not load ${target} test verses`);
      const data = await response.json();
      return verses.map((verse) => data[chapter][verse - 1][1].trim()).join("\n\n");
    }, example);
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`"${text}"\n\n- ${example.citation}`);
  });
}

test("does not copy a Martin numbered heading into the KJV", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/moh/b/psalms/c/51/v/2");
  await page.evaluate(() => navigator.clipboard.writeText("unchanged"));
  await page.locator("#verse-2").click();
  await page.locator("#copy-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='kjv']").click();
  await expect(page.locator("#copy-status")).not.toBeEmpty();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("unchanged");
});

test("does not copy the Martin epistle verse containing a source separator", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/2-corinthians/c/13/v/14");
  await page.evaluate(() => navigator.clipboard.writeText("unchanged"));
  await page.locator("#verse-14").click();
  await page.locator("#copy-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='martin1744']").click();
  await expect(page.locator("#copy-status")).not.toBeEmpty();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("unchanged");
});

test("preserves a two-heading Psalm passage when switching editions", async ({ page }) => {
  await page.goto("/kjv/b/psalms/c/51/v/10");
  await page.locator("#verse-10").click();
  await page.locator("#edition-select").click();
  await page.locator("#edition-option-martin1744").click();
  await expect(page).toHaveURL(/\/moh\/b\/psalms\/c\/51\/v\/12$/);
  await expect(page.locator("#verse-12")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#edition-select").click();
  await page.locator("#edition-option-kjv").click();
  await expect(page).toHaveURL(/\/kjv\/b\/psalms\/c\/51\/v\/10$/);
  await expect(page.locator("#verse-10")).toHaveAttribute("aria-pressed", "true");
});

test("keeps the same canonical passage selected when switching between KJV and Martin", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/psalms/c/42/v/5");
  await page.locator("#verse-5").click();
  await page.locator("#edition-select").click();
  await page.locator("#edition-option-martin1744").click();

  await expect(page).toHaveURL(/\/moh\/b\/psalms\/c\/42\/v\/6$/);
  await expect(page.locator("#verse-6")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#copy-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='kjv']").click();

  const kjvVerse = await page.evaluate(async () => {
    const data = await (await fetch("/scripture/kjv/books/19_psalms.json")).json();
    return data["42"][4][1].trim();
  });
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`"${kjvVerse}"\n\n- Psalm 42:5`);
});

test("preserves a split KRV passage when switching editions", async ({ page }) => {
  await page.goto("/kjv/b/song-of-solomon/c/6/v/13");
  await page.locator("#verse-13").click();
  await page.locator("#edition-select").click();
  await page.locator("#edition-option-krv").click();

  await expect(page).toHaveURL(/\/krv\/b\/song-of-solomon\/c\/6\/v\/13$/);
  await expect(page.locator("#verse-13")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#verse-14")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#edition-select").click();
  await page.locator("#edition-option-kjv").click();
  await expect(page).toHaveURL(/\/kjv\/b\/song-of-solomon\/c\/6\/v\/13$/);
  await expect(page.locator("#verse-13")).toHaveAttribute("aria-pressed", "true");
});

test("copies selected verses with Command+C", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/isaiah/c/3/v/10");
  const verses = [21, 10];
  const expectedText = (await Promise.all(verses.map(async (number) => ({
    number,
    text: await page.locator(`#verse-${number} .verse-text`).textContent(),
  })))).sort((left, right) => left.number - right.number).map((verse) => verse.text).join("\n\n");

  for (const number of verses) await page.locator(`#verse-${number}`).click();
  await page.keyboard.press("Meta+C");

  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`"${expectedText}"\n\n- Isaiah 3:10, 21`);
});

test("copies selected verses with Control+C", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/isaiah/c/3/v/10");
  const verses = [21, 10];
  const expectedText = (await Promise.all(verses.map(async (number) => ({
    number,
    text: await page.locator(`#verse-${number} .verse-text`).textContent(),
  })))).sort((left, right) => left.number - right.number).map((verse) => verse.text).join("\n\n");

  for (const number of verses) await page.locator(`#verse-${number}`).click();
  await page.keyboard.press("Control+C");

  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`"${expectedText}"\n\n- Isaiah 3:10, 21`);
});

test("fills the currently focused verse when it is selected for copying", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  const focusedVerse = page.locator("#verse-16");
  const otherVerse = page.locator("#verse-17");
  await otherVerse.click();
  await focusedVerse.click();

  await expect(focusedVerse).toHaveAttribute("aria-pressed", "true");
  await expect(focusedVerse).toHaveCSS("background-color", "rgba(169, 124, 53, 0.09)");
  await expect(otherVerse).toHaveCSS("background-color", "rgba(169, 124, 53, 0.09)");
});

test("copies staggered verses in chapter order with separated reference ranges", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/kjv/b/isaiah/c/3/v/10");
  const verses = [22, 10, 21];
  const expectedText = (await Promise.all(verses.map(async (number) => ({
    number,
    text: await page.locator(`#verse-${number} .verse-text`).textContent(),
  })))).sort((left, right) => left.number - right.number).map((verse) => verse.text).join("\n\n");

  for (const number of verses) await page.locator(`#verse-${number}`).click();
  await page.locator("#copy-selected-verses").click();
  await page.locator("#share-language-menu [data-edition='kjv']").click();

  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`"${expectedText}"\n\n- Isaiah 3:10, 21-22`);
});

for (const viewport of [
  { width: 390, height: 844, label: "mobile" },
  { width: 1280, height: 900, label: "desktop" },
]) {
  test(`links Buy Me a Coffee directly from the footer on ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    const supportLink = page.locator(".site-footer-coffee");

    await expect(supportLink).toBeVisible();
    await expect(supportLink).toHaveAttribute("href", "https://buymeacoffee.com/isaiahyoon");
    await expect(supportLink).toHaveAttribute("target", "_blank");
    await expect(supportLink).toHaveAttribute("rel", "noopener noreferrer");
    await expect(page.locator('script[data-name="BMC-Widget"]')).toHaveCount(0);
    const footerLinks = page.locator('.site-footer a[target="_blank"]');
    await expect(footerLinks.locator(".external-link-icon svg")).toHaveCount(3);
    expect((await footerLinks.allTextContents()).join(" ")).not.toContain("↗");
    const iconGaps = await footerLinks.evaluateAll((links) => links.map((link) => {
      const label = link.querySelector(".footer-link-label").getBoundingClientRect();
      const icon = link.querySelector(".external-link-icon svg").getBoundingClientRect();
      return icon.left - label.right;
    }));
    expect(iconGaps).toEqual([4, 4, 4]);
  });
}

for (const shortcut of ["Meta+X", "Control+X"]) {
  test(`copies and clears selected verses with ${shortcut}`, async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/kjv/b/isaiah/c/3/v/10");
    const verses = [21, 10];
    const expectedText = (await Promise.all(verses.map(async (number) => ({
      number,
      text: await page.locator(`#verse-${number} .verse-text`).textContent(),
    })))).sort((left, right) => left.number - right.number).map((verse) => verse.text).join("\n\n");

    for (const number of verses) await page.locator(`#verse-${number}`).click();
    await page.keyboard.press(shortcut);

    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`"${expectedText}"\n\n- Isaiah 3:10, 21`);
    await expect(page.locator("#verse-10")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#verse-21")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#verse-actions")).toBeHidden();
  });
}

test("uses the Korean UI font for KRV bottom chapter navigation", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  const kjvFont = await page.locator("#bottom-next strong").evaluate((element) =>
    getComputedStyle(element).fontFamily,
  );

  await page.goto("/krv/b/john/c/3/v/16");
  const krvTitle = page.locator("#bottom-next strong");
  await expect(krvTitle).toHaveCSS("font-family", /Noto Serif KR/);
  const krvFont = await krvTitle.evaluate((element) => getComputedStyle(element).fontFamily);

  expect(kjvFont).toContain("Gelasio");
  expect(krvFont).not.toBe(kjvFont);
});

test("styles the optional-passage checkbox and feedback exit control", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#feedback-open").click();
  const passageOption = page.locator(".feedback-passage-option");
  const checkbox = page.locator("#feedback-include-passage");
  const closeButton = page.locator("#feedback-close");

  await expect(passageOption).toHaveCSS("border-radius", "5px");
  await expect(passageOption).toHaveCSS("background-image", /linear-gradient/);
  await checkbox.check();
  await expect(passageOption).toHaveCSS("border-top-color", "rgba(49, 88, 99, 0.42)");
  await expect(checkbox).toHaveCSS("appearance", "none");
  await expect(checkbox).toHaveCSS("border-top-color", "rgb(49, 88, 99)");

  await closeButton.hover();
  await expect(closeButton).toHaveCSS("border-radius", "50%");
  await expect(closeButton).toHaveCSS("border-top-color", "rgb(223, 198, 129)");
  await expect(closeButton).toHaveCSS("box-shadow", /72, 65, 99/);
});

test("submits the URL-focused feedback passage only by consent", async ({ page }) => {
  let submittedForm;
  await page.route("**/*", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    submittedForm = new URLSearchParams(route.request().postData() ?? "");
    await route.fulfill({ status: 200, contentType: "text/plain", body: "ok" });
  });
  await page.goto("/kjv/b/john/c/3/v/16-17");
  await page.locator("#feedback-open").click();

  const dialog = page.locator("#feedback-dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#feedback-include-passage")).not.toBeChecked();
  await expect(page.locator("#feedback-category-trigger")).toBeFocused();
  await page.locator("#feedback-close").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/16-17$/);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.locator("#feedback-open").click();
  await page.locator("#feedback-message").fill("The KRV page feels lovely on mobile.");
  await page.locator("#feedback-submit").click();
  await expect(page.locator("#feedback-category-error")).toBeVisible();
  await expect(page.locator("#feedback-category-trigger")).toHaveAttribute("aria-invalid", "true");

  const categoryTrigger = page.locator("#feedback-category-trigger");
  const categoryOptions = page.locator("#feedback-category-options");
  await categoryTrigger.click();
  await expect(categoryOptions).toBeVisible();
  await expect(categoryOptions).toHaveCSS("background-color", "rgb(255, 254, 240)");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(categoryTrigger).toContainText("A bright idea");
  await expect(categoryOptions).toBeHidden();
  await page.locator("#feedback-include-passage").check();
  await page.locator("#feedback-submit").click();

  await expect(page.locator("#feedback-success")).toBeVisible();
  expect(submittedForm.get("form-name")).toBe("reader-feedback");
  expect(submittedForm.get("category")).toBe("idea");
  expect(submittedForm.get("message")).toBe("The KRV page feels lovely on mobile.");
  expect(submittedForm.get("email")).toBe("");
  expect(submittedForm.get("passage")).toBe("John 3:16-17");
  expect(submittedForm.get("bot-field")).toBe("");
});