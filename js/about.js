import { ABOUT_LOCALES } from "./about-locales.mjs";
import { EDITIONS } from "./editions.mjs";
import { logger } from "./logger.js";

const languageTrigger = document.querySelector("#about-language");
const languageMenu = document.querySelector("#about-language-options");
const languageOptions = [...languageMenu.querySelectorAll("[data-language]")];
const readerStateKey = "the-word.reader-state.v1:/";
let activeLanguage = "en";

function getSavedLanguage() {
  try {
    const savedState = JSON.parse(window.localStorage.getItem(readerStateKey));
    const language = EDITIONS[savedState?.editionId]?.language;
    return Object.hasOwn(ABOUT_LOCALES, language) ? language : "en";
  } catch (error) {
    logger.warn("Could not read the saved edition for About page localization", { error });
    return "en";
  }
}

function getInitialLanguage() {
  const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
  return Object.hasOwn(ABOUT_LOCALES, requestedLanguage)
    ? requestedLanguage
    : getSavedLanguage();
}

function applyLanguage(language) {
  const locale = ABOUT_LOCALES[language];
  activeLanguage = language;
  document.documentElement.lang = language;
  document.title = locale.pageTitle;
  document.querySelector('meta[name="description"]').content = locale.metaDescription;

  for (const element of document.querySelectorAll("[data-about]")) {
    const key = element.dataset.about;
    element.textContent = locale[key];
  }

  for (const element of document.querySelectorAll("[data-about-aria-label]")) {
    const key = element.dataset.aboutAriaLabel;
    element.setAttribute("aria-label", locale[key]);
  }

  const selectedOption = languageOptions.find((option) => option.dataset.language === language);
  languageTrigger.querySelector(".language-current").textContent = selectedOption.textContent;
  for (const option of languageOptions) {
    option.setAttribute("aria-selected", String(option === selectedOption));
  }
}

function closeLanguageMenu({ restoreFocus = false } = {}) {
  languageMenu.hidden = true;
  languageTrigger.setAttribute("aria-expanded", "false");
  if (restoreFocus) languageTrigger.focus();
}

function openLanguageMenu() {
  languageMenu.hidden = false;
  languageTrigger.setAttribute("aria-expanded", "true");
  languageOptions.find((option) => option.dataset.language === activeLanguage)?.focus();
}

function chooseLanguage(language) {
  const url = new URL(window.location.href);
  url.searchParams.set("lang", language);
  window.history.replaceState(null, "", url);
  applyLanguage(language);
  closeLanguageMenu({ restoreFocus: true });
}

applyLanguage(getInitialLanguage());

languageTrigger.addEventListener("click", () => {
  if (languageMenu.hidden) openLanguageMenu();
  else closeLanguageMenu();
});

for (const [index, option] of languageOptions.entries()) {
  option.addEventListener("click", () => chooseLanguage(option.dataset.language));
  option.addEventListener("keydown", (event) => {
    const navigationKeys = new Map([
      ["ArrowDown", (index + 1) % languageOptions.length],
      ["ArrowUp", (index - 1 + languageOptions.length) % languageOptions.length],
      ["Home", 0],
      ["End", languageOptions.length - 1],
    ]);

    if (navigationKeys.has(event.key)) {
      event.preventDefault();
      languageOptions[navigationKeys.get(event.key)].focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeLanguageMenu({ restoreFocus: true });
    } else if (event.key === "Tab") {
      closeLanguageMenu();
    }
  });
}

document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".language-control")) closeLanguageMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !languageMenu.hidden) {
    event.preventDefault();
    closeLanguageMenu({ restoreFocus: true });
  }
});
