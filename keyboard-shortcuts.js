export function bindKeyboardShortcuts({
  dialog,
  openButton,
  closeButton,
  searchInput,
  isChapterPickerOpen,
  onPreviousChapter,
  onNextChapter,
  onEscape
}) {
  openButton.addEventListener("click", () => dialog.showModal());
  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (dialog.open) dialog.close();
      onEscape();
      return;
    }
    if (dialog.open || isChapterPickerOpen()) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput.focus();
      return;
    }

    const isEditing = event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true']");
    if (isEditing || event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      (event.key === "ArrowLeft" ? onPreviousChapter : onNextChapter)();
    }
  });
}