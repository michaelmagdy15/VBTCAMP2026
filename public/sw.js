const CACHE_NAME = 'vbt-app-v8';
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

// IndexedDB helpers (duplicated from offlineQueue.js — SW can't import ES modules)
const IDB_NAME = 'vbt-offline-db';
const IDB_STORE = 'sync-queue';

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function idbGetAll() {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(id) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Force update immediately for all active devices
  self.skipWaiting();
});

// Activate Event — clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Audio files: cache-first with put on miss
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

  // Bypass Firebase / Firestore / WebSockets / non-HTTP / non-GET
  const isFirebase =
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.pathname.includes('firestore');
  const isWebSocket = event.request.headers.get('Upgrade') === 'websocket';
  const isHttp = url.protocol === 'http:' || url.protocol === 'https:';

  if (!isHttp || isFirebase || isWebSocket || event.request.method !== 'GET') {
    return;
  }

  // Stale-While-Revalidate for same-origin assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              console.log('[SW] Network fetch failed, using cache');
            });

          if (cachedResponse) {
            event.waitUntil(fetchPromise);
            return cachedResponse;
          }

          return fetchPromise.then((response) => {
            if (response) return response;
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Offline — not cached', { status: 503 });
          });
        })
      )
    );
  }
});

// Push Notification
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data = { title: event.data.text() }; }
  }

  const title = data.title ||
    (data.notification && data.notification.title) ||
    (data.data && data.data.title) ||
    'VBT Service';

  const options = {
    body: data.body ||
      (data.notification && data.notification.body) ||
      (data.data && data.data.body) ||
      'New update from VBT!',
    icon: '/Final%20VBT%20Re-Branding%202026-02%20(3).png',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200, 100, 300],
    tag: 'vbt-notification-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    data: data.url ||
      (data.data && data.data.url) ||
      (data.notification && data.notification.click_action) ||
      '/',
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      console.error('[SW] showNotification failed:', err);
      return self.registration.showNotification(title, {
        body: options.body,
        vibrate: [200, 100, 200],
        tag: 'vbt-fallback-' + Date.now(),
        renotify: true,
      });
    })
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const targetUrl = event.notification.data || '/';
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// Message — skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Background Sync — replay queued offline writes ───
self.addEventListener('sync', (event) => {
  if (event.tag === 'vbt-sync-queue') {
    event.waitUntil(replayQueue());
  }
});

async function replayQueue() {
  const items = await idbGetAll();
  if (!items.length) return;

  console.log('[SW] Replaying', items.length, 'queued writes');

  // Notify clients that sync is starting
  const allClients = await self.clients.matchAll();
  allClients.forEach(c => c.postMessage({ type: 'SYNC_START', count: items.length }));

  let synced = 0;
  for (const item of items) {
    try {
      // Notify the open app tab to perform the Firestore write
      // (The SW can't import Firestore SDK, so it delegates back to the page)
      const appClients = await self.clients.matchAll({ type: 'window' });
      if (appClients.length > 0) {
        appClients[0].postMessage({ type: 'REPLAY_WRITE', payload: item });
        // Wait a moment for the write to complete before moving on
        await new Promise(r => setTimeout(r, 300));
        await idbDelete(item.id);
        synced++;
      } else {
        // No open client — leave in queue for next time
        break;
      }
    } catch (err) {
      console.error('[SW] Failed to replay item', item.id, err);
    }
  }

  // Notify clients sync is done
  const doneClients = await self.clients.matchAll();
  doneClients.forEach(c => c.postMessage({ type: 'SYNC_DONE', synced }));
  console.log('[SW] Sync complete —', synced, 'writes replayed');
}
