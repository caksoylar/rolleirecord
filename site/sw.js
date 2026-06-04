const CACHE_NAME = "rolleirecord-v26";
const ASSETS = [
  "./",
  "./index.html",
  "./entity-editor.html",
  "./settings.html",
  "./icons.svg",
  "./styles.css",
  "./assets/site.webmanifest",
  "./assets/favicon.svg",
  "./assets/favicon.ico",
  "./assets/favicon-96x96.png",
  "./assets/apple-touch-icon.png",
  "./assets/web-app-manifest-192x192.png",
  "./assets/web-app-manifest-512x512.png",
  "./src/app.js",
  "./src/config.js",
  "./src/entities.js",
  "./src/entity-editor.js",
  "./src/exif.js",
  "./src/export.js",
  "./src/frame.js",
  "./src/rolls.js",
  "./src/selectors.js",
  "./src/settings.js",
  "./src/table.js",
  "./src/util.js",
];

// Cache all assets on install
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// Remove old caches on activate
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Cache-first, fallback to network; skip non-GET requests.
// When offline, never let a network fetch reject - that can surface iOS's
// "Turn Off Airplane Mode" prompt on PWA launch.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      if (!self.navigator.onLine) {
        return new Response("", { status: 504 });
      }
      return fetch(e.request).catch(() => new Response("", { status: 504 }));
    }),
  );
});
