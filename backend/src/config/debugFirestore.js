// debugFirestore.js — quick check for patient data in Firestore Emulator
import { db } from "./firebaseEmulator.js";
import { collection, getDocs } from "firebase/firestore";

async function verifyPatients() {
  try {
    const ref = collection(db, "providers", "demoProvider", "patients");
    const snap = await getDocs(ref);

    console.log(`🧩 Found ${snap.size} patient docs.`);
    if (snap.empty) {
      console.warn("⚠️ No patients found under providers/demoProvider/patients");
      return;
    }

    snap.docs.slice(0, 5).forEach((doc, i) => {
      const d = doc.data();
      console.log(`Patient ${i + 1}:`, {
        id: doc.id,
        name: d.name,
        aseCategory: d.aseCategory,
        status: d.status,
      });
    });
  } catch (err) {
    console.error("❌ Firestore debug error:", err);
  }
}

verifyPatients().then(() => process.exit());
