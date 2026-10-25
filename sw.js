/**
 * Three Star - Service Worker (PWA)
 * Enables offline capability, faster caching, and installation on mobile devices
 */

const CACHE_NAME = 'threestar-cache-v6';
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/css/clay.css?v=v8',
    '/js/app.js?v=v9',
    '/manifest.json',
    '/site.webmanifest',
    '/assets/logo.png?v=v8',
    '/assets/icon-192.png?v=v8',
    '/assets/icon-512.png?v=v8',
    '/assets/apple-touch-icon.png?v=v8',
    '/assets/favicon.png?v=v8'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('[PWA SW] Precache partial error (non-fatal):', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const reqUrl = new URL(event.request.url);

    // Bypass API requests to network directly (do not cache dynamic backend API)
    if (reqUrl.pathname.startsWith('/api/')) {
        return;
    }

    // For navigation (HTML) or static files: try network first, fallback to cache
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});
