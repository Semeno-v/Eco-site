/* =====================================================
   EcoGroup Service Worker
   Strategy: Cache-first for assets, Network-first for navigation.
   Offline fallback: /404.html
   ===================================================== */

const CACHE  = 'eco-v3';
const OFFLINE = '/404.html';

const PRECACHE = [
  '/',
  '/index.html',
  '/404.html',
  '/css/main.css',
  '/js/top.js',
  '/img/main.webp',
  '/img/main.png',
  '/img/Video.webp',
  '/img/item_1.webp',
  '/img/item_1.png',
  '/img/item_2.webp',
  '/img/item_2.png',
  '/img/item_3.webp',
  '/img/item_3.png',
  '/img/illustration/illustration_1.webp',
  '/img/illustration/illustration_1.png',
  '/img/illustration/illustration_2.webp',
  '/img/illustration/illustration_2.png',
  '/img/illustration/illustration_3.webp',
  '/img/illustration/illustration_3.png',
  '/img/illustration/illustration_4.webp',
  '/img/illustration/illustration_4.png',
  '/img/illustration/illustration_5.webp',
  '/img/illustration/illustration_5.png',
  '/img/illustration/illustration_6.webp',
  '/img/illustration/illustration_6.png',
  '/img/illustration/ecology_1.webp',
  '/img/illustration/ecology_1.png',
  '/img/trash/trash_can_1.webp',
  '/img/trash/trash_can_1.png',
  '/img/trash/trash_can_2.webp',
  '/img/trash/trash_can_2.png',
  '/img/trash/trash_can_4.webp',
  '/img/trash/trash_can_4.png',
  '/img/trash/trash_can_5.webp',
  '/img/trash/trash_can_5.png',
];

/* ── Install: precache critical assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: remove old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  if (request.mode === 'navigate') {
    // Navigation: network-first, offline fallback
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE))
    );
  } else {
    // Assets: cache-first, then network
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          // Cache successful GET responses
          if (response.ok && request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return response;
        });
      }).catch(() => {
        // Image fallback — return nothing (browser shows alt text)
        if (request.destination === 'image') {
          return new Response('', { status: 404 });
        }
      })
    );
  }
});
