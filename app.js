import { bindKeyboardShortcuts } from "./keyboard-shortcuts.js";
import { createChapterPicker } from "./chapter-picker.js";

const BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
];

const BOOK_TITLES = [
  "The First Book of Moses", "The Second Book of Moses", "The Third Book of Moses", "The Fourth Book of Moses", "The Fifth Book of Moses", "The Book of Joshua", "The Book of Judges", "The Book of Ruth", "The First Book of Samuel", "The Second Book of Samuel", "The First Book of the Kings", "The Second Book of the Kings", "The First Book of the Chronicles", "The Second Book of the Chronicles", "The Book of Ezra", "The Book of Nehemiah", "The Book of Esther", "The Book of Job", "The Book of Psalms", "The Proverbs", "Ecclesiastes", "The Song of Solomon", "The Book of the Prophet Isaiah", "The Book of the Prophet Jeremiah", "The Lamentations of Jeremiah", "The Book of the Prophet Ezekiel", "The Book of Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "The Gospel According to St. Matthew", "The Gospel According to St. Mark", "The Gospel According to St. Luke", "The Gospel According to St. John", "The Acts of the Apostles", "The Epistle of Paul the Apostle to the Romans", "The First Epistle of Paul the Apostle to the Corinthians", "The Second Epistle of Paul the Apostle to the Corinthians", "The Epistle of Paul the Apostle to the Galatians", "The Epistle of Paul the Apostle to the Ephesians", "The Epistle of Paul the Apostle to the Philippians", "The Epistle of Paul the Apostle to the Colossians", "The First Epistle of Paul the Apostle to the Thessalonians", "The Second Epistle of Paul the Apostle to the Thessalonians", "The First Epistle of Paul the Apostle to Timothy", "The Second Epistle of Paul the Apostle to Timothy", "The Epistle of Paul to Titus", "The Epistle of Paul to Philemon", "The Epistle of Paul the Apostle to the Hebrews", "The General Epistle of James", "The First Epistle General of Peter", "The Second Epistle General of Peter", "The First Epistle General of John", "The Second Epistle of John", "The Third Epistle of John", "The General Epistle of Jude", "The Revelation of St. John the Divine"
];

const CHAPTER_GRADIENT_COLORS = ["var(--chapter-blue)", "var(--chapter-lavender)", "var(--chapter-pink)", "var(--chapter-green)"];
const state = { book: 1, chapter: 1, testament: "old", verses: [], chapters: new Map(), searchTimer: null, searchMatches: [], searchQuery: "", searchShown: 0 };
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
  const response = await fetch("./kjv.json");
  if (!response.ok) throw new Error("Could not load kjv.json");
  const data = await response.json();
  state.verses = data.contents.map(({ field }) => ({ book: field[1], chapter: field[2], verse: field[3], text: field[4] }));
  for (const verse of state.verses) {
    const key = chapterKey(verse.book, verse.chapter);
    if (!state.chapters.has(key)) state.chapters.set(key, []);
    state.chapters.get(key).push(verse);
  }
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
      state.chapter = chapter;
      renderChapter();
    }
  });
  renderChapter();
  bindEvents();
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
    const chapters = [...state.chapters.keys()].filter((key) => key.startsWith(`${book}:`)).length;
    button.innerHTML = `<span class="book-index">${String(book).padStart(2, "0")}</span><span class="book-name">${bookName(book)}</span><span class="book-chapters">${chapters}</span>`;
    button.addEventListener("click", () => {
      const changedBook = book !== state.book;
      state.book = book;
      state.chapter = 1;
      closeSidebar();
      renderBookList();
      renderChapter();
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
    elements.bookList.append(button);
  }
}

function renderChapter(focusVerse = null) {
  const name = bookName(state.book);
  const testament = testamentFor(state.book);
  const verses = state.chapters.get(chapterKey(state.book, state.chapter)) ?? [];
  document.querySelector("#testament-name").textContent = `${testament.toUpperCase()} TESTAMENT`;
  document.querySelector("#book-crumb").textContent = name.toUpperCase();
  document.querySelector("#heading-book").textContent = name;
  const chapterNumber = document.querySelector("#heading-chapter");
  chapterNumber.textContent = state.chapter;
  chapterNumber.style.setProperty("--chapter-gradient", createChapterGradient());
  document.querySelector("#chapter-kicker").textContent = BOOK_TITLES[state.book - 1].toUpperCase();
  document.querySelector("#verse-count").textContent = `${verses.length} ${verses.length === 1 ? "verse" : "verses"}`;
  document.querySelector("#testament-meta").textContent = `${testament === "old" ? "Old" : "New"} Testament`;
  document.title = `${name} ${state.chapter} — The Word`;

  const chapterCount = [...state.chapters.keys()].filter((key) => key.startsWith(`${state.book}:`)).length;
  chapterPicker.render({ bookName: name, chapterCount, activeChapter: state.chapter });

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
  let total = [...state.chapters.keys()].filter((key) => key.startsWith(`${book}:`)).length;
  while (chapter < 1) {
    book -= 1;
    if (book < 1) return { book: 1, chapter: 1 };
    total = [...state.chapters.keys()].filter((key) => key.startsWith(`${book}:`)).length;
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
  state.book = target.book;
  state.chapter = target.chapter;
  state.testament = testamentFor(target.book);
  renderBookList();
  renderChapter();
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

function appendSearchResults() {
  const batch = state.searchMatches.slice(state.searchShown, state.searchShown + 12);
  for (const verse of batch) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.setAttribute("role", "option");
    const reference = document.createElement("span");
    reference.className = "result-reference";
    reference.textContent = `${bookName(verse.book)} ${verse.chapter}:${verse.verse}`;
    const text = document.createElement("span");
    text.className = "result-text";
    appendHighlighted(text, verse.text, state.searchQuery);
    button.append(reference, text);
    button.addEventListener("click", () => {
      state.book = verse.book;
      state.chapter = verse.chapter;
      state.testament = testamentFor(verse.book);
      elements.searchResults.hidden = true;
      elements.searchInput.value = "";
      renderBookList();
      renderChapter(verse.verse);
    });
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

function findReferenceMatches(query) {
  const reference = query.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
  if (!reference) return null;

  const book = BOOKS.findIndex((name) => name.toLowerCase() === reference[1].toLowerCase()) + 1;
  if (book === 0) return null;

  const chapter = Number(reference[2]);
  const verseNumber = reference[3] === undefined ? null : Number(reference[3]);
  return state.verses.filter((verse) =>
    verse.book === book &&
    verse.chapter === chapter &&
    (verseNumber === null || verse.verse === verseNumber)
  );
}

function search(query) {
  const trimmed = query.trim();
  elements.searchResults.replaceChildren();
  if (trimmed.length < 2) {
    state.searchMatches = [];
    state.searchQuery = "";
    state.searchShown = 0;
    elements.searchResults.hidden = true;
    return;
  }
  const matches = findReferenceMatches(trimmed) ?? state.verses.filter((verse) =>
    verse.text.toLowerCase().includes(trimmed.toLowerCase())
  );
  elements.searchResults.hidden = false;
  state.searchMatches = matches;
  state.searchQuery = trimmed;
  state.searchShown = 0;
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
  document.querySelectorAll(".testament-tab").forEach((tab) => tab.addEventListener("click", () => {
    state.testament = tab.dataset.testament;
    state.book = state.testament === "old" ? 1 : 40;
    state.chapter = 1;
    renderBookList();
    renderChapter();
  }));
  document.querySelector("#previous-chapter").addEventListener("click", () => navigate(-1));
  document.querySelector("#next-chapter").addEventListener("click", () => navigate(1));
  document.querySelector("#bottom-previous").addEventListener("click", () => navigate(-1));
  document.querySelector("#bottom-next").addEventListener("click", () => navigate(1));
  elements.searchInput.addEventListener("input", () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => search(elements.searchInput.value), 120);
  });
  elements.searchInput.addEventListener("focus", () => {
    if (elements.searchInput.value.trim().length >= 2) search(elements.searchInput.value);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-wrap")) elements.searchResults.hidden = true;
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
      elements.searchResults.hidden = true;
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