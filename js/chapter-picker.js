import { formatUiText } from "./ui-locales.mjs";

export function createChapterPicker({ root, trigger, value, popover, heading, count, list, onSelect }) {
  let renderedOptions = null;
  function optionButtons() {
    return [...list.querySelectorAll(".chapter-option")];
  }

  function close(returnFocus = false) {
    popover.hidden = true;
    if (popover.parentElement !== root) root.append(popover);
    trigger.setAttribute("aria-expanded", "false");
    if (returnFocus) trigger.focus();
  }

  function focusOption(chapter) {
    const option = list.querySelector(`[data-chapter="${chapter}"]`);
    option?.focus();
    option?.scrollIntoView({ block: "nearest" });
  }

  function open(chapter = Number(value.textContent)) {
    if (window.matchMedia("(max-width: 640px)").matches) {
      document.body.append(popover);
    }
    popover.style.setProperty(
      "--chapter-popover-top",
      `${trigger.getBoundingClientRect().bottom + 9}px`
    );
    popover.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    focusOption(chapter);
  }

  function render({ bookName, chapterCount, activeChapter, locale }) {
    value.textContent = activeChapter;
    trigger.setAttribute("aria-label", formatUiText(locale, "chooseChapter", { book: bookName, chapter: activeChapter }));
    heading.textContent = bookName.toUpperCase();
    count.textContent = formatUiText(locale, chapterCount === 1 ? "chapterCountOne" : "chapterCountMany", { count: chapterCount });
    if (renderedOptions?.bookName !== bookName || renderedOptions.chapterCount !== chapterCount || renderedOptions.locale !== locale) {
      list.replaceChildren();
      for (let chapter = 1; chapter <= chapterCount; chapter += 1) {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "chapter-option";
        option.setAttribute("role", "option");
        option.setAttribute("aria-label", formatUiText(locale, "chapterOption", { book: bookName, chapter }));
        option.dataset.chapter = chapter;
        option.textContent = chapter;
        list.append(option);
      }
      renderedOptions = { bookName, chapterCount, locale };
    }
    for (const option of optionButtons()) {
      const chapter = Number(option.dataset.chapter);
      option.setAttribute("aria-selected", String(chapter === activeChapter));
      option.tabIndex = chapter === activeChapter ? 0 : -1;
    }
  }

  trigger.addEventListener("click", () => {
    if (popover.hidden) open();
    else close(true);
  });
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      open();
    }
  });
  list.addEventListener("click", (event) => {
    const option = event.target.closest(".chapter-option");
    if (!option) return;
    close();
    onSelect(Number(option.dataset.chapter));
  });
  list.addEventListener("keydown", (event) => {
    const options = optionButtons();
    const currentIndex = options.indexOf(document.activeElement);
    let targetIndex;

    if (event.key === "ArrowDown") targetIndex = Math.min(currentIndex + 1, options.length - 1);
    else if (event.key === "ArrowUp") targetIndex = Math.max(currentIndex - 1, 0);
    else if (event.key === "Home") targetIndex = 0;
    else if (event.key === "End") targetIndex = options.length - 1;
    else return;

    event.preventDefault();
    options[targetIndex]?.focus();
  });
  document.addEventListener("click", (event) => {
    if (!root.contains(event.target) && !popover.contains(event.target)) close();
  });

  return { close, isOpen: () => !popover.hidden, render };
}