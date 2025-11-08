/* ------------------------------------------------------------
   Low-level Readers (corrected to pull from /checkins)
------------------------------------------------------------ */
async function readPatients() {
  let snap;

  try {
    // ✅ Always pull from /checkins first
    snap = await getDocs(collection(db, "checkins"));
    if (snap.empty) {
      console.warn("⚠️ No check-ins found; falling back to /patients");
      snap = await getDocs(collection(db, "patients"));
    } else {
      console.info("✅ Loaded patients via /checkins collection");
    }
  } catch (err) {
    console.warn("⚠️ readPatients failed:", err);
    snap = await getDocs(collection(db, "patients"));
  }

  const docs = snap?.docs.map((d) => ({ id: d.id, ...d.data() })) ?? [];
  log("readPatients", `${docs.length} records`);
  return docs;
}

async function readPatientCheckins(patientId) {
  let snap;

  try {
    // ✅ Directly query top-level /checkins for patient match
    const q = query(
      collection(db, "checkins"),
      where("patientId", "==", patientId),
      orderBy("timestamp", "desc")
    );
    snap = await getDocs(q);

    if (!snap || snap.empty) {
      console.info(`ℹ️ No direct check-ins for ${patientId}; falling back.`);
      const fallbackRef = query(
        collection(db, "patients", patientId, "checkins"),
        orderBy("date", "asc")
      );
      snap = await getDocs(fallbackRef);
    }
  } catch (err) {
    console.warn(`⚠️ readPatientCheckins error for ${patientId}:`, err);
  }

  const docs = snap?.docs.map((d) => ({ id: d.id, ...d.data() })) ?? [];
  log(`readPatientCheckins(${patientId})`, `${docs.length} check-ins`);
  return docs;
}
