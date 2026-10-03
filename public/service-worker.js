/*
 * Dependency-free PWA worker. It deliberately caches only application shell
 * files and safe static assets; authenticated and connector API responses are
 * always fetched from the network and are never persisted by the worker.
 */
const CACHE_NAME = 'spec-kit-studio-shell-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './pwa-icon-192.png', './pwa-icon-512.png', './pwa-maskable-icon-512.png', './pwa-icon.svg', './pwa-maskable-icon.svg'];
const STATIC_DESTINATIONS = new Set(['script', 'style', 'image', 'font', 'worker']);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith('spec-kit-studio-shell-') && key !== CACHE_NAME)
    .map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) void caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    return response;
  }));
}

self.addEventListener('fetch', (event) => {
  const {request} = event;
  if (request.method !== 'GET' || !isSameOrigin(request)) return;

  const url = new URL(request.url);
  // Never cache API calls, downloads, or anything callers explicitly mark as private.
  if (url.pathname.includes('/api/') || url.pathname.includes('/downloads/') || request.cache === 'no-store') return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) void caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', response.clone()));
      return response;
    }).catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html'))));
    return;
  }
  if (STATIC_DESTINATIONS.has(request.destination)) event.respondWith(cacheFirst(request));
});
