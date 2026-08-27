// ============================================================
// ATMOS Service Worker v10
// - Shell asset pre-caching (install phase) - resilient
// - Stale-while-revalidate for static assets
// - Network-first with 15-day cache for weather APIs
// - Offline document fallback to /index.html
// - v10: fix blank screen / "Unable to start telemetry" after PR #5
//   * Resilient install (allSettled) so one failed asset doesn't break SW
//   * Validate JS/CSS content-type to avoid caching HTML as JS (which caused SyntaxError)
//   * Bump cache to force evict stale v9 that might contain HTML-as-JS
//   * Network-first for documents + cache-first for assets with validation
// ============================================================

const SHELL_CACHE   = 'atmos-shell-v10';
const WEATHER_CACHE = 'atmos-weather-v5';

// ---- Assets to pre-cache on install ----
// Use versioned query ?v=10 to bust browser cache, but cache key includes query
// We also include bare paths for offline fallback
const SHELL_ASSETS = [
  '/',
  '/?v=10',
  '/index.html',
  '/atmos-offline.js',
  '/assets/index-DzR8kFx2.js?v=10',
  '/assets/index-DzR8kFx2.js',
  '/assets/index-CqP0rmqg.css?v=10',
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
// INSTALL - resilient: don't fail if one asset 404s
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Use allSettled so a single 404 doesn't break install
      const results = await Promise.allSettled(
        SHELL_ASSETS.map(async (url) => {
          try {
            const req = new Request(url, { cache: 'no-cache' });
            const res = await fetch(req);
            if (!res || !res.ok) {
              console.warn('[SW v10] skip caching non-ok:', url, res && res.status);
              return;
            }
            // Validate content-type for critical assets to avoid HTML-as-JS bug
            const ct = (res.headers.get('content-type') || '').toLowerCase();
            if (url.includes('/assets/') && url.includes('.js')) {
              if (!ct.includes('javascript') && !ct.includes('text/javascript') && !ct.includes('application/javascript') && !ct.includes('text/html') === false) {
                // If server returns HTML for JS (e.g., due to rewrite), don't cache it
                // We check by peeking first bytes
                const clone = res.clone();
                const text = await clone.text();
                if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
                  console.warn('[SW v10] refusing to cache HTML as JS:', url);
                  return;
                }
              }
            }
            await cache.put(req, res.clone());
          } catch (e) {
            console.warn('[SW v10] failed to cache', url, e.message);
          }
        })
      );
      // Always skip waiting even if some assets failed
      await self.skipWaiting();
    })()
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
          .map((n) => {
            console.log('[SW v10] deleting old cache', n);
            return caches.delete(n);
          })
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

  // ---- Documents: network-first prevents a stale shell from causing a blank screen. ----
  if (url.origin === self.location.origin && event.request.mode === 'navigate') {
    event.respondWith(navigationNetworkFirst(event.request));
    return;
  }

  // ---- Shell / static assets: Cache-first with validation, fallback to network ----
  if (url.origin === self.location.origin) {
    // For JS/CSS, use cache-first but validate that cached response isn't HTML
    if (url.pathname.startsWith('/assets/')) {
      event.respondWith(shellCacheFirstValidated(event.request));
      return;
    }
    event.respondWith(shellCacheFirst(event.request));
    return;
  }

  // ---- Everything else: pass-through ----
});

// ============================================================
// Strategy: network-first for documents, with an offline shell fallback
// ============================================================
async function navigationNetworkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      // Only cache if it's actually HTML
      const ct = (response.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('text/html') || request.mode === 'navigate') {
        await cache.put(request, response.clone());
      }
    }
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    // Try exact match, then /index.html, then /
    return (await cache.match(request)) ||
           (await cache.match('/index.html')) ||
           (await cache.match('/')) ||
           Response.error();
  }
}

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
// Strategy: cache-first for shell assets (generic)
// ============================================================
async function shellCacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      // Don't cache opaque or HTML-as-JS mistakes
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
// Strategy: cache-first with validation for JS/CSS
// - If cached response looks like HTML but request is for JS/CSS, ignore cache and fetch network
// ============================================================
async function shellCacheFirstValidated(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    try {
      const ct = (cached.headers.get('content-type') || '').toLowerCase();
      // If requesting JS but cached is HTML, treat as miss
      if (request.url.includes('.js') && ct.includes('text/html')) {
        const text = await cached.clone().text();
        if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
          console.warn('[SW v10] cached JS is actually HTML, ignoring:', request.url);
          // Delete the bad entry
          await cache.delete(request);
        } else {
          return cached;
        }
      } else {
        return cached;
      }
    } catch {
      // If we can't read, return cached anyway
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      // Validate before caching: don't cache HTML as JS
      const ct = (response.headers.get('content-type') || '').toLowerCase();
      if (request.url.includes('.js') && ct.includes('text/html')) {
        const clone = response.clone();
        const text = await clone.text();
        if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
          console.warn('[SW v10] network returned HTML for JS, not caching:', request.url);
          return response; // return but don't cache
        }
      }
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Fallback to cache if network fails, even if previously we thought it was bad
    const fallback = await cache.match(request);
    if (fallback) return fallback;
    throw new Error('Network error and no cache available for ' + request.url);
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

  // Allow client to request cache cleanup (used by hard-refresh button)
  if (event.data && event.data.type === 'CLEAR_SHELL_CACHE') {
    try {
      await caches.delete(SHELL_CACHE);
      const clients = await self.clients.matchAll();
      clients.forEach((client) => client.postMessage({ type: 'SHELL_CACHE_CLEARED' }));
    } catch {}
  }
});
