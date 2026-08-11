const CACHE = 'mi-mundo-v2';
const FILES = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

// Estrategia: intenta primero la red (para tener siempre lo último),
// y solo usa la copia guardada si no hay internet.
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).then(r => {
      var copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
  );
});
