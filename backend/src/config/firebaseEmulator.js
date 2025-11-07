// backend/src/config/firebaseEmulator.js
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "localhost",
  projectId: "heartlink-provider-platform",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8081);

export { db };
