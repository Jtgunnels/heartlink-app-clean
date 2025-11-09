// src/utils/getCheckIns.js — Final Updated Version
import { db } from "../utils/firebaseConfig";
import { collection, query, orderBy, getDocs } from "firebase/firestore";

/**
 * Fetch all check-ins for the currently selected provider.
 * Reads providerId from local/session storage instead of Firebase Auth claims.
 * Returns [] if no providerId found or no check-ins exist.
 */
export async function getCheckIns() {
  try {
    // ✅ Use stored providerId (consistent with TierContext + fetchReportData)
    const providerId =
      sessionStorage.getItem("providerId") || localStorage.getItem("providerId");

    if (!providerId) {
      console.warn("⚠️ getCheckIns: No providerId found in storage — returning []");
      return [];
    }

    // ✅ Query Firestore under correct provider document
    const q = query(
      collection(db, `providers/${providerId}/checkins`),
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log(`ℹ️ getCheckIns: No check-ins found for provider '${providerId}'`);
      return [];
    }

    const results = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`✅ getCheckIns: Loaded ${results.length} check-ins for ${providerId}`);
    return results;
  } catch (err) {
    console.error("❌ getCheckIns error:", err);
    return [];
  }
}
