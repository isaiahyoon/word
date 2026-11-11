import { bindKeyboardShortcuts } from "./keyboard-shortcuts.js";
import { createChapterPicker } from "./chapter-picker.js";
import { createScriptureStore } from "./scripture-store.js";
import { createVisualEffects } from "./visual-effects.js";
import { createEditionPicker, createShareLanguageMenu } from "./edition-picker.js";
import { createOfflineEditions, registerServiceWorker } from "./offline.js";
import { createOfflineControl } from "./offline-control.js";
import { createReaderFeedback } from "./reader-feedback.js";
import { createReaderSearch } from "./reader-search.js";
import { createVerseCopyShare, resolveVerseReferences } from "./verse-copy-share.js";
import { createScriptureRoutes, getVerseStep, isValidVerseRange, normalizeVerseRange } from "./scripture-routes.mjs";
import { BOOKS, BOOK_TITLES } from "./books.mjs";
import { logger } from "./logger.js";
import { DEFAULT_EDITION, EDITIONS, EDITION_IDS } from "./editions.mjs";
import { applyUiLocale, formatUiText, getUiLocale } from "./ui-locales.mjs";
import { VerseReferenceAlignmentError } from "./verse-reference-alignment.mjs";

const CHAPTER_GRADIENT_COLORS = ["var(--chapter-blue)", "var(--chapter-lavender)", "var(--chapter-pink)", "var(--chapter-green)"];
const state = { editionId: DEFAULT_EDITION, book: 1, chapter: 1, verse: 1, selectedVerses: new Set(), testament: "old", lastBookByTestament: { old: 1, new: 40 }, chapterRequestId: 0 };
let uiLocale = getUiLocale("en");
const uiText = (key, values) => formatUiText(uiLocale, key, values);
const appBasePath = new URL(document.baseURI).pathname;
const scriptureRoutes = createScriptureRoutes(BOOKS, appBasePath, EDITIONS);
const readerStateStorageKey = `the-word.reader-state.v1:${appBasePath}`;
const defaultEditionStorageKey = "the-word.default-edition.v1";
const elements = {
  appShell: document.querySelector(".app-shell"),
  pullRefreshIndicator: document.querySelector("#pull-refresh-indicator"),
  pullRefreshLabel: document.querySelector("#pull-refresh-label"),
  bookList: document.querySelector("#book-list"),
  chapterSelect: document.querySelector("#chapter-select"),
  chapterSelectValue: document.querySelector("#chapter-select-value"),
  chapterPicker: document.querySelector("#chapter-picker"),
  chapterOptions: document.querySelector("#chapter-options"),
  chapterOptionsTitle: document.querySelector("#chapter-options-title"),
  chapterOptionsCount: document.querySelector("#chapter-options-count"),
  chapterOptionsList: document.querySelector("#chapter-options-list"),
  quietViewToggle: document.querySelector("#quiet-view-toggle"),
  verseList: document.querySelector("#verse-list"),
  verseActions: document.querySelector("#verse-actions"),
  scrollToTop: document.querySelector("#scroll-to-top"),
  cutControl: document.querySelector("#cut-selected-verses"),
  copyControl: document.querySelector("#copy-selected-verses"),
  copyControlLabel: document.querySelector("#copy-selected-label"),
  shareControl: document.querySelector("#share-selected-verses"),
  shareLanguageMenu: document.querySelector("#share-language-menu"),
  clearControl: document.querySelector("#clear-selected-verses"),
  copyStatus: document.querySelector("#copy-status"),
  feedbackOpen: document.querySelector("#feedback-open"),
  feedbackDialog: document.querySelector("#feedback-dialog"),
  feedbackClose: document.querySelector("#feedback-close"),
  feedbackForm: document.querySelector("#reader-feedback-form"),
  feedbackCategoryField: document.querySelector("#feedback-category-field"),
  feedbackCategory: document.querySelector("#feedback-category"),
  feedbackCategoryTrigger: document.querySelector("#feedback-category-trigger"),
  feedbackCategoryValue: document.querySelector("#feedback-category-value"),
  feedbackCategoryMenu: document.querySelector("#feedback-category-options"),
  feedbackCategoryError: document.querySelector("#feedback-category-error"),
  feedbackMessage: document.querySelector("#feedback-message"),
  feedbackIncludePassage: document.querySelector("#feedback-include-passage"),
  feedbackPassage: document.querySelector("#feedback-passage"),
  feedbackSubmit: document.querySelector("#feedback-submit"),
  feedbackError: document.querySelector("#feedback-error"),
  feedbackSuccess: document.querySelector("#feedback-success"),
  feedbackDone: document.querySelector("#feedback-done"),
  quietWelcome: document.querySelector("#quiet-welcome"),
  searchInput: document.querySelector("#search-input"),
  searchWrap: document.querySelector(".search-wrap"),
  searchResults: document.querySelector("#search-results"),
  mobilePreviousChapter: document.querySelector("#mobile-previous-chapter"),
  mobileNextChapter: document.querySelector("#mobile-next-chapter"),
  mobilePreviousTitle: document.querySelector("#mobile-previous-title"),
  mobileNextTitle: document.querySelector("#mobile-next-title"),
  menuToggle: document.querySelector("#menu-toggle"),
  sidebar: document.querySelector("#sidebar"),
  sidebarScrim: document.querySelector("#sidebar-scrim"),
  editionPicker: document.querySelector("#edition-picker"),
  editionSelect: document.querySelector("#edition-select"),
  editionSelectCode: document.querySelector("#edition-select-code"),
  editionSelectLabel: document.querySelector("#edition-select-label"),
  editionOptions: document.querySelector("#edition-options"),
  editionAttribution: document.querySelector("#edition-attribution"),
  editionNotice: document.querySelector("#edition-notice"),
  editionOffline: document.querySelector("#edition-offline"),
  editionOfflineStatus: document.querySelector("#edition-offline-status"),
  editionOfflineAction: document.querySelector("#edition-offline-action"),
  brand: document.querySelector(".brand"),
  brandEditionPrimary: document.querySelector("#brand-edition-primary"),
  brandEditionSecondary: document.querySelector("#brand-edition-secondary")
};
let chapterPicker;
let editionPicker;
let offlineControl;
let verseNavigationQueue = Promise.resolve();
let editionCycleQueue = Promise.resolve();
let verseActions;
let renderedChapter = null;
let renderedBookList = null;
let displayedEditionId = null;
const headingBook = document.querySelector("#heading-book");
const chapterHeading = headingBook.closest("h1");

function fitBookHeading() {
  headingBook.style.removeProperty("font-size");
  const availableWidth = chapterHeading.getBoundingClientRect().width;
  const naturalWidth = headingBook.getBoundingClientRect().width;
  if (availableWidth > 0 && naturalWidth > availableWidth) {
    const defaultSize = parseFloat(getComputedStyle(headingBook).fontSize);
    let minimumSize = 0;
    let maximumSize = defaultSize;
    while (maximumSize - minimumSize > 0.05) {
      const size = (minimumSize + maximumSize) / 2;
      headingBook.style.fontSize = `${size}px`;
      if (headingBook.getBoundingClientRect().width <= availableWidth) {
        minimumSize = size;
      } else {
        maximumSize = size;
      }
    }
    headingBook.style.fontSize = `${minimumSize}px`;
  }
}

let headingWidth = 0;
new ResizeObserver(([entry]) => {
  if (entry.contentRect.width !== headingWidth) {
    headingWidth = entry.contentRect.width;
    fitBookHeading();
  }
}).observe(chapterHeading);
window.addEventListener("resize", fitBookHeading, { passive: true });
document.fonts.addEventListener("loadingdone", fitBookHeading);

const scriptureStores = new Map(EDITION_IDS.map((editionId) => {
  const edition = EDITIONS[editionId];
  return [editionId, createScriptureStore({
    dataPath: edition.dataPath,
    editionId,
    language: edition.language,
    displayBookNames: edition.displayBookNames,
    bookOrder: edition.bookOrder,
  })];
}));
let scripture = scriptureStores.get(DEFAULT_EDITION);
const testamentFor = (book) => book <= 39 ? "old" : "new";
const bookName = (book) => scripture.bookName(book);
const referenceBookName = (book) => scripture.referenceBookName(book);
const visualEffects = createVisualEffects({
  shell: document.querySelector(".app-shell"),
  verseList: elements.verseList
});
const shareLanguageMenu = createShareLanguageMenu({
  trigger: elements.shareControl,
  copyTrigger: elements.copyControl,
  menu: elements.shareLanguageMenu,
  editionIds: EDITION_IDS,
  editions: EDITIONS,
  getActiveEditionId: () => state.editionId,
  onOpen: (action) => {
    verseActions.clearFeedbackTimer();
    elements.copyStatus.textContent = "";
    elements.shareLanguageMenu.setAttribute(
      "aria-label",
      uiText(action === "copy" ? "copyInLanguage" : "shareInLanguage"),
    );
    verseActions.warmShareChapters();
  },
  onSelect: (editionId, action) => {
    if (action === "copy") void verseActions.copySelectedVerses({ editionId });
    else void verseActions.shareSelectedVerses(editionId);
  },
});
const readerFeedback = createReaderFeedback({
  elements,
  uiText,
  currentPassage: currentFeedbackPassage,
  logger,
});

verseActions = createVerseCopyShare({
  state,
  elements,
  scriptureStores,
  getScripture: () => scripture,
  uiText,
  editions: EDITIONS,
  logger,
  clearVerseSelection,
  updateCopyControl,
});
const readerSearch = createReaderSearch({
  elements,
  getEditionId: () => state.editionId,
  getScripture: () => scripture,
  editions: EDITIONS,
  uiText,
  bookName,
  referenceBookName,
  logger,
  openChapter,
});

function updateCopyControl({ clearStatus = true } = {}) {
  const count = state.selectedVerses.size;
  const visible = count > 0;
  elements.verseActions.classList.toggle("is-visible", visible);
  elements.verseActions.setAttribute("aria-hidden", String(!visible));
  elements.verseActions.inert = !visible;
  if (!visible) shareLanguageMenu.close();
  elements.appShell.classList.toggle("has-copy-selection", visible);
  elements.copyControlLabel.textContent = visible
    ? uiText(count === 1 ? "copyOneVerse" : "copyManyVerses", { count })
    : uiText("copyText");
  elements.shareControl.setAttribute(
    "aria-label",
    visible ? uiText(count === 1 ? "shareOneVerse" : "shareManyVerses", { count }) : uiText("shareSelected"),
  );
  elements.shareControl.title = visible
    ? uiText(count === 1 ? "shareOneVerse" : "shareManyVerses", { count })
    : uiText("shareSelected");
  if (clearStatus) elements.copyStatus.textContent = "";
  verseActions?.clearFeedbackTimer();
}

function readSavedReaderState() {
  try {
    const savedState = JSON.parse(window.localStorage.getItem(readerStateStorageKey));
    if (
      !savedState ||
      savedState.version !== 1 ||
      !Object.hasOwn(EDITIONS, savedState.editionId) ||
      !Number.isSafeInteger(savedState.book) || savedState.book < 1 || savedState.book > BOOKS.length ||
      !Number.isSafeInteger(savedState.chapter) || savedState.chapter < 1 ||
      !Number.isSafeInteger(savedState.verse) || savedState.verse < 1 ||
      !Array.isArray(savedState.selectedVerses)
    ) {
      return null;
    }

    return {
      editionId: savedState.editionId,
      book: savedState.book,
      chapter: savedState.chapter,
      verse: savedState.verse,
      selectedVerses: [...new Set(savedState.selectedVerses.filter((verse) =>
        Number.isSafeInteger(verse) && verse > 0,
      ))],
    };
  } catch {
    return null;
  }
}

function readDefaultEdition() {
  try {
    const editionId = window.localStorage.getItem(defaultEditionStorageKey);
    return Object.hasOwn(EDITIONS, editionId) ? editionId : null;
  } catch {
    return null;
  }
}

function initialInstallEdition() {
  const editionId = new URLSearchParams(window.location.search).get("install");
  if (!Object.hasOwn(EDITIONS, editionId)) return null;
  const savedEdition = readDefaultEdition();
  if (savedEdition) return savedEdition;
  try {
    window.localStorage.setItem(defaultEditionStorageKey, editionId);
  } catch (error) {
    logger.warn("Could not save the installed app's default edition", { editionId, error });
  }
  return editionId;
}

function saveReaderState() {
  try {
    window.localStorage.setItem(readerStateStorageKey, JSON.stringify({
      version: 1,
      editionId: state.editionId,
      book: state.book,
      chapter: state.chapter,
      verse: state.verse,
      selectedVerses: [...state.selectedVerses].sort((left, right) => left - right),
    }));
  } catch {
    // Reading remains available when browser storage is disabled or full.
  }
}

function clearVerseSelection() {
  for (const verseNumber of state.selectedVerses) {
    const row = elements.verseList.querySelector(`[data-verse="${verseNumber}"]`);
    row?.classList.remove("is-copy-selected");
    row?.setAttribute("aria-pressed", "false");
  }
  state.selectedVerses.clear();
  updateCopyControl();
  saveReaderState();
}

function toggleVerseSelection(row) {
  const verseNumber = Number(row.dataset.verse);
  if (state.selectedVerses.has(verseNumber)) {
    state.selectedVerses.delete(verseNumber);
  } else {
    state.selectedVerses.add(verseNumber);
  }
  const selected = state.selectedVerses.has(verseNumber);
  row.classList.toggle("is-copy-selected", selected);
  row.setAttribute("aria-pressed", String(selected));
  updateCopyControl();
  saveReaderState();
}

function restoreVerseSelection(verseNumbers, verseCount) {
  for (const verseNumber of verseNumbers) {
    if (!Number.isSafeInteger(verseNumber) || verseNumber > verseCount) continue;
    const row = elements.verseList.querySelector(`[data-verse="${verseNumber}"]`);
    if (!row) continue;

    state.selectedVerses.add(verseNumber);
    row.classList.add("is-copy-selected");
    row.setAttribute("aria-pressed", "true");
  }
  updateCopyControl();
}

function updateVerseLocation(verseNumber) {
  state.verse = verseNumber;
  const path = scriptureRoutes.buildPath(
    state.book,
    state.chapter,
    { start: verseNumber, end: verseNumber },
    state.editionId,
  );
  if (window.location.pathname !== path) window.history.replaceState(null, "", path);
}

function currentFeedbackPassage() {
  const route = scriptureRoutes.parse(window.location.pathname);
  const passage = route && !route.home
    ? route
    : {
      book: state.book,
      chapter: state.chapter,
      range: { start: state.verse, end: state.verse },
      editionId: state.editionId,
    };
  const range = passage.range ?? { start: state.verse, end: state.verse };
  const verseReference = range.start === range.end
    ? range.start
    : `${range.start}-${range.end}`;
  const passageScripture = scriptureStores.get(passage.editionId) ?? scripture;
  return `${passageScripture.referenceBookName(passage.book)} ${passage.chapter}:${verseReference}`;
}

async function activateEdition(editionId) {
  showEdition(editionId);
  await scripture.initialize();
}

function showEdition(editionId) {
  const edition = EDITIONS[editionId];
  const store = scriptureStores.get(editionId);
  if (!edition || !store) throw new RangeError(`Unknown edition: ${editionId}`);
  if (displayedEditionId === editionId) {
    elements.editionNotice.hidden = true;
    return;
  }

  state.editionId = editionId;
  elements.brand.href = new URL(edition.routeSegment, document.baseURI).pathname;
  scripture = store;
  document.documentElement.lang = edition.language;
  uiLocale = getUiLocale(edition.language);
  applyUiLocale(uiLocale);
  document.querySelector(".topbar-about").setAttribute("href", `/about?lang=${edition.language}`);
  setQuietReadingMode(document.body.classList.contains("is-quiet-reading"));
  elements.editionNotice.hidden = true;
  document.body.classList.toggle("is-kjv-edition", editionId === "kjv");
  document.body.classList.toggle("is-krv-edition", editionId === "krv");
  document.body.classList.toggle("is-diodati-edition", editionId === "diodati");
  document.body.classList.toggle("is-luther1912-edition", editionId === "luther1912");
  document.body.classList.toggle("is-japbungo-edition", editionId === "japbungo");
  document.body.classList.toggle("is-martin1744-edition", editionId === "martin1744");
  document.body.classList.toggle("is-rv1865-edition", editionId === "rv1865");
  document.body.classList.toggle("is-alm1911-edition", editionId === "alm1911");
  document.querySelector('meta[name="description"]')?.setAttribute("content", uiText("metaDescription"));
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", uiText("metaDescription"));
  document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", uiText("metaDescription"));
  document.querySelector('meta[property="og:image:alt"]')?.setAttribute("content", uiText("socialPreviewAlt"));
  document.querySelector('meta[name="twitter:image:alt"]')?.setAttribute("content", uiText("socialPreviewAlt"));
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", edition.themeColor ?? "#f6f4f9");
  editionPicker.render(EDITION_IDS, EDITIONS, editionId, uiLocale);
  elements.editionSelect.disabled = false;
  elements.editionSelect.removeAttribute("aria-busy");
  elements.verseList.lang = edition.language;
  elements.verseList.dir = edition.direction;
  elements.searchResults.lang = edition.language;
  elements.searchResults.dir = edition.direction;
  elements.brandEditionPrimary.textContent = edition.brandPrimary;
  elements.brandEditionPrimary.dataset.glimmer = edition.brandPrimary;
  elements.brandEditionPrimary.lang = edition.language;
  elements.brandEditionSecondary.textContent = edition.brandSecondary;
  elements.brandEditionSecondary.dataset.glimmer = edition.brandSecondary;
  elements.brandEditionSecondary.lang = edition.language;
  elements.editionAttribution.replaceChildren();
  elements.editionAttribution.hidden = !edition.attribution;
  if (edition.attribution) {
    const link = document.createElement("a");
    link.href = edition.attributionUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = edition.attribution;
    elements.editionAttribution.append(link);
  }
  updateCopyControl();
  void offlineControl.render(edition, uiLocale);
  displayedEditionId = editionId;
}

async function changeEdition(editionId, { preserveFocus = false } = {}) {
  if (!EDITIONS[editionId] || editionId === state.editionId) return;
  const keepSidebarOpen = elements.sidebar.classList.contains("is-open");
  const { book, chapter, verse } = state;
  const selectedVerses = [...state.selectedVerses];
  const previousStore = scripture;
  const searchQuery = readerSearch.getQuery();
  const previousEditionId = state.editionId;
  readerSearch.invalidate();
  try {
    await activateEdition(editionId);
  } catch {
    showEdition(previousEditionId);
    elements.editionNotice.textContent = uiText("offlineEditionNotice", { edition: EDITIONS[editionId].name });
    elements.editionNotice.hidden = false;
    return;
  }
  try {
    window.localStorage.setItem(defaultEditionStorageKey, editionId);
  } catch {
    // The active edition remains usable if browser storage is unavailable.
  }
  await scripture.loadChapter(book, chapter);
  const canonicalStore = await verseActions.ensureChapterLoaded("kjv", "aligning");
  let targetVerse = 1;
  let selectedVersesToRestore = [];
  let alignmentUnavailable = !canonicalStore;

  if (canonicalStore) {
    try {
      const focusedVerse = resolveVerseReferences({
        sourceEditionId: previousEditionId,
        sourceStore: previousStore,
        targetEditionId: editionId,
        targetStore: scripture,
        canonicalStore,
        book,
        chapter,
        verseNumbers: [verse],
      });
      targetVerse = focusedVerse.targetVerses[0].verse;
    } catch (error) {
      if (!(error instanceof VerseReferenceAlignmentError)) throw error;
      alignmentUnavailable = true;
    }

    if (selectedVerses.length > 0) {
      try {
        const selected = resolveVerseReferences({
          sourceEditionId: previousEditionId,
          sourceStore: previousStore,
          targetEditionId: editionId,
          targetStore: scripture,
          canonicalStore,
          book,
          chapter,
          verseNumbers: selectedVerses,
        });
        selectedVersesToRestore = selected.targetVerses.map((selectedVerse) => selectedVerse.verse);
      } catch (error) {
        if (!(error instanceof VerseReferenceAlignmentError)) throw error;
        alignmentUnavailable = true;
      }
    }
  }

  await openChapter(book, chapter, targetVerse, { selectedVersesToRestore });
  if (alignmentUnavailable) elements.copyStatus.textContent = uiText("editionAlignmentUnavailable");
  animateEditionSwitch();
  requestAnimationFrame(() => {
    if (keepSidebarOpen) {
      elements.bookList.querySelector('.book-row[aria-current="page"]')?.focus();
    } else if (!preserveFocus) {
      document.querySelector(`#verse-${state.verse}`)?.focus({ preventScroll: true });
    }
  });
  if (searchQuery.length >= 2) {
    readerSearch.refresh(searchQuery);
  }
}

function cycleEdition(direction) {
  editionCycleQueue = editionCycleQueue
    .catch((error) => logger.error("Edition switch failed", { editionId: state.editionId, error }))
    .then(() => {
      const currentIndex = EDITION_IDS.indexOf(state.editionId);
      const nextIndex = (currentIndex + direction + EDITION_IDS.length) % EDITION_IDS.length;
      return changeEdition(EDITION_IDS[nextIndex], { preserveFocus: true });
    });
  return editionCycleQueue;
}

function cycleEditionFromShortcut(direction) {
  chapterPicker.close();
  editionPicker.close();
  void cycleEdition(direction);
}

function animateEditionSwitch() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.querySelector("#reader").animate(
    [
      { opacity: 0.68, transform: "translateY(8px) scale(0.995)", filter: "saturate(.82)" },
      { opacity: 1, transform: "translateY(0) scale(1)", filter: "saturate(1)" },
    ],
    { duration: 620, easing: "cubic-bezier(.22, 1, .36, 1)" },
  );
}

function setQuietReadingMode(enabled) {
  document.querySelector(".app-shell").classList.toggle("is-quiet-reading", enabled);
  document.body.classList.toggle("is-quiet-reading", enabled);
  elements.quietViewToggle.setAttribute("aria-pressed", String(enabled));
  const label = uiText(enabled ? "exitQuiet" : "enterQuiet");
  elements.quietViewToggle.setAttribute("aria-label", label);
  elements.quietViewToggle.title = label;
  elements.quietViewToggle.textContent = uiText(enabled ? "exit" : "quiet");
}

function toggleQuietReadingMode() {
  const isQuietReading = document.querySelector(".app-shell").classList.contains("is-quiet-reading");
  setQuietReadingMode(!isQuietReading);
}

function showInvalidScripturePath() {
  state.chapterRequestId += 1;
  window.location.replace(new URL("404.html", document.baseURI).href);
}

async function restoreLocationFromPath() {
  const route = scriptureRoutes.parse(window.location.pathname);
  if (!route) {
    showInvalidScripturePath();
    return;
  }

  const savedState = readSavedReaderState();
  const savedLocation = route.home ? savedState : null;
  await activateEdition((route.home ? readDefaultEdition() ?? initialInstallEdition() : null) ?? savedLocation?.editionId ?? route.editionId);
  const canRestoreSavedLocation = savedLocation &&
    savedLocation.chapter <= scripture.chapterCount(savedLocation.book);

  const routeMatchesSavedState = savedState && !route.home &&
    savedState.editionId === route.editionId &&
    savedState.book === route.book &&
    savedState.chapter === route.chapter &&
    route.range?.start === savedState.verse &&
    route.range?.end === savedState.verse &&
    savedState.chapter <= scripture.chapterCount(savedState.book);
  const stateToRestore = canRestoreSavedLocation ? savedLocation : routeMatchesSavedState ? savedState : null;

  elements.quietWelcome.hidden = !route.home || Boolean(canRestoreSavedLocation);
  const reference = canRestoreSavedLocation
    ? savedLocation
    : route.home ? { book: 1, chapter: 1, verse: 1, range: null } : route;
  const range = canRestoreSavedLocation
    ? { start: savedLocation.verse, end: savedLocation.verse }
    : reference.range;
  await openChapter(reference.book, reference.chapter, range, {
    updateHistory: false,
    selectedVersesToRestore: stateToRestore?.selectedVerses,
    startAtTop: route.home || route.editionRoot,
  });
  if (route.legacy) {
    const canonicalPath = scriptureRoutes.buildPath(
      reference.book,
      reference.chapter,
      reference.range,
      route.editionId,
    );
    window.history.replaceState(null, "", canonicalPath);
  }
}

function navigateHome() {
  const editionRootPath = new URL(EDITIONS[state.editionId].routeSegment, document.baseURI).pathname;
  if (window.location.pathname !== editionRootPath || window.location.search || window.location.hash) {
    window.history.pushState(null, "", editionRootPath);
  }
  void restoreLocationFromPath();
}

function createChapterGradient() {
  const colors = [...CHAPTER_GRADIENT_COLORS];
  for (let index = colors.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [colors[index], colors[swapIndex]] = [colors[swapIndex], colors[index]];
  }
  const angle = Math.floor(Math.random() * 360);
  const stops = colors.map((color, index) => `${color} ${index / (colors.length - 1) * 100}%`);
  return `linear-gradient(${angle}deg, ${stops.join(", ")})`;
}

async function initialize() {
  editionPicker = createEditionPicker({
    root: elements.editionPicker,
    trigger: elements.editionSelect,
    code: elements.editionSelectCode,
    label: elements.editionSelectLabel,
    menu: elements.editionOptions,
    onSelect: (editionId) => void changeEdition(editionId),
    onEscape: () => document.querySelector(`#verse-${state.verse}`)?.focus({ preventScroll: true }),
  });
  offlineControl = createOfflineControl({
    root: elements.editionOffline,
    status: elements.editionOfflineStatus,
    action: elements.editionOfflineAction,
    offline: createOfflineEditions(),
  });
  void registerServiceWorker();
  const initialRoute = scriptureRoutes.parse(window.location.pathname);
  const savedEditionId = initialRoute?.home
    ? readDefaultEdition() ?? initialInstallEdition() ?? readSavedReaderState()?.editionId
    : null;
  let editionLoadError = null;
  await activateEdition(savedEditionId ?? initialRoute?.editionId ?? DEFAULT_EDITION)
    .catch((error) => { editionLoadError = error; });
  if (!editionLoadError) renderBookList();
  chapterPicker = createChapterPicker({
    root: elements.chapterPicker,
    trigger: elements.chapterSelect,
    value: elements.chapterSelectValue,
    popover: elements.chapterOptions,
    heading: elements.chapterOptionsTitle,
    count: elements.chapterOptionsCount,
    list: elements.chapterOptionsList,
    onSelect: (chapter) => openChapter(
      state.book,
      chapter,
      null,
      { direction: Math.sign(chapter - state.chapter) },
    ).then(() => document.querySelector(`#verse-${state.verse}`)?.focus({ preventScroll: true }))
  });
  visualEffects.bind();
  bindEvents();
  // Finish wiring first so a saved edition can still be chosen after a failed load.
  if (editionLoadError) throw editionLoadError;
  await restoreLocationFromPath();
}

async function openChapter(book, chapter, requestedRange = null, {
  updateHistory = true,
  direction = 0,
  selectedVersesToRestore = [],
  startAtTop = false,
} = {}) {
  if (updateHistory) elements.quietWelcome.hidden = true;
  clearVerseSelection();
  const requestId = ++state.chapterRequestId;
  const normalizedRange = normalizeVerseRange(requestedRange);
  state.book = book;
  state.chapter = chapter;
  state.verse = normalizedRange?.start ?? 1;
  state.testament = testamentFor(book);
  state.lastBookByTestament[state.testament] = book;
  renderBookList();
  const reuseChapter = renderedChapter?.editionId === state.editionId &&
    renderedChapter.book === book && renderedChapter.chapter === chapter;
  if (!reuseChapter) {
    renderedChapter = null;
    elements.verseList.setAttribute("aria-busy", "true");
    elements.verseList.textContent = uiText("loadingPlace");

    try {
      await logger.measure("Chapter load", { editionId: state.editionId, book, chapter }, () => scripture.loadChapter(book, chapter));
    } catch (error) {
      if (requestId !== state.chapterRequestId) return;
      if (error instanceof RangeError) {
        showInvalidScripturePath();
        return;
      }
      logger.error("Chapter load failed", { editionId: state.editionId, book, chapter, error });
      elements.verseList.removeAttribute("aria-busy");
      elements.verseList.textContent = uiText("chapterLoadFailed");
      return;
    }
  }

  if (requestId !== state.chapterRequestId) return;
  const range = normalizedRange ?? (updateHistory ? { start: 1, end: 1 } : null);
  const verses = scripture.getChapter(book, chapter);
  if (range && !isValidVerseRange(range, verses.length)) {
    showInvalidScripturePath();
    return;
  }
  elements.verseList.removeAttribute("aria-busy");
  if (reuseChapter) {
    visualEffects.clearScriptureGlow();
    elements.verseList.querySelectorAll(".verse").forEach((row) => {
      const verse = Number(row.dataset.verse);
      row.classList.toggle("is-focused", Boolean(range && verse >= range.start && verse <= range.end));
    });
  } else {
    renderChapter(range);
    renderedChapter = { editionId: state.editionId, book, chapter };
  }
  restoreVerseSelection(selectedVersesToRestore, verses.length);
  if (!reuseChapter) animateChapterTurn(direction, requestId);
  if (range) {
    scrollToVerse(range.start, requestId, startAtTop);
  } else {
    visualEffects.triggerChapterGlimmers();
  }
  const path = scriptureRoutes.buildPath(book, chapter, range, state.editionId);
  if (updateHistory) {
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
  }
  saveReaderState();
}

function scrollToVerse(verse, requestId, startAtTop = false) {
  requestAnimationFrame(() => {
    if (requestId !== state.chapterRequestId) return;
    if (startAtTop) {
      window.scrollTo({ top: 0, behavior: "instant" });
    } else {
      document.querySelector(`#verse-${verse}`)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
        inline: "nearest"
      });
    }
    requestAnimationFrame(visualEffects.triggerChapterGlimmers);
  });
}

function renderBookList() {
  if (renderedBookList?.editionId === state.editionId && renderedBookList.testament === state.testament) {
    elements.bookList.querySelectorAll(".book-row").forEach((button) => {
      const current = Number(button.dataset.book) === state.book;
      button.classList.toggle("is-current", current);
      button.setAttribute("aria-current", current ? "page" : "false");
    });
    return;
  }
  elements.bookList.replaceChildren();
  const books = scripture.bookOrder.filter((book) => testamentFor(book) === state.testament);
  for (const book of books) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.book = book;
    button.className = `book-row${book === state.book ? " is-current" : ""}`;
    button.setAttribute("aria-current", book === state.book ? "page" : "false");
    const chapters = scripture.chapterCount(book);
    button.innerHTML = `<span class="book-index">${String(book).padStart(2, "0")}</span><span class="book-name">${bookName(book)}</span><span class="book-chapters">${chapters}</span>`;
    button.querySelector(".book-name").lang = EDITIONS[state.editionId].language;
    button.addEventListener("click", () => {
      const changedBook = book !== state.book;
      closeSidebar();
      void openChapter(book, 1).then(() => {
        if (changedBook && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          document.querySelector("#reader").animate(
            [
              { opacity: 0.55, transform: "translateY(8px)" },
              { opacity: 1, transform: "translateY(0)" }
            ],
            { duration: 320, easing: "cubic-bezier(.22, 1, .36, 1)" }
          );
        }
      });
    });
    elements.bookList.append(button);
  }
  renderedBookList = { editionId: state.editionId, testament: state.testament };
}

function renderChapter(focusRange = null) {
  const name = referenceBookName(state.book);
  const testament = testamentFor(state.book);
  const verses = scripture.getChapter(state.book, state.chapter);
  document.querySelector("#testament-name").textContent = uiText(
    testament === "old" ? "oldTestamentFull" : "newTestamentFull",
  ).toUpperCase();
  document.querySelector("#book-crumb").textContent = name.toUpperCase();
  document.querySelector("#book-crumb").lang = EDITIONS[state.editionId].language;
  headingBook.textContent = name;
  headingBook.dataset.glimmer = name;
  headingBook.lang = EDITIONS[state.editionId].language;
  fitBookHeading();
  const chapterNumber = document.querySelector("#heading-chapter");
  chapterNumber.textContent = state.chapter;
  chapterNumber.dataset.glimmer = state.chapter;
  chapterNumber.style.setProperty("--chapter-gradient", createChapterGradient());
  const chapterKicker = document.querySelector("#chapter-kicker");
  chapterKicker.textContent = state.editionId === "kjv"
    ? BOOK_TITLES[state.book - 1].toUpperCase()
    : name.toUpperCase();
  chapterKicker.lang = EDITIONS[state.editionId].language;
  const formattedVerseCount = new Intl.NumberFormat(EDITIONS[state.editionId].language).format(verses.length);
  document.querySelector("#verse-count").textContent = uiText(
    verses.length === 1 ? "verseCountOne" : "verseCountMany",
    { count: formattedVerseCount },
  );
  document.querySelector("#testament-meta").textContent = uiText(
    testament === "old" ? "oldTestamentFull" : "newTestamentFull",
  );
  const chapterSourceHeading = document.querySelector("#chapter-source-heading");
  chapterSourceHeading.textContent = scripture.getChapterFrontMatter(state.book, state.chapter);
  chapterSourceHeading.lang = EDITIONS[state.editionId].language;
  chapterSourceHeading.hidden = !chapterSourceHeading.textContent;
  const { appName, name: editionName } = EDITIONS[state.editionId];
  document.title = `${name} ${state.chapter} — ${state.editionId === "kjv" ? appName : `${editionName} · ${appName}`}`;

  const chapterCount = scripture.chapterCount(state.book);
  chapterPicker.render({ bookName: name, chapterCount, activeChapter: state.chapter, locale: uiLocale });
  document.querySelector("#chapter-options-title").lang = EDITIONS[state.editionId].language;

  visualEffects.clearScriptureGlow();
  elements.verseList.replaceChildren();
  for (const verse of verses) {
    for (const headingText of scripture.getVerseHeadings(state.book, state.chapter, verse.verse)) {
      const heading = document.createElement("p");
      heading.className = "verse-section-heading";
      heading.setAttribute("role", "heading");
      heading.setAttribute("aria-level", "2");
      heading.lang = EDITIONS[state.editionId].language;
      heading.textContent = headingText;
      elements.verseList.append(heading);
    }
    const row = document.createElement("button");
    row.type = "button";
    row.tabIndex = -1;
    const isFocused = focusRange && verse.verse >= focusRange.start && verse.verse <= focusRange.end;
    row.className = `verse${isFocused ? " is-focused" : ""}`;
    row.id = `verse-${verse.verse}`;
    row.dataset.verse = verse.verse;
    row.setAttribute("aria-pressed", "false");
    const textLanguage = verse.textLanguage ?? EDITIONS[state.editionId].language;
    row.lang = textLanguage;
    row.dir = EDITIONS[state.editionId].direction;
    const number = document.createElement("span");
    number.className = "verse-number";
    number.textContent = verse.verse;
    const text = document.createElement("span");
    text.className = "verse-text";
    text.lang = textLanguage;
    text.dir = EDITIONS[state.editionId].direction;
    if (verse.sourceEdition === "krv") {
      const fallbackPanel = document.createElement("span");
      fallbackPanel.className = "verse-source-panel verse-source-panel--krv";
      fallbackPanel.lang = "ko";
      const sourceLabel = document.createElement("span");
      sourceLabel.className = "verse-source-label";
      sourceLabel.lang = EDITIONS[state.editionId].language;
      sourceLabel.textContent = uiText("sourceFallback");
      const fallbackVerse = document.createElement("span");
      fallbackVerse.className = "verse-source-panel-text";
      fallbackVerse.textContent = verse.text;
      fallbackPanel.append(sourceLabel, fallbackVerse);
      text.append(fallbackPanel);
      if (verse.referenceText) {
        const kjvReference = document.createElement("span");
        kjvReference.className = "verse-source-panel verse-source-panel--kjv verse-kjv-reference";
        kjvReference.lang = verse.referenceTextLanguage;
        const referenceLabel = document.createElement("span");
        referenceLabel.className = "verse-source-label verse-kjv-reference-label";
        referenceLabel.textContent = uiText("kjvReference");
        const referenceText = document.createElement("span");
        referenceText.className = "verse-source-panel-text";
        referenceText.textContent = verse.referenceText;
        kjvReference.append(referenceLabel, referenceText);
        text.append(kjvReference);
      }
    } else {
      text.textContent = verse.text;
    }
    row.append(number, text);
    elements.verseList.append(row);
  }

  updateChapterLinks();
  document.querySelectorAll(".testament-tab").forEach((tab) => {
    const active = tab.dataset.testament === testament;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
}

function adjacentChapter(offset) {
  const order = scripture.bookOrder;
  let book = state.book;
  let bookIndex = order.indexOf(book);
  let chapter = state.chapter + offset;
  let total = scripture.chapterCount(book);
  while (chapter < 1) {
    bookIndex -= 1;
    if (bookIndex < 0) return { book: order[0], chapter: 1 };
    book = order[bookIndex];
    total = scripture.chapterCount(book);
    chapter = total;
  }
  while (chapter > total) {
    chapter -= total;
    bookIndex += 1;
    if (bookIndex >= order.length) {
      const lastBook = order[order.length - 1];
      return { book: lastBook, chapter: scripture.chapterCount(lastBook) };
    }
    book = order[bookIndex];
    total = scripture.chapterCount(book);
  }
  return { book, chapter };
}

function updateChapterLinks() {
  const previous = adjacentChapter(-1);
  const next = adjacentChapter(1);
  const previousTitle = `${referenceBookName(previous.book)} ${previous.chapter}`;
  const nextTitle = `${referenceBookName(next.book)} ${next.chapter}`;
  document.querySelector("#previous-title").textContent = previousTitle;
  document.querySelector("#next-title").textContent = nextTitle;
  document.querySelector("#previous-title").lang = EDITIONS[state.editionId].language;
  document.querySelector("#next-title").lang = EDITIONS[state.editionId].language;
  document.querySelector("#previous-chapter").title = uiText("previousChapter", { reference: previousTitle });
  document.querySelector("#previous-chapter").setAttribute("aria-label", uiText("previousChapter", { reference: previousTitle }));
  document.querySelector("#next-chapter").title = uiText("nextChapter", { reference: nextTitle });
  document.querySelector("#next-chapter").setAttribute("aria-label", uiText("nextChapter", { reference: nextTitle }));
  elements.mobilePreviousTitle.textContent = previousTitle;
  elements.mobileNextTitle.textContent = nextTitle;
  elements.mobilePreviousTitle.lang = EDITIONS[state.editionId].language;
  elements.mobileNextTitle.lang = EDITIONS[state.editionId].language;
  elements.mobilePreviousChapter.setAttribute("aria-label", uiText("previousChapter", { reference: previousTitle }));
  elements.mobileNextChapter.setAttribute("aria-label", uiText("nextChapter", { reference: nextTitle }));
}

function navigate(offset) {
  const target = adjacentChapter(offset);
  void openChapter(target.book, target.chapter, null, { direction: offset });
}

function selectTestament(testament) {
  void openChapter(state.lastBookByTestament[testament], 1).then(() => {
    if (!elements.sidebar.classList.contains("is-open")) {
      document.querySelector(`#verse-${state.verse}`)?.focus({ preventScroll: true });
    }
  });
}

function navigateVerse(offset) {
  verseNavigationQueue = verseNavigationQueue
    .then(() => moveToAdjacentVerse(offset))
    .catch((error) => logger.error("Verse navigation failed", { editionId: state.editionId, error }));
}

async function moveToAdjacentVerse(offset) {
  if (elements.verseList.getAttribute("aria-busy") === "true") return;

  const verses = scripture.getChapter(state.book, state.chapter);
  if (verses.length === 0) return;

  const step = getVerseStep(state.verse, verses.length, offset);
  if (step.chapterOffset === 0) {
    await openChapter(state.book, state.chapter, step.verse);
    return;
  }

  const target = adjacentChapter(step.chapterOffset);
  if (target.book === state.book && target.chapter === state.chapter) return;

  const targetVerse = step.verse ?? (await scripture.loadChapter(target.book, target.chapter)).length;
  await openChapter(target.book, target.chapter, targetVerse);
}

function animateChapterTurn(direction, requestId) {
  if (direction === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  requestAnimationFrame(() => {
    if (requestId !== state.chapterRequestId) return;
    document.querySelector("#reader").animate(
      [
        { opacity: .82, transform: `translateX(${direction * 12}px) scale(.996)` },
        { opacity: 1, transform: "translateX(0)" }
      ],
      { duration: 340, easing: "cubic-bezier(.22, 1, .36, 1)" }
    );
  });
}

function openSidebar() {
  elements.sidebar.classList.add("is-open");
  elements.sidebarScrim.classList.add("is-open");
  elements.menuToggle.setAttribute("aria-expanded", "true");
  elements.menuToggle.setAttribute("aria-label", uiText("closeNavigation"));
}

function closeSidebar() {
  elements.sidebar.classList.remove("is-open");
  elements.sidebarScrim.classList.remove("is-open");
  elements.menuToggle.setAttribute("aria-expanded", "false");
  elements.menuToggle.setAttribute("aria-label", uiText("openNavigation"));
}

function bindMobileChapterButtons() {
  for (const [button, offset] of [
    [elements.mobilePreviousChapter, -1],
    [elements.mobileNextChapter, 1]
  ]) {
    button.addEventListener("click", () => {
      navigate(offset);
      button.classList.remove("did-navigate");
      void button.offsetWidth;
      button.classList.add("did-navigate");
    });
    button.addEventListener("animationend", (event) => {
      if (event.animationName === "chapter-tap") button.classList.remove("did-navigate");
    });
  }
}

function bindMobilePullToRefresh() {
  const threshold = 72;
  const maxDistance = 96;
  const excludedTargets = "button, a, input, textarea, select, [contenteditable='true'], dialog[open], .search-results, .sidebar, .chapter-popover, .edition-options, .mobile-chapter-cues";
  let startX = null;
  let startY = null;
  let distance = 0;

  const reset = () => {
    startX = null;
    startY = null;
    distance = 0;
    document.body.classList.remove("is-pull-refreshing", "is-pull-refresh-ready");
    elements.pullRefreshIndicator.setAttribute("aria-hidden", "true");
    elements.pullRefreshIndicator.style.removeProperty("--pull-refresh-offset");
    elements.pullRefreshIndicator.style.removeProperty("--pull-refresh-progress");
  };
  const isAtTop = () => window.scrollY <= 0 && (document.scrollingElement?.scrollTop ?? 0) <= 0;

  document.addEventListener("touchstart", (event) => {
    if (
      event.touches.length !== 1 ||
      !isAtTop() ||
      (event.target instanceof Element && event.target.closest(excludedTargets))
    ) {
      reset();
      return;
    }

    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });

  document.addEventListener("touchmove", (event) => {
    if (startY === null || event.touches.length !== 1 || !isAtTop()) {
      reset();
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    if (deltaY <= 0 || Math.abs(deltaX) > Math.abs(deltaY)) {
      reset();
      return;
    }

    if (event.cancelable) event.preventDefault();
    distance = Math.min(deltaY * 0.6, maxDistance);
    const ready = distance >= threshold;
    document.body.classList.toggle("is-pull-refreshing", distance > 0);
    document.body.classList.toggle("is-pull-refresh-ready", ready);
    elements.pullRefreshIndicator.setAttribute("aria-hidden", "false");
    elements.pullRefreshLabel.textContent = uiText(ready ? "releaseToRefresh" : "pullToRefresh");
    elements.pullRefreshIndicator.style.setProperty("--pull-refresh-offset", `${distance}px`);
    elements.pullRefreshIndicator.style.setProperty(
      "--pull-refresh-progress",
      `${Math.min(distance / threshold, 1) * 360}deg`,
    );
  }, { passive: false });

  document.addEventListener("touchend", () => {
    if (startY === null) return;
    const shouldRefresh = distance >= threshold;
    startX = null;
    startY = null;
    if (!shouldRefresh) {
      reset();
      return;
    }

    document.body.classList.add("is-refreshing");
    document.body.classList.remove("is-pull-refresh-ready");
    elements.pullRefreshLabel.textContent = uiText("refreshing");
    elements.pullRefreshIndicator.setAttribute("aria-label", uiText("refreshing"));
    elements.pullRefreshIndicator.style.setProperty("--pull-refresh-offset", "88px");
    requestAnimationFrame(() => window.location.reload());
  }, { passive: true });

  document.addEventListener("touchcancel", reset, { passive: true });
}

function bindMobileSidebarSwipe() {
  const edgeWidth = 28;
  const swipeThreshold = 72;
  const excludedTargets = "button, a, input, textarea, select, [contenteditable='true'], dialog[open], .search-wrap, .sidebar, .sidebar-scrim, .chapter-popover, .edition-options, .mobile-chapter-cues";
  let startX = null;
  let startY = null;
  let gesture = null;

  const reset = () => {
    startX = null;
    startY = null;
    gesture = null;
  };

  document.addEventListener("touchstart", (event) => {
    const target = event.target;
    if (
      window.innerWidth > 640 ||
      event.touches.length !== 1 ||
      elements.appShell.classList.contains("is-quiet-reading") ||
      elements.feedbackDialog.open
    ) {
      reset();
      return;
    }

    const touch = event.touches[0];
    if (elements.sidebar.classList.contains("is-open")) {
      if (!(target instanceof Element) || !elements.sidebar.contains(target)) {
        reset();
        return;
      }
      gesture = "close";
      startX = touch.clientX;
      startY = touch.clientY;
      return;
    }

    if (target instanceof Element && target.closest(excludedTargets)) {
      reset();
      return;
    }
    if (touch.clientX > edgeWidth) {
      reset();
      return;
    }
    gesture = "open";
    startX = touch.clientX;
    startY = touch.clientY;
  }, { passive: true });

  document.addEventListener("touchmove", (event) => {
    if (startX === null || startY === null || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const directionalDeltaX = gesture === "close" ? -deltaX : deltaX;
    if (directionalDeltaX > 12 && directionalDeltaX > Math.abs(deltaY)) {
      if (event.cancelable) event.preventDefault();
    } else if (Math.abs(deltaY) > 32 || directionalDeltaX < 0) {
      reset();
    }
  }, { passive: false });

  document.addEventListener("touchend", (event) => {
    if (startX === null || startY === null) return;
    const touch = event.changedTouches[0];
    const deltaX = touch ? touch.clientX - startX : 0;
    const deltaY = touch ? touch.clientY - startY : 0;
    const isHorizontalSwipe = Math.abs(deltaX) >= swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;
    const shouldOpen = gesture === "open" && isHorizontalSwipe && deltaX > 0;
    const shouldClose = gesture === "close" && isHorizontalSwipe && deltaX < 0;
    reset();
    if (shouldOpen) openSidebar();
    if (shouldClose) closeSidebar();
  }, { passive: true });

  document.addEventListener("touchcancel", reset, { passive: true });
}

function scrollToPageTop() {
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "instant"
    : "smooth";
  window.scrollTo({ top: 0, behavior });
}

function bindScrollToTop() {
  function updateVisibility() {
    const scrollTop = Math.max(window.scrollY, document.scrollingElement?.scrollTop ?? 0);
    elements.scrollToTop.hidden = scrollTop <= 420;
  }

  window.addEventListener("scroll", updateVisibility, { passive: true });
  window.addEventListener("resize", updateVisibility, { passive: true });
  elements.scrollToTop.addEventListener("click", scrollToPageTop);
  updateVisibility();
}

function bindEvents() {
  readerSearch.bindEvents();
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || (key !== "c" && key !== "x")) return;
    if (elements.feedbackDialog.open) return;
    if (state.selectedVerses.size === 0) return;
    if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;

    event.preventDefault();
    void verseActions.copySelectedVerses({ clearAfter: key === "x" });
  });
  elements.verseList.addEventListener("click", (event) => {
    const verseButton = event.target.closest("button.verse");
    if (!verseButton || !elements.verseList.contains(verseButton)) return;

    updateVerseLocation(Number(verseButton.dataset.verse));
    toggleVerseSelection(verseButton);
  });
  elements.cutControl.addEventListener("click", () => void verseActions.copySelectedVerses({ clearAfter: true }));
  elements.clearControl.addEventListener("click", clearVerseSelection);
  elements.brand.addEventListener("click", () => {
    clearVerseSelection();
    window.getSelection()?.removeAllRanges();
  });
  readerFeedback.bindEvents();
  elements.quietViewToggle.addEventListener("click", () => {
    toggleQuietReadingMode();
  });
  document.querySelectorAll(".testament-tab").forEach((tab) => tab.addEventListener("click", () => {
    selectTestament(tab.dataset.testament);
  }));
  document.querySelector("#previous-chapter").addEventListener("click", () => navigate(-1));
  document.querySelector("#next-chapter").addEventListener("click", () => navigate(1));
  document.querySelector("#bottom-previous").addEventListener("click", () => navigate(-1));
  document.querySelector("#bottom-next").addEventListener("click", () => navigate(1));
  window.addEventListener("popstate", () => void restoreLocationFromPath());
  bindKeyboardShortcuts({
    dialog: document.querySelector("#shortcuts-dialog"),
    openButton: document.querySelector("#shortcuts-open"),
    closeButton: document.querySelector("#shortcuts-close"),
    searchInput: elements.searchInput,
    isPickerOpen: () => chapterPicker.isOpen() || editionPicker.isOpen(),
    isMenuOpen: () => shareLanguageMenu.isOpen(),
    isOtherDialogOpen: () => elements.feedbackDialog.open,
    onPreviousChapter: () => navigate(-1),
    onNextChapter: () => navigate(1),
    onPreviousVerse: () => navigateVerse(-1),
    onNextVerse: () => navigateVerse(1),
    onOldTestament: () => selectTestament("old"),
    onNewTestament: () => selectTestament("new"),
    onToggleQuietReading: toggleQuietReadingMode,
    onPreviousEdition: () => cycleEditionFromShortcut(-1),
    onNextEdition: () => cycleEditionFromShortcut(1),
    onHome: navigateHome,
    onScrollToTop: scrollToPageTop,
    isSidebarOpen: () => elements.sidebar.classList.contains("is-open"),
    onEscape: () => {
      const returnFocusToChapterPicker = chapterPicker.isOpen();
      setQuietReadingMode(false);
      chapterPicker.close(returnFocusToChapterPicker);
      readerSearch.close();
      closeSidebar();
    }
  });
  elements.menuToggle.addEventListener("click", () => {
    if (elements.sidebar.classList.contains("is-open")) closeSidebar();
    else openSidebar();
  });
  elements.sidebarScrim.addEventListener("click", closeSidebar);
  bindMobileChapterButtons();
  bindMobilePullToRefresh();
  bindMobileSidebarSwipe();
  bindScrollToTop();
}

initialize().catch((error) => {
  logger.error("Reader initialization failed", { error });
  elements.verseList.textContent = uiText("bibleLoadFailed");
});