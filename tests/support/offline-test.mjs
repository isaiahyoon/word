import { expect, test as base } from "@playwright/test";

const googleFontsPattern = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

// Google Fonts is external, so stub it to keep page loads and offline saves independent of network speed.
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(googleFontsPattern, (route) => route.fulfill({
      status: 200,
      contentType: "text/css",
      body: "",
    }));
    await use(context);
  },
});

export { expect };
