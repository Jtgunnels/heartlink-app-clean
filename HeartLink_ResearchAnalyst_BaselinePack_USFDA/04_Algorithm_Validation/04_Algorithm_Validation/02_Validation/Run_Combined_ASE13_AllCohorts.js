// ---------------------------------------------------------------------------
// HeartLink – ASE 1.3f Combined Trial Runner (Stable + Mild + Acute + High Diversity)
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Import the clinical-lock algorithm
import calculateScore from "./calculateScore_ASE13f_FINAL_CL.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATE = new Date().toISOString().slice(0, 10);

// ----- Input files
const BASE_DIR = __dirname;
const FILE_STABLE = path.join(BASE_DIR, "ChronicStabilityScenarios_ASE13_x4.json");
const FILE_MILD   = path.join(BASE_DIR, "MildChangeScenarios_ASE13_x4.json");
const FILE_ACUTE  = path.join(BASE_DIR, "AcuteDecompensationScenarios_ASE13_x4.json");
const FILE_HIGH   = path.join(BASE_DIR, "HighDiversityScenarios_ASE13_x4.json");

// ----- Outputs
const OUT_CSV     = path.join(BASE_DIR, `Phase_B2_ASE13_Overlay_AllCohorts_Results_${DATE}.csv`);
const OUT_SUMMARY = path.join(BASE_DIR, `Phase_B2_ASE13_Overlay_AllCohorts_Summary_${DATE}.json`);

// ----- Helpers
function loadJSON(fp) {
  if (!fs.existsSync(fp)) {
    console.error(`❌ Missing file: ${fp}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(fp, "utf8"));
  console.log(`✅ Loaded ${data.length} from ${path.basename(fp)}`);
  return data;
}

// ----- Version sanity check
try {
  const version = calculateScore({}, {}, {}).version;
  console.log("Algorithm version check:", version);
} catch (e) {
  console.error("❌ Could not retrieve algorithm version:", e.message);
}

// ----- Load datasets
const stableCases = loadJSON(FILE_STABLE).map(x => ({ ...x, label: "stable" }));
const mildCases   = loadJSON(FILE_MILD).map(x => ({ ...x, label: "mild" }));
const acuteCases  = loadJSON(FILE_ACUTE).map(x => ({ ...x, label: "acute" }));
const highCases   = loadJSON(FILE_HIGH).map(x => ({ ...x, label: "highdiverse" }));
const allCases    = [...stableCases, ...mildCases, ...acuteCases, ...highCases];

// ----- Metrics
let TP = 0, TN = 0, FP = 0, FN = 0;
const colorCount = { Neutral: 0, Green: 0, Yellow: 0, Orange: 0, Red: 0, Undefined: 0 };
const rows = ["id,cohort,label,category,normalized,alertFlag,correct"];

// ----- Evaluate all scenarios
for (const s of allCases) {
  try {
    const input    = s.input || {};
    const baseline = s.baseline || {};
    const hist     = s.hist || {};
    const res      = calculateScore(input, baseline, hist);

    const category = res?.category || "Undefined"; // ✅ corrected key
    const score    = Number(res?.normalized ?? 0);
    const alert    = ["Yellow", "Orange", "Red"].includes(category);

    if (s.label === "stable") {
      if (!alert) TN++; else FP++;
    } else if (s.label === "mild" || s.label === "acute") {
      if (alert) TP++; else FN++;
    }

    colorCount[category] = (colorCount[category] || 0) + 1;

    const correct =
      (s.label === "stable" && !alert) ||
      ((s.label === "mild" || s.label === "acute") && alert) ? "✔️" : "❌";

    rows.push(
      `${s.id},${s.cohort || ""},${s.label},${category},${score.toFixed(2)},${alert ? 1 : 0},${correct}`
    );
  } catch (e) {
    console.error(`❌ Error on ${s.id}:`, e.message);
    rows.push(`${s.id},${s.cohort || ""},${s.label},Error,0,0,❌`);
    colorCount.Undefined++;
  }
}

// ----- Summary metrics
const total = TP + TN + FP + FN;
const sensitivity = total ? (TP / (TP + FN)) * 100 : 0;
const specificity = total ? (TN / (TN + FP)) * 100 : 0;
const fpr         = total ? (FP / (FP + TN)) * 100 : 0;
const accuracy    = total ? ((TP + TN) / total) * 100 : 0;

// ----- Color distribution %
const colorPct = {};
for (const [k, v] of Object.entries(colorCount)) {
  colorPct[k] = allCases.length ? +((v / allCases.length) * 100).toFixed(2) : 0;
}

// ----- Write outputs
fs.writeFileSync(OUT_CSV, rows.join("\n"), "utf8");

const summary = {
  total_cases: allCases.length,
  stable_cases: stableCases.length,
  mild_cases: mildCases.length,
  acute_cases: acuteCases.length,
  true_positives: TP,
  true_negatives: TN,
  false_positives: FP,
  false_negatives: FN,
  sensitivity_pct: +sensitivity.toFixed(2),
  specificity_pct: +specificity.toFixed(2),
  false_positive_rate_pct: +fpr.toFixed(2),
  accuracy_pct: +accuracy.toFixed(2),
  color_distribution_count: colorCount,
  color_distribution_pct: colorPct,
  version: calculateScore({}, {}, {}).version, // ✅ dynamic version tag
  date: DATE,
  source_files: [
    path.basename(FILE_STABLE),
    path.basename(FILE_MILD),
    path.basename(FILE_ACUTE),
    path.basename(FILE_HIGH)
  ]
};

fs.writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2), "utf8");
console.table(summary);
console.log("Color distribution (%):", colorPct);
console.log(`✅ Results saved:\n  • ${OUT_CSV}\n  • ${OUT_SUMMARY}`);
