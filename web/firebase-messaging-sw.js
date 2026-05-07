importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');


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
    data: payload.data || {},
    requireInteraction: false,
  };

  return self.registration.showNotification(title, options);
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
