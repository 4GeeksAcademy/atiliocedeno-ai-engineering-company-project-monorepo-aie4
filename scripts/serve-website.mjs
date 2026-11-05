import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = resolve(fileURLToPath(new URL("../uis/website/", import.meta.url)));
const pages = new Map([
  ["/", "index.html"],
  ["/en", "index.en.html"],
  ["/care-request", "aplication.html"],
  ["/en/care-request", "aplication.en.html"],
  ["/index.html", "index.html"],
  ["/index.en.html", "index.en.html"],
  ["/aplication.html", "aplication.html"],
  ["/aplication.en.html", "aplication.en.html"],
  // Relative links on the English form resolve beneath /en/.
  ["/en/index.html", "index.html"],
  ["/en/index.en.html", "index.en.html"],
  ["/en/aplication.html", "aplication.html"],
  ["/en/aplication.en.html", "aplication.en.html"],
  ["/style.css", "style.css"],
  ["/validation.js", "validation.js"],
  ["/en/style.css", "style.css"],
  ["/en/validation.js", "validation.js"],
]);
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
]);

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end("Method Not Allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400).end("Bad Request");
    return;
  }

  const relativePath = pages.get(pathname);
  if (!relativePath) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not Found");
    return;
  }

  const filePath = resolve(websiteRoot, relativePath);
  if (!filePath.startsWith(`${websiteRoot}/`)) {
    response.writeHead(404).end("Not Found");
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes.get(extname(filePath)),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not Found");
  }
});

const port = Number(process.env.PORT || 4187);
const host = process.env.HOST || "0.0.0.0";
server.listen(port, host, () => {
  console.log(`HealthCore historical HTML (no authentication): http://localhost:${port} (listening on ${host})`);
});
