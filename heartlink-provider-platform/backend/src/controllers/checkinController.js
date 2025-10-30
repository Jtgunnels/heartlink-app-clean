import { db } from "../config/db.js";

// POST /api/checkins
export const receiveCheckin = async (req, res) => {
  try {
    const { providerID, patientCode, ssi, category, summary, timestamp } =
      req.body;

    if (!providerID || !patientCode)
      return res
        .status(400)
        .json({ error: "providerID and patientCode required" });

    const when = timestamp || new Date().toISOString();
    const base = db
      .collection("providers")
      .doc(providerID)
      .collection("patients")
      .doc(patientCode);

    // store new check-in
    await base.collection("checkins").add({
      ssi,
      category,
      summary,
      timestamp: when,
    });

    // update patient’s top-level status
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
