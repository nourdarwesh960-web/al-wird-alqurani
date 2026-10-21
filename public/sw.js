// وردك — Service Worker for Offline PWA and Background Notifications
const CACHE_NAME = 'wirdak-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Wirdak: Assets caching partial failure', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Cache with network fallback
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  // Skip cross-origin audio streams from being cached fully in CacheStorage
  if (event.request.url.includes('everyayah.com')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Background Push Notification handling
self.addEventListener('push', (event) => {
  let data = {
    title: 'تذكير وِرْدك اليومي 📖',
    body: 'حان الآن موعد وِردك اليومي من القرآن الكريم.. افتح المصحف واقرأ ما تيسر.',
    icon: '/logo.svg',
    badge: '/logo.svg'
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.svg',
    badge: data.badge || '/logo.svg',
    vibrate: [200, 100, 200],
    data: { url: '/' },
    actions: [
      { action: 'open', title: 'افتح المصحف' },
      { action: 'close', title: 'لاحقاً' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
