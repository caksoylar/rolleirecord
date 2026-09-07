const CACHE_NAME = "rolleirecord-v49";
const REFRESH_ASSETS_MESSAGE = "refresh-assets";
const ASSETS = [
  "./",
  "./index.html",
  "./entity-editor.html",
  "./export.html",
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
  "./src/data-io.js",
  "./src/entities.js",
  "./src/entity-editor.js",
  "./src/export.js",
  "./src/frame.js",
  "./src/location.js",
  "./src/rolls.js",
  "./src/roll-ui.js",
  "./src/settings.js",
  "./src/table.js",
  "./src/util.js",
];

function cacheAssets() {
  // Keep install and manual refresh on the same complete app-shell manifest.
  return caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS));
}

// Cache all assets on install
self.addEventListener("install", (e) => {
  e.waitUntil(cacheAssets().then(() => self.skipWaiting()));
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

self.addEventListener("message", (e) => {
  if (e.data?.type !== REFRESH_ASSETS_MESSAGE) return;

  // Refresh in place so the existing cache remains available while fetching.
  e.waitUntil(
    cacheAssets().catch((error) => {
      console.error("Failed to refresh cached assets:", error);
      throw error;
    }),
  );
});

async function offlineResponse(request) {
  const url = new URL(request.url);
  // Fall back only for app launches, not navigation to another uncached page.
  if (
    request.mode === "navigate" &&
    (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html"))
  ) {
    const appShell = await caches.match("./index.html");
    if (appShell) return appShell;
  }
  return new Response("", { status: 504 });
}

// Serve cached responses first, refill same-origin misses from the network,
// and return a controlled response when offline. Skip non-GET requests.
// When offline, never let a network fetch reject - that can surface iOS's
// "Turn Off Airplane Mode" prompt on PWA launch.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    (async () => {
      const cached = await caches.match(e.request);
      if (cached) return cached;
      if (!self.navigator.onLine) {
        return offlineResponse(e.request);
      }

      try {
        const response = await fetch(e.request);
        const url = new URL(e.request.url);
        // Refill evicted entries without caching cross-origin API responses.
        if (url.origin === self.location.origin && response.ok) {
          try {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(e.request, response.clone());
          } catch (error) {
            console.error("Failed to cache fetched asset:", error);
          }
        }
        return response;
      } catch {
        return offlineResponse(e.request);
      }
    })(),
  );
});
