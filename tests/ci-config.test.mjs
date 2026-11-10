import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("CI uses preinstalled browsers matching the pinned Playwright package and lockfile", async () => {
  const [manifest, lock, workflow] = await Promise.all([
    readJson("package.json"),
    readJson("package-lock.json"),
    readFile(new URL(".github/workflows/ci.yml", root), "utf8"),
  ]);
  const version = manifest.devDependencies["@playwright/test"];
  assert.match(version, /^\d+\.\d+\.\d+$/, "Playwright must use an exact stable version");
  assert.equal(lock.packages[""].devDependencies["@playwright/test"], version);
  for (const name of ["@playwright/test", "playwright", "playwright-core"]) {
    assert.equal(lock.packages[`node_modules/${name}`].version, version, name);
  }

  const jobsSection = workflow.split("\njobs:\n")[1];
  assert.ok(jobsSection, "Workflow must define jobs");
  const jobs = [...jobsSection.matchAll(/^ {2}([\w-]+):\n([\s\S]*?)(?=^ {2}[\w-]+:\n|(?![\s\S]))/gm)];
  assert.equal(jobs.length, 2, "Check every CI job, including UI shards");
  for (const [, name, body] of jobs) {
    const images = [...body.matchAll(/^\s+image: mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-noble\s*$/gm)];
    assert.equal(images.length, 1, `${name} must use the official preinstalled browser image`);
    assert.equal(images[0][1], version, `${name} image must match the npm package`);
    assert.doesNotMatch(body, /playwright install\b/, `${name} must not reinstall browsers`);
    assert.match(body, /run: npm ci\b/, `${name} must install locked npm dependencies`);
  }
});

test("Renovate groups Playwright package and container updates without automerging", async () => {
  const config = await readJson(".github/renovate.json");
  assert.ok(config.enabledManagers.includes("npm"));
  assert.ok(config.enabledManagers.includes("github-actions"));
  const rule = config.packageRules.find(({ groupSlug }) => groupSlug === "playwright");
  assert.ok(rule, "Playwright updates must have a shared group");
  assert.deepEqual(rule.matchPackageNames, ["@playwright/test", "mcr.microsoft.com/playwright"]);
  assert.equal(rule.enabled, true);
  assert.equal(rule.rangeStrategy, "pin");
  assert.equal(rule.separateMajorMinor, false);
  assert.equal(rule.automerge, false);
});
