import { expect, test } from "./support/browser-test.mjs";

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
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.locator("#edition-offline-action").click();
  await expect(page.locator("#edition-offline-status")).toHaveText("Available offline");

  await page.goto("/krv/b/john/c/3/v/16");
  await expect(page.locator("#edition-offline-status")).toHaveText("오프라인 저장 안 됨");
});

async function saveKjvThenGoOffline(page, context) {
  await page.goto("/kjv/b/john/c/3/v/16");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.locator("#edition-offline-action").click();
  await expect(page.locator("#edition-offline-status")).toHaveText("Available offline");
  await context.setOffline(true);
}

test("stays on the current edition when an unsaved edition is chosen offline", async ({ page, context }) => {
  await saveKjvThenGoOffline(page, context);
  await page.reload();
  await expect(page.locator("#verse-16")).toContainText("For God so loved the world");

  await page.locator("#edition-select").click();
  await page.locator('[data-edition="krv"]').click();

  await expect(page.locator("#edition-notice")).toContainText("needs an internet connection");
  await expect(page.locator("#edition-select-code")).toHaveText("KJV");
  await expect(page.locator("body")).toHaveClass(/is-kjv-edition/);
  await expect(page).toHaveURL(/\/kjv\/b\/john\/c\/3\/v\/16$/);
  await expect(page.locator("#verse-16")).toContainText("For God so loved the world");
  await expect(page.locator("#edition-offline-status")).toHaveText("Available offline");
});

test("explains an unsaved edition opened directly while offline and allows switching to a saved one", async ({ page, context }) => {
  await saveKjvThenGoOffline(page, context);
  await page.goto("/krv/b/john/c/3/v/16");

  await expect(page.locator("#verse-list")).toContainText("오프라인 저장된 번역본을 선택하세요.");
  await page.locator("#edition-select").click();
  await page.locator('[data-edition="kjv"]').click();
  await expect(page.locator("#verse-list")).toContainText("In the beginning God created the heaven and the earth");
});
