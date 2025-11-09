// ---------------------------------------------------------------------------
// Firebase Admin SDK – initialization (safeguarded for multiple imports)
// ---------------------------------------------------------------------------
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine credential file path (env override or local key)
const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, "../heartlink-firebase-key.json");

// ✅ Prevent duplicate initialization if app already exists
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
  console.log("✅ Firebase Admin initialized for provider platform");
} else {
  console.log("ℹ️ Firebase Admin already initialized — reusing existing app");
}

export const db = admin.firestore();
export { admin };
