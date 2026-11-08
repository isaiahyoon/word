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