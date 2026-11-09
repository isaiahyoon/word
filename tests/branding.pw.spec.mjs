import { expect, test } from "./support/browser-test.mjs";

test("sword icon exports have clean navy edges without the darker outer frame", async ({ page }) => {
  await page.goto("/");
  const assets = [
    "favicon.png",
    "apple-touch-icon.png",
    "pwa-icon-192.png",
    "pwa-icon-512.png",
    "app-icon-1024.png",
    "iphone-app-icon-1024.png",
    "instagram-profile-1080.png",
  ];
  for (const asset of assets) {
    const samples = await page.evaluate(async (file) => {
      const image = new Image();
      image.src = `/assets/${file}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return [[0, 0], [1, 0], [0, 1], [1, 1], [0, 0.5], [1, 0.5], [0.2, 0], [0.8, 1]]
        .map(([x, y]) => [...context.getImageData(
          Math.round(x * (canvas.width - 1)),
          Math.round(y * (canvas.height - 1)),
          1, 1,
        ).data]);
    }, asset);
    for (const pixel of samples) {
      expect(pixel[2], `${asset}: edge remains tile navy, not the old near-black frame`).toBeGreaterThan(45);
      expect(pixel[3], `${asset}: corners remain opaque for installation`).toBe(255);
    }
  }
});
