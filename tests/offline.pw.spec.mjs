import { expect, test } from "@playwright/test";

test("saves an edition for offline reading and removes it again", async ({ page, context }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.evaluate(() => navigator.serviceWorker.ready);

  const status = page.locator("#edition-offline-status");
  const action = page.locator("#edition-offline-action");
  await expect(status).toHaveText("Not saved for offline");

  await action.click();
  await expect(status).toHaveText("Available offline");
  await expect(action).toHaveText("Remove");

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#verse-16")).toContainText("For God so loved the world");
  await expect(status).toHaveText("Available offline");
  await context.setOffline(false);

  await action.click();
  await expect(status).toHaveText("Not saved for offline");
  await expect(action).toHaveText("Save");
});

test("keeps each edition's offline status separate", async ({ page }) => {
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.locator("#edition-offline-action").click();
  await expect(page.locator("#edition-offline-status")).toHaveText("Available offline");

  await page.goto("/krv/b/john/c/3/v/16");
  await expect(page.locator("#edition-offline-status")).toHaveText("Not saved for offline");
});
