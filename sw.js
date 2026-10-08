// Water Game service worker: makes the game load instantly and play offline once installed.
// Bump VERSION whenever index.html (or any file below) changes, so players get the update.
const VERSION = 'v37';
const APP_CACHE = `watergame-app-${VERSION}`;
const FONT_CACHE = 'watergame-fonts';

const APP_SHELL = [
  './',
  './index.html',
  './js/analytics.js',
  './js/game.js',
  './js/habitats.js',
  './audio/spongebob-transition-short.mp3',
  './css/game.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((c) => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('watergame-app-') && k !== APP_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Authenticated pages and analytics must always go to the server.
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/')) return;

  // Google Fonts: serve from cache, refresh in the background
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        const net = fetch(req)
          .then((res) => {
            if (res.ok || res.type === 'opaque') {
              const copy = res.clone();
              cache.put(req, copy);
            }
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Page loads: network first so updates arrive, cached copy when offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(APP_CACHE).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Everything else from our own site: cache first
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
