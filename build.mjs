import { mkdir, copyFile, readFile } from "node:fs/promises";
const list = [
  "index.html",
  "style.css",
  "app.js",
  "core.mjs",
  "exchange.mjs",
  "reflection.js",
  "extensions.js",
  "icons.js",
  "terrain.svg",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "sw.js",
];
await mkdir("dist", { recursive: true });
for (const f of list) await copyFile(f, "dist/" + f);
console.log(list.length + " öffentliche App-Dateien in dist/");
