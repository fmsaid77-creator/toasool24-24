// Service Worker for Tawasol 24 PWA
const CACHE_NAME = 'tawasol24-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through all API and WebSocket requests
  if (event.request.url.includes('/api/') || event.request.url.includes('/ws')) {
    return;
  }
  // Network first for all resources
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
