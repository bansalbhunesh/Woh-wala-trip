// Yaarlore Service Worker — handles web push notifications
// and enables the PWA "add to home screen" capability.

const CACHE_NAME = 'yaarlore-v1';

// Install: cache the app shell for offline capability
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate: take control immediately
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// Push: display notification when push event received from server
self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Yaarlore', body: event.data.text() };
  }

  const title = data.title || 'Yaarlore';
  const options = {
    body: data.body || 'Something happened in your mythology.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'yaarlore-default',
    data: {
      url: data.url || '/',
      tripId: data.tripId || null,
    },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click: open the relevant URL
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = event.notification.data?.url || '/trips';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new tab
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
