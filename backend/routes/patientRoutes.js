// ---------------------------------------------------------------------------
// HeartLink Provider Platform – patientRoutes.js (Finalized Firestore Version)
// ---------------------------------------------------------------------------

import express from "express";
import fetch from "node-fetch";
import { db } from "../server.js";

const router = express.Router();

// ---------------------------------------------------------------------------
// Logflare helper
// ---------------------------------------------------------------------------
const sendLogToLogflare = async (message, metadata = {}) => {
  try {
    const res = await fetch(
      `https://api.logflare.app/api/logs?source=${process.env.LOGFLARE_SOURCE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.LOGFLARE_API_KEY,
        },
        body: JSON.stringify({
          message,
          metadata: { ...metadata, env: process.env.NODE_ENV || "production" },
        }),
      }
    );
    if (!res.ok) {
      console.error("❌ Logflare error:", await res.text());
    }
  } catch (error) {
    console.error("⚠️ Logflare network error:", error);
  }
};

// ---------------------------------------------------------------------------
// ✅ POST /api/patients  → Add or update patient check-in
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { providerID, patientCode, timestamp, category, normalized, shortReason } = req.body;

    if (!providerID || !patientCode) {
      await sendLogToLogflare("⚠️ Missing providerID or patientCode", { body: req.body });
      return res.status(400).json({ error: "Missing providerID or patientCode" });
    }

    const providerRef = db.collection("providers").doc(providerID);
    const patientRef = providerRef.collection("patients").doc(patientCode);

    // Ensure parent documents exist
    await providerRef.set({ lastUpdated: new Date().toISOString() }, { merge: true });

    // Update patient doc
    await patientRef.set(
      {
        lastUpdated: timestamp || new Date().toISOString(),
        category: category || "neutral",
        normalized: normalized || null,
        shortReason: shortReason || "",
      },
      { merge: true }
    );

    // Add historical check-in
    await patientRef.collection("checkins").add({
      timestamp: timestamp || new Date().toISOString(),
      category,
      normalized,
      shortReason,
    });

    await sendLogToLogflare("📦 Patient check-in stored", {
      route: "/api/patients",
      method: "POST",
      providerID,
      patientCode,
      category,
      normalized,
      status: 200,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Firestore write error:", err);
    await sendLogToLogflare("❌ Firestore write error", {
      route: "/api/patients",
      method: "POST",
      error: err.message,
      status: 500,
    });
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------------------------------------
// ✅ GET /api/patients/:providerID → Fetch all patients + latest check-in
// ---------------------------------------------------------------------------
router.get("/:providerID", async (req, res) => {
  try {
    const { providerID } = req.params;
    const patientsRef = db.collection("providers").doc(providerID).collection("patients");
    const snapshot = await patientsRef.get();

    const patients = [];

    for (const doc of snapshot.docs) {
      const patientData = doc.data();

      // Get latest check-in
      const checkinsSnap = await patientsRef
        .doc(doc.id)
        .collection("checkins")
        .orderBy("timestamp", "desc")
        .limit(1)
        .get();

      let latest = {};
      checkinsSnap.forEach((c) => (latest = c.data()));

      patients.push({
        patientCode: doc.id,
        category: latest?.category || patientData.category || "neutral",
        normalized: latest?.normalized ?? patientData.normalized ?? null,
        shortReason: latest?.shortReason || patientData.shortReason || "",
        timestamp: latest?.timestamp || patientData.lastUpdated || null,
      });
    }

    res.json(patients);

    await sendLogToLogflare("📋 Patients list retrieved", {
      route: `/api/patients/${providerID}`,
      method: "GET",
      count: patients.length,
      status: 200,
    });
  } catch (err) {
    console.error("❌ Firestore read error:", err);
    await sendLogToLogflare("❌ Firestore read error", {
      route: "/api/patients/:providerID",
      method: "GET",
      error: err.message,
      status: 500,
    });
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
