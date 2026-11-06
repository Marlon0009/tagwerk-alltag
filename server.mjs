import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
const root = import.meta.dirname,
  types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webmanifest": "application/manifest+json",
    ".json": "application/json",
  };
http
  .createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      let f = path.resolve(
        root,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (!f.startsWith(root + path.sep) || f.includes("node_modules"))
        throw Error();
      let data = await fs.readFile(f);
      res.writeHead(200, {
        "Content-Type":
          (types[path.extname(f)] || "text/plain") + "; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(Number(process.env.PORT || 5173), "0.0.0.0", () =>
    console.log("Tagwerk: http://localhost:" + (process.env.PORT || 5173)),
  );
