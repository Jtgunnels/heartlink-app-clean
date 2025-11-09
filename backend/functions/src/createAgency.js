// ---------------------------------------------------------------------------
// HeartLink Provider Platform — createAgency Function (Final, Safe Initialization)
// ---------------------------------------------------------------------------

import { https } from "firebase-functions/v2";
import admin from "firebase-admin";

// ✅ Safe initialization (prevents "default Firebase app does not exist" error)
if (!admin.apps.length) {
  admin.initializeApp();
  console.log("✅ Firebase Admin initialized (createAgency)");
} else {
  console.log("ℹ️ Firebase Admin already initialized (createAgency)");
}

const db = admin.firestore();

// ---------------------------------------------------------------------------
// HTTPS Function: createAgency
// ---------------------------------------------------------------------------
export const createAgency = https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { name, email, password, tier } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const providerId = name.toLowerCase().replace(/\s+/g, "-");

    // Create Firebase Auth user
    const user = await admin.auth().createUser({
      email,
      password,
      displayName: `${name} Admin`,
    });

    // Assign custom claims to user
    await admin.auth().setCustomUserClaims(user.uid, {
      provider_id: providerId,
      role: "admin",
    });

    // Save provider record in Firestore
    await db.doc(`providers/${providerId}`).set({
      name,
      tier: tier ?? "Bronze",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: user.uid,
      contactEmail: email,
      schemaVersion: "1.0.0",
    });

    return res.status(200).json({ success: true, providerId });
  } catch (err) {
    console.error("❌ createAgency error:", err);
    return res.status(500).json({ error: err.message });
  }
});
