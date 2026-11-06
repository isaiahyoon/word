import { ABOUT_LOCALES } from "./about-locales.mjs";
import { EDITIONS } from "./editions.mjs";
import { logger } from "./logger.js";
import { registerServiceWorker } from "./offline.js";

const languageTrigger = document.querySelector("#about-language");
const languageMenu = document.querySelector("#about-language-options");
const languageOptions = [...languageMenu.querySelectorAll("[data-language]")];
const appNameByLanguage = Object.fromEntries(
  Object.values(EDITIONS).map(({ language, appName }) => [language, appName]),
);
const brandName = document.querySelector("[data-about-app-name]");
const readerStateKey = "the-word.reader-state.v1:/";
const defaultEditionKey = "the-word.default-edition.v1";
const installLanguageForm = document.querySelector("#install-language-form");
const installLanguageStatus = document.querySelector("#install-language-status");
const installLanguageOptions = document.querySelector("#install-language-options");
let activeLanguage = "en";
let installPromptEvent = null;
let installStatusKey = null;
const installEditionId = new URLSearchParams(window.location.search).get("install");
const validInstallEdition = Object.hasOwn(EDITIONS, installEditionId) ? installEditionId : null;

if (validInstallEdition) {
  if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
    window.location.replace(`/?install=${encodeURIComponent(validInstallEdition)}`);
  } else {
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = `/assets/install-manifests/${validInstallEdition}.webmanifest`;
    document.head.append(manifest);
  }
}
void registerServiceWorker();

function setInstallStatus(key) {
  installStatusKey = key;
  installLanguageStatus.textContent = ABOUT_LOCALES[activeLanguage][key];
}

function getDefaultEditionId() {
  try {
    const editionId = window.localStorage.getItem(defaultEditionKey);
    return Object.hasOwn(EDITIONS, editionId) ? editionId : null;
  } catch (error) {
    logger.warn("Could not read the default reading language", { error });
    return null;
  }
}

function getSavedLanguage() {
  const defaultEditionId = getDefaultEditionId();
  if (defaultEditionId) return EDITIONS[defaultEditionId].language;

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
  document.title = validInstallEdition ? EDITIONS[validInstallEdition].appName : locale.pageTitle;
  brandName.textContent = appNameByLanguage[language];
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
  if (installStatusKey) setInstallStatus(installStatusKey);
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

for (const [editionId, edition] of Object.entries(EDITIONS)) {
  const label = document.createElement("label");
  label.className = "install-language-option";
  const input = document.createElement("input");
  input.type = "radio";
  input.name = "install-language";
  input.value = editionId;
  input.required = true;
  const languageName = document.createElement("span");
  languageName.lang = edition.language;
  languageName.dir = edition.direction;
  languageName.textContent = edition.languageName;
  label.append(input, languageName);
  installLanguageOptions.append(label);
}

const initialInstallEdition = validInstallEdition ?? getDefaultEditionId() ?? Object.values(EDITIONS)
  .find((edition) => edition.language === activeLanguage)?.id ?? "kjv";
const initialInstallOption = installLanguageForm.querySelector(`[value="${initialInstallEdition}"]`);
if (initialInstallOption) initialInstallOption.checked = true;
if (validInstallEdition) {
  setInstallStatus("installLanguageSaved");
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPromptEvent = event;
});

window.addEventListener("appinstalled", () => {
  installPromptEvent = null;
  setInstallStatus("installLanguageInstalled");
});

installLanguageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const editionId = new FormData(installLanguageForm).get("install-language");
  if (!Object.hasOwn(EDITIONS, editionId)) {
    logger.error("Invalid default reading edition selected");
    setInstallStatus("installLanguageFailed");
    return;
  }

  try {
    window.localStorage.setItem(defaultEditionKey, editionId);
  } catch (error) {
    logger.error("Could not save the default reading language", { editionId, error });
    setInstallStatus("installLanguageFailed");
    return;
  }

  if (editionId !== validInstallEdition) {
    const url = new URL(window.location.href);
    url.searchParams.set("install", editionId);
    url.searchParams.set("lang", activeLanguage);
    url.hash = "install-title";
    window.location.assign(url);
    return;
  }

  if (!installPromptEvent) {
    setInstallStatus("installLanguageSaved");
    return;
  }

  const promptEvent = installPromptEvent;
  installPromptEvent = null;
  try {
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setInstallStatus("installLanguageSaved");
  } catch (error) {
    logger.error("Native app installation prompt failed", { editionId, error });
    setInstallStatus("installLanguageSaved");
  }
});

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
