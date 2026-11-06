import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createOfflineControl } from "../js/offline-control.js";
import { formatUiText, getUiLocale, UI_LOCALES } from "../js/ui-locales.mjs";

function createElement() {
  const listeners = new Map();
  return {
    dataset: {},
    hidden: false,
    disabled: false,
    textContent: "",
    attributes: {},
    addEventListener: (name, listener) => listeners.set(name, listener),
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    async click() {
      await listeners.get("click")?.();
    },
  };
}

describe("reader interface locales", () => {
  it("provides every English interface message in each supported language", () => {
    const keys = Object.keys(UI_LOCALES.en);

    for (const [language, locale] of Object.entries(UI_LOCALES)) {
      assert.deepEqual(
        keys.filter((key) => !(key in locale)),
        [],
        `${language} is missing interface messages`,
      );
    }
  });

  it("formats dynamic control text and falls back to English for unknown languages", () => {
    assert.equal(
      formatUiText(getUiLocale("fr"), "previousChapter", { reference: "Genèse 2" }),
      "Chapitre précédent : Genèse 2",
    );
    assert.equal(getUiLocale("unknown"), UI_LOCALES.en);
    assert.equal(formatUiText(UI_LOCALES.en, "unregisteredMessage"), "unregisteredMessage");
  });

  it("localizes Spanish reader controls and dynamic verse messages", () => {
    const locale = getUiLocale("es");
    assert.equal(locale.searchInput, "Buscar en las Escrituras");
    assert.equal(locale.shareInLanguage, "Compartir en otro idioma");
    assert.equal(formatUiText(locale, "previousChapter", { reference: "San Juan 2" }), "Capítulo anterior: San Juan 2");
    assert.equal(formatUiText(locale, "offlineSavingProgress", { done: 2, total: 5 }), "Guardando 2 de 5…");
  });

  it("localizes Portuguese reader controls and dynamic passage messages", () => {
    const locale = getUiLocale("pt");
    assert.equal(locale.searchInput, "Pesquisar as Escrituras");
    assert.equal(locale.copyInLanguage, "Escolher um idioma para copiar");
    assert.equal(formatUiText(locale, "chooseChapter", { book: "Gênesis", chapter: 2 }), "Escolher capítulo de Gênesis, atualmente 2");
    assert.equal(formatUiText(locale, "offlineSavingProgress", { done: 2, total: 5 }), "Salvando 2 de 5…");
    assert.equal(formatUiText(locale, "previousChapter", { reference: "João 3" }), "Capítulo anterior: João 3");
  });

  it("localizes offline progress, saved state, and removal for every language", async () => {
    for (const [language, locale] of Object.entries(UI_LOCALES)) {
      const root = createElement();
      const status = createElement();
      const action = createElement();
      let saved = false;
      let progressText = "";
      const control = createOfflineControl({
        root,
        status,
        action,
        offline: {
          supported: true,
          isSaved: async () => saved,
          async save(_, onProgress) {
            onProgress(2, 5);
            progressText = status.textContent;
            saved = true;
          },
          async remove() {
            saved = false;
          },
        },
      });
      const edition = { id: language, name: "Edition", language };

      await control.render(edition, locale);
      assert.equal(status.textContent, locale.offlineNotSaved, `${language} idle status`);
      assert.equal(action.textContent, locale.save, `${language} save action`);

      await action.click();
      assert.equal(progressText, formatUiText(locale, "offlineSavingProgress", { done: 2, total: 5 }), `${language} progress`);
      assert.equal(status.textContent, locale.offlineAvailable, `${language} saved status`);
      assert.equal(action.textContent, locale.remove, `${language} remove action`);

      await action.click();
      assert.equal(status.textContent, locale.offlineNotSaved, `${language} restored idle status`);
      assert.equal(action.textContent, locale.save, `${language} restored save action`);
    }
  });
});