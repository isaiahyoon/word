export function createReaderSearch({
  elements,
  getEditionId,
  getScripture,
  editions,
  uiText,
  bookName,
  referenceBookName,
  logger,
  openChapter,
}) {
  const state = {
    timer: null,
    requestId: 0,
    matches: [],
    query: "",
    shown: 0,
    activeIndex: -1,
  };

  function appendHighlighted(container, text, matchedTerms = [], language = editions[getEditionId()].language) {
    const terms = new Set(matchedTerms.map((term) => term.toLocaleLowerCase()));
    if (language === "ja" && typeof Intl.Segmenter === "function") {
      const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
      let cursor = 0;
      for (const part of segmenter.segment(text)) {
        const word = part.segment;
        if (!part.isWordLike || !terms.has(word.toLocaleLowerCase())) continue;

        container.append(document.createTextNode(text.slice(cursor, part.index)));
        const mark = document.createElement("mark");
        mark.textContent = word;
        container.append(mark);
        cursor = part.index + word.length;
      }
      container.append(document.createTextNode(text.slice(cursor)));
      return;
    }

    const hangulTerm = /\p{Script=Hangul}/u;
    const wordPattern = /[\p{L}\p{N}]+/gu;
    let cursor = 0;

    for (const match of text.matchAll(wordPattern)) {
      const word = match[0];
      const normalizedWord = word.toLocaleLowerCase();
      const isMatched = terms.has(normalizedWord) || [...terms].some((term) =>
        hangulTerm.test(term) && normalizedWord.startsWith(term)
      );
      if (!isMatched) continue;

      container.append(document.createTextNode(text.slice(cursor, match.index)));
      const mark = document.createElement("mark");
      mark.textContent = word;
      container.append(mark);
      cursor = match.index + word.length;
    }

    container.append(document.createTextNode(text.slice(cursor)));
  }

  function openSearchResult(verse) {
    invalidate();
    state.activeIndex = -1;
    state.matches = [];
    state.shown = 0;
    state.query = "";
    elements.searchResults.hidden = true;
    elements.searchResults.replaceChildren();
    elements.searchInput.value = "";
    elements.searchInput.setAttribute("aria-expanded", "false");
    elements.searchInput.removeAttribute("aria-activedescendant");
    void openChapter(verse.book, verse.chapter, verse.verse)
      .then(() => document.querySelector(`#verse-${verse.verse}`)?.focus({ preventScroll: true }));
  }

  function setActiveResult(index) {
    const results = [...elements.searchResults.querySelectorAll(".search-result")];
    if (results.length === 0) return;

    state.activeIndex = Math.max(0, Math.min(index, results.length - 1));
    results.forEach((result, resultIndex) => {
      result.setAttribute("aria-selected", String(resultIndex === state.activeIndex));
    });
    const activeResult = results[state.activeIndex];
    elements.searchInput.setAttribute("aria-activedescendant", activeResult.id);
    activeResult.scrollIntoView({ block: "nearest" });
  }

  function formatSummary(matches, shown) {
    const language = editions[getEditionId()].language;
    const number = (value) => value.toLocaleString(language);
    const navigationCount = matches.filter((match) => match.searchType !== "text").length;
    const verseCount = matches.length - navigationCount;
    const summaryParts = [];
    if (navigationCount > 0) {
      summaryParts.push(uiText(navigationCount === 1 ? "navigationSuggestionOne" : "navigationSuggestionMany", {
        count: number(navigationCount),
      }));
    }
    if (verseCount > 0) {
      summaryParts.push(uiText(verseCount === 1 ? "foundVerseOne" : "foundVerseMany", {
        count: number(verseCount),
      }));
    }
    summaryParts.push(uiText("searchShowing", { count: number(shown) }));
    return summaryParts.join(" · ");
  }

  function appendResults() {
    const batch = state.matches.slice(state.shown, state.shown + 12);
    for (const [batchIndex, verse] of batch.entries()) {
      const resultIndex = state.shown + batchIndex;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      button.id = `search-result-${resultIndex}`;
      button.tabIndex = -1;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(resultIndex === state.activeIndex));
      button.dataset.searchType = verse.searchType ?? "text";
      if (verse.searchType && verse.searchType !== "text") {
        button.classList.add("search-result--navigation");
      }
      const reference = document.createElement("span");
      reference.className = "result-reference";
      if (verse.searchType === "book") {
        reference.textContent = uiText("resultBook", { book: bookName(verse.book) });
      } else if (verse.searchType === "chapter") {
        reference.textContent = uiText("resultChapter", {
          book: referenceBookName(verse.book),
          chapter: verse.chapter,
        });
      } else if (verse.searchType === "reference") {
        reference.textContent = uiText("resultExactPassage", {
          reference: `${referenceBookName(verse.book)} ${verse.chapter}:${verse.verse}`,
        });
      } else {
        reference.textContent = `${referenceBookName(verse.book)} ${verse.chapter}:${verse.verse}`;
      }
      if (verse.sourceEdition === "krv") reference.textContent += uiText("fallbackResult");
      const text = document.createElement("span");
      text.className = "result-text";
      if (verse.searchType === "book") {
        text.textContent = uiText("openBookFromStart", { book: bookName(verse.book) });
      } else if (verse.searchType === "chapter") {
        text.textContent = uiText("openChapterResult", {
          book: referenceBookName(verse.book),
          chapter: verse.chapter,
        });
      } else {
        appendHighlighted(text, verse.text, verse.matchedTerms, verse.textLanguage ?? editions[getEditionId()].language);
      }
      button.append(reference, text);
      button.addEventListener("click", () => openSearchResult(verse));
      elements.searchResults.append(button);
    }
    state.shown += batch.length;
    const summary = elements.searchResults.querySelector(".search-summary");
    summary.textContent = formatSummary(state.matches, state.shown);
  }

  async function runSearch(query, requestId) {
    const trimmed = query.trim();
    elements.searchResults.replaceChildren();
    state.activeIndex = -1;
    elements.searchInput.removeAttribute("aria-activedescendant");
    if (trimmed.length < 2) {
      state.matches = [];
      state.query = "";
      state.shown = 0;
      elements.searchResults.hidden = true;
      elements.searchInput.setAttribute("aria-expanded", "false");
      return;
    }
    elements.searchResults.hidden = false;
    elements.searchInput.setAttribute("aria-expanded", "true");
    state.query = trimmed;
    state.shown = 0;

    const loading = document.createElement("div");
    loading.className = "search-summary";
    loading.textContent = uiText("searchLoading");
    elements.searchResults.append(loading);

    let matches;
    try {
      const editionId = getEditionId();
      matches = await logger.measure("Search", { editionId }, () => getScripture().search(trimmed));
      if (requestId !== state.requestId || trimmed !== elements.searchInput.value.trim()) return;

      elements.searchResults.replaceChildren();
      state.matches = matches;
    } catch (error) {
      if (requestId !== state.requestId) return;
      logger.error("Search failed", { editionId: getEditionId(), error });
      elements.searchResults.replaceChildren();
      const message = document.createElement("div");
      message.className = "search-empty";
      message.textContent = uiText("searchUnavailable");
      elements.searchResults.append(message);
      return;
    }

    if (matches.length === 0) {
      const empty = document.createElement("div");
      empty.className = "search-empty";
      empty.textContent = uiText("searchNoMatches");
      elements.searchResults.append(empty);
      return;
    }
    const summary = document.createElement("div");
    summary.className = "search-summary";
    summary.textContent = formatSummary(matches, Math.min(matches.length, 12));
    elements.searchResults.append(summary);
    appendResults();
    setActiveResult(0);
  }

  function invalidate() {
    clearTimeout(state.timer);
    state.requestId += 1;
  }

  function close() {
    invalidate();
    elements.searchResults.hidden = true;
    elements.searchInput.setAttribute("aria-expanded", "false");
    elements.searchInput.removeAttribute("aria-activedescendant");
  }

  function refresh(query = state.query) {
    if (query.trim().length < 2) return;
    void runSearch(query, ++state.requestId);
  }

  function handleInput() {
    invalidate();
    const requestId = state.requestId;
    state.activeIndex = -1;
    elements.searchInput.removeAttribute("aria-activedescendant");
    state.matches = [];
    state.shown = 0;
    state.query = elements.searchInput.value.trim();
    elements.searchResults.replaceChildren();
    if (state.query.length < 2) {
      elements.searchResults.hidden = true;
      elements.searchInput.setAttribute("aria-expanded", "false");
      return;
    }

    elements.searchResults.hidden = false;
    elements.searchInput.setAttribute("aria-expanded", "true");
    const loading = document.createElement("div");
    loading.className = "search-summary";
    loading.textContent = uiText("searchLoading");
    elements.searchResults.append(loading);
    state.timer = setTimeout(() => void runSearch(elements.searchInput.value, requestId), 120);
  }

  function handleKeydown(event) {
    if (elements.searchResults.hidden) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const results = elements.searchResults.querySelectorAll(".search-result");
      if (results.length === 0) return;

      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      let nextIndex = state.activeIndex < 0
        ? (direction > 0 ? 0 : results.length - 1)
        : state.activeIndex + direction;

      if (direction > 0 && nextIndex >= results.length && state.shown < state.matches.length) {
        elements.searchResults.querySelector(".search-more")?.remove();
        appendResults();
      }

      if (nextIndex < elements.searchResults.querySelectorAll(".search-result").length) {
        setActiveResult(nextIndex);
      }
      return;
    }

    if (event.key === "Enter" && state.activeIndex >= 0) {
      event.preventDefault();
      elements.searchResults.querySelectorAll(".search-result")[state.activeIndex]?.click();
    }
  }

  function bindEvents() {
    elements.searchResults.addEventListener("scroll", () => {
      if (state.shown >= state.matches.length) return;
      const distanceToBottom = elements.searchResults.scrollHeight -
        elements.searchResults.scrollTop -
        elements.searchResults.clientHeight;
      if (distanceToBottom <= 48) appendResults();
    });
    elements.searchInput.addEventListener("input", handleInput);
    elements.searchInput.addEventListener("keydown", handleKeydown);
    elements.searchInput.addEventListener("focus", () => {
      if (elements.searchInput.value.trim().length >= 2) refresh(elements.searchInput.value);
    });
    document.addEventListener("click", (event) => {
      if (!event.composedPath().includes(elements.searchWrap)) close();
    });
  }

  return {
    appendResults,
    bindEvents,
    close,
    getQuery: () => state.query,
    invalidate,
    refresh,
  };
}
