// public/firebase-messaging-sw.js

// 1. Import Firebase from the CDN (Compat version is required for Service Workers)
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// 2. Initialize Firebase (PASTE YOUR ACTUAL KEYS HERE!)
firebase.initializeApp( {
  apiKey: "AIzaSyDZjuQ25Ds3kPO0QGJkQrcEUk4GanwMkTA",
  authDomain: "uhura-c399e.firebaseapp.com",
  projectId: "uhura-c399e",
  storageBucket: "uhura-c399e.firebasestorage.app",
  messagingSenderId: "423562755233",
  appId: "1:423562755233:web:a6b7afc6e0857f60da44e0"
}                   );

const messaging = firebase.messaging();

// 3. Catch the "Data-Only" background message and force a notification
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Check if this is our custom incoming call payload
  if (payload.data && payload.data.notificationType === 'incoming_call') {
    
    const notificationTitle = 'Incoming Audio Call 📞';
    const notificationOptions = {
      body: `${payload.data.callerName || 'Someone'} is calling you on Uhura.`,
      icon: '/favicon.ico', // You can change this to your app's logo path
      badge: '/favicon.ico',
      requireInteraction: true, // This keeps the notification on screen until the user clicks it or dismisses it
      data: {
        callId: payload.data.callId,
        url: '/' // Tells the browser where to go when they click the notification
      }
    };

    // Manually show the desktop notification!
    return self.registration.showNotification(notificationTitle, notificationOptions);
  }
  
  // If the caller cancelled the call while it was ringing in the background, we can close the notification
  if (payload.data && payload.data.notificationType === 'call_cancelled') {
      self.registration.getNotifications().then(notifications => {
          notifications.forEach(notification => notification.close());
      });
  }
});

// 4. Handle clicks on the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Focus the open browser tab so the user can answer the call
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      if (windowClients.length > 0) {
        return windowClients[0].focus();
      } else {
        return clients.openWindow('/');
      }
    })
  );
});