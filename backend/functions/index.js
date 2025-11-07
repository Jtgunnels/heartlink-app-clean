/**
 * HeartLink Health LLC — ASE Integration Cloud Function
 * Version: ASE 1.3 (Clinical-Lock)
 * Function: onCheckInCreated
 * Purpose: Auto-score new check-ins and update patient summary in Firestore
 */

import admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import calculateScore_v41CL from "./algorithms/calculateScore.js";

// ✅ Initialize Firebase Admin correctly for ESM (Node 22)
admin.initializeApp();
const db = admin.firestore();

export const onCheckInCreated = onDocumentCreated("checkIns/{checkInId}", async (event) => {
  try {
    const checkIn = event.data.data();
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
    const { ssi, category } = calculateScore_v41CL(checkIn, baseline, hist);

    // 🕒 Prepare updated patient data
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
        timestamp: checkIn.timestamp || admin.firestore.FieldValue.serverTimestamp(),
      }),
    };

    // ✏️ Update patient record atomically
    await patientRef.set(updatedData, { merge: true });

    // ⚠️ Optional: create alert if Red or Orange
    if (["Needs Immediate Review", "Review Recommended", "Red", "Orange"].includes(category)) {
      await db.collection("alerts").add({
        patientId,
        category,
        ssi,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log(`✅ ASE score updated for patient ${patientId}: ${category} (SSI ${ssi})`);
  } catch (err) {
    console.error("❌ Error scoring check-in:", err);
  }
});
