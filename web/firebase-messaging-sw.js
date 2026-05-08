importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// skipWaiting activates this SW immediately on first install so getToken() works on first login.
// No clients.claim() — avoids conflicting with Flutter's own service worker.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

firebase.initializeApp({
  apiKey: "AIzaSyDxYURwnQj3z0OmDd-huEIX1w_UnxnY1oc",
  authDomain: "jgb-codezpark.firebaseapp.com",
  projectId: "jgb-codezpark",
  storageBucket: "jgb-codezpark.firebasestorage.app",
  messagingSenderId: "441380081715",
  appId: "1:441380081715:web:28657c6b6755604136d346",
  measurementId: "G-K3M4FZCY1P",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const title = payload.notification?.title || 'JBG';
  const options = {
    body: payload.notification?.body || '',
    icon: '/icons/Icon-192.png',
    badge: '/icons/Icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'jbg-order',
    renotify: true,
    data: payload.data || {},
    requireInteraction: true,
  };

  if (payload.notification?.image) {
    options.image = payload.notification.image;
  }

  return self.registration.showNotification(title, options)
    .then(() => console.log('[SW] Notification shown successfully'))
    .catch(err => console.error('[SW] showNotification failed:', err));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
