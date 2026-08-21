/**
 * ATMOS Offline Intelligence Module
 * ----------------------------------
 * • Tracks every city the user searches
 * • Background-prefetches 16-day weather data for all saved cities when online
 * • Shows a live online/offline status bar at the top of the page
 * • Stores city list in localStorage; uses Service Worker for actual API caching
 */

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────
  const CITIES_KEY       = 'atmos_saved_cities';      // localStorage key
  const LAST_SYNC_KEY    = 'atmos_last_sync';
  const SYNC_INTERVAL_MS = 30 * 60 * 1000;            // re-sync every 30 min
  const MAX_CITIES       = 50;

  // Open-Meteo forecast URL template (16 days, same params as the React app)
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
    // city = { name, lat, lon }
    if (!city || city.lat == null || city.lon == null) return;
    let list = getCities();
    const exists = list.some((c) => Math.abs(c.lat - city.lat) < 0.01 && Math.abs(c.lon - city.lon) < 0.01);
    if (!exists) {
      list.unshift(city);
      if (list.length > MAX_CITIES) list = list.slice(0, MAX_CITIES);
      saveCities(list);
      prefetchCity(city);   // immediately prefetch when a new city is added
    }
  }

  // ── Prefetch helpers ───────────────────────────────────────────────────────
  function getPrefetchUrls(cities) {
    return cities.map((c) => makeWeatherUrl(c.lat, c.lon));
  }

  function prefetchCity(city) {
    if (!navigator.onLine) return;
    const url = makeWeatherUrl(city.lat, city.lon);
    sendSWMessage({ type: 'PREFETCH_WEATHER', urls: [url] });
  }

  function prefetchAll() {
    if (!navigator.onLine) return;
    const cities = getCities();
    if (!cities.length) return;
    const urls = getPrefetchUrls(cities);
    sendSWMessage({ type: 'PREFETCH_WEATHER', urls });
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    setStatus('syncing');
  }

  function sendSWMessage(msg) {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(msg);
    }
  }

  // ── Listen for SW messages ─────────────────────────────────────────────────
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, fetched, total } = event.data || {};
      if (type === 'PREFETCH_DONE') {
        setStatus(navigator.onLine ? 'online' : 'offline');
        showToast(`✓ Weather data synced for ${fetched}/${total} cities`);
      }
      if (type === 'WEATHER_CACHED') {
        // individual cache confirmation - silent
      }
    });
  }

  // ── Intercept city searches by monkey-patching fetch ──────────────────────
  // The React app calls H6({ lat, lon }) which internally calls open-meteo.
  // We intercept fetch() for the open-meteo forecast endpoint and extract lat/lon.
  const _originalFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
    if (url.includes('api.open-meteo.com/v1/forecast')) {
      try {
        const u = new URL(url);
        const lat  = parseFloat(u.searchParams.get('latitude'));
        const lon  = parseFloat(u.searchParams.get('longitude'));
        if (!isNaN(lat) && !isNaN(lon)) {
          // Derive a name from nearby known city or use coords as fallback
          const name = u.searchParams.get('city') || `${lat.toFixed(2)},${lon.toFixed(2)}`;
          addCity({ name, lat, lon });
        }
      } catch { /* ignore */ }
    }
    return _originalFetch.apply(this, arguments);
  };

  // ── Status Bar UI ─────────────────────────────────────────────────────────
  let statusBar, statusDot, statusText, syncBtn, cityCount;
  let currentStatus = 'online';

  function createStatusBar() {
    const bar = document.createElement('div');
    bar.id = 'atmos-status-bar';
    bar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 36px;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      transition: background 0.4s ease, opacity 0.4s ease;
      background: rgba(5,5,5,0.85);
    `;

    // Left: dot + status
    const left = document.createElement('div');
    left.style.cssText = 'display:flex;align-items:center;gap:8px;';

    const dot = document.createElement('span');
    dot.style.cssText = `
      width: 7px; height: 7px;
      border-radius: 50%;
      display: inline-block;
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e;
      transition: all 0.4s ease;
    `;

    const text = document.createElement('span');
    text.style.color = 'rgba(255,255,255,0.5)';
    text.textContent = 'ONLINE · DATA LIVE';

    left.appendChild(dot);
    left.appendChild(text);

    // Center: city count badge
    const badge = document.createElement('span');
    badge.style.cssText = `
      background: rgba(242,125,38,0.12);
      border: 1px solid rgba(242,125,38,0.25);
      color: rgba(242,125,38,0.8);
      border-radius: 20px;
      padding: 2px 10px;
      font-size: 10px;
      letter-spacing: 0.1em;
      cursor: default;
      transition: opacity 0.3s;
    `;
    badge.title = 'Cities with offline weather data cached';

    // Right: sync button
    const btn = document.createElement('button');
    btn.style.cssText = `
      background: transparent;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      color: rgba(255,255,255,0.4);
      font-size: 10px;
      font-family: inherit;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 3px 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    btn.textContent = 'SYNC NOW';
    btn.title = 'Refresh offline weather cache for all saved cities';
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255,255,255,0.08)';
      btn.style.color       = 'rgba(255,255,255,0.8)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.color      = 'rgba(255,255,255,0.4)';
    });
    btn.addEventListener('click', () => {
      if (!navigator.onLine) {
        showToast('✕ Cannot sync while offline');
        return;
      }
      prefetchAll();
    });

    bar.appendChild(left);
    bar.appendChild(badge);
    bar.appendChild(btn);
    document.body.insertBefore(bar, document.body.firstChild);

    // Pad the root element so content isn't hidden behind the bar
    const root = document.getElementById('root');
    if (root) root.style.paddingTop = '36px';

    statusBar  = bar;
    statusDot  = dot;
    statusText = text;
    syncBtn    = btn;
    cityCount  = badge;

    updateCityBadge();
  }

  function updateCityBadge() {
    const cities = getCities();
    const n = cities.length;
    if (cityCount) {
      cityCount.textContent = n > 0 ? `${n} CITIES CACHED` : 'NO CITIES CACHED';
      cityCount.style.opacity = n > 0 ? '1' : '0.4';
    }
  }

  function setStatus(status) {
    currentStatus = status;
    if (!statusBar) return;

    const configs = {
      online: {
        barBg:    'rgba(5,5,5,0.85)',
        dotColor: '#22c55e',
        dotGlow:  '#22c55e',
        text:     'ONLINE · DATA LIVE',
        btnShow:  true,
      },
      offline: {
        barBg:    'rgba(20,5,5,0.92)',
        dotColor: '#ef4444',
        dotGlow:  '#ef4444',
        text:     'OFFLINE · SHOWING CACHED DATA',
        btnShow:  false,
      },
      syncing: {
        barBg:    'rgba(5,5,5,0.85)',
        dotColor: '#f59e0b',
        dotGlow:  '#f59e0b',
        text:     'SYNCING WEATHER DATA…',
        btnShow:  false,
      },
    };

    const cfg = configs[status] || configs.online;
    statusBar.style.background  = cfg.barBg;
    statusDot.style.background  = cfg.dotColor;
    statusDot.style.boxShadow   = `0 0 8px ${cfg.dotGlow}`;
    statusText.textContent      = cfg.text;
    syncBtn.style.display       = cfg.btnShow ? 'inline-block' : 'none';

    if (status === 'syncing') {
      statusDot.style.animation = 'atmos-pulse 1s infinite';
    } else {
      statusDot.style.animation = '';
    }

    updateCityBadge();
  }

  // ── Toast notification ─────────────────────────────────────────────────────
  function showToast(msg, duration = 3000) {
    const existing = document.getElementById('atmos-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'atmos-toast';
    toast.style.cssText = `
      position: fixed;
      top: 46px;
      left: 50%;
      transform: translateX(-50%) translateY(-10px);
      background: rgba(20,20,20,0.95);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: rgba(255,255,255,0.85);
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
      padding: 10px 20px;
      z-index: 10000;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
      opacity: 0;
      transition: opacity 0.3s ease, transform 0.3s ease;
      white-space: nowrap;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity   = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateX(-50%) translateY(-10px)';
      setTimeout(() => toast.remove(), 350);
    }, duration);
  }

  // ── Inject keyframe animation ──────────────────────────────────────────────
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes atmos-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%       { opacity: 0.5; transform: scale(0.8); }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Online / offline event listeners ──────────────────────────────────────
  window.addEventListener('online', () => {
    setStatus('online');
    showToast('✓ Back online — syncing weather cache…');
    setTimeout(prefetchAll, 1500);   // small delay so page settles
  });

  window.addEventListener('offline', () => {
    setStatus('offline');
    showToast('⚡ You are offline — showing cached data', 5000);
  });

  // ── Auto-sync on page load / visibility restore ────────────────────────────
  function maybeSyncOnLoad() {
    if (!navigator.onLine) return;
    const lastSync = parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0', 10);
    if (Date.now() - lastSync > SYNC_INTERVAL_MS) {
      setTimeout(prefetchAll, 3000);   // 3 s delay after page load
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') maybeSyncOnLoad();
  });

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    createStatusBar();

    // Set initial status based on current network state
    setStatus(navigator.onLine ? 'online' : 'offline');

    // Sync on first load if stale
    maybeSyncOnLoad();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
