// frontend/src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ---- Emulator-safe config ----
const firebaseConfig = {
  apiKey: "demo-key",
  authDomain: "heartlink-emulator.firebaseapp.com",
  projectId: "heartlink-emulator",
  storageBucket: "heartlink-emulator.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:demo",
};

// ---- Initialize Firebase ----
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
