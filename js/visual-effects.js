const scriptureSegmenter = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
  : null;

export function createVisualEffects({ shell, verseList }) {
  let chapterGlimmerTimer;
  let chapterGlimmerRun = 0;
  let activeScriptureGlow = null;
  let bound = false;

  function clearScriptureGlow() {
    if (!activeScriptureGlow) return;

    const parent = activeScriptureGlow.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(activeScriptureGlow.textContent), activeScriptureGlow);
      parent.normalize();
    }
    activeScriptureGlow = null;
  }

  function triggerChapterGlimmers() {
    const run = ++chapterGlimmerRun;
    clearTimeout(chapterGlimmerTimer);
    shell.classList.remove("is-glimmering");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    void shell.offsetWidth;
    shell.classList.add("is-glimmering");
    chapterGlimmerTimer = setTimeout(() => {
      if (run === chapterGlimmerRun) shell.classList.remove("is-glimmering");
    }, 1000);
  }

  function scriptureCharacterAt(text, offset) {
    if (scriptureSegmenter) {
      let lastSegment = null;
      for (const segment of scriptureSegmenter.segment(text)) {
        lastSegment = segment;
        if (offset >= segment.index && offset < segment.index + segment.segment.length) {
          return segment.segment.trim() ? segment : null;
        }
      }
      return offset >= text.length && lastSegment?.segment.trim() ? lastSegment : null;
    }

    let index = 0;
    let lastSegment = null;
    for (const segment of text) {
      lastSegment = { index, segment };
      if (offset >= index && offset < index + segment.length) {
        return segment.trim() ? lastSegment : null;
      }
      index += segment.length;
    }
    return offset >= text.length && lastSegment?.segment.trim() ? lastSegment : null;
  }

  function caretAtPoint(event) {
    if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(event.clientX, event.clientY);
      return position && { node: position.offsetNode, offset: position.offset };
    }
    const range = document.caretRangeFromPoint?.(event.clientX, event.clientY);
    return range && { node: range.startContainer, offset: range.startOffset };
  }

  function glowScriptureCharacter(event) {
    if (event.pointerType === "touch") {
      clearScriptureGlow();
      return;
    }

    const textElement = event.target instanceof Element ? event.target.closest(".verse-text") : null;
    if (!textElement) {
      clearScriptureGlow();
      return;
    }
    if (activeScriptureGlow?.contains(event.target)) return;

    clearScriptureGlow();
    const caret = caretAtPoint(event);
    if (!caret || caret.node.nodeType !== Node.TEXT_NODE || !textElement.contains(caret.node)) return;

    const character = scriptureCharacterAt(caret.node.textContent, caret.offset);
    if (!character) return;

    const range = document.createRange();
    range.setStart(caret.node, character.index);
    range.setEnd(caret.node, character.index + character.segment.length);
    const glow = document.createElement("span");
    glow.className = "scripture-glow";
    glow.style.setProperty("--rainbow-hue", `${Math.floor(Math.random() * 360)}deg`);
    range.surroundContents(glow);
    activeScriptureGlow = glow;
  }

  function bind() {
    if (bound) return;
    bound = true;
    verseList.addEventListener("pointermove", glowScriptureCharacter);
    verseList.addEventListener("pointerleave", clearScriptureGlow);
  }

  return { bind, clearScriptureGlow, triggerChapterGlimmers };
}
