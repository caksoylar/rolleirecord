const CACHE_NAME = 'rolleirecord-v16';
const ASSETS = [
  './',
  './index.html',
  './entity-editor.html',
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
  './src/entity-editor.js',
  './src/exif.js',
  './src/export.js',
  './src/frame.js',
  './src/rolls.js',
  './src/selectors.js',
  './src/table.js',
];

// Cache all assets on install
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Remove old caches on activate
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first, fallback to network; skip non-GET requests
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request)).catch(() => caches.match('./index.html'))
  );
});
