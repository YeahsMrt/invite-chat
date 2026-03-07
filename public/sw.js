const CACHE_NAME = 'invite-chat-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/client.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', event => {
  // Skip caching for socket.io requests - always fetch from server
  if (event.request.url.includes('/socket.io/')) {
    return event.respondWith(fetch(event.request).catch(() => {
      // If fetch fails, return a network error response
      return new Response('Network error', { status: 503 });
    }));
  }
  
  // Normal cache strategy for other assets
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
