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

export function isEditingTarget(target) {
  return target instanceof Element &&
    Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function getPickerOptionIndex(key, currentIndex, optionCount) {
  switch (key) {
    case "ArrowDown": return Math.min(currentIndex + 1, optionCount - 1);
    case "ArrowUp": return Math.max(currentIndex - 1, 0);
    case "Home": return 0;
    case "End": return optionCount - 1;
    default: return null;
  }
}

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
  isDialogOpen = () => dialog.open,
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
    if (event.defaultPrevented || event.isComposing) return;
    if (event.key === "Escape") {
      if (dialog.open) {
        dialog.close();
        return;
      }
      if (isDialogOpen()) return;
      onEscape();
      return;
    }
    if (isDialogOpen() || isMenuOpen()) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      const bounds = searchInput.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
      searchInput.focus({ preventScroll: true });
      return;
    }

    if (event.key === " " && event.shiftKey) return;
    const action = getNavigationAction(event.key, {
      pickerOpen: isPickerOpen(),
      isEditing: isEditingTarget(event.target),
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
