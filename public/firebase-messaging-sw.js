importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBU4oZhgtixAXjGEedglyrI1fY0jlA-zgo",
  authDomain: "uhura-1966.firebaseapp.com",
  projectId: "uhura-1966",
  storageBucket: "uhura-1966.appspot.com",
  messagingSenderId: "788993276826",
  appId: "1:788993276826:web:ccc85449afdf69068a5823", // ⚠️ must match Web app
  measurementId: "G-KYYETXDTZ7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);

  const notificationTitle = payload.notification?.title || "Background Message Title";
  const notificationOptions = {
    body: payload.notification?.body || "Background Message body",
    icon: "/favicon.ico"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
