/* Офлайн-кэш веб-версии: после первого открытия прототип работает без интернета. */
const CACHE = 'ys-v1';
const FILES = [
  './', 'index.html', 'styles.css', 'icons.js', 'data.js', 'map.js', 'app.js', 'manifest.webmanifest',
  'assets/icon.png', 'assets/icon-192.png', 'assets/apple-touch-icon.png',
  ...[400, 500, 600, 700].flatMap((w) => [`fonts/inter-cyrillic-${w}-normal.woff2`, `fonts/inter-latin-${w}-normal.woff2`]),
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Сначала сеть (чтобы обновления доходили сразу), без сети — кэш.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request)
    .then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
