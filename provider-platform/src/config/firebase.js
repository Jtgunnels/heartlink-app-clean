import { initializeApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
} from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "localhost",
  projectId: "heartlink-provider-platform",
  storageBucket: "heartlink-provider-platform.appspot.com",
  appId: "dev-heartlink",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Emulator detection — use either env flag or localhost hostname
const USE_EMULATOR =
  import.meta.env.VITE_FIREBASE_MODE === "emulator" ||
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

if (USE_EMULATOR) {
  connectFirestoreEmulator(db, "127.0.0.1", 8081);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}

enableIndexedDbPersistence(db).catch(() => {});

export default app;
