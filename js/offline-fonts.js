const googleFontsSelector = 'link[rel="stylesheet"][href*="fonts.googleapis.com"]';
const readingSelectors = ["#verse-list", ".chapter-heading h1", ".book-name"];

const unquote = (name) => name.trim().replace(/^["']|["']$/g, "");

function fontWeightRange(weight) {
  const weights = weight.trim().split(/\s+/u).map((value) => {
    if (value === "normal") return 400;
    if (value === "bold") return 700;
    return Number(value);
  });
  if (weights.some((value) => !Number.isFinite(value))) return [400, 400];
  return [Math.min(...weights), Math.max(...weights)];
}

function fontWeightDistance(faceWeight, requestedWeight) {
  const [minimum, maximum] = fontWeightRange(faceWeight);
  if (requestedWeight >= minimum && requestedWeight <= maximum) return 0;
  return Math.min(Math.abs(requestedWeight - minimum), Math.abs(requestedWeight - maximum));
}

// Fetching through the service worker stores the stylesheet and the font files the reader actually renders.
export async function preloadEditionFonts({
  doc = document,
  fetchImpl = fetch,
  getStyle = (element) => getComputedStyle(element),
} = {}) {
  await Promise.all([...doc.querySelectorAll(googleFontsSelector)]
    .map((link) => fetchImpl(link.href, { mode: "no-cors" })));

  const used = new Map();
  for (const selector of readingSelectors) {
    const element = doc.querySelector(selector);
    if (!element) continue;
    const { fontFamily, fontWeight, fontStyle } = getStyle(element);
    for (const family of fontFamily.split(",")) {
      const key = `${unquote(family)}|${fontStyle}`;
      const weights = used.get(key) ?? new Set();
      weights.add(Number(fontWeight));
      used.set(key, weights);
    }
  }

  const availableFaces = [...doc.fonts];
  const usedFaces = new Set();
  for (const [key, requestedWeights] of used) {
    const candidates = availableFaces.filter((face) =>
      `${unquote(face.family)}|${face.style}` === key
    );
    for (const requestedWeight of requestedWeights) {
      const closestDistance = Math.min(
        ...candidates.map((face) => fontWeightDistance(face.weight, requestedWeight)),
      );
      candidates
        .filter((face) => fontWeightDistance(face.weight, requestedWeight) === closestDistance)
        .forEach((face) => usedFaces.add(face));
    }
  }

  await Promise.all([...usedFaces].map((face) => face.load()));
}
