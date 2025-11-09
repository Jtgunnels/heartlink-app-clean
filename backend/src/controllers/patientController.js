// src/controllers/patientController.js
import { adminDB } from "../../firebaseAdmin.js"; // ✅ two levels up

export const getPatients = async (req, res) => {
  try {
    const { providerID } = req.params;
    const snap = await adminDB
      .collection("providers")
      .doc(providerID)
      .collection("patients")
      .get();

    const patients = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(patients);
  } catch (e) {
    console.error("getPatients error:", e);
    res.status(500).json({ error: "Failed to fetch patients" });
  }
};

export const getPatientByCode = async (req, res) => {
  try {
    const { patientCode } = req.params;
    const snap = await adminDB
      .collectionGroup("patients")
      .where("code", "==", patientCode)
      .limit(1)
      .get();

    if (snap.empty) return res.status(404).json({ error: "Not found" });
    const doc = snap.docs[0];
    res.json({ id: doc.id, ...doc.data(), providerID: doc.ref.parent.parent.id });
  } catch (e) {
    console.error("getPatientByCode error:", e);
    res.status(500).json({ error: "Lookup failed" });
  }
};

export const createPatient = async (req, res) => {
  try {
    const { providerID, code, baseline } = req.body;
    if (!providerID || !code)
      return res.status(400).json({ error: "providerID and code required" });

    const pRef = adminDB
      .collection("providers")
      .doc(providerID)
      .collection("patients")
      .doc(code);

    await pRef.set(
      {
        code,
        baseline: baseline || {},
        category: "Green",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    res.status(201).json({ ok: true, code });
  } catch (e) {
    console.error("🔥 createPatient error:", e.message, e.stack);
    res.status(500).json({ error: e.message || "Create failed" });
  }
};
