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
]);

export function getNavigationAction(
  key,
  {
    dialogOpen = false,
    chapterPickerOpen = false,
    isEditing = false,
    allowEditionCycling = true,
    shiftKey = false,
    altKey = false,
    ctrlKey = false,
    metaKey = false,
  } = {},
) {
  if (
    dialogOpen ||
    chapterPickerOpen ||
    isEditing ||
    altKey ||
    ctrlKey ||
    metaKey
  )
    return null;
  if (key === "Tab") {
    if (!allowEditionCycling) return null;
    return shiftKey ? "previousEdition" : "nextEdition";
  }
  return (
    NAVIGATION_ACTIONS.get(key.length === 1 ? key.toLowerCase() : key) ?? null
  );
}

export function bindKeyboardShortcuts({
  dialog,
  openButton,
  closeButton,
  searchInput,
  isChapterPickerOpen,
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
    const chapterPickerOpen = isChapterPickerOpen();
    if (dialog.open || chapterPickerOpen || isOtherDialogOpen()) return;
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
    const isFocusableControl =
      event.target instanceof Element &&
      event.target.closest("button, a[href], input, textarea, select, [contenteditable='true'], [role='button'], [role='option'], [role='tab'], [tabindex]:not([tabindex='-1'])");
    const action = getNavigationAction(event.key, {
      dialogOpen: dialog.open,
      chapterPickerOpen,
      isEditing: Boolean(isEditing),
      allowEditionCycling: !isFocusableControl && !isSidebarOpen(),
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
      openShortcuts: () => openButton.click(),
    };
    event.preventDefault();
    actions[action]();
  });
}
