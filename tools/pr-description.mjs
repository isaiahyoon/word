import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const START_MARKER = "<!-- auto-description:start -->";
export const END_MARKER = "<!-- auto-description:end -->";

const MODELS_URL = "https://models.github.ai/inference/chat/completions";
const MODEL = "openai/gpt-4.1";
const MAX_DIFF_CHARACTERS = 60000;

const SYSTEM_PROMPT = `You write pull request titles and descriptions for a scripture reader web app.
Respond with JSON only: {"title": string, "body": string}.
- title: imperative, under 72 characters, no trailing period.
- body: Markdown with a "## Summary" paragraph, a "## Changes" bullet list grouped by concern, and a "## Testing" section.
- Describe only what the diff shows. Do not invent behavior, tests, or results.`;

/** Replaces the generated section of a PR body, keeping any hand-written text around it. */
export function mergeBody(currentBody, generatedBody) {
  const section = `${START_MARKER}\n${generatedBody.trim()}\n${END_MARKER}`;
  const start = currentBody.indexOf(START_MARKER);
  const end = currentBody.indexOf(END_MARKER);
  if (start !== -1 && end > start) {
    return currentBody.slice(0, start) + section + currentBody.slice(end + END_MARKER.length);
  }
  return currentBody.trim() ? `${section}\n\n${currentBody}` : section;
}

export function parseGeneration(content) {
  const { title, body } = JSON.parse(content);
  if (typeof title !== "string" || typeof body !== "string" || !title.trim() || !body.trim()) {
    throw new Error("Model response is missing a title or body");
  }
  return { title: title.trim(), body };
}

async function generate({ commits, diff }) {
  const response = await fetch(MODELS_URL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Commits:\n${commits}\n\nDiff:\n${diff}` },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`GitHub Models request failed with ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  return parseGeneration(data.choices[0].message.content);
}

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

async function main() {
  const { PR_NUMBER, BASE_SHA, HEAD_SHA, UPDATE_TITLE } = process.env;
  const range = `${BASE_SHA}...${HEAD_SHA}`;
  const commits = run("git", ["log", "--format=- %s", range]);
  const diff = run("git", ["diff", range]).slice(0, MAX_DIFF_CHARACTERS);

  let generated;
  try {
    generated = await generate({ commits, diff });
  } catch (error) {
    console.error(`Could not generate a description for PR #${PR_NUMBER}`, error);
    process.exitCode = 1;
    return;
  }

  const { body: currentBody } = JSON.parse(run("gh", ["pr", "view", PR_NUMBER, "--json", "body"]));
  const args = ["pr", "edit", PR_NUMBER, "--body", mergeBody(currentBody ?? "", generated.body)];
  if (UPDATE_TITLE === "true") args.push("--title", generated.title);
  run("gh", args);
  console.log(`Updated PR #${PR_NUMBER}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
