const googleFontsSelector = 'link[rel="stylesheet"][href*="fonts.googleapis.com"]';
const readingSelectors = ["#verse-list", ".chapter-heading h1", ".book-name"];

const unquote = (name) => name.trim().replace(/^["']|["']$/g, "");

// Fetching through the service worker stores the stylesheet and the font files the reader actually renders.
export async function preloadEditionFonts({
  doc = document,
  fetchImpl = fetch,
  getStyle = (element) => getComputedStyle(element),
} = {}) {
  await Promise.all([...doc.querySelectorAll(googleFontsSelector)]
    .map((link) => fetchImpl(link.href, { mode: "no-cors" })));

  const used = readingSelectors.flatMap((selector) => {
    const element = doc.querySelector(selector);
    if (!element) return [];
    const { fontFamily, fontWeight, fontStyle } = getStyle(element);
    return fontFamily.split(",").map((family) => `${unquote(family)}|${fontWeight}|${fontStyle}`);
  });
  const usedFaces = new Set(used);

  await Promise.all([...doc.fonts]
    .filter((face) => usedFaces.has(`${unquote(face.family)}|${face.weight}|${face.style}`))
    .map((face) => face.load()));
}
