import { mkdir, copyFile, readFile } from "node:fs/promises";
const list = [
  "Designvergleich.html",
  "index.html",
  "journal.css",
  "journal.js",
  "everyday.mjs","everyday-ui.js",
  "scanner.js",
  "vendor/zxing-browser.min.js",
  "vendor/LICENSE",
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
await mkdir("dist/vendor", { recursive: true });
for (const f of list) await copyFile(f, "dist/" + f);
console.log(list.length + " öffentliche App-Dateien in dist/");
