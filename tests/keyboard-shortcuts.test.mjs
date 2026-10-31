import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bindKeyboardShortcuts,
  getNavigationAction,
} from "../js/keyboard-shortcuts.js";

function createKeyboardHarness(testContext) {
  const previousDocument = globalThis.document;
  const previousElement = globalThis.Element;
  const previousWindow = globalThis.window;
  const documentListeners = new Map();
  const calls = [];
  let searchInputBounds = { top: 0, bottom: 40 };

  globalThis.Element = class TestElement {
    constructor(isEditing = false) {
      this.isEditing = isEditing;
    }

    closest() {
      return this.isEditing ? this : null;
    }
  };
  globalThis.document = {
    addEventListener: (type, listener) => documentListeners.set(type, listener),
  };
  globalThis.window = {
    innerHeight: 800,
    scrollTo: (options) => calls.push(["pageScroll", options]),
  };

  const dialog = {
    open: false,
    addEventListener() {},
    showModal() {
      this.open = true;
    },
    close() {
      this.open = false;
    },
  };

  function createButton(onClick, onFocus = () => {}) {
    const listeners = new Map();
    return {
      addEventListener: (type, listener) => listeners.set(type, listener),
      click: () => onClick(),
      focus: onFocus,
    };
  }

  let chapterPickerOpen = false;
  const openButton = createButton(
    () => dialog.showModal(),
    () => calls.push("shortcutsButtonFocus"),
  );
  bindKeyboardShortcuts({
    dialog,
    openButton,
    closeButton: createButton(() => dialog.close()),
    searchInput: {
      getBoundingClientRect: () => searchInputBounds,
      focus: (options) => calls.push(["search", options]),
    },
    isChapterPickerOpen: () => chapterPickerOpen,
    onPreviousChapter: () => calls.push("previousChapter"),
    onNextChapter: () => calls.push("nextChapter"),
    onPreviousVerse: () => calls.push("previousVerse"),
    onNextVerse: () => calls.push("nextVerse"),
    onOldTestament: () => calls.push("oldTestament"),
    onNewTestament: () => calls.push("newTestament"),
    onToggleQuietReading: () => calls.push("quietReading"),
    onHome: () => calls.push("home"),
    onEscape: () => calls.push("escape"),
  });

  testContext.after(() => {
    globalThis.document = previousDocument;
    globalThis.Element = previousElement;
    globalThis.window = previousWindow;
  });

  function press(key, options = {}) {
    let defaultPrevented = false;
    documentListeners.get("keydown")({
      key,
      target: options.target ?? new globalThis.Element(),
      altKey: options.altKey ?? false,
      ctrlKey: options.ctrlKey ?? false,
      metaKey: options.metaKey ?? false,
      preventDefault() {
        defaultPrevented = true;
      },
    });
    return defaultPrevented;
  }

  return {
    calls,
    dialog,
    press,
    setChapterPickerOpen: (open) => {
      chapterPickerOpen = open;
    },
    setSearchInputBounds: (bounds) => {
      searchInputBounds = bounds;
    },
  };
}

describe("keyboard navigation shortcuts", () => {
  it("maps arrow keys to verse and chapter navigation", () => {
    assert.equal(getNavigationAction("ArrowUp"), "previousVerse");
    assert.equal(getNavigationAction("ArrowDown"), "nextVerse");
    assert.equal(getNavigationAction("ArrowLeft"), "previousChapter");
    assert.equal(getNavigationAction("ArrowRight"), "nextChapter");
  });

  it("maps O and N case-insensitively to testament selection", () => {
    assert.equal(getNavigationAction("o"), "oldTestament");
    assert.equal(getNavigationAction("O"), "oldTestament");
    assert.equal(getNavigationAction("n"), "newTestament");
    assert.equal(getNavigationAction("N"), "newTestament");
  });

  it("maps Q case-insensitively to quiet reading mode", () => {
    assert.equal(getNavigationAction("q"), "toggleQuietReading");
    assert.equal(getNavigationAction("Q"), "toggleQuietReading");
  });

  it("maps H case-insensitively to the homepage", () => {
    assert.equal(getNavigationAction("h"), "goHome");
    assert.equal(getNavigationAction("H"), "goHome");
  });

  it("maps slash to opening the shortcuts dialog", () => {
    assert.equal(getNavigationAction("/"), "openShortcuts");
  });

  it("instantly scrolls the page to the top for Cmd/Ctrl+K before focusing an offscreen search input", (testContext) => {
    const { calls, press, setSearchInputBounds } = createKeyboardHarness(testContext);
    setSearchInputBounds({ top: -50, bottom: -4 });

    assert.equal(press("k", { metaKey: true }), true);
    assert.deepEqual(calls, [
      ["pageScroll", { top: 0, behavior: "instant" }],
      ["search", { preventScroll: true }],
    ]);

    calls.length = 0;
    assert.equal(press("k", { ctrlKey: true }), true);
    assert.deepEqual(calls, [
      ["pageScroll", { top: 0, behavior: "instant" }],
      ["search", { preventScroll: true }],
    ]);
  });

  it("does not intercept typing, dialogs, pickers, or modified keys", () => {
    const guardedContexts = [
      { isEditing: true },
      { dialogOpen: true },
      { chapterPickerOpen: true },
      { altKey: true },
      { ctrlKey: true },
      { metaKey: true },
    ];

    for (const context of guardedContexts) {
      assert.equal(getNavigationAction("o", context), null);
      assert.equal(getNavigationAction("ArrowDown", context), null);
      assert.equal(getNavigationAction("q", context), null);
      assert.equal(getNavigationAction("h", context), null);
      assert.equal(getNavigationAction("/", context), null);
    }
  });

  it("ignores unrelated keys", () => {
    assert.equal(getNavigationAction("x"), null);
    assert.equal(getNavigationAction("Enter"), null);
  });

  it("dispatches every navigation key to its action", (testContext) => {
    const { calls, dialog, press } = createKeyboardHarness(testContext);
    const shortcuts = [
      ["ArrowUp", "previousVerse"],
      ["ArrowDown", "nextVerse"],
      ["ArrowLeft", "previousChapter"],
      ["ArrowRight", "nextChapter"],
      ["o", "oldTestament"],
      ["n", "newTestament"],
      ["q", "quietReading"],
      ["h", "home"],
    ];

    for (const [key] of shortcuts) assert.equal(press(key), true);
    assert.deepEqual(
      calls,
      shortcuts.map(([, action]) => action),
    );

    assert.equal(press("/"), true);
    assert.equal(dialog.open, true);
    assert.equal(press("h"), false);
    assert.deepEqual(
      calls,
      shortcuts.map(([, action]) => action),
    );

    assert.equal(press("Escape"), false);
    assert.equal(dialog.open, false);
    assert.deepEqual(
      calls,
      shortcuts.map(([, action]) => action),
    );

    assert.equal(press("Escape"), false);
    assert.equal(calls.at(-1), "escape");
  });

  it("closes the shortcuts dialog without invoking reader Escape behavior", (testContext) => {
    const { calls, dialog, press } = createKeyboardHarness(testContext);

    press("/");
    assert.equal(dialog.open, true);
    press("Escape");

    assert.equal(dialog.open, false);
    assert.deepEqual(calls, []);
  });

  it("keeps navigation keys available to typing and open pickers", (testContext) => {
    const { calls, press, setChapterPickerOpen } =
      createKeyboardHarness(testContext);
    const input = new globalThis.Element(true);

    assert.equal(press("q", { target: input }), false);
    assert.equal(press("h", { target: input }), false);
    setChapterPickerOpen(true);
    assert.equal(press("ArrowDown"), false);
    assert.equal(press("o"), false);
    assert.deepEqual(calls, []);
  });
});
