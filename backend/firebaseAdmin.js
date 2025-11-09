// src/config/firebaseAdmin.js
// ---------------------------------------------------------------------------
// HeartLink Provider Platform — Firebase Admin Initialization (Claims Ready)
// ---------------------------------------------------------------------------
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

if (!admin.apps.length) {
  const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };

  if (!serviceAccount.project_id || !serviceAccount.private_key) {
    console.error("❌ Missing Firebase Admin credentials in .env");
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin initialized for provider platform");
}

export const adminAuth = admin.auth();
export const adminDB = admin.firestore();
export default admin;
