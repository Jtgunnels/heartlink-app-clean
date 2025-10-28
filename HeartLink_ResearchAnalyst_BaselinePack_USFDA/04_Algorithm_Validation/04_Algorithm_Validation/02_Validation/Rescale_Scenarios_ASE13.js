// ---------------------------------------------------------------------------
// HeartLink Scenario Rescaler – ASE 1.3 normalization
// Multiplies all numeric symptom and baseline values by a fixed factor.
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";

const SCALE = 4.0; // change to 3.5–5.0 if you want to test different magnitudes
const BASE_DIR = path.resolve("./"); // current folder
const TARGET_FILES = [
  "ChronicStabilityScenarios_ASE13.json",
  "MildChangeScenarios_ASE13.json",
  "AcuteDecompensationScenarios_ASE13.json",
  "HighDiversityScenarios_ASE13.json"
];

// keys to scale
const FIELDS = ["sob", "edema", "fatigue", "baselineSob", "baselineEdema", "baselineFatigue"];

function scaleValue(v) {
  return typeof v === "number" ? +(v * SCALE).toFixed(2) : v;
}

for (const file of TARGET_FILES) {
  const fp = path.join(BASE_DIR, file);
  if (!fs.existsSync(fp)) {
    console.warn(`⚠️  Missing ${file}, skipping.`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(fp, "utf8"));
  for (const caseObj of data) {
    if (caseObj.input) {
      for (const key of Object.keys(caseObj.input)) {
        if (FIELDS.includes(key)) caseObj.input[key] = scaleValue(caseObj.input[key]);
      }
    }
    if (caseObj.baseline) {
      for (const key of Object.keys(caseObj.baseline)) {
        if (FIELDS.includes(key)) caseObj.baseline[key] = scaleValue(caseObj.baseline[key]);
      }
    }
  }

  const outName = file.replace(".json", `_x${SCALE}.json`);
  fs.writeFileSync(path.join(BASE_DIR, outName), JSON.stringify(data, null, 2));
  console.log(`✅  Scaled ${file} → ${outName}`);
}

console.log("🎯  Scaling complete.");
