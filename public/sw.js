const CACHE_NAME = 'vbt-sports-camp-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/Final VBT Re-Branding 2026-02 (3).png',
  '/manifest.json',
  '/icons.svg',
  // Sound files (Howler.js pre-loads these — cache for offline use)
  '/sounds/announcement.mp3',
  '/sounds/score.mp3',
  '/sounds/urgent.mp3',
  '/sounds/schedule.mp3',
  '/sounds/round_start.mp3',
  '/sounds/walkie.mp3',
  '/sounds/notification.mp3',
  '/sounds/success.mp3',
  '/sounds/error.mp3',
  '/sounds/countdown.mp3',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Range request passthrough for audio files (required for iOS audio buffering)
  // Pattern from: github.com/daffinm/audio-cache-test
  if (/\.(mp3|wav|webm|ogg|m4a|aac)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(async (cached) => {
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response && response.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      })
    );
    return;
  }

  // Bypass Firebase / Firestore / WebSockets / non-HTTP requests
  const isFirebase = url.hostname.includes('firebase') || url.hostname.includes('googleapis') || url.pathname.includes('firestore');
  const isWebSocket = event.request.headers.get('Upgrade') === 'websocket';
  const isHttp = url.protocol === 'http:' || url.protocol === 'https:';

  if (!isHttp || isFirebase || isWebSocket || event.request.method !== 'GET') {
    return; // Let browser handle it normally
  }

  // Stale-While-Revalidate strategy for same-origin requests
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch((error) => {
              console.log('[Service Worker] Fetch failed, relying on cache/fallback', error);
            });

          // Keep the Service Worker alive for the background fetch
          if (cachedResponse) {
            event.waitUntil(fetchPromise);
            return cachedResponse;
          }

          // If no cached response, wait for the network response
          return fetchPromise.then((response) => {
            if (response) return response;
            // Fallback if network also failed and no cache
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Offline and not cached', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        });
      })
    );
  }
});

// Push Event
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: event.data.text() };
    }
  }

  // Extract fields supporting custom Web Push formats, Firebase Cloud Messaging notification, or FCM data payloads
  const title = data.title || 
                (data.notification && data.notification.title) || 
                (data.data && data.data.title) || 
                'VBT Sports Camp';
                
  const options = {
    body: data.body || 
          (data.notification && data.notification.body) || 
          (data.data && data.data.body) || 
          'New update from VBT Sports Camp!',
    icon: '/Final%20VBT%20Re-Branding%202026-02%20(3).png',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200, 100, 300],
    tag: 'vbt-notification-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    data: data.url || 
          (data.data && data.data.url) || 
          (data.notification && data.notification.click_action) || 
          '/'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .catch((err) => {
        console.error('[Service Worker] showNotification failed, trying basic fallback:', err);
        return self.registration.showNotification(title, {
          body: options.body,
          vibrate: [200, 100, 200],
          tag: 'vbt-fallback-' + Date.now(),
          renotify: true
        });
      })
  );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const targetUrl = event.notification.data || '/';
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Message Event (to skip waiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background Sync Event
self.addEventListener('sync', (event) => {
  if (event.tag === 'vbt-offline-sync') {
    event.waitUntil(
      self.clients.matchAll().then((allClients) => {
        allClients.forEach((client) => {
          client.postMessage({ type: 'SYNC_READY' });
        });
      })
    );
  }
});
