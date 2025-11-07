// ---------------------------------------------------------------------------
// HeartLink Provider Platform — Firebase Auth Utility
// ---------------------------------------------------------------------------

import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

// --- Load Firebase config from environment variables ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);

// --- Export Auth instance and methods ---
export const auth = getAuth(app);
export { signInWithEmailAndPassword, signOut, onAuthStateChanged };
