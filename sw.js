const CACHE = 'sportforma-v8';
const PARTS = Array.from({ length: 7 }, (_, index) => `./app-parts/part${String(index).padStart(2, '0')}.txt`);
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=8',
  './library-media.css?v=8',
  './loader.js?v=8',
  './library-media-patch.js',
  './manifest.webmanifest',
  './assets/icon.svg',
  ...PARTS
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (_) {
    return (await cache.match(request)) || (request.mode === 'navigate' ? cache.match('./index.html') : Response.error());
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.origin === self.location.origin) {
    const freshFiles = event.request.mode === 'navigate' ||
      url.pathname.endsWith('/loader.js') ||
      url.pathname.endsWith('/library-media-patch.js') ||
      url.pathname.includes('/app-parts/');

    if (freshFiles) {
      event.respondWith(networkFirst(event.request));
      return;
    }

    event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    })));
    return;
  }

  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
    return response;
  }).catch(() => caches.match(event.request)));
});