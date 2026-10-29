import { bindKeyboardShortcuts } from "./keyboard-shortcuts.js";
import { createChapterPicker } from "./chapter-picker.js";
import { BOOKS, bookFileName } from "./books.mjs";

const BOOK_TITLES = [
  "The First Book of Moses", "The Second Book of Moses", "The Third Book of Moses", "The Fourth Book of Moses", "The Fifth Book of Moses", "The Book of Joshua", "The Book of Judges", "The Book of Ruth", "The First Book of Samuel", "The Second Book of Samuel", "The First Book of the Kings", "The Second Book of the Kings", "The First Book of the Chronicles", "The Second Book of the Chronicles", "The Book of Ezra", "The Book of Nehemiah", "The Book of Esther", "The Book of Job", "The Book of Psalms", "The Proverbs", "Ecclesiastes", "The Song of Solomon", "The Book of the Prophet Isaiah", "The Book of the Prophet Jeremiah", "The Lamentations of Jeremiah", "The Book of the Prophet Ezekiel", "The Book of Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "The Gospel According to St. Matthew", "The Gospel According to St. Mark", "The Gospel According to St. Luke", "The Gospel According to St. John", "The Acts of the Apostles", "The Epistle of Paul the Apostle to the Romans", "The First Epistle of Paul the Apostle to the Corinthians", "The Second Epistle of Paul the Apostle to the Corinthians", "The Epistle of Paul the Apostle to the Galatians", "The Epistle of Paul the Apostle to the Ephesians", "The Epistle of Paul the Apostle to the Philippians", "The Epistle of Paul the Apostle to the Colossians", "The First Epistle of Paul the Apostle to the Thessalonians", "The Second Epistle of Paul the Apostle to the Thessalonians", "The First Epistle of Paul the Apostle to Timothy", "The Second Epistle of Paul the Apostle to Timothy", "The Epistle of Paul to Titus", "The Epistle of Paul to Philemon", "The Epistle of Paul the Apostle to the Hebrews", "The General Epistle of James", "The First Epistle General of Peter", "The Second Epistle General of Peter", "The First Epistle General of John", "The Second Epistle of John", "The Third Epistle of John", "The General Epistle of Jude", "The Revelation of St. John the Divine"
];

const CHAPTER_GRADIENT_COLORS = ["var(--chapter-blue)", "var(--chapter-lavender)", "var(--chapter-pink)", "var(--chapter-green)"];
const state = { book: 1, chapter: 1, testament: "old", chapters: new Map(), bookLoads: new Map(), chapterCounts: [], chapterRequestId: 0, searchTimer: null, searchRequestId: 0, searchMatches: [], searchQuery: "", searchShown: 0, searchActiveIndex: -1 };
const elements = {
  bookList: document.querySelector("#book-list"),
  chapterSelect: document.querySelector("#chapter-select"),
  chapterSelectValue: document.querySelector("#chapter-select-value"),
  chapterPicker: document.querySelector("#chapter-picker"),
  chapterOptions: document.querySelector("#chapter-options"),
  chapterOptionsTitle: document.querySelector("#chapter-options-title"),
  chapterOptionsCount: document.querySelector("#chapter-options-count"),
  chapterOptionsList: document.querySelector("#chapter-options-list"),
  verseList: document.querySelector("#verse-list"),
  searchInput: document.querySelector("#search-input"),
  searchResults: document.querySelector("#search-results"),
  menuToggle: document.querySelector("#menu-toggle"),
  sidebar: document.querySelector("#sidebar"),
  sidebarScrim: document.querySelector("#sidebar-scrim")
};
let chapterPicker;

const testamentFor = (book) => book <= 39 ? "old" : "new";
const bookName = (book) => BOOKS[book - 1];
const chapterKey = (book, chapter) => `${book}:${chapter}`;
const scriptureSegmenter = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
  : null;
let activeScriptureGlow = null;

function clearScriptureGlow() {
  if (!activeScriptureGlow) return;

  const parent = activeScriptureGlow.parentNode;
  if (parent) {
    parent.replaceChild(document.createTextNode(activeScriptureGlow.textContent), activeScriptureGlow);
    parent.normalize();
  }
  activeScriptureGlow = null;
}

function scriptureCharacterAt(text, offset) {
  let lastSegment = null;
  if (scriptureSegmenter) {
    for (const segment of scriptureSegmenter.segment(text)) {
      lastSegment = segment;
      if (offset >= segment.index && offset < segment.index + segment.segment.length) {
        return segment.segment.trim() ? segment : null;
      }
    }
    return offset >= text.length && lastSegment?.segment.trim() ? lastSegment : null;
  }

  let index = 0;
  for (const segment of text) {
    lastSegment = { index, segment };
    if (offset >= index && offset < index + segment.length) {
      return segment.trim() ? lastSegment : null;
    }
    index += segment.length;
  }
  return offset >= text.length && lastSegment?.segment.trim() ? lastSegment : null;
}

function caretAtPoint(event) {
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(event.clientX, event.clientY);
    return position && { node: position.offsetNode, offset: position.offset };
  }
  const range = document.caretRangeFromPoint?.(event.clientX, event.clientY);
  return range && { node: range.startContainer, offset: range.startOffset };
}

function glowScriptureCharacter(event) {
  if (event.pointerType === "touch") {
    clearScriptureGlow();
    return;
  }

  const textElement = event.target instanceof Element ? event.target.closest(".verse-text") : null;
  if (!textElement) {
    clearScriptureGlow();
    return;
  }
  if (activeScriptureGlow?.contains(event.target)) return;

  clearScriptureGlow();
  const caret = caretAtPoint(event);
  if (!caret || caret.node.nodeType !== Node.TEXT_NODE || !textElement.contains(caret.node)) return;

  const character = scriptureCharacterAt(caret.node.textContent, caret.offset);
  if (!character) return;

  const range = document.createRange();
  range.setStart(caret.node, character.index);
  range.setEnd(caret.node, character.index + character.segment.length);
  const glow = document.createElement("span");
  glow.className = "scripture-glow";
  glow.style.setProperty("--rainbow-hue", `${Math.floor(Math.random() * 360)}deg`);
  range.surroundContents(glow);
  activeScriptureGlow = glow;
}

function loadBook(book) {
  if (state.bookLoads.has(book)) return state.bookLoads.get(book);

  const fileName = state.bookFiles[book - 1] ?? bookFileName(book);
  const request = fetch(`./scripture/books/${fileName}`)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load ${bookName(book)}`);
      return response.json();
    })
    .then((chapters) => {
      for (const [chapter, records] of Object.entries(chapters)) {
        const chapterNumber = Number(chapter);
        state.chapters.set(chapterKey(book, chapterNumber), records.map(([verse, text]) => ({
          book,
          chapter: chapterNumber,
          verse,
          text
        })));
      }
    })
    .catch((error) => {
      state.bookLoads.delete(book);
      throw error;
    });

  state.bookLoads.set(book, request);
  return request;
}

async function loadAllBooks() {
  await Promise.all(BOOKS.map((_, index) => loadBook(index + 1)));
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
  const response = await fetch("./scripture/index.json");
  if (!response.ok) throw new Error("Could not load scripture index");
  const index = await response.json();
  if (
    !Array.isArray(index.chapterCounts) ||
    index.chapterCounts.length !== BOOKS.length ||
    !Array.isArray(index.bookFiles) ||
    index.bookFiles.length !== BOOKS.length
  ) {
    throw new Error("The scripture index is invalid");
  }
  state.chapterCounts = index.chapterCounts;
  state.bookFiles = index.bookFiles;
  renderBookList();
  chapterPicker = createChapterPicker({
    root: elements.chapterPicker,
    trigger: elements.chapterSelect,
    value: elements.chapterSelectValue,
    popover: elements.chapterOptions,
    heading: elements.chapterOptionsTitle,
    count: elements.chapterOptionsCount,
    list: elements.chapterOptionsList,
    onSelect: (chapter) => {
      void openChapter(state.book, chapter);
    }
  });
  bindEvents();
  await openChapter(state.book, state.chapter);
}

async function openChapter(book, chapter, focusVerse = null) {
  const requestId = ++state.chapterRequestId;
  state.book = book;
  state.chapter = chapter;
  state.testament = testamentFor(book);
  renderBookList();
  elements.verseList.setAttribute("aria-busy", "true");
  elements.verseList.textContent = "Loading chapter...";

  try {
    await loadBook(book);
  } catch (error) {
    if (requestId !== state.chapterRequestId) return;
    console.error(error);
    elements.verseList.removeAttribute("aria-busy");
    elements.verseList.textContent = "The chapter could not be loaded. Please try again.";
    return;
  }

  if (requestId !== state.chapterRequestId) return;
  elements.verseList.removeAttribute("aria-busy");
  renderChapter(focusVerse);
  if (focusVerse !== null) {
    requestAnimationFrame(() => {
      if (requestId !== state.chapterRequestId) return;
      document.querySelector(`#verse-${focusVerse}`)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
        inline: "nearest"
      });
    });
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
    const chapters = state.chapterCounts[book - 1];
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

function renderChapter(focusVerse = null) {
  const name = bookName(state.book);
  const testament = testamentFor(state.book);
  const verses = state.chapters.get(chapterKey(state.book, state.chapter)) ?? [];
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

  const chapterCount = state.chapterCounts[state.book - 1];
  chapterPicker.render({ bookName: name, chapterCount, activeChapter: state.chapter });

  clearScriptureGlow();
  elements.verseList.replaceChildren();
  for (const verse of verses) {
    const row = document.createElement("p");
    row.className = `verse${verse.verse === focusVerse ? " is-focused" : ""}`;
    row.id = `verse-${verse.verse}`;
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
  let total = state.chapterCounts[book - 1];
  while (chapter < 1) {
    book -= 1;
    if (book < 1) return { book: 1, chapter: 1 };
    total = state.chapterCounts[book - 1];
    chapter = total;
  }
  while (chapter > total) {
    book += 1;
    if (book > 66) return { book: 66, chapter: 22 };
    chapter -= total;
    total = [...state.chapters.keys()].filter((key) => key.startsWith(`${book}:`)).length;
  }
  return { book, chapter };
}

function updateChapterLinks() {
  const previous = adjacentChapter(-1);
  const next = adjacentChapter(1);
  document.querySelector("#previous-title").textContent = `${bookName(previous.book)} ${previous.chapter}`;
  document.querySelector("#next-title").textContent = `${bookName(next.book)} ${next.chapter}`;
}

function navigate(offset) {
  const target = adjacentChapter(offset);
  void openChapter(target.book, target.chapter);
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
  if (state.searchShown < state.searchMatches.length) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = "search-more";
    more.textContent = "Show more results";
    more.addEventListener("click", () => {
      more.remove();
      appendSearchResults();
    });
    elements.searchResults.append(more);
  }
}

function parseReference(query) {
  const reference = query.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
  if (!reference) return null;

  const book = BOOKS.findIndex((name) => name.toLowerCase() === reference[1].toLowerCase()) + 1;
  if (book === 0) return null;

  return {
    book,
    chapter: Number(reference[2]),
    verse: reference[3] === undefined ? null : Number(reference[3])
  };
}

async function findReferenceMatches(query) {
  const reference = parseReference(query);
  if (!reference) return null;
  if (reference.chapter < 1 || reference.chapter > state.chapterCounts[reference.book - 1]) return [];

  await loadBook(reference.book);
  return (state.chapters.get(chapterKey(reference.book, reference.chapter)) ?? []).filter((verse) =>
    (reference.verse === null || verse.verse === reference.verse)
  );
}

function getAllVerses() {
  const verses = [];
  for (let book = 1; book <= BOOKS.length; book += 1) {
    for (let chapter = 1; chapter <= state.chapterCounts[book - 1]; chapter += 1) {
      verses.push(...(state.chapters.get(chapterKey(book, chapter)) ?? []));
    }
  }
  return verses;
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
  loading.textContent = "Searching scripture...";
  elements.searchResults.append(loading);

  let matches;
  try {
    matches = await findReferenceMatches(trimmed);
    if (matches === null) {
      await loadAllBooks();
      matches = getAllVerses().filter((verse) =>
        verse.text.toLowerCase().includes(trimmed.toLowerCase())
      );
    }
    if (requestId !== state.searchRequestId || trimmed !== elements.searchInput.value.trim()) return;

    elements.searchResults.replaceChildren();
    state.searchMatches = matches;
  } catch (error) {
    if (requestId !== state.searchRequestId) return;
    console.error(error);
    elements.searchResults.replaceChildren();
    const message = document.createElement("div");
    message.className = "search-empty";
    message.textContent = "Scripture could not be loaded. Please try again.";
    elements.searchResults.append(message);
    return;
  }

  if (matches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "search-empty";
    empty.textContent = "No verses found. Try another word or phrase.";
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

function bindEvents() {
  elements.verseList.addEventListener("pointermove", glowScriptureCharacter);
  elements.verseList.addEventListener("pointerleave", clearScriptureGlow);
  document.querySelectorAll(".testament-tab").forEach((tab) => tab.addEventListener("click", () => {
    const book = tab.dataset.testament === "old" ? 1 : 40;
    void openChapter(book, 1);
  }));
  document.querySelector("#previous-chapter").addEventListener("click", () => navigate(-1));
  document.querySelector("#next-chapter").addEventListener("click", () => navigate(1));
  document.querySelector("#bottom-previous").addEventListener("click", () => navigate(-1));
  document.querySelector("#bottom-next").addEventListener("click", () => navigate(1));
  elements.searchInput.addEventListener("input", () => {
    clearTimeout(state.searchTimer);
    const requestId = ++state.searchRequestId;
    state.searchActiveIndex = -1;
    elements.searchInput.removeAttribute("aria-activedescendant");
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
    if (!event.target.closest(".search-wrap")) {
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
    onEscape: () => {
      chapterPicker.close(true);
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
}

initialize().catch((error) => {
  console.error(error);
  elements.verseList.textContent = "The Bible text could not be loaded. Please open this reader through a local web server.";
});