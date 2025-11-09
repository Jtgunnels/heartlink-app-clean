/**
 * HeartLink Health LLC — ASE Integration Cloud Functions
 * Version: ASE 1.3 (Clinical-Lock)
 * -------------------------------------------------------
 * This file registers all backend functions for Firebase.
 */

import admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { https } from "firebase-functions/v2";

// ✅ Initialize Firebase Admin (safe for emulator and prod)
try {
  if (!admin.apps.length) {
    admin.initializeApp();
    console.log("✅ Firebase Admin initialized");
  } else {
    console.log("ℹ️ Firebase Admin already initialized");
  }
} catch (err) {
  console.error("🔥 Firebase Admin init error:", err);
}

const db = admin.firestore();

// Algorithms & feature modules (import AFTER init)
import calculateScore from "./algorithms/calculateScore.js";
import { createAgency } from "./src/createAgency.js";
import { inviteStaff } from "./src/inviteStaff.js";
import { aggregateCheckins } from "./src/aggregateCheckins.js";

/**
 * -------------------------------------------------------
 * ASE 1.3 Clinical Logic — onCheckInCreated Trigger
 * -------------------------------------------------------
 */
export const onCheckInCreated = onDocumentCreated(
  "checkIns/{checkInId}",
  async (event) => {
    try {
      const checkIn = event.data?.data();
      if (!checkIn?.patientId) return;

      const { patientId } = checkIn;
      const patientRef = db.collection("patients").doc(patientId);
      const patientSnap = await patientRef.get();
      const patient = patientSnap.exists ? patientSnap.data() : {};

      const baseline = patient.baseline || {};
      const hist = {
        wsSeries: patient.wsSeries || [],
        normalizedScores: patient.normalizedScores || [],
        categories: patient.categories || [],
        weights: patient.weights || [],
      };

      // 🧮 Run ASE 1.3 scoring
      const { ssi, category } = calculateScore(checkIn, baseline, hist);

      const updatedData = {
        latestScore: {
          ssi,
          category,
          version: "ASE 1.3-CL",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        wsSeries: hist.wsSeries,
        normalizedScores: hist.normalizedScores,
        categories: hist.categories,
        weights: hist.weights,
        history: admin.firestore.FieldValue.arrayUnion({
          ...checkIn,
          ssi,
          category,
          timestamp:
            checkIn.timestamp ||
            admin.firestore.FieldValue.serverTimestamp(),
        }),
      };

      await patientRef.set(updatedData, { merge: true });

      if (
        ["Needs Immediate Review", "Review Recommended", "Red", "Orange"].includes(
          category
        )
      ) {
        await db.collection("alerts").add({
          patientId,
          category,
          ssi,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      console.log(
        `✅ ASE score updated for patient ${patientId}: ${category} (SSI ${ssi})`
      );
    } catch (err) {
      console.error("❌ Error scoring check-in:", err);
    }
  }
);

/**
 * -------------------------------------------------------
 * HTTPS Callable Functions
 * -------------------------------------------------------
 */
export { createAgency };
export const inviteStaffFn = https.onRequest(inviteStaff);
export { aggregateCheckins };
