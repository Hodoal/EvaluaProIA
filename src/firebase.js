// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-DMO07BaqHo7iTB7DKmhjFsHFrFsB9nM",
  authDomain: "calificaciones-51c74.firebaseapp.com",
  projectId: "calificaciones-51c74",
  storageBucket: "calificaciones-51c74.firebasestorage.app",
  messagingSenderId: "599987671779",
  appId: "1:599987671779:web:bc2fa3bd3536fb6bb12bd6",
  measurementId: "G-JW57B4HQTK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics (opcional - solo si necesitas analytics)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export { analytics };

export default app;