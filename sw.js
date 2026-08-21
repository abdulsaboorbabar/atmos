const CACHE_NAME = 'atmos-cache-v2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/assets/index-DuwN7aB6.js',
  '/assets/index-CqP0rmqg.css',
  '/icon.png',
  '/manifest.json',
  '/robots.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Skip caching for non-GET requests, API requests, and third-party maps/weather APIs
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('open-meteo.com') ||
    event.request.url.includes('nasa.gov') ||
    event.request.url.includes('openstreetmap.org') ||
    event.request.url.includes('/api.')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback strategy for offline support
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If a document request fails and is not in cache, fallback to index.html (SPA shell)
          if (event.request.destination === 'document') {
            return caches.match('/index.html') || caches.match('/');
          }
        });
      })
  );
});
