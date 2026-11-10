import { expect, test } from "./support/browser-test.mjs";
import { EDITIONS } from "../js/editions.mjs";

test("presents the About page and installation options at desktop and mobile widths", async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/kjv/b/genesis/c/1");
    const aboutLink = page.getByRole("link", { name: "About" });
    const shortcutsButton = page.getByRole("button", { name: "Show keyboard shortcuts" });
    await expect(aboutLink).toBeVisible();
    await expect(shortcutsButton).toBeVisible();
    const [aboutBounds, shortcutsBounds] = await Promise.all([
      aboutLink.boundingBox(),
      shortcutsButton.boundingBox(),
    ]);
    expect(aboutBounds).not.toBeNull();
    expect(shortcutsBounds).not.toBeNull();
    expect(aboutBounds.x + aboutBounds.width).toBeLessThanOrEqual(shortcutsBounds.x);
    await page.goto("/about");

    await expect(page).toHaveTitle("About — The Amazing Word");
    await expect(page.getByRole("heading", { name: "A quiet place to meet the text." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Install The Amazing Word." })).toBeVisible();
    await expect(page.getByRole("link", { name: /Buy Me a Coffee/ })).toHaveAttribute(
      "href",
      "https://buymeacoffee.com/isaiahyoon",
    );
    const installPositions = await page.locator(".install-item").evaluateAll((items) =>
      Object.fromEntries(items.map((item) => {
        const bounds = item.getBoundingClientRect();
        return [item.classList[1].replace("install-item--", ""), {
          x: bounds.x,
          y: bounds.y,
        }];
      })),
    );
    expect(installPositions.mac.y).toBeLessThan(installPositions.windows.y);
    expect(installPositions.iphone.y).toBeLessThan(installPositions.android.y);
    expect(Math.abs(installPositions.mac.y - installPositions.iphone.y)).toBeLessThan(2);
    expect(Math.abs(installPositions.windows.y - installPositions.android.y)).toBeLessThan(2);
    expect(installPositions.mac.x).toBeLessThan(installPositions.iphone.x);
    expect(installPositions.windows.x).toBeLessThan(installPositions.android.x);
    expect(await page.locator("html").evaluate((element) => element.scrollWidth))
      .toBeLessThanOrEqual(viewport.width);
  }
});

test("localizes reader navigation and accessible controls for every edition", async ({ page }) => {
  test.setTimeout(120_000);
  const editions = [
    { route: "/kjv", language: "en", navigation: "Open book navigation", previous: "Previous chapter:", chapter: "Choose Genesis chapter", chapterOption: "Genesis chapter 2", testament: "Old", offlineStatus: "Not saved for offline", save: "Save", cut: "Cut", previewAlt: "The Amazing Word prism sword emblem beside the Scripture reader name", shortcutTitle: "Keyboard shortcuts", shortcutHome: "Go to homepage", feedbackTitle: "Leave me a note", feedbackBug: "A small snag" },
    { route: "/krv", language: "ko", navigation: "책 탐색 열기", previous: "이전 장:", chapter: "창세기 장 선택", chapterOption: "창세기 2장", testament: "구약", offlineStatus: "오프라인 저장 안 됨", save: "저장", cut: "잘라내기", previewAlt: "성경 읽기 서비스 이름 옆에 있는 놀라운 말씀 프리즘 검 문양", shortcutTitle: "키보드 단축키", shortcutHome: "홈페이지로 이동", feedbackTitle: "의견 남기기", feedbackBug: "작은 문제" },
    { route: "/diodati", language: "it", navigation: "Apri la navigazione dei libri", previous: "Capitolo precedente:", chapter: "Scegli il capitolo di Genesi", chapterOption: "Genesi, capitolo 2", testament: "Antico", offlineStatus: "Non salvata per l’uso offline", save: "Salva", cut: "Taglia", previewAlt: "Emblema della spada prismatica della Parola Meravigliosa accanto al nome del lettore biblico", shortcutTitle: "Scorciatoie da tastiera", shortcutHome: "Vai alla pagina iniziale", feedbackTitle: "Lasciami un messaggio", feedbackBug: "Un piccolo problema" },
    { route: "/licht", language: "de", navigation: "Buchnavigation öffnen", previous: "Vorheriges Kapitel:", chapter: "Kapitel von ", chapterOption: "1 Mose, Kapitel 2", testament: "Altes", offlineStatus: "Nicht offline gespeichert", save: "Speichern", cut: "Ausschneiden", previewAlt: "Prismenschwert-Emblem vom Wunderbaren Wort neben dem Namen des Bibelleseprogramms", shortcutTitle: "Tastenkürzel", shortcutHome: "Zur Startseite", feedbackTitle: "Hinterlasse eine Nachricht", feedbackBug: "Ein kleines Problem" },
    { route: "/japbungo", language: "ja", navigation: "書名ナビゲーションを開く", previous: "前の章：", chapter: "創世記の章を選択", chapterOption: "創世記 2章", testament: "旧約", offlineStatus: "オフライン用に未保存", save: "保存", cut: "切り取る", previewAlt: "聖書リーダー名の横にある驚くべき御言葉のプリズムの剣の紋章", shortcutTitle: "キーボードショートカット", shortcutHome: "ホームページへ移動", feedbackTitle: "ご意見をお聞かせください", feedbackBug: "小さな不具合" },
    { route: "/moh", language: "fr", navigation: "Ouvrir la navigation des livres", previous: "Chapitre précédent :", chapter: "Choisir le chapitre de Genèse", chapterOption: "Genèse, chapitre 2", testament: "Ancien", offlineStatus: "Non enregistré hors connexion", save: "Enregistrer", cut: "Couper", previewAlt: "Emblème de l’épée prismatique de la Parole Merveilleuse à côté du nom du lecteur biblique", shortcutTitle: "Raccourcis clavier", shortcutHome: "Aller à la page d’accueil", feedbackTitle: "Laissez-moi un mot", feedbackBug: "Un petit souci" },
    { route: "/alm", language: "pt", navigation: "Abrir navegação dos livros", previous: "Capítulo anterior:", chapter: "Escolher capítulo de Gênesis", chapterOption: "Gênesis, capítulo 2", testament: "Antigo", offlineStatus: "Não salvo para leitura offline", save: "Salvar", cut: "Recortar", previewAlt: "Emblema da espada prismática de A Palavra Maravilhosa ao lado do nome do leitor bíblico", shortcutTitle: "Atalhos de teclado", shortcutHome: "Ir para a página inicial", feedbackTitle: "Deixe uma mensagem", feedbackBug: "Um pequeno problema" },
  ];

  for (const edition of editions) {
    await page.goto(`${edition.route}/b/genesis/c/1`);
    await expect(page.locator("#verse-1")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", edition.language);
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", edition.previewAlt ?? "The Amazing Word prism sword emblem beside the Scripture reader name");
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
      pt: "Pesquisar as Escrituras",
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
      pt: "Fechar atalhos de teclado",
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

test("localizes and emphasizes the reader's About link for every edition", async ({ page }) => {
  const editions = [
    { route: "/kjv", label: "About", font: "Gelasio", interfaceFont: "DM Sans" },
    { route: "/krv", label: "소개", font: "Noto Serif KR", interfaceFont: "DM Sans" },
    { route: "/diodati", label: "Informazioni", font: "Cormorant Garamond", interfaceFont: "DM Sans" },
    { route: "/licht", label: "Über uns", font: "Gelasio", interfaceFont: "DM Sans" },
    { route: "/japbungo", label: "このサイトについて", font: "Noto Serif JP", interfaceFont: "Noto Sans JP" },
    { route: "/moh", label: "À propos", font: "EB Garamond", interfaceFont: "DM Sans" },
    { route: "/luz", label: "Acerca de", font: "Petrona", interfaceFont: "DM Sans" },
    { route: "/alm", label: "Sobre", font: "Cardo", interfaceFont: "DM Sans" },
  ];

  for (const viewport of [
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const edition of editions) {
      await page.goto(`${edition.route}/b/genesis/c/1`);
      const aboutLink = page.locator(".topbar-about");
      await expect(page.locator("#verse-1")).toBeVisible();
      await expect(page.locator("body")).toHaveCSS("font-family", new RegExp(edition.interfaceFont));
      await expect(aboutLink).toHaveText(edition.label);
      await expect(aboutLink).toHaveCSS("font-size", viewport.width <= 640 ? "11px" : "15px");
      await expect(aboutLink).toHaveCSS("font-weight", "500");
      await expect(aboutLink).toHaveCSS("font-family", new RegExp(edition.font));
      await expect(aboutLink).toHaveCSS("text-decoration-line", "none");

      const palette = await aboutLink.evaluate(() => {
        const resolveColor = (variable) => {
          const probe = document.createElement("span");
          probe.style.color = `var(${variable})`;
          document.body.append(probe);
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        };
        return {
          navy: resolveColor("--navy-ink"),
          gold: resolveColor("--brass"),
        };
      });
      await expect(aboutLink).toHaveCSS("color", palette.navy);
      await aboutLink.hover();
      await expect(aboutLink).toHaveCSS("color", palette.gold);

      const decoration = await aboutLink.evaluate((element) => ({
        diamondBorderStyle: getComputedStyle(element, "::before").borderTopStyle,
        underlineBackground: getComputedStyle(element, "::after").backgroundImage,
      }));
      expect(decoration.diamondBorderStyle).toBe("solid");
      expect(decoration.underlineBackground).toContain("linear-gradient");
      const linkBounds = await aboutLink.boundingBox();
      expect(linkBounds).not.toBeNull();
      expect(linkBounds.x + linkBounds.width).toBeLessThanOrEqual(viewport.width);
    }
  }

  await page.goto("/kjv/b/genesis/c/1");
  await page.locator("#edition-select").click();
  await page.locator("#edition-option-krv").click();
  await expect(page.locator(".topbar-about")).toHaveText("소개");
});

test("applies the Almeida palette and Cardo, and keeps its open edition menu usable", async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/alm/b/john/c/3/v/16");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt");
    await expect(page.locator("body")).toHaveClass(/is-alm1911-edition/);
    await expect(page.locator("#verse-list")).toHaveCSS("font-family", /Cardo/);
    await expect(page.locator(".chapter-heading h1")).toHaveCSS("font-family", /Cardo/);

    const theme = await page.locator("body").evaluate((body) => {
      const style = getComputedStyle(body);
      return {
        canvas: style.getPropertyValue("--canvas").trim(),
        green: style.getPropertyValue("--green").trim(),
        pink: style.getPropertyValue("--pink").trim(),
        red: style.getPropertyValue("--coral").trim(),
        chapterPink: style.getPropertyValue("--chapter-pink").trim(),
        gold: style.getPropertyValue("--yellow").trim(),
        background: getComputedStyle(body, "::before").backgroundImage,
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      };
    });
    expect(theme).toMatchObject({
      canvas: "#f4f0e7",
      green: "#dde9dc",
      pink: "#f2d5da",
      red: "#a83f4b",
      chapterPink: "#e4a0aa",
      gold: "#e5d6a5",
    });
    expect(theme.pageWidth).toBeLessThanOrEqual(viewport.width);
    expect(theme.background).toMatch(
      /linear-gradient\(135deg, rgba\(168, 63, 75, .*rgba\(229, 214, 165, .*rgba\(221, 233, 220,/,
    );
    expect(await page.locator('meta[name="theme-color"]').getAttribute("content")).toBe("#f4f0e7");

    const trigger = page.locator("#edition-select");
    const menu = page.locator("#edition-options");
    if (viewport.width < 768) {
      await page.locator("#menu-toggle").click();
      await expect(page.locator("#sidebar")).toHaveClass(/is-open/);
      await expect.poll(() => page.locator("#sidebar").evaluate((element) =>
        getComputedStyle(element).transform,
      )).toBe("matrix(1, 0, 0, 1, 0, 0)");
    }
    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    await expect(menu).toBeVisible();
    await expect(page.locator("#edition-option-alm1911")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Home");
    await expect(page.locator("#edition-option-kjv")).toBeFocused();
    const options = await menu.locator(".edition-option").evaluateAll((elements) =>
      elements.map((element) => {
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          left: bounds.left,
          right: bounds.right,
          focused: element.matches(":focus-visible"),
          selected: element.getAttribute("aria-selected") === "true",
          background: style.backgroundImage,
        };
      }),
    );
    expect(options).toHaveLength(8);
    for (const option of options) {
      expect(option.left).toBeGreaterThanOrEqual(0);
      expect(option.right).toBeLessThanOrEqual(viewport.width);
    }
    expect(options.find(({ focused }) => focused)?.background).not.toBe("none");
    expect(options.find(({ selected }) => selected)?.background).not.toBe("none");
    const panel = await menu.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        left: bounds.left,
        right: bounds.right,
        background: style.backgroundImage !== "none" || style.backgroundColor !== "rgba(0, 0, 0, 0)",
      };
    });
    expect(panel.left, `menu left edge at ${viewport.width}px`).toBeGreaterThanOrEqual(0);
    expect(panel.right, `menu right edge at ${viewport.width}px`).toBeLessThanOrEqual(viewport.width);
    expect(panel.background).toBe(true);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  }

  await page.goto("/luz/b/john/c/3/v/16");
  const spanishPalette = await page.locator("body").evaluate((body) => {
    const style = getComputedStyle(body);
    return {
      pink: style.getPropertyValue("--pink").trim(),
      red: style.getPropertyValue("--coral").trim(),
    };
  });
  expect(spanishPalette).toEqual({ pink: "#eed8d0", red: "#a75f48" });
  expect(spanishPalette.pink).not.toBe("#f2d5da");
  expect(spanishPalette.red).not.toBe("#a83f4b");
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

test("keeps the mobile brand compact and clear across all editions and narrow viewports", async ({ page }) => {
  for (const edition of Object.values(EDITIONS)) {
    await page.goto(`/${edition.routeSegment}/b/genesis/c/1`);

    for (const width of [320, 360, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      const layout = await page.evaluate(() => {
        const bounds = (selector) => {
          const { x, right, width, height } = document.querySelector(selector).getBoundingClientRect();
          return { x, right, width, height };
        };
        const mark = document.querySelector(".brand-mark");
        const wordmark = document.querySelector(".brand-copy strong");

        return {
          viewportWidth: document.documentElement.clientWidth,
          pageWidth: document.documentElement.scrollWidth,
          menu: bounds("#menu-toggle"),
          brand: bounds(".brand"),
          mark: {
            ...bounds(".brand-mark"),
            cssWidth: getComputedStyle(mark).width,
            cssHeight: getComputedStyle(mark).height,
          },
          wordmark: {
            ...bounds(".brand-copy strong"),
            fontSize: getComputedStyle(wordmark).fontSize,
            lineHeight: getComputedStyle(wordmark).lineHeight,
          },
          about: bounds(".topbar-about"),
          shortcuts: bounds("#shortcuts-open"),
        };
      });

      expect(layout.pageWidth, `${edition.id} at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth);
      expect(layout.mark.cssWidth, `${edition.id} logo width at ${width}px`)
        .toBe(layout.mark.cssHeight);
      expect(Number.parseFloat(layout.mark.cssWidth), `${edition.id} logo size at ${width}px`)
        .toBeLessThanOrEqual(26);
      expect(Number.parseFloat(layout.wordmark.fontSize), `${edition.id} wordmark size at ${width}px`)
        .toBeLessThanOrEqual(16);
      expect(layout.wordmark.height, `${edition.id} wordmark wrapping at ${width}px`)
        .toBeLessThanOrEqual(
          Number.parseFloat(layout.wordmark.lineHeight) * (width === 320 ? 3.2 : 2.2),
        );
      expect(layout.menu.right, `${edition.id} menu spacing at ${width}px`)
        .toBeLessThanOrEqual(layout.brand.x);
      expect(layout.brand.right, `${edition.id} brand spacing at ${width}px`)
        .toBeLessThanOrEqual(layout.about.x);
      expect(layout.about.right, `${edition.id} action spacing at ${width}px`)
        .toBeLessThanOrEqual(layout.shortcuts.x);
    }
  }
});

test("brand link returns to the active edition root", async ({ page }) => {
  await page.goto("/moh/b/genesis/c/1");
  const brand = page.locator(".brand");
  await expect(brand).toHaveAttribute("href", "/moh");

  await brand.click();

  await expect(page).toHaveURL(/\/moh$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("#verse-1")).toBeVisible();
});

for (const segment of ["kjv", "krv", "diodati", "licht", "japbungo", "moh", "luz", "alm"]) {
  test(`brand link on ${segment} returns to its edition root`, async ({ page }) => {
    await page.goto(`/${segment}/b/1-samuel/c/1/v/1`);
    const brand = page.locator(".brand");
    await expect(brand).toHaveAttribute("href", `/${segment}`);

    await brand.click();

    await expect(page).toHaveURL(new RegExp(`/${segment}$`));
    await expect(page.locator("#verse-1")).toBeVisible();
  });

  test(`h shortcut on ${segment} returns to its edition root`, async ({ page }) => {
    await page.goto(`/${segment}/b/1-samuel/c/1/v/1`);
    await expect(page.locator(".brand")).toHaveAttribute("href", `/${segment}`);

    await page.keyboard.press("h");

    await expect(page).toHaveURL(new RegExp(`/${segment}$`));
    await expect(page.locator("#verse-1")).toBeVisible();
  });
}

test("brand link clears highlighted verses and goes to the KJV edition root", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  const brand = page.locator(".brand");
  await expect(brand).toHaveAttribute("href", "/kjv");

  await page.locator("#verse-16").click();
  await expect(page.locator(".verse.is-copy-selected")).toHaveCount(1);
  await page.locator("#verse-16 .verse-text").selectText();

  await brand.click();

  await expect(page).toHaveURL(/\/kjv$/);
  await expect(page.locator(".verse.is-copy-selected")).toHaveCount(0);
  expect(await page.evaluate(() => window.getSelection().toString())).toBe("");
  expect(await page.evaluate(() =>
    Object.values(localStorage).some((value) => value.includes('"selectedVerses":[16]')),
  )).toBe(false);
});

test("brand link lands at the top of the page, not at the saved verse", async ({ page }) => {
  for (const [route, home] of [["/kjv", "/kjv"], ["/moh", "/moh"]]) {
    await page.goto(`${route}/b/psalms/c/119/v/170`);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);

    await page.locator(".brand").click();

    await expect(page).toHaveURL(new RegExp(`${home}$`));
    await expect(page.locator("#verse-1")).toBeVisible();
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => window.scrollY), route).toBe(0);
  }
});

test("adds gold borders and sparkles to the four-square brand mark", async ({ page }) => {
  for (const route of ["/", "/about?lang=en", "/404.html"]) {
    await page.goto(route);
    const mark = page.locator(".brand-mark");
    const tiles = mark.locator("i");
    await expect(tiles).toHaveCount(4);
    expect(await tiles.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundColor))).toEqual([
      "rgb(222, 254, 252)",
      "rgb(220, 215, 247)",
      "rgb(250, 212, 224)",
      "rgb(255, 254, 207)",
    ]);
    await expect(tiles.first()).toHaveCSS("border-top-color", "rgba(169, 124, 53, 0.82)");
    expect(await tiles.first().evaluate((element) => getComputedStyle(element).boxShadow))
      .toContain("169, 124, 53");

    if (route === "/") {
      await mark.hover();
      await expect(mark).toHaveCSS("animation-name", "logo-spin-settle");
      await expect.poll(() =>
        mark.evaluate((element) => getComputedStyle(element, "::after").animationName),
      ).toBe("brand-mark-sparkle");
    } else {
      await page.locator(".brand").hover();
      await expect.poll(() =>
        mark.evaluate((element) => getComputedStyle(element, "::after").animationName),
      ).toBe("brand-mark-sparkle");
    }
  }
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
  for (const route of ["/kjv", "/krv", "/diodati", "/licht", "/japbungo", "/moh", "/alm"]) {
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
