export const getPatients = async (req, res) => {
  const { providerID } = req.params;
  // stubbed
  res.json([
    { code: "HL-4D8C92", category: "Yellow", lastCheckin: "2025-10-20", summary: "Mild SOB" },
    { code: "HL-7B21D1", category: "Green", lastCheckin: "2025-10-19", summary: "Stable" }
  ]);
};

export const getPatientByCode = async (req, res) => {
  const { patientCode } = req.params;
  res.json({
    code: patientCode,
    trend: [2.1, 3.5, 4.0, 3.9],
    lastCategory: "Yellow",
    summary: "Slight increase in swelling"
  });
};
