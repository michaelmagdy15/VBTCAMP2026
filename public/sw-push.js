// ── VBT Push Notification Handler ─────────────────────────────────────
// Imported by the Workbox-generated service worker via importScripts().
// ──────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try { data = event.data.json(); }
    catch (e) { data = { title: event.data.text() }; }
  }

  const title    = data.title || 'VBT SERVICE';
  const body     = data.body  ||
                   (data.notification && data.notification.body) ||
                   'New update from VBT Sports Camp!';
  const type     = (data.data && data.data.type) || 'announcement';
  const isUrgent = type === 'urgent' || type === 'ping';

  // Urgent alerts: aggressive vibration + stay on screen
  const options = isUrgent
    ? {
        body,
        icon            : '/vbt-icon-192.png',
        badge           : '/vbt-icon-192.png',
        tag             : 'vbt-urgent',          // replaces previous urgent banner
        renotify        : true,
        requireInteraction: true,                // stays on screen until dismissed
        vibrate         : [300,100,300,100,500,100,500,100,800], // long escalating buzz
        data            : { url: (data.data && data.data.url) || '/', type },
      }
    : {
        body,
        icon  : '/vbt-icon-192.png',
        badge : '/vbt-icon-192.png',
        tag   : 'vbt-' + Date.now(),
        data  : { url: (data.data && data.data.url) || '/', type },
      };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // If the app is open in the background, tell it to play the urgent sound
      if (isUrgent) {
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then(clients => clients.forEach(c => c.postMessage({ type: 'PLAY_URGENT_SOUND' })));
      }
    })
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
