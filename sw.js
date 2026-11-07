const prefix = "tagwerk:" + self.registration.scope + ":",
  cache = prefix + "2.0.0",
  assets = [
    "./",
    "index.html",
    "journal.css",
    "journal.js",
    "scanner.js",
    "vendor/zxing-browser.min.js",
    "style.css",
    "app.js",
    "core.mjs",
    "exchange.mjs",
    "extensions.js",
    "icons.js",
    "reflection.js",
    "terrain.svg",
    "manifest.webmanifest",
    "icon-192.png",
    "icon-512.png",
  ];
self.addEventListener("install", (ev) =>
  ev.waitUntil(caches.open(cache).then((c) => c.addAll(assets))),
);
self.addEventListener("activate", (ev) =>
  ev.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(prefix) && k !== cache)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (ev) => {
  if (
    ev.request.method === "GET" &&
    new URL(ev.request.url).origin === location.origin
  )
    ev.respondWith(
      caches
        .match(ev.request, { cacheName: cache })
        .then(
          (r) =>
            r ||
            fetch(ev.request).catch(() =>
              ev.request.mode === "navigate"
                ? caches.match("./index.html", { cacheName: cache })
                : Response.error(),
            ),
        ),
    );
});
