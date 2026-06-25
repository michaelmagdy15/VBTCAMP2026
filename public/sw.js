const CACHE_NAME = 'vbt-sports-camp-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/Final VBT Re-Branding 2026-02 (3).png',
  '/image1.png',
  '/image2.jpg',
  '/manifest.json',
  '/icons.svg'
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

  // Bypass Firebase / Firestore / WebSockets / non-HTTP requests
  const isFirebase = url.hostname.includes('firebase') || url.hostname.includes('googleapis') || url.pathname.includes('firestore');
  const isWebSocket = event.request.headers.get('Upgrade') === 'websocket';
  const isHttp = url.protocol === 'http:' || url.protocol === 'https:';

  if (!isHttp || isFirebase || isWebSocket || event.request.method !== 'GET') {
    return; // Let browser handle it normally
  }

  // Network-first strategy for same-origin requests
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If response is valid, clone it and save to cache
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try to get it from cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If it's a navigation request, we can fallback to index.html for SPA behavior
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Offline and not cached', {
              status: 503,
              statusText: 'Service Unavailable'
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
    icon: '/Final VBT Re-Branding 2026-02 (3).png',
    badge: '/favicon.svg',
    data: data.url || 
          (data.data && data.data.url) || 
          (data.notification && data.notification.click_action) || 
          '/'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
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
