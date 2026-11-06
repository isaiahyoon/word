import { spawn } from "node:child_process";

const suites = [
  ["lint:css", ["run", "lint:css"]],
  ["lint:js", ["run", "lint:js"]],
  ["unit", ["test"]],
  ["ui", ["run", "test:ui"]],
];

const results = await Promise.all(
  suites.map(
    ([name, args]) =>
      new Promise((resolve) => {
        const child = spawn("npm", args, { stdio: ["ignore", "pipe", "pipe"] });
        let output = "";
        child.stdout.on("data", (chunk) => (output += chunk));
        child.stderr.on("data", (chunk) => (output += chunk));
        child.on("close", (code) => resolve({ name, code, output }));
      }),
  ),
);

for (const { name, code, output } of results) {
  console.log(`\n=== ${name}: ${code === 0 ? "passed" : "FAILED"} ===`);
  if (code !== 0) console.log(output);
}

process.exitCode = results.some(({ code }) => code !== 0) ? 1 : 0;
