// The source marks print paragraph breaks with ¶, which the reader does not display.
export function stripParagraphMarks(text) {
  return text.replace(/^¶\s*/, "").replace(/\s*¶\s*/g, " ");
}
