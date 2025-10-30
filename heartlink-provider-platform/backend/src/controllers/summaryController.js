import { db } from "../config/db.js";

// Utility: get timestamp X days ago
const daysAgo = (num) => {
  const d = new Date();
  d.setDate(d.getDate() - num);
  return d.toISOString();
};

// GET /api/summary/:providerID
export const getSummary = async (req, res) => {
  try {
    const { providerID } = req.params;
    const providerRef = db.collection("providers").doc(providerID);
    const patientsSnap = await providerRef.collection("patients").get();

    const now = new Date().toISOString();
    const sevenDaysAgo = daysAgo(7);
    const thirtyDaysAgo = daysAgo(30);

    const summary = {
      providerID,
      generatedAt: now,
      totals7: { green: 0, yellow: 0, orange: 0, red: 0 },
      totals30: { green: 0, yellow: 0, orange: 0, red: 0 },
      patientSummaries: [],
    };

    for (const doc of patientsSnap.docs) {
      const patientCode = doc.id;
      const checkinsRef = providerRef
        .collection("patients")
        .doc(patientCode)
        .collection("checkins");

      // last 7 days
      const checkins7 = await checkinsRef
        .where("timestamp", ">=", sevenDaysAgo)
        .get();

      // last 30 days
      const checkins30 = await checkinsRef
        .where("timestamp", ">=", thirtyDaysAgo)
        .get();

      const countByCategory = (snap) => {
        const counts = { green: 0, yellow: 0, orange: 0, red: 0 };
        snap.forEach((c) => {
          const cat = (c.data().category || "green").toLowerCase();
          if (counts[cat] !== undefined) counts[cat] += 1;
        });
        return counts;
      };

      const counts7 = countByCategory(checkins7);
      const counts30 = countByCategory(checkins30);

      // Add to provider totals
      for (const k of Object.keys(summary.totals7)) {
        summary.totals7[k] += counts7[k];
        summary.totals30[k] += counts30[k];
      }

      // Last update
      const latest = await checkinsRef
        .orderBy("timestamp", "desc")
        .limit(1)
        .get();

      const latestData = latest.empty ? null : latest.docs[0].data();

      summary.patientSummaries.push({
        patientCode,
        lastCategory: latestData?.category || doc.data().category || "Green",
        counts7,
        counts30,
        lastUpdated: latestData?.timestamp || doc.data().updatedAt,
      });
    }

    res.json(summary);
  } catch (e) {
    console.error("🔥 getSummary error:", e);
    res.status(500).json({ error: e.message });
  }
};
