// ---------------------------------------------------------------------------
// HeartLink ASE 1.3 Combined Trial Runner  – Overlay / No-Clamp Build
// ---------------------------------------------------------------------------
// Merges Chronic-Stability + Acute-Decompensation datasets,
// computes sensitivity / specificity / accuracy,
// and now logs a full color-distribution breakdown.
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import calculateScore_ASE13 from "./calculateScore_v3_9e_FINAL_CL.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATE = new Date().toISOString().slice(0, 10);

// ---- file paths (flat structure)
const BASE_DIR = __dirname;
const FILE_STABLE = path.join(BASE_DIR, "ChronicStabilityScenarios_ASE13.json");
const FILE_ACUTE = path.join(BASE_DIR, "AcuteDecompensationScenarios_ASE13.json");
const OUT_CSV = path.join(BASE_DIR, `Phase_B2_ASE13_Overlay_Combined_Results_${DATE}.csv`);
const OUT_SUMMARY = path.join(BASE_DIR, `Phase_B2_ASE13_Overlay_Combined_Summary_${DATE}.json`);

// ---- helper to load JSON
function loadJSON(fp) {
  if (!fs.existsSync(fp)) {
    console.error(`❌ Missing file: ${fp}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(fp, "utf8"));
  console.log(`✅ Loaded ${data.length} from ${path.basename(fp)}`);
  return data;
}

// ---- read both scenario sets
const stableCases = loadJSON(FILE_STABLE).map(x => ({ ...x, label: "stable" }));
const acuteCases  = loadJSON(FILE_ACUTE).map(x => ({ ...x, label: "acute" }));
const allCases = [...stableCases, ...acuteCases];

// ---- initialize counters
let TP = 0, TN = 0, FP = 0, FN = 0;
const colorCount = { Neutral: 0, Green: 0, Yellow: 0, Orange: 0, Red: 0, Undefined: 0 };
const rows = ["id,cohort,label,cardCategory,normalized,alertFlag,correct"];

// ---- run algorithm for each scenario
for (const s of allCases) {
  try {
    const res = calculateScore_ASE13(s.input || {}, s.baseline || {}, s.hist || {});
    const category = res?.cardCategory || "Undefined";
    const score = Number(res?.normalized ?? 0);
    const alert = ["Yellow", "Orange", "Red"].includes(category);

    // classification accounting
    if (s.label === "stable" && !alert) TN++;
    else if (s.label === "stable" && alert) FP++;
    else if (s.label === "acute" && alert) TP++;
    else if (s.label === "acute" && !alert) FN++;

    colorCount[category] = (colorCount[category] || 0) + 1;

    const correct =
      (s.label === "stable" && !alert) || (s.label === "acute" && alert) ? "✔️" : "❌";

    rows.push(
      `${s.id},${s.cohort},${s.label},${category},${score.toFixed(2)},${alert ? 1 : 0},${correct}`
    );
  } catch (e) {
    console.error(`❌ ${s.id}:`, e.message);
    rows.push(`${s.id},${s.cohort},${s.label},Error,0,0,❌`);
    colorCount.Undefined++;
  }
}

// ---- metrics
const total = TP + TN + FP + FN;
const sens = total ? (TP / (TP + FN)) * 100 : 0;
const spec = total ? (TN / (TN + FP)) * 100 : 0;
const fpr  = total ? (FP / (FP + TN)) * 100 : 0;
const acc  = total ? ((TP + TN) / total) * 100 : 0;

// ---- color distribution %
const colorPct = {};
for (const [k, v] of Object.entries(colorCount)) {
  colorPct[k] = total ? +((v / total) * 100).toFixed(2) : 0;
}

// ---- outputs
fs.writeFileSync(OUT_CSV, rows.join("\n"), "utf8");

const summary = {
  total_cases: total,
  acute_cases: TP + FN,
  stable_cases: TN + FP,
  true_positives: TP,
  true_negatives: TN,
  false_positives: FP,
  false_negatives: FN,
  sensitivity_pct: +sens.toFixed(2),
  specificity_pct: +spec.toFixed(2),
  false_positive_rate_pct: +fpr.toFixed(2),
  accuracy_pct: +acc.toFixed(2),
  color_distribution_count: colorCount,
  color_distribution_pct: colorPct,
  version: "ASE_1.3_Overlay_NoClamp_NoCore",
  date: DATE,
  source_files: [
    path.basename(FILE_STABLE),
    path.basename(FILE_ACUTE)
  ]
};

fs.writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2));
console.table(summary);
console.log("Color distribution (%):", colorPct);
console.log(`✅ Combined results saved to: ${OUT_CSV}`);
