import { expect, test as base } from "@playwright/test";

const googleFontsPattern = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;
const analyticsPattern = /^https:\/\/cloud\.umami\.is\//;

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(googleFontsPattern, (route) => route.fulfill({
      status: 200,
      contentType: "text/css",
      body: "",
    }));
    await context.route(analyticsPattern, (route) => route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "",
    }));
    await use(context);
  },
});

export { expect };
