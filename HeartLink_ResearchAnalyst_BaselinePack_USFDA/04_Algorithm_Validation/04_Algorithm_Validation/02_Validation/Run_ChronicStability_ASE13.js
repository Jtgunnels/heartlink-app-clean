// ---------------------------------------------------------------------------
// HeartLink ASE 1.3 — Chronic Stability Trial Runner (Overlay / No-Clamp Build)
// ---------------------------------------------------------------------------
// Evaluates false-positive rate under stable conditions (target <10 %)
// Works with calculateScore_ASE13 and ChronicStabilityScenarios_ASE13.json
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import calculateScore_ASE13 from "./calculateScore_v3_9e_FINAL_CL.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATE = new Date().toISOString().slice(0, 10);

// ---- File locations (flat structure)
const INPUT_PATH = path.join(__dirname, "ChronicStabilityScenarios_ASE13.json");
const OUT_DIR = path.join(__dirname);
const OUT_CSV = path.join(OUT_DIR, `Phase_B2_ASE13_Overlay_Results_${DATE}.csv`);
const OUT_SUMMARY = path.join(OUT_DIR, `Phase_B2_ASE13_Overlay_Summary_${DATE}.json`);

// ---- Verify input file
if (!fs.existsSync(INPUT_PATH)) {
  console.error(`❌ Scenario file not found: ${INPUT_PATH}`);
  console.error("Run convert_ChronicStability_to_ASE13.js first.");
  process.exit(1);
}

let scenarios;
try {
  const raw = fs.readFileSync(INPUT_PATH, "utf8");
  scenarios = JSON.parse(raw);
  console.log(`✅ Loaded ${scenarios.length} scenarios`);
  console.log("Example:", scenarios[0]);
} catch (err) {
  console.error("❌ Failed to load or parse input:", err.message);
  process.exit(1);
}

// ---- Initialize counters
const rows = ["id,cardCategory,normalized,alertFlag"];
let FP = 0;
let benign = 0;

// ---- Run algorithm per scenario
for (const s of scenarios) {
  try {
    const input = s.input || {};
    const baseline = s.baseline || {};
    const hist = s.hist || {};

    const result = calculateScore_ASE13(input, baseline, hist);

    // ASE 1.3 outputs `cardCategory`
    const category = result?.cardCategory || "Undefined";
    const score = Number(result?.normalized ?? 0);
    const alertFlag = ["Yellow", "Orange", "Red"].includes(category) ? 1 : 0;

    if (alertFlag === 1) FP++;
    benign++;

    if (benign <= 3) console.log(`🔬 Case ${s.id}:`, category, score);

    rows.push(`${s.id},${category},${score.toFixed(2)},${alertFlag}`);
  } catch (err) {
    console.error(`❌ Scenario ${s.id} error:`, err.message);
    rows.push(`${s.id},Error,0,0`);
  }
}

// ---- Aggregate stats
const categories = rows.slice(1).map(r => r.split(",")[1]);
const totalScores = rows.slice(1).map(r => parseFloat(r.split(",")[2]) || 0);
const uniqueCats = [...new Set(categories)];
const avgScore = totalScores.reduce((a, b) => a + b, 0) / totalScores.length;
const FP_rate = +(FP / benign * 100).toFixed(2);

// ---- Save outputs
fs.writeFileSync(OUT_CSV, rows.join("\n"), "utf8");
const summary = {
  total_cases: scenarios.length,
  FP,
  benign,
  FP_rate_pct: FP_rate,
  specificity_pct: +(100 - FP_rate).toFixed(2),
  unique_categories: uniqueCats,
  avg_score: avgScore.toFixed(2),
  version: "ASE_1.3_Overlay_NoClamp_NoCore",
  date: DATE,
  source: path.basename(INPUT_PATH)
};
fs.writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2));

console.table(summary);
console.log(`✅ Results saved to ${OUT_DIR}`);
if (uniqueCats.includes("[object Object]") || avgScore === 0) {
  console.warn("⚠️  Possible algorithm output issue — check import path.");
}
