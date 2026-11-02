import { createReadStream, promises as fs } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { EDITIONS } from "../js/editions.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT ?? 8000);
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"]
]);
const knownEditionRouteSegments = new Set(Object.entries(EDITIONS).map(([editionId, edition]) =>
  edition.routeSegment ?? editionId,
));

function isScriptureRoute(pathname) {
  const pathSegments = pathname.split("/").filter(Boolean);
  if (knownEditionRouteSegments.has(pathSegments.at(-1))) return true;
  const routeIndex = pathname.indexOf("/b/");
  if (routeIndex < 0) return false;
  return /^\/b\/[^/]+(?:\/(?:c\/\d+(?:\/v\/\d+(?:-\d+)?)?|\d+\/\d+))?\/?$/.test(pathname.slice(routeIndex));
}

export function createDevServer(projectRoot = root) {
  return createServer(async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    } catch {
      response.writeHead(400).end("Bad request");
      return;
    }

    if (pathname === "/health") {
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8"
      });
      response.end(request.method === "HEAD" ? undefined : JSON.stringify({ status: "ok" }));
      return;
    }

    let filePath = resolve(projectRoot, `.${pathname}`);
    let statusCode = 200;
    if (pathname === "/404.html") statusCode = 404;
    if (filePath !== projectRoot && !filePath.startsWith(`${projectRoot}${sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    try {
      let stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        filePath = resolve(filePath, "index.html");
        stats = await fs.stat(filePath);
      }
      if (!stats.isFile()) throw new Error("Not a file");
    } catch {
      if (!isScriptureRoute(pathname)) {
        filePath = resolve(projectRoot, "404.html");
        statusCode = 404;
      } else {
        filePath = resolve(projectRoot, "index.html");
      }
    }

    response.writeHead(statusCode, {
      "Cache-Control": "no-cache",
      "Content-Type": contentTypes.get(extname(filePath)) ?? "application/octet-stream"
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(filePath).pipe(response);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createDevServer();
  server.listen(port, "0.0.0.0", () => {
    console.log(`The Word is available at http://localhost:${port}`);
  });
}