// ---------------------------------------------------------------------------
// HeartLink v3.8 — Chronic Stability Trial Runner (Final Patched Version)
// ---------------------------------------------------------------------------
// Evaluates false-positive rate under stable conditions (should be < 5 %)
// Adds inline scenario verification and resilient file handling
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Adjust this import path if your algorithm is in a different folder
import calculateScore from "../../01_Algorithms/calculateScore_v3_8.js";
import "../02_Validation/Verify_ConfigLock_v3_8.js"; // optional integrity check

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATE = new Date().toISOString().slice(0, 10);

// ---- Define file structure
const INPUT_PATH = path.join(__dirname, "ChronicStabilityScenarios.json");
const OUT_DIR = path.join(__dirname, `../03_Results/ChronicStability_${DATE}`);
const OUT_CSV = path.join(OUT_DIR, "results_v3_8.csv");
const OUT_SUMMARY = path.join(OUT_DIR, "results_v3_8.summary.json");

// ---- Ensure output folder exists
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---- Load scenarios safely
if (!fs.existsSync(INPUT_PATH)) {
  console.error(`❌ Scenario file not found: ${INPUT_PATH}`);
  console.error("Run `node Generate_ChronicStabilityPack.js` first.");
  process.exit(1);
}

let scenarios;
try {
  const fileData = fs.readFileSync(INPUT_PATH, "utf8");
  scenarios = JSON.parse(fileData);
  console.log(`✅ Loaded ${scenarios.length} scenarios from ${INPUT_PATH}`);
  console.log("Example scenario:", scenarios[0]); // ✅ confirm structure
} catch (err) {
  console.error("❌ Failed to load or parse ChronicStabilityScenarios.json:", err.message);
  process.exit(1);
}

// ---- Initialize output
const rows = ["id,category,score,alertFlag"];
let FP = 0;
let benign = 0;

// ---- Process each scenario
for (const s of scenarios) {
  try {
    const input = s.input || {};
    const baseline = s.baseline || {};
    const hist = s.hist || {};

    // Call algorithm
    const result = calculateScore(input, baseline, hist);

    // ✅ Explicit category extraction
    const category = typeof result?.category === "string" ? result.category : "Undefined";
    const score = Number(result?.normalized ?? result?.score ?? 0);
    const alertFlag = ["Yellow", "Orange", "Red"].includes(category) ? 1 : 0;

    if (alertFlag === 1) FP++;
    benign++;

    // Optional debug: print first few results
    if (benign <= 3) console.log(`🔬 Case ${s.id}:`, result);

    // ✅ Explicitly stringify only the fields
    rows.push(`${s.id},${category},${score.toFixed(2)},${alertFlag}`);
  } catch (err) {
    console.error(`❌ Error running scenario ${s.id}:`, err.message);
    rows.push(`${s.id},Error,0,0`);
  }
}


// ---- Validate results
const uniqueCats = [...new Set(rows.slice(1).map(line => line.split(",")[1]))];
const totalScores = rows.slice(1).map(l => parseFloat(l.split(",")[2]) || 0);
const avgScore = totalScores.reduce((a, b) => a + b, 0) / totalScores.length;

// ---- Write results to disk
fs.writeFileSync(OUT_CSV, rows.join("\n"), "utf8");

const FP_rate = +(FP / benign * 100).toFixed(2);
const summary = {
  total_cases: scenarios.length,
  FP,
  benign,
  FP_rate_pct: FP_rate,
  specificity_pct: +(100 - FP_rate).toFixed(2),
  unique_categories: uniqueCats,
  avg_score: avgScore.toFixed(2),
  version: "3.8.OPT2025-10-12",
  date: DATE,
  source: INPUT_PATH
};

fs.writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2));
console.table(summary);
console.log(`✅ Results saved → ${OUT_DIR}`);

// ---- Safety checks
if (uniqueCats.includes("[object Object]") || avgScore === 0) {
  console.warn("\n⚠️  Warning: Possible algorithm or writer issue detected.");
  console.warn("   Check that calculateScore_v3_8.js is correctly imported and executed.\n");
}
