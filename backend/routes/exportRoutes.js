// ---------------------------------------------------------------------------
// HeartLink Provider Platform – Export Routes (Silver Tier)
// ---------------------------------------------------------------------------

import express from "express";
import { Parser as CsvParser } from "json2csv";
import PDFDocument from "pdfkit";
import { db } from "../src/config/db.js";

const router = express.Router();

// Utility: Fetch all patients under a provider
async function fetchPatients(providerID) {
  const patientsRef = db.collection("providers").doc(providerID).collection("patients");
  const snapshot = await patientsRef.get();
  const patients = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    patients.push({
      patientCode: doc.id,
      name: data.name || "Unnamed",
      status: data.status || "Unknown",
      category: data.category || "neutral",
      lastUpdated: data.lastUpdated || "",
    });
  });

  return patients;
}

// ---------------------------------------------------------------------------
// GET /api/export?providerID=demoProvider&type=csv|pdf
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const { providerID, type = "csv" } = req.query;

    if (!providerID)
      return res.status(400).json({ error: "Missing providerID" });

    const patients = await fetchPatients(providerID);

    if (type === "csv") {
      const fields = ["patientCode", "name", "status", "category", "lastUpdated"];
      const parser = new CsvParser({ fields });
      const csv = parser.parse(patients);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=heartlink_report_${providerID}.csv`);
      return res.status(200).send(csv);
    }

    if (type === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=heartlink_report_${providerID}.pdf`);

      const doc = new PDFDocument();
      doc.pipe(res);

      doc.fontSize(18).text("HeartLink Clinical Summary", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Provider: ${providerID}`);
      doc.text(`Generated: ${new Date().toLocaleString()}`);
      doc.moveDown();

      patients.forEach((p, i) => {
        doc.text(`${i + 1}. ${p.name} (${p.patientCode}) – ${p.status} (${p.category})`);
      });

      doc.end();
      return;
    }

    return res.status(400).json({ error: "Invalid type. Use csv or pdf." });
  } catch (error) {
    console.error("❌ Export generation failed:", error);
    res.status(500).json({ error: "Server error during export" });
  }
});

export default router;
