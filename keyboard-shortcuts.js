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
  onPreviousChapter,
  onNextChapter,
  onPreviousVerse,
  onNextVerse,
  onOldTestament,
  onNewTestament,
  onToggleQuietReading,
  onHome,
  onEscape,
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
      onEscape();
      return;
    }
    const chapterPickerOpen = isChapterPickerOpen();
    if (dialog.open || chapterPickerOpen) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput.focus();
      return;
    }

    const isEditing =
      event.target instanceof Element &&
      event.target.closest("input, textarea, select, [contenteditable='true']");
    const action = getNavigationAction(event.key, {
      dialogOpen: dialog.open,
      chapterPickerOpen,
      isEditing: Boolean(isEditing),
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
      goHome: onHome,
      openShortcuts: () => openButton.click(),
    };
    event.preventDefault();
    actions[action]();
  });
}
