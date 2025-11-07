// ---------------------------------------------------------------------------
// HeartLink Provider Platform – providerSummary.js
// ---------------------------------------------------------------------------
// Returns color distribution + last update timestamps for a provider
// ---------------------------------------------------------------------------

import express from "express";
import { db } from "../server.js";
import fetch from "node-fetch";

const router = express.Router();

// Optional Logflare utility
const logEvent = async (message, metadata = {}) => {
  try {
    await fetch(`https://api.logflare.app/api/logs?source=${process.env.LOGFLARE_SOURCE_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.LOGFLARE_API_KEY,
      },
      body: JSON.stringify({ message, metadata }),
    });
  } catch (err) {
    console.error("Logflare error:", err);
  }
};

// ---------------------------------------------------------------------------
// ✅ GET /api/providers/:providerID/summary
// ---------------------------------------------------------------------------
router.get("/:providerID/summary", async (req, res) => {
  const { providerID } = req.params;
  try {
    const patientsSnap = await db
      .collection("providers")
      .doc(providerID)
      .collection("patients")
      .get();

    let counts = { green: 0, yellow: 0, orange: 0, red: 0, neutral: 0 };
    let lastUpdated = null;

    patientsSnap.forEach((doc) => {
      const data = doc.data();
      const cat = (data.category || "neutral").toLowerCase();
      if (counts[cat] !== undefined) counts[cat] += 1;
      const t = data.updatedAt || data.lastUpdated;
      if (t && (!lastUpdated || new Date(t) > new Date(lastUpdated))) lastUpdated = t;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    const summary = {
      providerID,
      totals: counts,
      totalPatients: total,
      lastUpdated: lastUpdated || new Date().toISOString(),
    };

    await logEvent("📊 Provider summary generated", { providerID, summary });

    res.json(summary);
  } catch (err) {
    console.error("❌ Provider summary error:", err);
    await logEvent("❌ Provider summary error", { providerID, error: err.message });
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

export default router;
