// ---------------------------------------------------------------------------
// Firebase Admin SDK – initialization
// ---------------------------------------------------------------------------
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use local key file path from .env
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, "../heartlink-firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

export const db = admin.firestore();
