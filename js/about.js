import { ABOUT_LOCALES } from "./about-locales.mjs";
import { EDITIONS } from "./editions.mjs";

const languageSelect = document.querySelector("#about-language");
const readerStateKey = "the-word.reader-state.v1:/";

function getSavedLanguage() {
  try {
    const savedState = JSON.parse(window.localStorage.getItem(readerStateKey));
    const language = EDITIONS[savedState?.editionId]?.language;
    return Object.hasOwn(ABOUT_LOCALES, language) ? language : "en";
  } catch (error) {
    console.warn("Could not read the saved edition for About page localization.", error);
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

  languageSelect.value = language;
}

applyLanguage(getInitialLanguage());

languageSelect.addEventListener("change", () => {
  const language = languageSelect.value;
  const url = new URL(window.location.href);
  url.searchParams.set("lang", language);
  window.history.replaceState(null, "", url);
  applyLanguage(language);
});
