// ── VBT Push Notification Handler ─────────────────────────────────────
// This file is imported by the Workbox-generated service worker via
// importScripts() in vite.config.js. It adds push + notificationclick
// event handlers without interfering with Workbox caching logic.
// ──────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try { data = event.data.json(); }
    catch (e) { data = { title: event.data.text() }; }
  }

  const title = data.title || 'VBT Sports Camp 🏐';
  const body  = data.body  ||
                (data.notification && data.notification.body) ||
                'New update from VBT Sports Camp!';

  // Keep options minimal for maximum iOS compatibility
  const options = {
    body,
    icon : '/vbt-icon-192.png',
    badge: '/vbt-icon-192.png',
    tag  : 'vbt-' + Date.now(),
    data : { url: (data.data && data.data.url) || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        const match = windowClients.find(c => c.url.includes(url) && 'focus' in c);
        if (match) return match.focus();
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
