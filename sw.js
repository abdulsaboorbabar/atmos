// ============================================================
// ATMOS Service Worker v4
// - Shell asset pre-caching (install phase)
// - Stale-while-revalidate for static assets
// - Network-first with 15-day cache for weather APIs
// - Offline document fallback to /index.html
// - v4: force cache bust to evict stale banner from PWA installs
// ============================================================

const SHELL_CACHE   = 'atmos-shell-v4';
const WEATHER_CACHE = 'atmos-weather-v4';

// ---- Assets to pre-cache on install ----
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/atmos-offline.js',
  '/assets/index-DuwN7aB6.js',
  '/assets/index-CqP0rmqg.css',
  '/icon.png',
  '/manifest.json',
];

// ---- Max age for cached weather API responses (15 days in ms) ----
const WEATHER_MAX_AGE_MS = 15 * 24 * 60 * 60 * 1000;

// ---- API hosts whose responses should be weather-cached ----
const WEATHER_API_HOSTS = [
  'api.open-meteo.com',
  'archive-api.open-meteo.com',
];

// ============================================================
// INSTALL
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// ACTIVATE - clean up old caches
// ============================================================
self.addEventListener('activate', (event) => {
  const validCaches = [SHELL_CACHE, WEATHER_CACHE];
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => !validCaches.includes(n))
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH
// ============================================================
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ---- Weather API: Network-first, fallback to cache ----
  if (WEATHER_API_HOSTS.some((h) => url.hostname === h)) {
    event.respondWith(weatherNetworkFirst(event.request));
    return;
  }

  // ---- Shell / static assets: Cache-first, fallback to network ----
  if (url.origin === self.location.origin) {
    event.respondWith(shellCacheFirst(event.request));
    return;
  }

  // ---- Everything else: pass-through ----
});

// ============================================================
// Strategy: network-first with timestamp-aware cache for weather
// ============================================================
async function weatherNetworkFirst(request) {
  const cache = await caches.open(WEATHER_CACHE);
  try {
    const networkResponse = await fetch(request.clone());
    if (networkResponse && networkResponse.status === 200) {
      // Store with timestamp header
      const body = await networkResponse.clone().arrayBuffer();
      const headers = new Headers(networkResponse.headers);
      headers.set('sw-cached-at', Date.now().toString());
      const cachedResponse = new Response(body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers,
      });
      await cache.put(request, cachedResponse);

      // Notify clients that new data is available
      const clients = await self.clients.matchAll();
      clients.forEach((client) => client.postMessage({ type: 'WEATHER_CACHED', url: request.url }));
    }
    return networkResponse;
  } catch {
    // Offline - try cache
    const cached = await cache.match(request);
    if (cached) {
      const cachedAt = parseInt(cached.headers.get('sw-cached-at') || '0', 10);
      const age = Date.now() - cachedAt;
      if (age < WEATHER_MAX_AGE_MS) {
        // Tag the response so the app knows it's stale
        const body = await cached.clone().arrayBuffer();
        const headers = new Headers(cached.headers);
        headers.set('sw-offline', 'true');
        headers.set('sw-cached-age-hours', Math.round(age / 3600000).toString());
        return new Response(body, {
          status: cached.status,
          statusText: cached.statusText,
          headers,
        });
      }
    }
    // No valid cache - let the app handle the error
    return new Response(JSON.stringify({ error: 'offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'sw-offline': 'true' },
    });
  }
}

// ============================================================
// Strategy: cache-first for shell assets
// ============================================================
async function shellCacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // For navigation requests, serve the SPA shell
    if (request.destination === 'document') {
      return cache.match('/index.html') || cache.match('/');
    }
    throw new Error('Network error and no cache available');
  }
}

// ============================================================
// MESSAGE HANDLER - for background prefetch commands from the app
// ============================================================
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'PREFETCH_WEATHER') {
    const { urls } = event.data;
    if (!Array.isArray(urls)) return;

    const cache = await caches.open(WEATHER_CACHE);
    let fetched = 0;

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response && response.status === 200) {
          const body = await response.clone().arrayBuffer();
          const headers = new Headers(response.headers);
          headers.set('sw-cached-at', Date.now().toString());
          const cachedResponse = new Response(body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
          await cache.put(new Request(url), cachedResponse);
          fetched++;
        }
      } catch {
        // Skip failed fetches silently
      }
    }

    // Notify the client that prefetch is done
    const clients = await self.clients.matchAll();
    clients.forEach((client) =>
      client.postMessage({ type: 'PREFETCH_DONE', fetched, total: urls.length })
    );
  }
});
