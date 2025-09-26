import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBU4oZhgtixAXjGEedglyrI1fY0jlA-zgo",   // from Web app
  authDomain: "uhura-1966.firebaseapp.com",
  projectId: "uhura-1966",
  storageBucket: "uhura-1966.appspot.com",
  messagingSenderId: "788993276826",
  appId: "1:788993276826:web:ccc85449afdf69068a5823", // ⚠️ must be web
  measurementId: "G-KYYETXDTZ7"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const fetchFcmToken = async () => {
  try {
    const token = await getToken(messaging, {
      vapidKey: "BCYYyw_IJYroPabCkx-6gHrGpOd1Ztn1nexdNYp8PDV57IM1tfB1icIw-QXl81ccRMLL9oLS97h7lAp4n9bNuo4"
    });
    console.log("✅ Got FCM Token:", token);
    return token;
  } catch (err) {
    console.error("❌ Error getting FCM token:", err);
    return null;
  }
};
