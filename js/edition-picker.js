export function createEditionPicker({
  root,
  trigger,
  code,
  label,
  menu,
  onSelect,
  onEscape,
}) {
  function optionButtons() {
    return [...menu.querySelectorAll(".edition-option")];
  }

  function close(returnFocus = false) {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (returnFocus) trigger.focus();
  }

  function focusOption(editionId) {
    const option = menu.querySelector(`[data-edition="${editionId}"]`);
    option?.focus();
    option?.scrollIntoView({ block: "nearest" });
  }

  function refreshScrollableText() {
    root.querySelectorAll("[data-scroll-text]").forEach((frame) => {
      const track = frame.firstElementChild;
      if (!track || frame.clientWidth === 0) return;
      const distance = Math.max(0, Math.ceil(track.getBoundingClientRect().width - frame.clientWidth));
      frame.classList.toggle("is-overflowing", distance > 0);
      frame.style.setProperty("--edition-scroll-distance", `${distance}px`);
    });
  }

  function setScrollableText(frame, text) {
    const track = document.createElement("span");
    track.className = "edition-scroll-text";
    track.textContent = text;
    frame.replaceChildren(track);
    frame.dataset.scrollText = "";
    frame.title = text;
    resizeObserver?.observe(track);
  }

  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(refreshScrollableText)
    : null;
  resizeObserver?.observe(root);

  function open() {
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    focusOption(trigger.dataset.edition);
    requestAnimationFrame(refreshScrollableText);
  }

  function render(editionIds, editions, activeEditionId) {
    const activeEdition = editions[activeEditionId];
    trigger.dataset.edition = activeEditionId;
    trigger.setAttribute("aria-label", `Choose edition, currently ${activeEdition.label}`);
    code.textContent = activeEdition.shortCode ?? activeEditionId.toUpperCase();
    setScrollableText(label, activeEdition.label);
    menu.replaceChildren();

    for (const editionId of editionIds) {
      const edition = editions[editionId];
      const option = document.createElement("button");
      option.type = "button";
      option.className = `edition-option${editionId === activeEditionId ? " is-selected" : ""}`;
      option.id = `edition-option-${editionId}`;
      option.dataset.edition = editionId;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(editionId === activeEditionId));
      option.tabIndex = editionId === activeEditionId ? 0 : -1;

      const mark = document.createElement("span");
      mark.className = "edition-option-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = edition.shortCode ?? editionId.toUpperCase();

      const description = document.createElement("span");
      description.className = "edition-option-description";
      description.lang = edition.language;
      const title = document.createElement("strong");
      setScrollableText(title, edition.label);
      const subtitle = document.createElement("small");
      setScrollableText(subtitle, edition.name);
      description.append(title, subtitle);

      const selectedMark = document.createElement("span");
      selectedMark.className = "edition-option-check";
      selectedMark.setAttribute("aria-hidden", "true");
      selectedMark.textContent = editionId === activeEditionId ? "✓" : "";
      option.append(mark, description, selectedMark);
      menu.append(option);
    }
    requestAnimationFrame(refreshScrollableText);
    if (document.fonts) {
      document.fonts.ready.then(() => requestAnimationFrame(refreshScrollableText));
    }
  }

  trigger.addEventListener("click", () => {
    if (menu.hidden) open();
    else close(true);
  });
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      open();
    }
  });
  menu.addEventListener("click", (event) => {
    const option = event.target.closest(".edition-option");
    if (!option) return;
    close(true);
    onSelect(option.dataset.edition);
  });
  menu.addEventListener("keydown", (event) => {
    const options = optionButtons();
    const currentIndex = options.indexOf(document.activeElement);
    let targetIndex = currentIndex;

    if (event.key === "ArrowDown") targetIndex = Math.min(currentIndex + 1, options.length - 1);
    else if (event.key === "ArrowUp") targetIndex = Math.max(currentIndex - 1, 0);
    else if (event.key === "Home") targetIndex = 0;
    else if (event.key === "End") targetIndex = options.length - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      onEscape?.();
      return;
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      options[currentIndex]?.click();
      return;
    } else return;

    event.preventDefault();
    options[targetIndex]?.focus();
  });
  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) close();
  });

  return { close, isOpen: () => !menu.hidden, render };
}