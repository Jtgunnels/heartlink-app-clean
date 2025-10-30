/**
 * HeartLink Firestore Configuration (Safe Toggle)
 * v4.1.5 — supports emulator & production with newline fix
 */

import admin from "firebase-admin";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const mode = process.env.FIREBASE_MODE || "emulator";
const projectId = process.env.FIREBASE_PROJECT_ID || "heartlink-emulator";

let app;

if (mode === "emulator") {
  console.log("🧩 Firestore Emulator Mode — Safe for testing");
  app = admin.initializeApp({ projectId });
} else if (mode === "prod") {
  console.log("🔐 Production Mode — Live Firestore Connection");

  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!fs.existsSync(keyPath)) {
    throw new Error(`❌ Service account file not found at ${keyPath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

  // ✅ Ensure private key newlines are correct
  if (serviceAccount.private_key && typeof serviceAccount.private_key === "string") {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
  });
} else {
  throw new Error(`❌ Invalid FIREBASE_MODE: ${mode}. Use "emulator" or "prod"`);
}

export const db = admin.firestore();
console.log("✅ Firestore initialized in", mode.toUpperCase(), "mode");
