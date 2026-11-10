import {
  createVerseReferenceAlignment,
  sameVerseReferences,
  VerseReferenceAlignmentError,
} from "./verse-reference-alignment.mjs";

function compressVerseNumbers(verseNumbers) {
  const ranges = [];
  let start = verseNumbers[0];
  let end = start;

  for (const verseNumber of verseNumbers.slice(1)) {
    if (verseNumber === end + 1) {
      end = verseNumber;
      continue;
    }
    ranges.push(start === end ? String(start) : `${start}-${end}`);
    start = end = verseNumber;
  }
  ranges.push(start === end ? String(start) : `${start}-${end}`);
  return ranges.join(", ");
}

function formatVerseReference(book, chapter, verseNumbers, store) {
  return `${store.referenceBookName(book)} ${chapter}:${compressVerseNumbers(verseNumbers)}`;
}

function formatReferenceList(references, store) {
  const groups = new Map();
  for (const [book, chapter, verse] of references) {
    const key = `${book}:${chapter}`;
    groups.set(key, [...(groups.get(key) ?? []), verse]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
    .map(([key, verseNumbers]) => {
      const [book, chapter] = key.split(":").map(Number);
      return formatVerseReference(book, chapter, [...new Set(verseNumbers)].sort((a, b) => a - b), store);
    })
    .join("; ");
}

async function writeClipboardText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall through to the compatibility path for browsers that deny clipboard access.
  }

  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Clipboard copy failed");
}

export function resolveVerseReferences({
  sourceEditionId,
  sourceStore,
  targetEditionId,
  targetStore,
  canonicalStore,
  book,
  chapter,
  verseNumbers,
}) {
  const sourceChapterVerses = sourceStore.getChapter(book, chapter);
  const targetChapterVerses = targetStore.getChapter(book, chapter);
  const canonicalChapterVerses = canonicalStore.getChapter(book, chapter);
  if (!canonicalChapterVerses.length) throw new VerseReferenceAlignmentError();

  const sourceAlignment = createVerseReferenceAlignment(
    sourceEditionId,
    sourceStore.getReferenceMetadata(),
    {
      book,
      chapter,
      verseCount: sourceChapterVerses.length,
      kjvVerseCount: canonicalChapterVerses.length,
    },
  );
  const targetAlignment = createVerseReferenceAlignment(
    targetEditionId,
    targetStore.getReferenceMetadata(),
    {
      book,
      chapter,
      verseCount: targetChapterVerses.length,
      kjvVerseCount: canonicalChapterVerses.length,
    },
  );
  const sourceVerses = sourceChapterVerses.filter((verse) => verseNumbers.includes(verse.verse));
  if (sourceVerses.length !== verseNumbers.length) throw new VerseReferenceAlignmentError();

  const canonicalReferences = [];
  for (const verse of sourceVerses) {
    const references = sourceAlignment.toKjvReferences(book, chapter, verse.verse);
    if (!references?.length) throw new VerseReferenceAlignmentError();
    canonicalReferences.push(...references);
  }
  const uniqueCanonicalReferences = [...new Map(canonicalReferences.map((reference) => [
    reference.join(":"),
    reference,
  ])).values()];
  for (const [refBook, refChapter, refVerse] of uniqueCanonicalReferences) {
    if (!canonicalStore.getChapter(refBook, refChapter).some((verse) => verse.verse === refVerse)) {
      throw new VerseReferenceAlignmentError();
    }
  }

  const targetVerses = targetAlignment.findNativeVerses(
    book,
    chapter,
    uniqueCanonicalReferences,
    targetChapterVerses,
  );
  if (!targetVerses?.length) throw new VerseReferenceAlignmentError();

  const targetReferences = [];
  for (const verse of targetVerses) {
    const references = targetAlignment.toKjvReferences(verse.book, verse.chapter, verse.verse);
    if (!references?.length) throw new VerseReferenceAlignmentError();
    targetReferences.push(...references);
  }
  const coveredReferences = new Set(targetReferences.map((reference) => reference.join(":")));
  if (uniqueCanonicalReferences.some((reference) => !coveredReferences.has(reference.join(":")))) {
    throw new VerseReferenceAlignmentError();
  }
  const selectedNumbers = new Set(verseNumbers);
  const additionalSourceVerses = sourceChapterVerses.filter((verse) => {
    if (selectedNumbers.has(verse.verse)) return false;
    const references = sourceAlignment.toKjvReferences(book, chapter, verse.verse);
    return references?.some((reference) => coveredReferences.has(reference.join(":")));
  });
  return { targetVerses, targetReferences, additionalSourceVerses };
}

export function createVerseCopyShare({
  state,
  elements,
  scriptureStores,
  getScripture,
  uiText,
  editions,
  logger,
  clearVerseSelection,
  updateCopyControl,
}) {
  let feedbackTimer;

  function clearFeedbackTimer() {
    clearTimeout(feedbackTimer);
  }

  function selectedVerseContent(editionId, store, canonicalStore = null) {
    const scripture = getScripture();
    const activeVerses = scripture.getChapter(state.book, state.chapter)
      .filter((verse) => state.selectedVerses.has(verse.verse));
    if (activeVerses.length === 0) return null;

    if (editionId === state.editionId) {
      const selectedVerses = store.getChapter(state.book, state.chapter)
        .filter((verse) => state.selectedVerses.has(verse.verse));
      const reference = formatVerseReference(
        state.book,
        state.chapter,
        selectedVerses.map((verse) => verse.verse),
        store,
      );
      const copiedVerses = selectedVerses.map((verse) => {
        const sourceLabel = verse.sourceEdition === "krv" ? ` [${uiText("sourceFallback")}]` : "";
        const verseText = `${verse.text.trim()}${sourceLabel}`;
        if (!verse.referenceText) return verseText;
        return `${verseText}\n\n${verse.referenceText.trim()} [${uiText("kjvReference")}]`;
      }).join("\n\n");
      return { reference, text: `"${copiedVerses}"\n\n- ${reference}` };
    }

    if (!canonicalStore) throw new VerseReferenceAlignmentError();
    const { targetVerses: selectedVerses, targetReferences, additionalSourceVerses } = resolveVerseReferences({
      sourceEditionId: state.editionId,
      sourceStore: scripture,
      targetEditionId: editionId,
      targetStore: store,
      canonicalStore,
      book: state.book,
      chapter: state.chapter,
      verseNumbers: activeVerses.map((verse) => verse.verse),
    });

    const reference = formatVerseReference(
      state.book,
      state.chapter,
      selectedVerses.map((verse) => verse.verse),
      store,
    );
    const nativeReferences = selectedVerses.map((verse) => [verse.book, verse.chapter, verse.verse]);
    const sourceReferences = activeVerses.map((verse) => [verse.book, verse.chapter, verse.verse]);
    const alignmentDetails = [];
    if (!sameVerseReferences(sourceReferences, nativeReferences) || additionalSourceVerses.length) {
      alignmentDetails.push(uiText("alignmentSelection", {
        reference: formatVerseReference(state.book, state.chapter, activeVerses.map((verse) => verse.verse), scripture),
        edition: editions[state.editionId].shortCode ?? state.editionId.toUpperCase(),
      }));
    }
    if (additionalSourceVerses.length) {
      alignmentDetails.push(uiText("alignmentExtraText", {
        reference: formatVerseReference(
          state.book,
          state.chapter,
          additionalSourceVerses.map((verse) => verse.verse),
          scripture,
        ),
      }));
    }
    const copiedVerses = selectedVerses.map((verse) => {
      const sourceLabel = verse.sourceEdition === "krv" ? ` [${uiText("sourceFallback")}]` : "";
      const verseText = `${verse.text.trim()}${sourceLabel}`;
      if (!verse.referenceText) return verseText;
      return `${verseText}\n\n${verse.referenceText.trim()} [${uiText("kjvReference")}]`;
    }).join("\n\n");
    const kjvReference = formatReferenceList(targetReferences, canonicalStore);
    const citation = sameVerseReferences(targetReferences, nativeReferences)
      ? `- ${reference}`
      : `- ${reference}\n- ${uiText("kjvReference")}: ${kjvReference}`;
    return { reference, text: `"${copiedVerses}"\n\n${citation}`, alignmentDetails: alignmentDetails.join(" ") };
  }

  function copyShareStatus(key, content) {
    return [uiText(key, { reference: content.reference }), content.alignmentDetails].filter(Boolean).join(" ");
  }

  async function ensureChapterLoaded(editionId, action) {
    const store = scriptureStores.get(editionId);
    if (store.getChapter(state.book, state.chapter).length === 0) {
      try {
        await store.initialize();
        await store.loadChapter(state.book, state.chapter);
      } catch (error) {
        logger.error("Chapter load failed", {
          action,
          editionId,
          book: state.book,
          chapter: state.chapter,
          error,
        });
        elements.copyStatus.textContent = uiText("chapterLoadFailed");
        return null;
      }
    }
    return store;
  }

  async function copySelectedVerses({ clearAfter = false, editionId = state.editionId } = {}) {
    const store = await ensureChapterLoaded(editionId, "copying");
    if (!store) return;
    const canonicalStore = editionId === state.editionId
      ? null
      : await ensureChapterLoaded("kjv", "aligning");
    if (editionId !== state.editionId && !canonicalStore) return;
    let content;
    try {
      content = selectedVerseContent(editionId, store, canonicalStore);
    } catch (error) {
      if (!(error instanceof VerseReferenceAlignmentError)) throw error;
      elements.copyStatus.textContent = uiText("referenceAlignmentUnavailable");
      return;
    }
    if (!content) return;

    try {
      await writeClipboardText(content.text);
      if (clearAfter) {
        clearVerseSelection();
        elements.copyStatus.textContent = uiText("copiedAndCleared", { reference: content.reference });
        return;
      }
      elements.copyControlLabel.textContent = uiText("copied");
      elements.copyStatus.textContent = copyShareStatus("copiedReference", content);
      feedbackTimer = setTimeout(() => updateCopyControl({ clearStatus: !content.alignmentDetails }), 1600);
    } catch (error) {
      logger.error("Copy failed", { editionId: state.editionId, error });
      elements.copyStatus.textContent = uiText("copyFailed");
    }
  }

  // Loading while the language menu is open preserves user activation for native sharing.
  function warmShareChapters() {
    const { book, chapter } = state;
    for (const [editionId, store] of scriptureStores) {
      store.initialize()
        .then(() => store.loadChapter(book, chapter))
        .catch((error) => logger.debug("Share chapter preload failed", { editionId, book, chapter, error }));
    }
  }

  async function shareSelectedVerses(editionId = state.editionId) {
    const store = await ensureChapterLoaded(editionId, "sharing");
    if (!store) return;
    const canonicalStore = editionId === state.editionId
      ? null
      : await ensureChapterLoaded("kjv", "aligning");
    if (editionId !== state.editionId && !canonicalStore) return;
    let content;
    try {
      content = selectedVerseContent(editionId, store, canonicalStore);
    } catch (error) {
      if (!(error instanceof VerseReferenceAlignmentError)) throw error;
      elements.copyStatus.textContent = uiText("referenceAlignmentUnavailable");
      return;
    }
    if (!content) return;

    if (typeof navigator.share !== "function") {
      try {
        await writeClipboardText(content.text);
        elements.copyStatus.textContent = copyShareStatus("shareUnavailableCopied", content);
      } catch (error) {
        logger.error("Share fallback copy failed", { editionId: state.editionId, error });
        elements.copyStatus.textContent = uiText("shareCopyFailed");
      }
      return;
    }

    try {
      if (content.alignmentDetails) elements.copyStatus.textContent = content.alignmentDetails;
      await navigator.share({ text: content.text });
      elements.copyStatus.textContent = copyShareStatus("sharedReference", content);
    } catch (error) {
      if (error?.name === "AbortError") {
        elements.copyStatus.textContent = "";
        return;
      }
      logger.error("Share failed", { editionId: state.editionId, error });
      elements.copyStatus.textContent = uiText("shareFailed");
    }
  }

  return {
    clearFeedbackTimer,
    copySelectedVerses,
    ensureChapterLoaded,
    shareSelectedVerses,
    warmShareChapters,
  };
}
