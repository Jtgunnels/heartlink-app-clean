/**
 * HeartLink ASE 1.3 Data Converter
 * Converts old ChronicStabilityScenarios.json (v3.9e schema)
 * into ASE 1.3-compatible schema with compare fields, cardCategories,
 * wsSeries, and baselineSavedAt timestamp.
 *
 * Usage:
 *   node convert_ChronicStability_to_ASE13.js
 */

import fs from "fs";

// ✅ Correct absolute file paths for your Windows environment
const INPUT_PATH =
  "C:/Users/lorir/OneDrive/Desktop/heart-failure-app/HeartLink_ResearchAnalyst_BaselinePack_USFDA/04_Algorithm_Validation/04_Algorithm_Validation/02_Validation/ChronicStabilityScenarios.json";

const OUTPUT_PATH =
  "C:/Users/lorir/OneDrive/Desktop/heart-failure-app/HeartLink_ResearchAnalyst_BaselinePack_USFDA/04_Algorithm_Validation/04_Algorithm_Validation/02_Validation/ChronicStabilityScenarios_ASE13.json";

// ----- helper: safe clone -----
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function upgradeScenario(scn) {
  const updated = deepClone(scn);

  // 1. add Compare fields if missing
  updated.input = updated.input || {};
  const compareKeys = ["sobCompare", "edemaCompare", "fatigueCompare"];
  for (const key of compareKeys) {
    if (!updated.input[key]) updated.input[key] = "Same";
  }

  // 2. add baselineSavedAt timestamp if missing
  updated.baseline = updated.baseline || {};
  if (!updated.baseline.baselineSavedAt) {
    updated.baseline.baselineSavedAt = new Date().toISOString();
  }

  // 3. add cardCategories and wsSeries duplicates
  updated.hist = updated.hist || {};
  if (!Array.isArray(updated.hist.cardCategories)) {
    updated.hist.cardCategories = Array.isArray(updated.hist.categories)
      ? [...updated.hist.categories]
      : [];
  }
  if (!Array.isArray(updated.hist.wsSeries)) {
    updated.hist.wsSeries = Array.isArray(updated.hist.normalizedScores)
      ? [...updated.hist.normalizedScores]
      : [];
  }

  // keep id/cohort intact
  return updated;
}

try {
  const raw = fs.readFileSync(INPUT_PATH, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("Expected array of scenarios.");

  const upgraded = data.map(upgradeScenario);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(upgraded, null, 2));
  console.log(
    `✅ Conversion complete.\nOutput: ${OUTPUT_PATH}\nScenarios processed: ${upgraded.length}`
  );
} catch (err) {
  console.error("❌ Conversion failed:", err.message);
}
