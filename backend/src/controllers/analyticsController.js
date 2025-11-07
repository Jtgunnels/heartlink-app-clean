import { getFirestore } from "firebase-admin/firestore";

export const getAnalyticsSummary = async (req, res) => {
  try {
    const db = getFirestore();
    const { providerID } = req.query;

    if (!providerID) {
      return res.status(400).json({ error: "Missing providerID" });
    }

    const patientsRef = db.collection("providers")
                          .doc(providerID)
                          .collection("patients");

    const snapshot = await patientsRef.get();
    if (snapshot.empty) {
      return res.json({ providerID, totalPatients: 0, trend30d: [] });
    }

    let total = 0, improved = 0, worsened = 0, stable = 0, stabilityScores = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      total++;
      if (data.status === "Improved") improved++;
      else if (data.status === "Worsening") worsened++;
      else stable++;

      if (data.stabilityScore) stabilityScores.push(data.stabilityScore);
    });

    const avgStability =
      stabilityScores.length > 0
        ? stabilityScores.reduce((a, b) => a + b, 0) / stabilityScores.length
        : 0;

    return res.json({
      providerID,
      totalPatients: total,
      improved,
      worsened,
      stable,
      avgStability: Number(avgStability.toFixed(2))
    });
  } catch (err) {
    console.error("❌ Analytics error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
