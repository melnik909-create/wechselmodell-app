const CACHE_NAME = 'wechselplaner-v3';

// Assets to cache on install
const PRECACHE_URLS = [
  '/',
];

// Install: precache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: rewrite @-scoped font paths + network-first cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Rewrite @expo font paths to /fonts/ directory
  if (url.pathname.includes('@expo') && url.pathname.endsWith('.ttf')) {
    const fontFilename = url.pathname.split('/').pop();
    const newUrl = new URL('/fonts/' + fontFilename, url.origin);
    event.respondWith(fetch(newUrl));
    return;
  }

  // Skip non-GET and Supabase API requests
  if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
