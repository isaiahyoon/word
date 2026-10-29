import { bindKeyboardShortcuts } from "./keyboard-shortcuts.js";
import { createChapterPicker } from "./chapter-picker.js";
import { createScriptureStore } from "./scripture-store.js";
import { createVisualEffects } from "./visual-effects.js";
import { createScriptureRoutes, getVerseStep, isValidVerseRange, normalizeVerseRange } from "./scripture-routes.mjs";
import { BOOKS } from "./books.mjs";

const BOOK_TITLES = [
  "The First Book of Moses", "The Second Book of Moses", "The Third Book of Moses", "The Fourth Book of Moses", "The Fifth Book of Moses", "The Book of Joshua", "The Book of Judges", "The Book of Ruth", "The First Book of Samuel", "The Second Book of Samuel", "The First Book of the Kings", "The Second Book of the Kings", "The First Book of the Chronicles", "The Second Book of the Chronicles", "The Book of Ezra", "The Book of Nehemiah", "The Book of Esther", "The Book of Job", "The Book of Psalms", "The Proverbs", "Ecclesiastes", "The Song of Solomon", "The Book of the Prophet Isaiah", "The Book of the Prophet Jeremiah", "The Lamentations of Jeremiah", "The Book of the Prophet Ezekiel", "The Book of Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "The Gospel According to St. Matthew", "The Gospel According to St. Mark", "The Gospel According to St. Luke", "The Gospel According to St. John", "The Acts of the Apostles", "The Epistle of Paul the Apostle to the Romans", "The First Epistle of Paul the Apostle to the Corinthians", "The Second Epistle of Paul the Apostle to the Corinthians", "The Epistle of Paul the Apostle to the Galatians", "The Epistle of Paul the Apostle to the Ephesians", "The Epistle of Paul the Apostle to the Philippians", "The Epistle of Paul the Apostle to the Colossians", "The First Epistle of Paul the Apostle to the Thessalonians", "The Second Epistle of Paul the Apostle to the Thessalonians", "The First Epistle of Paul the Apostle to Timothy", "The Second Epistle of Paul the Apostle to Timothy", "The Epistle of Paul to Titus", "The Epistle of Paul to Philemon", "The Epistle of Paul the Apostle to the Hebrews", "The General Epistle of James", "The First Epistle General of Peter", "The Second Epistle General of Peter", "The First Epistle General of John", "The Second Epistle of John", "The Third Epistle of John", "The General Epistle of Jude", "The Revelation of St. John the Divine"
];

const CHAPTER_GRADIENT_COLORS = ["var(--chapter-blue)", "var(--chapter-lavender)", "var(--chapter-pink)", "var(--chapter-green)"];
const state = { book: 1, chapter: 1, verse: 1, testament: "old", lastBookByTestament: { old: 1, new: 40 }, chapterRequestId: 0, searchTimer: null, searchRequestId: 0, searchMatches: [], searchQuery: "", searchShown: 0, searchActiveIndex: -1 };
const appBasePath = new URL(document.baseURI).pathname;
const scriptureRoutes = createScriptureRoutes(BOOKS, appBasePath);
const elements = {
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
  sidebarScrim: document.querySelector("#sidebar-scrim")
};
let chapterPicker;
let verseNavigationQueue = Promise.resolve();
const scripture = createScriptureStore();
const visualEffects = createVisualEffects({
  shell: document.querySelector(".app-shell"),
  verseList: elements.verseList
});

const testamentFor = (book) => book <= 39 ? "old" : "new";
const bookName = (book) => BOOKS[book - 1];

function setQuietReadingMode(enabled) {
  document.querySelector(".app-shell").classList.toggle("is-quiet-reading", enabled);
  document.body.classList.toggle("is-quiet-reading", enabled);
  elements.quietViewToggle.setAttribute("aria-pressed", String(enabled));
  elements.quietViewToggle.setAttribute(
    "aria-label",
    enabled ? "Exit quiet reading view" : "Enter quiet reading view"
  );
  elements.quietViewToggle.title = enabled ? "Exit quiet reading view" : "Enter quiet reading view";
  elements.quietViewToggle.textContent = enabled ? "Exit" : "Quiet";
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

  elements.quietWelcome.hidden = !route.home;
  const reference = route.home ? { book: 1, chapter: 1, range: null } : route;
  await openChapter(reference.book, reference.chapter, reference.range, { updateHistory: false });
}

function navigateHome() {
  if (window.location.pathname !== appBasePath || window.location.search || window.location.hash) {
    window.history.pushState(null, "", appBasePath);
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
  await scripture.initialize();
  renderBookList();
  chapterPicker = createChapterPicker({
    root: elements.chapterPicker,
    trigger: elements.chapterSelect,
    value: elements.chapterSelectValue,
    popover: elements.chapterOptions,
    heading: elements.chapterOptionsTitle,
    count: elements.chapterOptionsCount,
    list: elements.chapterOptionsList,
    onSelect: (chapter) => void openChapter(state.book, chapter, null, { direction: Math.sign(chapter - state.chapter) })
  });
  visualEffects.bind();
  bindEvents();
  await restoreLocationFromPath();
}

async function openChapter(book, chapter, requestedRange = null, { updateHistory = true, direction = 0 } = {}) {
  if (updateHistory) elements.quietWelcome.hidden = true;
  const requestId = ++state.chapterRequestId;
  const normalizedRange = normalizeVerseRange(requestedRange);
  state.book = book;
  state.chapter = chapter;
  state.verse = normalizedRange?.start ?? 1;
  state.testament = testamentFor(book);
  state.lastBookByTestament[state.testament] = book;
  renderBookList();
  elements.verseList.setAttribute("aria-busy", "true");
  elements.verseList.textContent = "Finding your place…";

  try {
    await scripture.loadChapter(book, chapter);
  } catch (error) {
    if (requestId !== state.chapterRequestId) return;
    if (error instanceof RangeError) {
      showInvalidScripturePath();
      return;
    }
    console.error(error);
    elements.verseList.removeAttribute("aria-busy");
    elements.verseList.textContent = "We couldn’t open this book. Please check your network connection.";
    return;
  }

  if (requestId !== state.chapterRequestId) return;
  const range = normalizedRange ?? (updateHistory ? { start: 1, end: 1 } : null);
  const verses = scripture.getChapter(book, chapter);
  if (range && !isValidVerseRange(range, verses.length)) {
    showInvalidScripturePath();
    return;
  }
  elements.verseList.removeAttribute("aria-busy");
  renderChapter(range);
  animateChapterTurn(direction, requestId);
  if (range) {
    requestAnimationFrame(() => {
      if (requestId !== state.chapterRequestId) return;
      document.querySelector(`#verse-${range.start}`)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
        inline: "nearest"
      });
      requestAnimationFrame(visualEffects.triggerChapterGlimmers);
    });
  } else {
    visualEffects.triggerChapterGlimmers();
  }
  const path = scriptureRoutes.buildPath(book, chapter, range);
  if (updateHistory) {
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
  }
}

function renderBookList() {
  elements.bookList.replaceChildren();
  const start = state.testament === "old" ? 1 : 40;
  const end = state.testament === "old" ? 39 : 66;
  for (let book = start; book <= end; book += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `book-row${book === state.book ? " is-current" : ""}`;
    button.setAttribute("aria-current", book === state.book ? "page" : "false");
    const chapters = scripture.chapterCount(book);
    button.innerHTML = `<span class="book-index">${String(book).padStart(2, "0")}</span><span class="book-name">${bookName(book)}</span><span class="book-chapters">${chapters}</span>`;
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
}

function renderChapter(focusRange = null) {
  const name = bookName(state.book);
  const testament = testamentFor(state.book);
  const verses = scripture.getChapter(state.book, state.chapter);
  document.querySelector("#testament-name").textContent = `${testament.toUpperCase()} TESTAMENT`;
  document.querySelector("#book-crumb").textContent = name.toUpperCase();
  const headingBook = document.querySelector("#heading-book");
  headingBook.textContent = name;
  headingBook.dataset.glimmer = name;
  const chapterNumber = document.querySelector("#heading-chapter");
  chapterNumber.textContent = state.chapter;
  chapterNumber.dataset.glimmer = state.chapter;
  chapterNumber.style.setProperty("--chapter-gradient", createChapterGradient());
  document.querySelector("#chapter-kicker").textContent = BOOK_TITLES[state.book - 1].toUpperCase();
  document.querySelector("#verse-count").textContent = `${verses.length} ${verses.length === 1 ? "verse" : "verses"}`;
  document.querySelector("#testament-meta").textContent = `${testament === "old" ? "Old" : "New"} Testament`;
  document.title = `${name} ${state.chapter} — The Word`;

  const chapterCount = scripture.chapterCount(state.book);
  chapterPicker.render({ bookName: name, chapterCount, activeChapter: state.chapter });

  visualEffects.clearScriptureGlow();
  elements.verseList.replaceChildren();
  for (const verse of verses) {
    const row = document.createElement("a");
    const isFocused = focusRange && verse.verse >= focusRange.start && verse.verse <= focusRange.end;
    row.className = `verse${isFocused ? " is-focused" : ""}`;
    row.id = `verse-${verse.verse}`;
    row.dataset.verse = verse.verse;
    row.href = scriptureRoutes.buildPath(state.book, state.chapter, { start: verse.verse, end: verse.verse });
    const number = document.createElement("span");
    number.className = "verse-number";
    number.textContent = verse.verse;
    const text = document.createElement("span");
    text.className = "verse-text";
    text.textContent = verse.text;
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
  let book = state.book;
  let chapter = state.chapter + offset;
  let total = scripture.chapterCount(book);
  while (chapter < 1) {
    book -= 1;
    if (book < 1) return { book: 1, chapter: 1 };
    total = scripture.chapterCount(book);
    chapter = total;
  }
  while (chapter > total) {
    book += 1;
    if (book > 66) return { book: 66, chapter: 22 };
    chapter -= total;
    total = scripture.chapterCount(book);
  }
  return { book, chapter };
}

function updateChapterLinks() {
  const previous = adjacentChapter(-1);
  const next = adjacentChapter(1);
  const previousTitle = `${bookName(previous.book)} ${previous.chapter}`;
  const nextTitle = `${bookName(next.book)} ${next.chapter}`;
  document.querySelector("#previous-title").textContent = previousTitle;
  document.querySelector("#next-title").textContent = nextTitle;
  document.querySelector("#previous-chapter").title = `Previous chapter: ${previousTitle}`;
  document.querySelector("#previous-chapter").setAttribute("aria-label", `Previous chapter: ${previousTitle}`);
  document.querySelector("#next-chapter").title = `Next chapter: ${nextTitle}`;
  document.querySelector("#next-chapter").setAttribute("aria-label", `Next chapter: ${nextTitle}`);
  elements.mobilePreviousTitle.textContent = previousTitle;
  elements.mobileNextTitle.textContent = nextTitle;
  elements.mobilePreviousChapter.setAttribute("aria-label", `Previous chapter: ${previousTitle}`);
  elements.mobileNextChapter.setAttribute("aria-label", `Next chapter: ${nextTitle}`);
}

function navigate(offset) {
  const target = adjacentChapter(offset);
  void openChapter(target.book, target.chapter, null, { direction: offset });
}

function selectTestament(testament) {
  void openChapter(state.lastBookByTestament[testament], 1);
}

function navigateVerse(offset) {
  verseNavigationQueue = verseNavigationQueue
    .then(() => moveToAdjacentVerse(offset))
    .catch((error) => console.error(error));
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

function appendHighlighted(container, text, query) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) {
    container.textContent = text;
    return;
  }
  container.append(document.createTextNode(text.slice(0, index)));
  const mark = document.createElement("mark");
  mark.textContent = text.slice(index, index + query.length);
  container.append(mark, document.createTextNode(text.slice(index + query.length)));
}

function openSearchResult(verse) {
  state.searchRequestId += 1;
  state.searchActiveIndex = -1;
  elements.searchResults.hidden = true;
  elements.searchInput.value = "";
  elements.searchInput.setAttribute("aria-expanded", "false");
  elements.searchInput.removeAttribute("aria-activedescendant");
  void openChapter(verse.book, verse.chapter, verse.verse);
}

function setActiveSearchResult(index) {
  const results = [...elements.searchResults.querySelectorAll(".search-result")];
  if (results.length === 0) return;

  state.searchActiveIndex = Math.max(0, Math.min(index, results.length - 1));
  results.forEach((result, resultIndex) => {
    result.setAttribute("aria-selected", String(resultIndex === state.searchActiveIndex));
  });
  const activeResult = results[state.searchActiveIndex];
  elements.searchInput.setAttribute("aria-activedescendant", activeResult.id);
  activeResult.scrollIntoView({ block: "nearest" });
}

function appendSearchResults() {
  const batch = state.searchMatches.slice(state.searchShown, state.searchShown + 12);
  for (const [batchIndex, verse] of batch.entries()) {
    const resultIndex = state.searchShown + batchIndex;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.id = `search-result-${resultIndex}`;
    button.tabIndex = -1;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(resultIndex === state.searchActiveIndex));
    const reference = document.createElement("span");
    reference.className = "result-reference";
    reference.textContent = `${bookName(verse.book)} ${verse.chapter}:${verse.verse}`;
    const text = document.createElement("span");
    text.className = "result-text";
    appendHighlighted(text, verse.text, state.searchQuery);
    button.append(reference, text);
    button.addEventListener("click", () => openSearchResult(verse));
    elements.searchResults.append(button);
  }
  state.searchShown += batch.length;
  const summary = elements.searchResults.querySelector(".search-summary");
  summary.textContent = `${state.searchMatches.length.toLocaleString()} ${state.searchMatches.length === 1 ? "verse" : "verses"} found · Showing ${state.searchShown}`;
}

async function search(query, requestId) {
  const trimmed = query.trim();
  elements.searchResults.replaceChildren();
  state.searchActiveIndex = -1;
  elements.searchInput.removeAttribute("aria-activedescendant");
  if (trimmed.length < 2) {
    state.searchMatches = [];
    state.searchQuery = "";
    state.searchShown = 0;
    elements.searchResults.hidden = true;
    elements.searchInput.setAttribute("aria-expanded", "false");
    return;
  }
  elements.searchResults.hidden = false;
  elements.searchInput.setAttribute("aria-expanded", "true");
  state.searchQuery = trimmed;
  state.searchShown = 0;

  const loading = document.createElement("div");
  loading.className = "search-summary";
  loading.textContent = "Looking through the verses…";
  elements.searchResults.append(loading);

  let matches;
  try {
    matches = await scripture.search(trimmed);
    if (requestId !== state.searchRequestId || trimmed !== elements.searchInput.value.trim()) return;

    elements.searchResults.replaceChildren();
    state.searchMatches = matches;
  } catch (error) {
    if (requestId !== state.searchRequestId) return;
    console.error(error);
    elements.searchResults.replaceChildren();
    const message = document.createElement("div");
    message.className = "search-empty";
    message.textContent = "The verses aren’t available just now. Please check your network connection.";
    elements.searchResults.append(message);
    return;
  }

  if (matches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "search-empty";
    empty.textContent = "No matching verses found. Try another word or reference.";
    elements.searchResults.append(empty);
    return;
  }
  const summary = document.createElement("div");
  summary.className = "search-summary";
  summary.textContent = `${matches.length.toLocaleString()} ${matches.length === 1 ? "verse" : "verses"} found · Showing ${Math.min(matches.length, 12)}`;
  elements.searchResults.append(summary);
  appendSearchResults();
}

function openSidebar() {
  elements.sidebar.classList.add("is-open");
  elements.sidebarScrim.classList.add("is-open");
  elements.menuToggle.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  elements.sidebar.classList.remove("is-open");
  elements.sidebarScrim.classList.remove("is-open");
  elements.menuToggle.setAttribute("aria-expanded", "false");
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

function bindEvents() {
  elements.searchResults.addEventListener("scroll", () => {
    if (state.searchShown >= state.searchMatches.length) return;
    const distanceToBottom = elements.searchResults.scrollHeight -
      elements.searchResults.scrollTop -
      elements.searchResults.clientHeight;
    if (distanceToBottom <= 48) appendSearchResults();
  });
  elements.verseList.addEventListener("click", (event) => {
    const verseLink = event.target.closest("a.verse");
    if (!verseLink || !elements.verseList.contains(verseLink)) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    void openChapter(state.book, state.chapter, Number(verseLink.dataset.verse));
  });
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
  elements.searchInput.addEventListener("input", () => {
    clearTimeout(state.searchTimer);
    const requestId = ++state.searchRequestId;
    state.searchActiveIndex = -1;
    elements.searchInput.removeAttribute("aria-activedescendant");
    state.searchMatches = [];
    state.searchShown = 0;
    state.searchQuery = elements.searchInput.value.trim();
    elements.searchResults.replaceChildren();
    if (state.searchQuery.length < 2) {
      elements.searchResults.hidden = true;
      elements.searchInput.setAttribute("aria-expanded", "false");
      return;
    }

    elements.searchResults.hidden = false;
    elements.searchInput.setAttribute("aria-expanded", "true");
    const loading = document.createElement("div");
    loading.className = "search-summary";
    loading.textContent = "Looking through the verses…";
    elements.searchResults.append(loading);
    state.searchTimer = setTimeout(() => void search(elements.searchInput.value, requestId), 120);
  });
  elements.searchInput.addEventListener("keydown", (event) => {
    if (elements.searchResults.hidden) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const results = elements.searchResults.querySelectorAll(".search-result");
      if (results.length === 0) return;

      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      let nextIndex = state.searchActiveIndex < 0
        ? (direction > 0 ? 0 : results.length - 1)
        : state.searchActiveIndex + direction;

      if (direction > 0 && nextIndex >= results.length && state.searchShown < state.searchMatches.length) {
        elements.searchResults.querySelector(".search-more")?.remove();
        appendSearchResults();
      }

      if (nextIndex < elements.searchResults.querySelectorAll(".search-result").length) {
        setActiveSearchResult(nextIndex);
      }
      return;
    }

    if (event.key === "Enter" && state.searchActiveIndex >= 0) {
      event.preventDefault();
      elements.searchResults.querySelectorAll(".search-result")[state.searchActiveIndex]?.click();
    }
  });
  elements.searchInput.addEventListener("focus", () => {
    if (elements.searchInput.value.trim().length >= 2) {
      void search(elements.searchInput.value, ++state.searchRequestId);
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.composedPath().includes(elements.searchWrap)) {
      state.searchRequestId += 1;
      elements.searchResults.hidden = true;
      elements.searchInput.setAttribute("aria-expanded", "false");
      elements.searchInput.removeAttribute("aria-activedescendant");
    }
  });
  bindKeyboardShortcuts({
    dialog: document.querySelector("#shortcuts-dialog"),
    openButton: document.querySelector("#shortcuts-open"),
    closeButton: document.querySelector("#shortcuts-close"),
    searchInput: elements.searchInput,
    isChapterPickerOpen: () => chapterPicker.isOpen(),
    onPreviousChapter: () => navigate(-1),
    onNextChapter: () => navigate(1),
    onPreviousVerse: () => navigateVerse(-1),
    onNextVerse: () => navigateVerse(1),
    onOldTestament: () => selectTestament("old"),
    onNewTestament: () => selectTestament("new"),
    onToggleQuietReading: toggleQuietReadingMode,
    onHome: navigateHome,
    onEscape: () => {
      const returnFocusToChapterPicker = chapterPicker.isOpen();
      setQuietReadingMode(false);
      chapterPicker.close(returnFocusToChapterPicker);
      state.searchRequestId += 1;
      elements.searchResults.hidden = true;
      elements.searchInput.setAttribute("aria-expanded", "false");
      elements.searchInput.removeAttribute("aria-activedescendant");
      closeSidebar();
    }
  });
  elements.menuToggle.addEventListener("click", () => {
    if (elements.sidebar.classList.contains("is-open")) closeSidebar();
    else openSidebar();
  });
  elements.sidebarScrim.addEventListener("click", closeSidebar);
  bindMobileChapterButtons();
}

initialize().catch((error) => {
  console.error(error);
  elements.verseList.textContent = "The Bible text could not be loaded. Please open this reader through a local web server.";
});