// Firebase Cloud Messaging Service Worker
// This file handles push notifications in the background (when app is closed)
// and foreground (when app is open but in background tab)

importScripts('https://www.gstatic.com/firebasejs/10.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.4.0/firebase-messaging-compat.js');

// Initialize Firebase in the Service Worker
// NOTE: Replace with your actual Firebase config
firebase.initializeApp({
  apiKey: "AIzaSy...", // Will be injected from environment variables in production
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
});

const messaging = firebase.messaging();

// Handle background messages
// This event fires when notification is received while app is closed
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification.title || 'Finance Tracker';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new notification',
    icon: '/vite.svg', // App icon
    badge: '/vite.svg', // Small badge icon
    tag: 'finance-notification', // Prevents duplicate notifications
    requireInteraction: false, // Allow dismissing notification
    data: payload.data || {}, // Additional data passed from server
    actions: [
      {
        action: 'open',
        title: 'Open App',
      },
      {
        action: 'close',
        title: 'Close',
      }
    ]
  };

  // Show the notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  const action = event.action;
  const notificationData = event.notification.data;

  event.notification.close();

  if (action === 'close') {
    // User clicked "Close" button - just dismiss the notification
    return;
  }

  // Default action or "Open" button - open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app window is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          // App is already open, just focus the window
          return client.focus();
        }
      }
      // App is not open, open it
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Handle notification dismissal/close
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw.js] Notification closed:', event);
});

// Handle service worker updates
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installing');
  self.skipWaiting();
});
