const CACHE_NAME = 'morning-dashboard-v2';
const ASSETS = [
  './index.html',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'SCHEDULE_NOTIFICATION') return;
  const { title, body, delay = 0, tag = 'morning', icon, badge } = event.data;
  setTimeout(() => {
    self.registration.showNotification(title, {
      body,
      tag,
      icon,
      badge,
      data: { url: './index.html' }
    });
  }, delay);
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('./index.html'));
});