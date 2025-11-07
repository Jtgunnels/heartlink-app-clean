// src/utils/addCheckIn.js
import { db } from "../firebaseConfig";
import { addDoc, collection, Timestamp } from "firebase/firestore";

/**
 * Saves a patient check-in to Firestore.
 * @param {string} patientId - The patient’s unique ID.
 * @param {object} data - The form or symptom data.
 */
export async function addCheckIn(patientId, data) {
  try {
    const docRef = await addDoc(collection(db, "checkins"), {
      patientId,
      ...data,
      timestamp: Timestamp.now(),
    });
    console.log("✅ Check-in saved with ID:", docRef.id);
  } catch (error) {
    console.error("❌ Error adding check-in:", error);
  }
}
