/**
 * HeartLink Provider Platform — Firestore Configuration (Clean Final)
 * Supports both EMULATOR (local dev) and PROD (service account) modes.
 * Tested on Node 20.x and firebase-admin 12.x
 */

import admin from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();

const mode = (process.env.FIREBASE_MODE || "emulator").toLowerCase();
const projectId = process.env.FIREBASE_PROJECT_ID || "heartlink-emulator";

let db;

try {
  if (mode === "emulator") {
    // ✅ Local emulator mode — no credentials needed
    if (!admin.apps.length) {
      admin.initializeApp({ projectId });
    }

    db = admin.firestore();
    db.settings({
      host: process.env.FIREBASE_EMULATOR_HOST || "127.0.0.1:8081",
      ssl: false,
      ignoreUndefinedProperties: true,
    });

    console.log("🧩 Firestore connected to local emulator (127.0.0.1:8081)");
  } else {
    // ✅ Production mode — uses base64 encoded service account key
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT not set in environment");
    }

    const json = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT,
      "base64"
    ).toString("utf8");
    const creds = JSON.parse(json);

    if (creds.private_key) {
      creds.private_key = creds.private_key.replace(/\\n/g, "\n");
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(creds),
        projectId,
      });
    }

    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    console.log("🧩 Firestore initialized in PROD mode");
  }
} catch (e) {
  console.error("🔥 Firestore initialization error:", e.message);
  process.exit(1);
}

export { db };
