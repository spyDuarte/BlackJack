const CACHE_NAME = 'blackjack-premium-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/src/main.js',
    '/src/core/GameManager.js',
    '/src/core/Deck.js',
    '/src/core/Constants.js',
    '/src/ui/UIManager.js',
    '/src/utils/SoundManager.js',
    '/src/utils/StorageManager.js',
    '/src/utils/HandUtils.js',
    '/src/utils/debounce.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).then((response) => {
                if (response.ok && event.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            });
        }).catch(() => {
            if (event.request.destination === 'document') {
                return caches.match('/index.html');
            }
        })
    );
});
