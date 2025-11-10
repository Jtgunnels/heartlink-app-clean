// src/utils/getPatients.js
// HeartLink Provider Platform — getPatients utility (ASE-compatible)

import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Returns patient documents enriched by the ASE / calculateScore process.
 * If algorithm outputs are stored on each patient doc (aseCategory, ssi, etc.),
 * they will automatically be included.
 */
export async function getPatients() {
  try {
    const snapshot = await getDocs(collection(db, "patients"));
    const patients = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    console.log("🩺 getPatients loaded:", patients.length, "records");
    if (patients.length < 10) console.table(patients);

    // ✅ Here we’re *not* recalculating ASE scores directly —
    // we’re trusting Firestore to contain the latest algorithm results.
    // If your backend recalculates them, they’ll flow through automatically.

    return patients;
  } catch (err) {
    console.error("Error in getPatients:", err);
    return [];
  }
}
