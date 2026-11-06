const cache = "tagwerk-v1.0.0",
  assets = [
    "./",
    "index.html",
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
            .filter((k) => k.startsWith("tagwerk-") && k !== cache)
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
        .match(ev.request)
        .then(
          (r) =>
            r ||
            fetch(ev.request).catch(() =>
              ev.request.mode === "navigate"
                ? caches.match("./index.html")
                : Response.error(),
            ),
        ),
    );
});
