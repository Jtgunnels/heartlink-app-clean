import express from "express";
import { db } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(verifyToken);

// GET /api/providers/:providerID/summary
router.get("/:providerID/summary", async (req, res) => {
  try {
    const { providerID } = req.params;
    const snap = await db.collection("providers").doc(providerID).collection("patients").get();

    const counts = { green: 0, yellow: 0, orange: 0, red: 0 };
    let lastUpdated = null;

    snap.forEach(doc => {
      const d = doc.data();
      const cat = String(d.category || "green").toLowerCase();
      if (counts[cat] !== undefined) counts[cat] += 1;
      const t = d.updatedAt || d.lastUpdated;
      if (t && (!lastUpdated || new Date(t) > new Date(lastUpdated))) lastUpdated = t;
    });

    res.json({
      providerID,
      totals: counts,
      totalPatients: Object.values(counts).reduce((a,b)=>a+b,0),
      lastUpdated: lastUpdated || null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load provider summary" });
  }
});

export default router;
