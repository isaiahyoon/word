const NAVIGATION_ACTIONS = new Map([
  ["ArrowUp", "previousVerse"],
  ["ArrowDown", "nextVerse"],
  ["ArrowLeft", "previousChapter"],
  ["ArrowRight", "nextChapter"],
  ["o", "oldTestament"],
  ["n", "newTestament"],
  ["q", "toggleQuietReading"],
  ["h", "goHome"],
  ["/", "openShortcuts"],
  [" ", "scrollToTop"],
]);

// Space natively activates these, except verse buttons, which Space scrolls past.
const SPACE_ACTIVATED_CONTROLS = "button:not(.verse), a[href], summary, select, [role='option'], [role='tab'], [role='menuitem']";

export function getNavigationAction(
  key,
  {
    dialogOpen = false,
    pickerOpen = false,
    isEditing = false,
    allowEditionCycling = true,
    shiftKey = false,
    altKey = false,
    ctrlKey = false,
    metaKey = false,
  } = {},
) {
  if (dialogOpen || altKey || ctrlKey || metaKey) return null;
  if (key === "Tab") {
    if (!allowEditionCycling) return null;
    return shiftKey ? "previousEdition" : "nextEdition";
  }
  if (pickerOpen || isEditing) return null;
  return (
    NAVIGATION_ACTIONS.get(key.length === 1 ? key.toLowerCase() : key) ?? null
  );
}

export function bindKeyboardShortcuts({
  dialog,
  openButton,
  closeButton,
  searchInput,
  isPickerOpen,
  isMenuOpen = () => false,
  isOtherDialogOpen = () => false,
  onPreviousChapter,
  onNextChapter,
  onPreviousVerse,
  onNextVerse,
  onOldTestament,
  onNewTestament,
  onToggleQuietReading,
  onPreviousEdition,
  onNextEdition,
  onHome,
  onScrollToTop,
  onEscape,
  isSidebarOpen = () => false,
}) {
  openButton.addEventListener("click", () => dialog.showModal());
  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (dialog.open) {
        dialog.close();
        return;
      }
      if (isOtherDialogOpen()) return;
      onEscape();
      return;
    }
    const pickerOpen = isPickerOpen();
    if (dialog.open || isMenuOpen() || isOtherDialogOpen()) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      const bounds = searchInput.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
      searchInput.focus({ preventScroll: true });
      return;
    }

    const isEditing =
      event.target instanceof Element &&
      event.target.closest("input, textarea, select, [contenteditable='true']");
    const isSpaceActivatingControl =
      event.key === " " &&
      (event.shiftKey ||
        (event.target instanceof Element && event.target.closest(SPACE_ACTIVATED_CONTROLS)));
    if (isSpaceActivatingControl) return;
    const action = getNavigationAction(event.key, {
      dialogOpen: dialog.open,
      pickerOpen,
      isEditing: Boolean(isEditing),
      allowEditionCycling: !isSidebarOpen(),
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    });
    if (!action) return;

    const actions = {
      previousVerse: onPreviousVerse,
      nextVerse: onNextVerse,
      previousChapter: onPreviousChapter,
      nextChapter: onNextChapter,
      oldTestament: onOldTestament,
      newTestament: onNewTestament,
      toggleQuietReading: onToggleQuietReading,
      previousEdition: onPreviousEdition,
      nextEdition: onNextEdition,
      goHome: onHome,
      scrollToTop: onScrollToTop,
      openShortcuts: () => openButton.click(),
    };
    event.preventDefault();
    actions[action]();
  });
}
