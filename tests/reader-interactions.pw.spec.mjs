import { expect, test } from "./support/browser-test.mjs";

test("localizes reader navigation and accessible controls for every edition", async ({ page }) => {
  const editions = [
    { route: "/kjv", language: "en", navigation: "Open book navigation", previous: "Previous chapter:", chapter: "Choose Genesis chapter", chapterOption: "Genesis chapter 2", testament: "Old", offlineStatus: "Not saved for offline", save: "Save", cut: "Cut", previewAlt: "The Word prism sword emblem beside the Scripture reader name", shortcutTitle: "Keyboard shortcuts", shortcutHome: "Go to homepage", feedbackTitle: "Leave me a note", feedbackBug: "A small snag" },
    { route: "/krv", language: "ko", navigation: "책 탐색 열기", previous: "이전 장:", chapter: "창세기 장 선택", chapterOption: "창세기 2장", testament: "구약", offlineStatus: "오프라인 저장 안 됨", save: "저장", cut: "잘라내기", previewAlt: "성경 읽기 서비스 이름 옆에 있는 The Word 프리즘 검 문양", shortcutTitle: "키보드 단축키", shortcutHome: "홈페이지로 이동", feedbackTitle: "의견 남기기", feedbackBug: "작은 문제" },
    { route: "/diodati", language: "it", navigation: "Apri la navigazione dei libri", previous: "Capitolo precedente:", chapter: "Scegli il capitolo di Genesi", chapterOption: "Genesi, capitolo 2", testament: "Antico", offlineStatus: "Non salvata per l’uso offline", save: "Salva", cut: "Taglia", previewAlt: "Emblema della spada prismatica di The Word accanto al nome del lettore biblico", shortcutTitle: "Scorciatoie da tastiera", shortcutHome: "Vai alla pagina iniziale", feedbackTitle: "Lasciami un messaggio", feedbackBug: "Un piccolo problema" },
    { route: "/licht", language: "de", navigation: "Buchnavigation öffnen", previous: "Vorheriges Kapitel:", chapter: "Kapitel von ", chapterOption: "1 Mose, Kapitel 2", testament: "Altes", offlineStatus: "Nicht offline gespeichert", save: "Speichern", cut: "Ausschneiden", previewAlt: "Prismenschwert-Emblem von The Word neben dem Namen des Bibelleseprogramms", shortcutTitle: "Tastenkürzel", shortcutHome: "Zur Startseite", feedbackTitle: "Hinterlasse eine Nachricht", feedbackBug: "Ein kleines Problem" },
    { route: "/japbungo", language: "ja", navigation: "書名ナビゲーションを開く", previous: "前の章：", chapter: "創世記の章を選択", chapterOption: "創世記 2章", testament: "旧約", offlineStatus: "オフライン用に未保存", save: "保存", cut: "切り取る", previewAlt: "聖書リーダー名の横にあるThe Wordのプリズムの剣の紋章", shortcutTitle: "キーボードショートカット", shortcutHome: "ホームページへ移動", feedbackTitle: "ご意見をお聞かせください", feedbackBug: "小さな不具合" },
    { route: "/moh", language: "fr", navigation: "Ouvrir la navigation des livres", previous: "Chapitre précédent :", chapter: "Choisir le chapitre de Genèse", chapterOption: "Genèse, chapitre 2", testament: "Ancien", offlineStatus: "Non enregistré hors connexion", save: "Enregistrer", cut: "Couper", previewAlt: "Emblème de l’épée prismatique de The Word à côté du nom du lecteur biblique", shortcutTitle: "Raccourcis clavier", shortcutHome: "Aller à la page d’accueil", feedbackTitle: "Laissez-moi un mot", feedbackBug: "Un petit souci" },
  ];

  for (const edition of editions) {
    await page.goto(`${edition.route}/b/genesis/c/1`);
    await expect(page.locator("#verse-1")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", edition.language);
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", edition.previewAlt ?? "The Word prism sword emblem beside the Scripture reader name");
    await expect(page.locator("#menu-toggle")).toHaveAttribute("aria-label", edition.navigation);
    await expect(page.locator("#edition-offline-status")).toHaveText(edition.offlineStatus);
    await expect(page.locator("#edition-offline-action")).toHaveText(edition.save);
    await expect(page.locator("#cut-selected-verses")).toHaveText(edition.cut);
    await expect(page.locator("#search-input")).toHaveAttribute("aria-label", edition.language === "en" ? "Search Scripture" : {
      ko: "성경 검색",
      it: "Cerca nelle Scritture",
      de: "In der Bibel suchen",
      ja: "聖書を検索",
      fr: "Rechercher dans les Écritures",
    }[edition.language]);
    await expect(page.locator(".testament-tabs [role='tab']").first()).toContainText(edition.testament);
    expect(await page.locator("#previous-chapter").getAttribute("aria-label")).toContain(edition.previous);
    expect(await page.locator("#chapter-select").getAttribute("aria-label")).toContain(edition.chapter);
    await page.locator("#chapter-select").click();
    await expect(page.locator('#chapter-options-list [data-chapter="2"]')).toHaveAttribute("aria-label", edition.chapterOption);
    await page.locator('#chapter-options-list [data-chapter="2"]').click();

    await page.locator("#shortcuts-open").click();
    await expect(page.locator("#shortcuts-title")).toHaveText(edition.shortcutTitle);
    await expect(page.locator(".shortcut-row--home > span")).toHaveText(edition.shortcutHome);
    await expect(page.locator("#shortcuts-close")).toHaveAttribute("aria-label", {
      en: "Close keyboard shortcuts",
      ko: "키보드 단축키 닫기",
      it: "Chiudi le scorciatoie da tastiera",
      de: "Tastenkürzel schließen",
      ja: "キーボードショートカットを閉じる",
      fr: "Fermer les raccourcis clavier",
    }[edition.language]);
    await page.locator("#shortcuts-close").click();

    await page.locator("#feedback-open").click();
    await expect(page.locator("#feedback-title")).toHaveText(edition.feedbackTitle);
    await page.locator("#feedback-category-trigger").click();
    await expect(page.locator("[data-value='bug'] .feedback-option-title")).toHaveText(edition.feedbackBug);
    await page.locator("#feedback-close").click();
  }

  await page.goto("/kjv/b/genesis/c/1");
  await page.locator("#edition-select").click();
  await page.locator("#edition-option-krv").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.locator("#menu-toggle")).toHaveAttribute("aria-label", "책 탐색 열기");
  await expect(page.locator("#edition-offline-status")).toHaveText("오프라인 저장 안 됨");
});

test("centers the chapter picker within a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#chapter-select").click();

  const popover = page.locator(".chapter-popover");
  await expect(popover).toBeVisible();
  await expect(popover).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");

  const [bounds, triggerBounds] = await Promise.all([
    popover.boundingBox(),
    page.locator("#chapter-select").boundingBox(),
  ]);
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(triggerBounds).not.toBeNull();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
  expect(Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2)).toBeLessThan(1);
  expect(Math.abs(bounds.y - triggerBounds.y - triggerBounds.height - 9)).toBeLessThan(1);
});

test("frames the testament tabs and gives the active tab a raised finish", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  const tabs = page.locator(".testament-tabs");
  const activeTab = page.locator('.testament-tab[aria-selected="true"]');

  await expect(tabs).toHaveCSS("border-top-color", "rgba(169, 124, 53, 0.4)");
  await expect(tabs).toHaveCSS("box-shadow", /169, 124, 53/);
  await expect(activeTab).toHaveCSS("border-top-color", "rgba(169, 124, 53, 0.35)");
  await expect(activeTab).toHaveCSS("box-shadow", /223, 198, 129/);
});

test("uses a yellow-pink gradient for focused verses", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  const verse = page.locator("#verse-16");
  await expect(verse).toHaveClass(/is-focused/);
  await expect(verse).toHaveCSS("animation-name", "none");
  const highlight = await verse.evaluate((element) => ({
    animation: getComputedStyle(element, "::before").animationName,
    radius: getComputedStyle(element, "::before").borderRadius,
    gradient: getComputedStyle(element, "::before").backgroundImage,
  }));
  expect(highlight.animation).toBe("verse-glow");
  expect(highlight.radius).toBe("6px");
  expect(highlight.gradient).toContain("rgb(255, 254, 207)");
  expect(highlight.gradient).toContain("rgb(250, 212, 224)");
});

test("renders edition-colored dotted scripture pages without mobile overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kjv/b/john/c/3/v/16");
  const verseList = page.locator("#verse-list");
  const getPageStyle = () => verseList.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      dot: style.getPropertyValue("--journal-dot").trim(),
      paper: style.getPropertyValue("--journal-paper").trim(),
      background: style.backgroundImage,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    };
  });

  const kjvPage = await getPageStyle();
  expect(kjvPage.background).toContain("radial-gradient");
  expect(kjvPage.background).toContain("linear-gradient");
  expect(kjvPage.background).not.toContain("189, 121, 152");
  expect(kjvPage.paper).toBe("#f6f5ff");
  expect(kjvPage.scrollWidth).toBe(kjvPage.clientWidth);

  await page.locator("#menu-toggle").click();
  await page.locator("#edition-select").click();
  await page.locator("#edition-option-krv").click();
  await expect(page.locator("body")).toHaveClass(/is-krv-edition/);
  const krvPage = await getPageStyle();
  expect(krvPage.paper).toBe("#f1faf5");
  expect(krvPage.dot).not.toBe(kjvPage.dot);
  expect(krvPage.background).not.toContain("196, 123, 139");
  expect(krvPage.scrollWidth).toBe(krvPage.clientWidth);
});

test("styles the active book row with a metallic blue finish", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  const activeBook = page.locator('.book-row[aria-current="page"]');
  const style = await activeBook.evaluate((element) => ({
    background: getComputedStyle(element).backgroundImage,
    shadow: getComputedStyle(element).boxShadow,
    text: getComputedStyle(element).color,
  }));
  expect(style.background).toContain("linear-gradient");
  expect(style.background).toContain("rgb(223, 198, 129)");
  expect(style.shadow).toContain("49, 88, 99");
  expect(style.text).toBe("rgb(34, 59, 85)");
});

test("styles the active Diodati book row with a rose gradient", async ({ page }) => {
  await page.goto("/diodati/b/genesis/c/1/v/1");
  const activeBook = page.locator('.book-row[aria-current="page"]');
  const style = await activeBook.evaluate((element) => ({
    background: getComputedStyle(element).backgroundImage,
    shadow: getComputedStyle(element).boxShadow,
    text: getComputedStyle(element).color,
  }));
  expect(style.background).toContain("linear-gradient");
  expect(style.background).toContain("rgb(239, 205, 216)");
  expect(style.shadow).toContain("103, 66, 81");
  expect(style.text).toBe("rgb(64, 53, 62)");
});

test("selecting a chapter focuses verse one for arrow navigation", async ({ page }) => {
  await page.goto("/kjv/b/1-kings/c/18/v/2");
  await page.locator("#chapter-select").click();
  await page.locator('#chapter-options-list [data-chapter="9"]').click();

  await expect(page).toHaveURL(/\/kjv\/b\/1-kings\/c\/9\/v\/1$/);
  await expect(page.locator("#verse-1")).toBeFocused();

  await page.keyboard.press("ArrowDown");

  await expect(page).toHaveURL(/\/kjv\/b\/1-kings\/c\/9\/v\/2$/);
  await expect(page.locator("#verse-2")).toHaveClass(/is-focused/);
});

test("renders the wordmark with a muted brass body and navy outline", async ({ page }) => {
  await page.goto("/");
  const wordmark = page.locator(".brand-copy strong");
  await page.locator(".brand").hover();
  await expect(wordmark).toHaveCSS("-webkit-text-stroke-color", "rgb(34, 59, 85)");
  await expect(wordmark).toHaveCSS("-webkit-text-stroke-width", "0.45px");

  const fill = await wordmark.evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(fill).toContain("linear-gradient");
  expect(fill).toContain("rgb(188, 162, 106)");
  await expect.poll(() => wordmark.evaluate((element) =>
    getComputedStyle(element, "::after").animationName,
  )).toBe("text-glimmer");
});

test("accents the four-color brand mark without changing its spin", async ({ page }) => {
  await page.goto("/");
  const mark = page.locator(".brand-mark");
  const tiles = mark.locator("i");
  await expect(tiles).toHaveCount(4);
  expect(await tiles.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundColor))).toEqual([
    "rgb(222, 254, 252)",
    "rgb(220, 215, 247)",
    "rgb(250, 212, 224)",
    "rgb(214, 242, 185)",
  ]);
  expect(await tiles.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).borderTopLeftRadius))).toEqual([
    "5px",
    "1.5px",
    "1.5px",
    "1.5px",
  ]);
  await expect(tiles.first()).toHaveCSS("border-top-color", "rgba(34, 59, 85, 0.52)");
  expect(await tiles.first().evaluate((element) => getComputedStyle(element).boxShadow)).toContain("169, 124, 53");

  await mark.hover();
  await expect(mark).toHaveCSS("animation-name", "logo-spin-settle");
});

test("keeps shortcut keycaps inside the dialog on short mobile screens", async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 650 });
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#shortcuts-open").click();

  const dialog = page.locator("#shortcuts-dialog");
  const lastKey = dialog.locator(".shortcut-row--shortcuts kbd");
  await lastKey.scrollIntoViewIfNeeded();

  const [dialogBounds, keyBounds, scrollTop] = await Promise.all([
    dialog.boundingBox(),
    lastKey.boundingBox(),
    dialog.evaluate((element) => element.scrollTop),
  ]);
  expect(dialogBounds).not.toBeNull();
  expect(keyBounds).not.toBeNull();
  expect(dialogBounds.y).toBeGreaterThanOrEqual(0);
  expect(dialogBounds.y + dialogBounds.height).toBeLessThanOrEqual(650);
  expect(keyBounds.y).toBeGreaterThanOrEqual(dialogBounds.y);
  expect(keyBounds.y + keyBounds.height).toBeLessThanOrEqual(dialogBounds.y + dialogBounds.height);
  expect(scrollTop).toBeGreaterThan(0);
});

test("sets every shortcut keycap in the same font in every edition", async ({ page }) => {
  for (const route of ["/kjv", "/krv", "/diodati", "/licht", "/japbungo", "/moh"]) {
    await page.goto(`${route}/b/genesis/c/1/v/1`);
    await page.locator("#shortcuts-open").click();
    const fonts = await page.locator(".shortcut-row kbd").evaluateAll((keys) =>
      keys.map((key) => {
        const style = getComputedStyle(key);
        return `${style.fontFamily}|${style.fontSize}|${style.fontWeight}`;
      }),
    );
    expect(fonts.length).toBeGreaterThan(10);
    expect(new Set(fonts).size, route).toBe(1);
  }
});

test("shines shortcut keycaps on hover", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("#shortcuts-open").click();
  const keycap = page.locator(".shortcut-row kbd").first();
  await keycap.hover();

  await expect.poll(() => keycap.evaluate((element) =>
    getComputedStyle(element, "::after").animationName,
  )).toBe("shortcut-keycap-glint");
});

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
    ["/kjv", "en"],
  ]) {
    await page.keyboard.press("Tab");
    await expect(page).toHaveURL(new RegExp(`${route}/b/genesis/c/1/v/1$`));
    await expect(page.locator("#verse-list")).toHaveAttribute("lang", language);
    await expect.poll(() => page.evaluate(() => document.activeElement.tagName)).toBe("BODY");
  }

  for (const [route, language] of [
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

  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#search-input")).not.toBeFocused();
  await expect(page.locator(".search-results")).toBeHidden();
  await expect(page.locator(".verse:focus")).toHaveCount(0);
});

// Every overlay must hand Tab back to edition cycling once it closes.
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

test("keeps all editable text fields at 16px on touch devices", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const textControls = page.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]');
  const fontSizes = await textControls.evaluateAll((elements) => elements.map((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize),
  ));
  expect(fontSizes.length).toBeGreaterThan(0);
  expect(fontSizes.every((size) => size >= 16)).toBe(true);
});

test("prevents double-tap zoom on mobile while allowing pinch zoom", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator("body")).toHaveCSS("touch-action", "manipulation");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    "width=device-width, initial-scale=1",
  );
});

test("frames the shortcut question mark and styles the close control on hover", async ({ page }) => {
  await page.goto("/");
  const shortcutButton = page.locator("#shortcuts-open");
  const questionMark = shortcutButton.locator("span").first();
  await expect(questionMark).toHaveCSS("border-top-width", "1px");
  await expect(questionMark).toHaveCSS("border-top-color", "rgb(183, 147, 82)");

  await shortcutButton.hover();
  await expect(questionMark).toHaveCSS("border-top-color", "rgb(110, 159, 168)");
  await expect(questionMark).toHaveCSS("box-shadow", /169, 124, 53/);

  await shortcutButton.click();
  const closeButton = page.locator("#shortcuts-close");
  await closeButton.hover();
  await expect(closeButton).toHaveCSS("border-radius", "50%");
  await expect(closeButton).toHaveCSS("border-top-color", "rgb(169, 124, 53)");
  await expect(closeButton).toHaveCSS("box-shadow", /169, 124, 53/);
});

test("uses the picker root to distinguish inside and outside clicks", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#chapter-picker").evaluate((root) => {
    root.id = "custom-picker-root";
  });
  await page.locator("#chapter-select").click();
  await expect(page.locator(".chapter-popover")).toBeVisible();

  await page.locator("body").click({ position: { x: 2, y: 2 } });

  await expect(page.locator(".chapter-popover")).toBeHidden();
});

test("loads another search batch when the results panel scrolls to the bottom", async ({ page }) => {
  const searchCases = [
    ["kjv", "john", "John 3:16", "130 verses found · Showing 36"],
    ["diodati", "Iddio", "Giovanni 3:16", null],
  ];

  for (const [edition, query, reference, expectedSummary] of searchCases) {
    await page.goto(`/${edition}`);
    await page.locator("#verse-1").waitFor();
    const searchInput = page.locator("#search-input");
    const results = page.locator(".search-result");
    const searchResults = page.locator("#search-results");

    await searchInput.fill(query);
    await expect(results).toHaveCount(12);

    await searchResults.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await expect(page.locator("#search-results")).toBeVisible();
    await expect(searchInput).toHaveAttribute("aria-expanded", "true");
    await expect(results).toHaveCount(24);

    if (expectedSummary) {
      await searchResults.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect(results).toHaveCount(36);
      await expect(page.locator(".search-summary")).toContainText(expectedSummary);
    }

    await searchInput.fill(reference);
    await expect(results.first()).toHaveAttribute("data-search-type", "reference");
    const exactPassageLabel = edition === "diodati" ? "BRANO ESATTO" : "EXACT PASSAGE";
    await expect(results.first()).toContainText(`${exactPassageLabel} · ${reference}`);
  }
});

test("prioritizes Korean book, chapter, and exact-verse suggestions", async ({ page }) => {
  await page.goto("/krv");
  await page.locator("#verse-1").waitFor();
  const searchInput = page.locator("#search-input");
  const firstResult = page.locator(".search-result").first();

  await searchInput.fill("요한복음");
  await expect(firstResult).toHaveAttribute("data-search-type", "book");
  await expect(firstResult).toContainText("책 · 요한복음");

  await searchInput.fill("요한복음 1장");
  await expect(firstResult).toHaveAttribute("data-search-type", "chapter");
  await expect(firstResult).toContainText("장 · 요한복음 1장");

  await searchInput.fill("요한");
  await expect(firstResult).toHaveAttribute("data-search-type", "book");
  await expect(firstResult).toContainText("책 · 요한복음");
  await expect(page.locator(".search-result--navigation")).toHaveCount(5);

  await searchInput.fill("요한복음 １：１");
  await expect(firstResult).toHaveAttribute("data-search-type", "reference");
  await expect(firstResult).toContainText("정확한 본문 · 요한복음 1:1");
  await firstResult.click();
  await expect(page).toHaveURL(/\/krv\/b\/john\/c\/1\/v\/1$/);

  await searchInput.fill("하느님");
  const normalizedKoreanMatch = page.locator(".search-result mark").filter({ hasText: /하나님/ }).first();
  await expect(normalizedKoreanMatch).toBeVisible();
});

test("finds separated and misspelled words and highlights the matched verse terms", async ({ page }) => {
  await page.goto("/");
  await page.locator("#verse-1").waitFor();
  const searchInput = page.locator("#search-input");

  await searchInput.fill("piercing sword");
  let result = page.locator(".search-result").filter({ hasText: "Hebrews 4:12" });
  await expect(result).toHaveCount(1);
  await expect(result.locator("mark")).toHaveText(["sword", "piercing"]);

  await searchInput.fill("piercin sword");
  result = page.locator(".search-result").filter({ hasText: "Hebrews 4:12" });
  await expect(result).toHaveCount(1);
  await expect(result.locator("mark")).toHaveText(["sword", "piercing"]);
});

test("highlights the first search result and opens it with Enter", async ({ page }) => {
  await page.goto("/");
  await page.locator("#verse-1").waitFor();
  const searchInput = page.locator("#search-input");
  const firstResult = page.locator(".search-result").first();

  await searchInput.fill("piercing sword");
  await expect(firstResult).toContainText("Isaiah 27:1");
  await expect(firstResult).toHaveAttribute("aria-selected", "true");
  await expect(searchInput).toHaveAttribute("aria-activedescendant", "search-result-0");

  await searchInput.press("Enter");
  await expect(page).toHaveURL(/\/kjv\/b\/isaiah\/c\/27\/v\/1$/);
});

for (const openWith of ["Enter", "click"]) {
  test(`Tab cycles editions after opening a search result with ${openWith}`, async ({ page }) => {
    await page.goto("/");
    await page.locator("#verse-1").waitFor();
    const searchInput = page.locator("#search-input");

    await searchInput.fill("piercing sword");
    await expect(page.locator(".search-result").first()).toContainText("Isaiah 27:1");
    if (openWith === "Enter") await searchInput.press("Enter");
    else await page.locator(".search-result").first().click();
    await expect(page).toHaveURL(/\/kjv\/b\/isaiah\/c\/27\/v\/1$/);
    await expect(searchInput).not.toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page).toHaveURL(/\/krv\/b\/isaiah\/c\/27\/v\/1$/);
    await expect(page.locator(".search-results")).toBeHidden();
    await expect(searchInput).toHaveValue("");

    await page.keyboard.press("Shift+Tab");
    await expect(page).toHaveURL(/\/kjv\/b\/isaiah\/c\/27\/v\/1$/);
    await expect(page.locator(".search-results")).toBeHidden();
    await expect(searchInput).not.toBeFocused();
  });
}

test("Cmd+K scrolls all the way to the top when the focused search bar is offscreen", async ({ page }) => {
  await page.goto("/");
  const searchInput = page.locator("#search-input");
  await searchInput.focus();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(searchInput).not.toBeInViewport();

  await page.keyboard.press("Meta+k");

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(searchInput).toBeFocused();
  await expect(searchInput).toBeInViewport();
  const searchBox = page.locator(".search-box");
  await expect(searchBox).toHaveCSS("animation-name", "search-focus-glow");
  await expect(searchBox).toHaveCSS("animation-iteration-count", "infinite");

  await searchInput.evaluate((input) => input.blur());
  await expect(searchBox).toHaveCSS("animation-name", "none");
});

test("loads another search batch from a mobile touch scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#verse-1").waitFor();
  await page.locator("#search-input").fill("john");
  await expect(page.locator(".search-result")).toHaveCount(12);

  const searchResults = page.locator("#search-results");
  const bounds = await searchResults.boundingBox();
  expect(bounds).not.toBeNull();

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  const x = Math.round(bounds.x + bounds.width / 2);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 1, x, y: Math.round(bounds.y + bounds.height - 12) }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ id: 1, x, y: Math.max(1, Math.round(bounds.y - 120)) }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await session.detach();

  await expect(page.locator(".search-result")).toHaveCount(24);
});

test("refreshes the current passage only after a pull past the mobile threshold", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/kjv/b/john/c/3/v/16");
  await expect(page.locator("#verse-16")).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  const dispatchTouch = (type, y) => session.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: type === "touchEnd" ? [] : [{ id: 1, x: 5, y }],
  });

  await dispatchTouch("touchStart", 50);
  await dispatchTouch("touchMove", 90);
  await expect(page.locator("#pull-refresh-indicator")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#pull-refresh-label")).toHaveText("Pull down to refresh");
  await dispatchTouch("touchEnd", 90);
  await expect(page.locator("#pull-refresh-indicator")).toHaveAttribute("aria-hidden", "true");
  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/16$/);

  await dispatchTouch("touchStart", 50);
  await dispatchTouch("touchMove", 190);
  await expect(page.locator("#pull-refresh-label")).toHaveText("Release to refresh");
  const reloaded = page.waitForEvent("load");
  await dispatchTouch("touchEnd", 190);
  await reloaded;
  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/16$/);
  await session.detach();
});

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
  await expect(page.locator("#share-language-menu [data-edition]")).toHaveCount(7);
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
  await expect(page.locator("#share-language-menu [data-edition]")).toHaveCount(7);
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
  await expect(menu.locator("[data-edition]")).toHaveCount(7);

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

test("keeps selected-verse actions inside small mobile viewports across edition themes", async ({ page }) => {
  const editions = ["kjv", "krv", "moh"];
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
    content: "#edition-option-luther1912 .edition-option-description strong { width: 80px; }",
  });
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

test("routes an edition-only URL to Genesis 1:1 in that edition", async ({ page }) => {
  await page.goto("/krv");

  await expect(page).toHaveURL(/\/krv\/?$/);
  await expect(page.locator("body")).toHaveClass(/is-krv-edition/);
  await expect(page.locator("#verse-1 .verse-text")).toContainText("태초에 하나님이 천지를 창조하시니라");

  await page.goto("/diodati");
  await expect(page).toHaveURL(/\/diodati\/?$/);
  await expect(page.locator("body")).toHaveClass(/is-diodati-edition/);
  await expect(page.locator("#verse-1 .verse-text")).toContainText("NEL principio Iddio creò il cielo e la terra.");

  await page.goto("/licht");
  await expect(page).toHaveURL(/\/licht\/?$/);
  await expect(page.locator("body")).toHaveClass(/is-luther1912-edition/);
  await expect(page.locator("#verse-1 .verse-text")).toContainText("Am Anfang schuf Gott Himmel und Erde.");
});

test("omits 3 John 1:15 from the KJV edition", async ({ page }) => {
  await page.goto("/kjv/b/3-john/c/1");
  await expect(page.locator("#verse-14")).toBeVisible();
  await expect(page.locator("#verse-15")).toHaveCount(0);

  await page.goto("/kjv/b/3-john/c/1/v/15");
  await expect(page).toHaveTitle("Page Not Found — The Word");
});

test("supports keyboard navigation in the edition menu", async ({ page }) => {
  await page.goto("/");
  const trigger = page.locator("#edition-select");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#edition-options")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#edition-option-krv")).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/krv\/b\/genesis\/c\/1\/v\/1$/);
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "ko");
});

test("selects Diodati from the edition menu with the keyboard", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#edition-select").focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#edition-option-diodati")).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/diodati\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "it");
  await expect(page.locator("#edition-select-code")).toHaveText("DIO");
});

test("selects Luther from the edition menu with the keyboard", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#edition-select").focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#edition-option-luther1912")).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/licht\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "de");
  await expect(page.locator("#edition-select-code")).toHaveText("LUX");
});

test("Escape from the edition menu returns focus to the verse for arrow navigation", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  const trigger = page.locator("#edition-select");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#edition-options")).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(page.locator("#edition-options")).toBeHidden();
  await expect(page.locator("#verse-16")).toBeFocused();
  await page.keyboard.press("ArrowDown");

  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/17$/);
  await expect(page.locator("#verse-17")).toHaveClass(/is-focused/);
});

test("keeps the mobile navigation drawer open and focused after switching to KRV", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#menu-toggle").click();
  await page.locator("#edition-select").click();
  await page.locator("#edition-option-krv").click();

  await expect(page).toHaveURL(/\/krv\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#sidebar")).toHaveClass(/is-open/);
  await expect(page.locator('.book-row[aria-current="page"]')).toBeFocused();
  await expect(page.locator("#verse-list")).toHaveAttribute("lang", "ko");
  await expect(page.locator("#verse-16 .verse-text")).toContainText("하나님이 세상을 이처럼 사랑하사");
});

test("keeps the mobile navigation drawer above the verse action buttons", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#verse-16").click();
  await expect(page.locator("#verse-actions")).toHaveClass(/is-visible/);

  await page.locator("#menu-toggle").click();
  await expect(page.locator("#sidebar")).toHaveClass(/is-open/);
  await expect.poll(() => page.locator("#sidebar").evaluate((element) =>
    getComputedStyle(element).transform,
  )).toBe("matrix(1, 0, 0, 1, 0, 0)");

  const topElementIsDrawer = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("#verse-actions > button")];
    const sidebar = document.querySelector("#sidebar");
    const scrim = document.querySelector("#sidebar-scrim");
    return buttons.every((button) => {
      const box = button.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return sidebar.contains(top) || top === scrim;
    });
  });
  expect(topElementIsDrawer).toBe(true);
});

test("opens the mobile navigation drawer with a right swipe from the left edge", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#verse-1").waitFor();

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  const dispatchTouch = (type, x, y) => session.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: type === "touchEnd" ? [] : [{ id: 1, x, y }],
  });

  await dispatchTouch("touchStart", 5, 280);
  await dispatchTouch("touchMove", 85, 286);
  await dispatchTouch("touchMove", 155, 290);
  await dispatchTouch("touchEnd", 155, 290);

  await expect(page.locator("#sidebar")).toHaveClass(/is-open/);
  await expect(page.locator("#sidebar-scrim")).toHaveClass(/is-open/);
  await expect(page.locator("#menu-toggle")).toHaveAttribute("aria-expanded", "true");
  await session.detach();
});

test("closes the mobile navigation drawer with a left swipe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#menu-toggle").click();
  await expect(page.locator("#sidebar")).toHaveClass(/is-open/);
  await expect.poll(() => page.locator("#sidebar").evaluate((element) =>
    getComputedStyle(element).transform,
  )).toBe("matrix(1, 0, 0, 1, 0, 0)");

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  const dispatchTouch = (type, x, y) => session.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: type === "touchEnd" ? [] : [{ id: 1, x, y }],
  });

  await dispatchTouch("touchStart", 260, 350);
  await dispatchTouch("touchMove", 180, 354);
  await dispatchTouch("touchMove", 100, 358);
  await dispatchTouch("touchEnd", 100, 358);

  await expect(page.locator("#sidebar")).not.toHaveClass(/is-open/);
  await expect(page.locator("#sidebar-scrim")).not.toHaveClass(/is-open/);
  await expect(page.locator("#menu-toggle")).toHaveAttribute("aria-expanded", "false");
  await session.detach();
});

test("shows a back-to-top button on mobile and desktop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#verse-1").waitFor();
  const scrollToTop = page.locator("#scroll-to-top");

  await expect(scrollToTop).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(scrollToTop).toBeVisible();
  await scrollToTop.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(scrollToTop).toBeHidden();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(scrollToTop).toBeVisible();
  await scrollToTop.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(scrollToTop).toBeHidden();
});

for (const viewport of [
  { width: 390, height: 844, label: "mobile" },
  { width: 1280, height: 900, label: "desktop" },
]) {
  test(`keeps the back-to-top button in place when selecting verses on ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/kjv/b/john/c/3/v/16");
    const scrollToTop = page.locator("#scroll-to-top");

    await page.evaluate(() => window.scrollTo(0, 800));
    await expect(scrollToTop).toBeVisible();
    const positionBeforeSelection = await scrollToTop.boundingBox();
    await page.locator("#verse-16").click();
    await expect(page.locator("#verse-actions")).toBeVisible();
    const positionAfterSelection = await scrollToTop.boundingBox();

    expect(positionAfterSelection.x).toBe(positionBeforeSelection.x);
    expect(positionAfterSelection.y).toBe(positionBeforeSelection.y);
  });
}

test("Space jumps to the top and is listed with a rainbow keycap", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await page.locator("#verse-1").waitFor();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(420);

  await page.keyboard.press("Space");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator("#verse-1")).toHaveAttribute("aria-pressed", "false");

  await page.locator("#shortcuts-open").click();
  const row = page.locator(".shortcut-row--scroll-top");
  await expect(row.locator("kbd")).toHaveText("Space");
  await expect(row.locator("span")).toHaveText("Jump to top");
  const background = await row.locator("kbd").evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(background.match(/rgb\(/g)).toHaveLength(6);
});

test("Space still activates focused buttons instead of scrolling", async ({ page }) => {
  await page.goto("/kjv/b/genesis/c/1/v/1");
  await page.locator("#verse-1").waitFor();
  await page.locator("#shortcuts-open").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#shortcuts-dialog")).toHaveAttribute("open", "");
});

test("restores reading position and selected verses across reloads", async ({ page }) => {
  await page.goto("/krv/b/john/c/3/v/16");
  await page.locator("#verse-17").click();
  await page.locator("#verse-21").click();

  await page.reload();
  await expect(page).toHaveURL(/\/krv\/b\/john\/c\/3\/v\/21$/);
  await expect(page.locator("body")).toHaveClass(/is-krv-edition/);
  await expect(page.locator("#verse-17")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#verse-21")).toHaveAttribute("aria-pressed", "true");

  await page.goto("/");
  await expect(page.locator("#heading-book")).toHaveText("요한복음");
  await expect(page.locator("#heading-chapter")).toHaveText("3");
  await expect(page.locator("body")).toHaveClass(/is-krv-edition/);
  await expect(page.locator("#verse-17")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#verse-21")).toHaveAttribute("aria-pressed", "true");

  await page.goto("/diodati/b/psalms/c/3/v/1");
  await expect(page.locator("body")).toHaveClass(/is-diodati-edition/);
  await expect(page.locator("#heading-book")).toHaveText("Salmi");
  await expect(page.locator("#verse-1")).toHaveAttribute("aria-pressed", "false");
});

for (const viewport of [
  { width: 390, height: 844, label: "mobile" },
  { width: 1280, height: 900, label: "desktop" },
]) {
  for (const [edition, routeSegment] of [["kjv", "kjv"], ["diodati", "diodati"], ["luther1912", "licht"]]) {
    test(`toggles independent verse selections on ${viewport.label} in ${edition}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`/${routeSegment}/b/john/c/3/v/16`);
      const passageUrl = (verse) => new RegExp(`/${routeSegment}/b/john/c/3/v/${verse}$`);
      await page.locator("#verse-17").click();
      await expect(page).toHaveURL(passageUrl(17));
      await page.locator("#verse-21").click();

      await expect(page).toHaveURL(passageUrl(21));
      await expect(page.locator("#verse-17")).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#verse-21")).toHaveAttribute("aria-pressed", "true");
      const copyControl = page.locator("#copy-selected-verses");
      const clearControl = page.locator("#clear-selected-verses");
      const copyLabels = {
        kjv: { two: "Copy 2 verses", one: "Copy 1 verse" },
        diodati: { two: "Copia 2 versetti", one: "Copia 1 versetto" },
        luther1912: { two: "2 Verse kopieren", one: "1 Vers kopieren" },
      }[edition];
      await expect(copyControl).toHaveText(copyLabels.two);
      await expect(copyControl).toBeVisible();
      await expect(clearControl).toBeVisible();
      const bounds = await copyControl.boundingBox();
      const viewportBounds = page.viewportSize();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewportBounds.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewportBounds.height);

      await page.locator("#verse-17").click();
      await expect(page).toHaveURL(passageUrl(17));
      await expect(page.locator("#verse-17")).toHaveAttribute("aria-pressed", "false");
      await expect(copyControl).toHaveText(copyLabels.one);
      await page.locator("#verse-21").click();
      await expect(page).toHaveURL(passageUrl(21));
      await expect(copyControl).toBeHidden();
      await expect(clearControl).toBeHidden();

      await page.locator("#verse-17").click();
      await page.locator("#verse-21").click();
      await clearControl.click();
      await expect(page.locator("#verse-17")).toHaveAttribute("aria-pressed", "false");
      await expect(page.locator("#verse-21")).toHaveAttribute("aria-pressed", "false");
      await expect(copyControl).toBeHidden();
      await expect(clearControl).toBeHidden();
    });
  }
}

for (const viewport of [
  { width: 320, height: 568, label: "narrow mobile" },
  { width: 390, height: 844, label: "mobile" },
  { width: 1280, height: 900, label: "desktop" },
]) {
  test(`cuts selected verses from the action button without overlap on ${viewport.label}`, async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/kjv/b/john/c/3/v/16");
    const verse = page.locator("#verse-16");
    const verseText = (await verse.locator(".verse-text").textContent()).trim();
    await verse.click();
    await page.evaluate(() => window.scrollTo(0, 800));

    const cutControl = page.locator("#cut-selected-verses");
    const copyControl = page.locator("#copy-selected-verses");
    const shareControl = page.locator("#share-selected-verses");
    const clearControl = page.locator("#clear-selected-verses");
    const scrollToTop = page.locator("#scroll-to-top");
    await expect(cutControl).toBeVisible();
    await expect(scrollToTop).toBeVisible();
    await expect(clearControl).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");

    const cutBounds = await cutControl.boundingBox();
    const copyBounds = await copyControl.boundingBox();
    const shareBounds = await shareControl.boundingBox();
    const clearBounds = await clearControl.boundingBox();
    const topBounds = await scrollToTop.boundingBox();
    const viewportBounds = page.viewportSize();
    expect(copyBounds.y).toBeCloseTo(cutBounds.y, 0);
    expect(copyBounds.x + copyBounds.width).toBeLessThanOrEqual(shareBounds.x + 2);
    expect(shareBounds.x + shareBounds.width).toBeLessThanOrEqual(cutBounds.x + 2);
    expect(cutBounds.x + cutBounds.width).toBeLessThanOrEqual(clearBounds.x + 2);
    const actionsBounds = await page.locator("#verse-actions").boundingBox();
    const overlaps = topBounds.x < actionsBounds.x + actionsBounds.width &&
      topBounds.x + topBounds.width > actionsBounds.x &&
      topBounds.y < actionsBounds.y + actionsBounds.height &&
      topBounds.y + topBounds.height > actionsBounds.y;
    expect(overlaps).toBe(false);
    for (const bounds of [cutBounds, copyBounds, shareBounds, clearBounds]) {
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewportBounds.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewportBounds.height);
    }

    expect(clearBounds.x + clearBounds.width).toBeCloseTo(topBounds.x + topBounds.width, 0);

    await cutControl.click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`"${verseText}"\n\n- John 3:16`);
    await expect(verse).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#verse-actions")).toBeHidden();
  });
}

test("copies consecutive verses on every edition as separate lines with a compressed citation", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const editions = [
    ["kjv", "kjv", "John"],
    ["krv", "krv", "요한복음"],
    ["diodati", "diodati", "Giovanni"],
    ["luther1912", "licht", "Johannes"],
    ["japbungo", "japbungo", "ヨハネの福音書"],
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
    const footerLinks = page.locator(".site-footer a");
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