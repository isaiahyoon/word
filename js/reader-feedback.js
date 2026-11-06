export function createReaderFeedback({ elements, uiText, currentPassage, logger }) {
  function feedbackCategoryOptions() {
    return [...elements.feedbackCategoryMenu.querySelectorAll(".feedback-category-option")];
  }

  function closeFeedbackCategory(returnFocus = false) {
    elements.feedbackCategoryMenu.hidden = true;
    elements.feedbackCategoryTrigger.setAttribute("aria-expanded", "false");
    if (returnFocus) elements.feedbackCategoryTrigger.focus();
  }

  function openFeedbackCategory(focusLast = false) {
    elements.feedbackCategoryMenu.hidden = false;
    elements.feedbackCategoryTrigger.setAttribute("aria-expanded", "true");
    const options = feedbackCategoryOptions();
    const selectedIndex = options.findIndex((option) => option.dataset.value === elements.feedbackCategory.value);
    const targetIndex = selectedIndex >= 0
      ? selectedIndex
      : focusLast ? options.length - 1 : 0;
    options[targetIndex]?.focus();
  }

  function selectFeedbackCategory(option) {
    elements.feedbackCategory.value = option.dataset.value;
    elements.feedbackCategoryValue.textContent = option.querySelector(".feedback-option-title").textContent;
    elements.feedbackCategoryError.hidden = true;
    elements.feedbackCategoryTrigger.setAttribute("aria-invalid", "false");
    feedbackCategoryOptions().forEach((item) => {
      const selected = item === option;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    closeFeedbackCategory(true);
  }

  function resetFeedbackCategory() {
    elements.feedbackCategory.value = "";
    elements.feedbackCategoryValue.textContent = uiText("chooseTopic");
    elements.feedbackCategoryError.hidden = true;
    elements.feedbackCategoryTrigger.setAttribute("aria-invalid", "false");
    feedbackCategoryOptions().forEach((option) => {
      option.setAttribute("aria-selected", "false");
      option.tabIndex = -1;
    });
  }

  async function submit(event) {
    event.preventDefault();
    elements.feedbackError.hidden = true;
    if (!elements.feedbackCategory.value) {
      elements.feedbackCategoryError.hidden = false;
      elements.feedbackCategoryTrigger.setAttribute("aria-invalid", "true");
      elements.feedbackCategoryTrigger.focus();
      return;
    }
    elements.feedbackCategoryError.hidden = true;
    elements.feedbackCategoryTrigger.setAttribute("aria-invalid", "false");
    elements.feedbackSubmit.disabled = true;
    elements.feedbackPassage.value = elements.feedbackIncludePassage.checked
      ? currentPassage()
      : "";

    try {
      const formData = new FormData(elements.feedbackForm);
      const response = await fetch(elements.feedbackForm.action, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(formData).toString(),
      });
      if (!response.ok) throw new Error(`Feedback submission failed (${response.status})`);

      elements.feedbackForm.reset();
      resetFeedbackCategory();
      elements.feedbackForm.hidden = true;
      elements.feedbackSuccess.hidden = false;
      elements.feedbackSuccess.focus();
    } catch (error) {
      logger.error("Feedback submission failed", { error });
      elements.feedbackError.hidden = false;
      elements.feedbackSubmit.disabled = false;
      elements.feedbackError.focus();
    }
  }

  function bindEvents() {
    elements.feedbackOpen.addEventListener("click", () => {
      elements.feedbackError.hidden = true;
      elements.feedbackCategoryError.hidden = true;
      elements.feedbackCategoryTrigger.setAttribute("aria-invalid", "false");
      elements.feedbackSuccess.hidden = true;
      elements.feedbackForm.hidden = false;
      elements.feedbackSubmit.disabled = false;
      closeFeedbackCategory();
      elements.feedbackDialog.showModal();
      elements.feedbackCategoryTrigger.focus();
    });
    elements.feedbackClose.addEventListener("click", () => elements.feedbackDialog.close());
    elements.feedbackDone.addEventListener("click", () => elements.feedbackDialog.close());
    elements.feedbackDialog.addEventListener("click", (event) => {
      if (event.target === elements.feedbackDialog) elements.feedbackDialog.close();
    });
    elements.feedbackDialog.addEventListener("close", () => closeFeedbackCategory());
    elements.feedbackCategoryTrigger.addEventListener("click", () => {
      if (elements.feedbackCategoryMenu.hidden) openFeedbackCategory();
      else closeFeedbackCategory(true);
    });
    elements.feedbackCategoryTrigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openFeedbackCategory(event.key === "ArrowUp");
      }
    });
    elements.feedbackCategoryMenu.addEventListener("click", (event) => {
      const option = event.target.closest(".feedback-category-option");
      if (option) selectFeedbackCategory(option);
    });
    elements.feedbackCategoryMenu.addEventListener("keydown", (event) => {
      const options = feedbackCategoryOptions();
      const currentIndex = options.indexOf(document.activeElement);
      let targetIndex;

      if (event.key === "ArrowDown") targetIndex = Math.min(currentIndex + 1, options.length - 1);
      else if (event.key === "ArrowUp") targetIndex = Math.max(currentIndex - 1, 0);
      else if (event.key === "Home") targetIndex = 0;
      else if (event.key === "End") targetIndex = options.length - 1;
      else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeFeedbackCategory(true);
        return;
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (currentIndex >= 0) selectFeedbackCategory(options[currentIndex]);
        return;
      } else return;

      event.preventDefault();
      options[targetIndex]?.focus();
    });
    document.addEventListener("click", (event) => {
      if (!elements.feedbackCategoryField.contains(event.target)) closeFeedbackCategory();
    });
    elements.feedbackCategoryField.addEventListener("focusout", () => {
      requestAnimationFrame(() => {
        if (!elements.feedbackCategoryField.contains(document.activeElement)) closeFeedbackCategory();
      });
    });
    elements.feedbackForm.addEventListener("submit", (event) => void submit(event));
  }

  return { bindEvents };
}
