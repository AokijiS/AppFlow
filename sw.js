const CACHE_NAME = 'morning-dashboard-v4';
const ASSETS = [
  './index.html','./manifest.json',
  './assets/icon-192.png','./assets/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

// Background Sync
self.addEventListener('sync', e => {
  if (e.tag === 'refresh-data') {
    e.waitUntil(Promise.all([
      fetchAndCache('https://api.open-meteo.com/v1/forecast?latitude=50.6942&longitude=3.1746&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=sunrise,sunset&timezone=Europe%2FParis', 'weather-cache'),
      fetchAndCache('https://api.spaceflightnewsapi.net/v4/articles/?limit=4', 'news-cache')
    ]));
  }
});
// Periodic Background Sync
self.addEventListener('periodicsync', e => {
  if (e.tag === 'morning-refresh') {
    e.waitUntil(Promise.all([
      fetchAndCache('https://api.open-meteo.com/v1/forecast?latitude=50.6942&longitude=3.1746&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=sunrise,sunset&timezone=Europe%2FParis', 'weather-cache'),
      fetchAndCache('https://api.spaceflightnewsapi.net/v4/articles/?limit=4', 'news-cache')
    ]));
  }
});

async function fetchAndCache(url, key) {
  try {
    const res = await fetch(url);
    const cache = await caches.open(CACHE_NAME);
    await cache.put(key, res.clone());
    return res;
  } catch(e) { return null; }
}

self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay=0, tag='morning', icon, badge } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body, tag,
        icon: icon || './assets/icon-192.png',
        badge: badge || './assets/icon-192.png',
        data: { url: './index.html' }
      });
    }, delay);
  }
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('./index.html'));
});
