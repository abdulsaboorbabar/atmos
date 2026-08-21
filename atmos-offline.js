/**
 * ATMOS Offline Intelligence Module
 * ----------------------------------
 * • Tracks every city the user searches
 * • Background-prefetches 16-day weather data for all saved cities when online
 * • Shows a single small dot: green = online, red = offline
 * • All sync/cache activity is completely silent in the background
 */

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────
  const CITIES_KEY       = 'atmos_saved_cities';
  const LAST_SYNC_KEY    = 'atmos_last_sync';
  const SYNC_INTERVAL_MS = 30 * 60 * 1000;   // re-sync every 30 min
  const MAX_CITIES       = 50;

  const makeWeatherUrl = (lat, lon) =>
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current_weather=true` +
    `&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,` +
    `weather_code,apparent_temperature,visibility,pressure_msl,precipitation_probability,` +
    `wind_direction_10m,wind_gusts_10m,uv_index,cloud_cover,dew_point_2m` +
    `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,` +
    `apparent_temperature_min,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset,` +
    `uv_index_max,precipitation_probability_max,precipitation_sum,weather_code` +
    `&timezone=auto&forecast_days=16`;

  // ── City store helpers ─────────────────────────────────────────────────────
  function getCities() {
    try { return JSON.parse(localStorage.getItem(CITIES_KEY) || '[]'); }
    catch { return []; }
  }

  function saveCities(list) {
    try { localStorage.setItem(CITIES_KEY, JSON.stringify(list)); }
    catch { /* quota exceeded */ }
  }

  function addCity(city) {
    if (!city || city.lat == null || city.lon == null) return;
    let list = getCities();
    const exists = list.some(
      (c) => Math.abs(c.lat - city.lat) < 0.01 && Math.abs(c.lon - city.lon) < 0.01
    );
    if (!exists) {
      list.unshift(city);
      if (list.length > MAX_CITIES) list = list.slice(0, MAX_CITIES);
      saveCities(list);
      prefetchCity(city);
    }
  }

  // ── Prefetch helpers ───────────────────────────────────────────────────────
  function prefetchCity(city) {
    if (!navigator.onLine) return;
    sendSWMessage({ type: 'PREFETCH_WEATHER', urls: [makeWeatherUrl(city.lat, city.lon)] });
  }

  function prefetchAll() {
    if (!navigator.onLine) return;
    const cities = getCities();
    if (!cities.length) return;
    sendSWMessage({ type: 'PREFETCH_WEATHER', urls: cities.map((c) => makeWeatherUrl(c.lat, c.lon)) });
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  }

  function sendSWMessage(msg) {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(msg);
    }
  }

  // ── Intercept weather fetch to track cities ────────────────────────────────
  const _originalFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input
              : (input instanceof Request ? input.url : String(input));
    if (url.includes('api.open-meteo.com/v1/forecast')) {
      try {
        const u   = new URL(url);
        const lat = parseFloat(u.searchParams.get('latitude'));
        const lon = parseFloat(u.searchParams.get('longitude'));
        if (!isNaN(lat) && !isNaN(lon)) {
          addCity({ name: `${lat.toFixed(2)},${lon.toFixed(2)}`, lat, lon });
        }
      } catch { /* ignore */ }
    }
    return _originalFetch.apply(this, arguments);
  };

  // ── Status Dot UI ──────────────────────────────────────────────────────────
  let dot;

  function createDot() {
    dot = document.createElement('div');
    dot.id = 'atmos-status-dot';
    dot.title = 'Online';
    dot.style.cssText = `
      position: fixed;
      top: 12px;
      right: 14px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e, 0 0 12px rgba(34,197,94,0.4);
      z-index: 99999;
      pointer-events: none;
      transition: background 0.4s ease, box-shadow 0.4s ease;
    `;
    document.body.appendChild(dot);
  }

  function setDot(online) {
    if (!dot) return;
    if (online) {
      dot.style.background  = '#22c55e';
      dot.style.boxShadow   = '0 0 6px #22c55e, 0 0 12px rgba(34,197,94,0.4)';
      dot.title = 'Online';
    } else {
      dot.style.background  = '#ef4444';
      dot.style.boxShadow   = '0 0 6px #ef4444, 0 0 12px rgba(239,68,68,0.4)';
      dot.title = 'Offline – showing cached data';
    }
  }

  // ── Network event listeners ────────────────────────────────────────────────
  window.addEventListener('online',  () => { setDot(true);  setTimeout(prefetchAll, 1500); });
  window.addEventListener('offline', () => { setDot(false); });

  // ── Auto-sync on page load / tab focus ────────────────────────────────────
  function maybeSyncOnLoad() {
    if (!navigator.onLine) return;
    const lastSync = parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0', 10);
    if (Date.now() - lastSync > SYNC_INTERVAL_MS) {
      setTimeout(prefetchAll, 3000);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') maybeSyncOnLoad();
  });

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    createDot();
    setDot(navigator.onLine);
    maybeSyncOnLoad();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
