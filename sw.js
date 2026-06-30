const CACHE_NAME = 'morning-dashboard-v3';
const DATA_CACHE = 'morning-data-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=50.6942&longitude=3.1746&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=sunrise,sunset&timezone=Europe%2FParis';
const NEWS_URL = 'https://api.spaceflightnewsapi.net/v4/articles/?limit=4';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME && k !== DATA_CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── Helper: fetch + store JSON in data cache ──
async function refreshData() {
  const cache = await caches.open(DATA_CACHE);
  const results = { weather: false, news: false };

  try {
    const wRes = await fetch(WEATHER_URL);
    if (wRes.ok) {
      const body = await wRes.clone().text();
      await cache.put('weather-cache', new Response(body, {
        headers: { 'Content-Type': 'application/json', 'X-Cached-At': String(Date.now()) }
      }));
      results.weather = true;
    }
  } catch (e) { /* offline */ }

  try {
    const nRes = await fetch(NEWS_URL);
    if (nRes.ok) {
      const body = await nRes.clone().text();
      await cache.put('news-cache', new Response(body, {
        headers: { 'Content-Type': 'application/json', 'X-Cached-At': String(Date.now()) }
      }));
      results.news = true;
    }
  } catch (e) { /* offline */ }

  return results;
}

// ── Background Sync ──
self.addEventListener('sync', event => {
  if (event.tag === 'refresh-data') {
    event.waitUntil(refreshData());
  }
});

// ── Periodic Background Sync ──
self.addEventListener('periodicsync', event => {
  if (event.tag === 'morning-refresh') {
    event.waitUntil(
      refreshData().then(async (results) => {
        // Notify on meaningful updates if notifications granted
        if (self.registration.showNotification && (results.weather || results.news)) {
          // Only notify if there's something noteworthy; keep it light-touch
          // We avoid spamming: just a silent cache refresh, no notif here by default.
        }
      })
    );
  }
});

// ── Messages from page ──
self.addEventListener('message', event => {
  if (!event.data) return;
  const { type } = event.data;

  if (type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay = 0, tag = 'morning', icon, badge } = event.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        tag,
        icon: icon || './assets/icon-192.png',
        badge: badge || './assets/icon-192.png',
        data: { url: './index.html' }
      });
    }, delay);
  }

  if (type === 'CANCEL_NOTIFICATION') {
    const { tag } = event.data;
    self.registration.getNotifications({ tag }).then(notifications => {
      notifications.forEach(n => n.close());
    });
  }

  if (type === 'REQUEST_REFRESH') {
    event.waitUntil ? event.waitUntil(refreshData()) : refreshData();
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('./index.html'));
});
