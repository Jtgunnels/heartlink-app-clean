// src/controllers/authController.js
// ---------------------------------------------------------------------------
// HeartLink Provider Platform — Auth Controller (Custom Claims Integration)
// ---------------------------------------------------------------------------

import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import { adminAuth, adminDB } from "../../firebaseAdmin.js"; // ✅ two levels up

export const loginProvider = async (req, res) => {
  const { email, password } = req.body;
  console.log("🧩 loginProvider triggered with:", email);

  try {
    if (!process.env.FIREBASE_API_KEY) {
      console.error("❌ Missing FIREBASE_API_KEY in environment.");
      return res.status(500).json({
        error: "Server misconfiguration: missing FIREBASE_API_KEY",
      });
    }

    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const data = await verifyRes.json();
    console.log("🧩 Firebase verifyRes status:", verifyRes.status, "data:", data);

    if (!verifyRes.ok || !data.localId) {
      const errMsg = data?.error?.message || "Authentication failed";
      console.warn(`⚠️ Firebase Auth rejected login for ${email}:`, errMsg);
      return res.status(401).json({
        error: "Invalid credentials or authentication error",
      });
    }

    const uid = data.localId;
    console.log("✅ Firebase Auth verified UID:", uid);

    const snapshot = await adminDB
      .collection("providers")
      .where("createdBy", "==", uid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.warn(`⚠️ No provider record found for UID ${uid}`);
      return res.status(404).json({
        error: "No matching provider record found for this account",
      });
    }

    const providerDoc = snapshot.docs[0];
    const providerId = providerDoc.id;
    console.log(`✅ Provider record found: ${providerId}`);

    try {
      const userRecord = await adminAuth.getUser(uid);
      const existingClaims = userRecord.customClaims || {};

      if (existingClaims.provider_id !== providerId) {
        await adminAuth.setCustomUserClaims(uid, {
          ...existingClaims,
          provider_id: providerId,
        });
        console.log(`✅ provider_id claim set for ${email}: ${providerId}`);
      } else {
        console.log(`ℹ️ provider_id claim already up-to-date for ${email}`);
      }
    } catch (claimErr) {
      console.error("⚠️ Error setting provider_id claim:", claimErr);
    }

    const token = jwt.sign(
      { providerID: providerId, uid },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    console.log(`✅ Login successful for ${email}`);
    return res.json({
      token,
      providerID: providerId,
      message: "Login successful, custom claim applied if missing",
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({
      error: err.message || "Internal server error",
    });
  }
};
