// src/controllers/checkinController.js
import { adminDB } from "../../firebaseAdmin.js"; // ✅ two levels up

export const receiveCheckin = async (req, res) => {
  try {
    const { providerID, patientCode, ssi, category, summary, timestamp } =
      req.body;

    if (!providerID || !patientCode)
      return res
        .status(400)
        .json({ error: "providerID and patientCode required" });

    const when = timestamp || new Date().toISOString();
    const base = adminDB
      .collection("providers")
      .doc(providerID)
      .collection("patients")
      .doc(patientCode);

    await base.collection("checkins").add({
      ssi,
      category,
      summary,
      timestamp: when,
    });

    await base.set(
      { category: category || "Green", updatedAt: when },
      { merge: true }
    );

    res.json({ ok: true });
  } catch (e) {
    console.error("receiveCheckin error:", e);
    res.status(500).json({ error: "Failed to store check-in" });
  }
};
