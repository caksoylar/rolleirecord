const CACHE_NAME = 'rolleirecord-v9';
const ASSETS = [
  './',
  './index.html',
  './icons.svg',
  './styles.css',
  './assets/site.webmanifest',
  './assets/favicon.svg',
  './assets/favicon.ico',
  './assets/favicon-96x96.png',
  './assets/apple-touch-icon.png',
  './assets/web-app-manifest-192x192.png',
  './assets/web-app-manifest-512x512.png',
  './src/app.js',
  './src/config.js',
  './src/data.js',
  './src/entities.js',
  './src/entity-modal.js',
  './src/exif.js',
  './src/export.js',
  './src/frame.js',
  './src/options.js',
  './src/rolls.js',
  './src/selectors.js',
  './src/table.js',
];

// Cache all assets on install
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

// Remove old caches on activate
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first, fallback to network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
