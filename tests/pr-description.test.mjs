import assert from "node:assert/strict";
import test from "node:test";
import { END_MARKER, mergeBody, parseGeneration, START_MARKER } from "../tools/pr-description.mjs";

test("wraps the generated body in markers when the PR body is empty", () => {
  assert.equal(mergeBody("", "## Summary\nHi"), `${START_MARKER}\n## Summary\nHi\n${END_MARKER}`);
});

test("keeps hand-written text when adding the generated section", () => {
  const merged = mergeBody("Closes #4", "New");
  assert.equal(merged, `${START_MARKER}\nNew\n${END_MARKER}\n\nCloses #4`);
});

test("replaces only the marked section on later pushes", () => {
  const current = `Intro\n\n${START_MARKER}\nOld\n${END_MARKER}\n\nNotes`;
  assert.equal(mergeBody(current, "Fresh"), `Intro\n\n${START_MARKER}\nFresh\n${END_MARKER}\n\nNotes`);
});

test("parses a model response and rejects incomplete ones", () => {
  assert.deepEqual(parseGeneration('{"title":" Fix it ","body":"Body"}'), { title: "Fix it", body: "Body" });
  assert.throws(() => parseGeneration('{"title":"","body":"Body"}'));
  assert.throws(() => parseGeneration('{"title":"T"}'));
});
