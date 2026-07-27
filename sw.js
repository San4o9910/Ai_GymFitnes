const CACHE = 'sportforma-v2';
const PARTS = Array.from({ length: 7 }, (_, index) => `./app-parts/part${String(index).padStart(2, '0')}.txt`);
const ASSETS = ['./','./index.html','./styles.css','./loader.js','./manifest.webmanifest','./assets/icon.svg', ...PARTS];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(res => {
    const clone = res.clone();
    caches.open(CACHE).then(c => c.put(event.request, clone));
    return res;
  }).catch(() => caches.match('./index.html'))));
});
