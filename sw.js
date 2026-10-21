// Service Worker: hält die App für die Offline-Nutzung im Zwischenspeicher.
// Mit Internet wird immer die neueste Version geladen, ohne Internet die gespeicherte.
// Bei Änderungen an der Dateiliste VERSION erhöhen.
const VERSION = 'befunde-v2';
const DATEIEN = [
  './', './index.html', './manifest.json', './icon-180.png', './icon-512.png',
  './normwerte.js',
  './CIDP/', './CIDP/index.html', './CIDP/logik.js',
  './GBS/', './GBS/index.html', './GBS/logik.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((namen) => Promise.all(namen.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((antwort) => {
        const kopie = antwort.clone();
        caches.open(VERSION).then((c) => c.put(e.request, kopie));
        return antwort;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
