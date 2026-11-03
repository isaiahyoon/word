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
    constructor(isEditing = false, isFocusableControl = false) {
      this.isEditing = isEditing;
      this.isFocusableControl = isFocusableControl;
    }

    closest(selector) {
      if (this.isEditing && selector.includes("input")) return this;
      if (this.isFocusableControl && selector.includes("button")) return this;
      return null;
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

  let pickerOpen = false;
  let sidebarOpen = false;
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
    isPickerOpen: () => pickerOpen,
    onPreviousChapter: () => calls.push("previousChapter"),
    onNextChapter: () => calls.push("nextChapter"),
    onPreviousVerse: () => calls.push("previousVerse"),
    onNextVerse: () => calls.push("nextVerse"),
    onOldTestament: () => calls.push("oldTestament"),
    onNewTestament: () => calls.push("newTestament"),
    onToggleQuietReading: () => calls.push("quietReading"),
    onPreviousEdition: () => calls.push("previousEdition"),
    onNextEdition: () => calls.push("nextEdition"),
    onHome: () => calls.push("home"),
    onScrollToTop: () => calls.push("scrollToTop"),
    onEscape: () => calls.push("escape"),
    isSidebarOpen: () => sidebarOpen,
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
      shiftKey: options.shiftKey ?? false,
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
    setPickerOpen: (open) => {
      pickerOpen = open;
    },
    setSidebarOpen: (open) => {
      sidebarOpen = open;
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

  it("maps Space to scrolling to the top", () => {
    assert.equal(getNavigationAction(" "), "scrollToTop");
    assert.equal(getNavigationAction(" ", { isEditing: true }), null);
    assert.equal(getNavigationAction(" ", { pickerOpen: true }), null);
  });

  it("scrolls on Space except from activatable controls or with Shift", (testContext) => {
    const { calls, press } = createKeyboardHarness(testContext);
    const button = new globalThis.Element(false, true);

    assert.equal(press(" "), true);
    assert.deepEqual(calls, ["scrollToTop"]);
    assert.equal(press(" ", { target: button }), false);
    assert.equal(press(" ", { shiftKey: true }), false);
    assert.deepEqual(calls, ["scrollToTop"]);
  });

  it("maps Tab and Shift+Tab to forward and backward edition cycling", () => {
    assert.equal(getNavigationAction("Tab"), "nextEdition");
    assert.equal(getNavigationAction("Tab", { shiftKey: true }), "previousEdition");
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
      { pickerOpen: true },
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

  it("keeps Tab cycling editions while typing or with the chapter picker open", () => {
    for (const context of [{ isEditing: true }, { pickerOpen: true }]) {
      assert.equal(getNavigationAction("Tab", context), "nextEdition");
      assert.equal(getNavigationAction("Tab", { ...context, shiftKey: true }), "previousEdition");
    }
    for (const context of [{ dialogOpen: true }, { altKey: true }, { ctrlKey: true }, { metaKey: true }]) {
      assert.equal(getNavigationAction("Tab", context), null);
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
      ["Tab", "nextEdition"],
    ];

    for (const [key] of shortcuts) assert.equal(press(key), true);
    assert.deepEqual(
      calls,
      shortcuts.map(([, action]) => action),
    );
    assert.equal(press("Tab", { shiftKey: true }), true);
    assert.equal(calls.at(-1), "previousEdition");
    const dispatchedActions = [...shortcuts.map(([, action]) => action), "previousEdition"];

    assert.equal(press("/"), true);
    assert.equal(dialog.open, true);
    assert.equal(press("h"), false);
    assert.deepEqual(calls, dispatchedActions);

    assert.equal(press("Escape"), false);
    assert.equal(dialog.open, false);
    assert.deepEqual(calls, dispatchedActions);

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
    const { calls, press, setPickerOpen } =
      createKeyboardHarness(testContext);
    const input = new globalThis.Element(true);

    assert.equal(press("q", { target: input }), false);
    assert.equal(press("h", { target: input }), false);
    setPickerOpen(true);
    assert.equal(press("ArrowDown"), false);
    assert.equal(press("o"), false);
    assert.deepEqual(calls, []);
  });

  it("cycles editions from any focused control but leaves Tab native while the sidebar is open", (testContext) => {
    const { calls, press, setSidebarOpen } = createKeyboardHarness(testContext);
    const button = new globalThis.Element(false, true);

    assert.equal(press("Tab", { target: button }), true);
    assert.equal(press("Tab", { target: button, shiftKey: true }), true);
    assert.deepEqual(calls, ["nextEdition", "previousEdition"]);

    calls.length = 0;
    setSidebarOpen(true);
    assert.equal(press("Tab"), false);
    assert.equal(press("Tab", { shiftKey: true }), false);
    assert.deepEqual(calls, []);
  });
});
