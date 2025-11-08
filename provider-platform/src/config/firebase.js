// src/firebase.js
// HeartLink Mobile App — Unified Firebase Init (Production + Emulator Safe)

import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
} from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { firebaseConfig } from "../firebaseConfig"; // ✅ Reuse shared config

// Avoid double initialization (for hot reloads)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Emulator toggle logic — based on env flag or hostname
const isLocalHost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const USE_EMULATOR =
  import.meta.env.VITE_FIREBASE_MODE === "emulator" || isLocalHost;

if (USE_EMULATOR) {
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8081);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    console.log("🧩 Running Firebase in EMULATOR mode");
  } catch (err) {
    console.warn("Emulator connection failed:", err);
  }
}

// Enable offline persistence for app users
try {
  enableIndexedDbPersistence(db).catch(() => {});
} catch (err) {
  console.warn("IndexedDB persistence error:", err);
}

export default app;
