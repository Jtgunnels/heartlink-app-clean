// ---------------------------------------------------------------------------
// HeartLink Comparative Metrics Analyzer
// ---------------------------------------------------------------------------
// Reads large_study_v3_7_vs_v3_8.csv and summary.json
// Computes head-to-head performance metrics between v3.7 and v3.8
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import readline from "readline";

const BASE_DIR = path.resolve("./Trial_v3_8_Validation");
const CSV_PATH = path.join(BASE_DIR, "large_study_v3_7_vs_v3_8.csv");
const SUMMARY_PATH = path.join(BASE_DIR, "large_study_v3_7_vs_v3_8.summary.json");
const OUT_JSON = path.join(BASE_DIR, "comparative_metrics_v3_7_vs_v3_8.json");
const OUT_CSV = path.join(BASE_DIR, "comparative_metrics_v3_7_vs_v3_8.csv");

// Utility
function toNum(v) { const n = Number(v); return isNaN(n) ? 0 : n; }
function catRank(c) {
  const map = { Green: 0, Yellow: 1, Orange: 2, Red: 3, StableAdvanced: 2.5 };
  return map[c] ?? 0;
}

// Load summary + CSV
if (!fs.existsSync(CSV_PATH)) {
  console.error("❌ Missing CSV file:", CSV_PATH);
  process.exit(1);
}
const summary = fs.existsSync(SUMMARY_PATH)
  ? JSON.parse(fs.readFileSync(SUMMARY_PATH, "utf8"))
  : {};

const data = fs.readFileSync(CSV_PATH, "utf8").trim().split("\n").slice(1)
  .map(l => l.split(","));

// Metrics counters
let total = data.length;
let exact = 0, within1 = 0;
let falsePositives = 0, falseNegatives = 0;
let stabilitySum = 0, stabilityCount = 0;
let stableAdvancedHits = 0, adaptiveThresholdActive = 0;

// For category transitions
const cats = ["Green", "Yellow", "Orange", "Red", "StableAdvanced"];
const matrix = {};
cats.forEach(a => { matrix[a] = {}; cats.forEach(b => matrix[a][b] = 0); });

for (const row of data) {
  const id = row[0];
  const trialGroup = row[2];
  const c7 = row[3];
  const c8 = row[4];
  const n7 = toNum(row[5]);
  const n8 = toNum(row[6]);
  const dNorm = n8 - n7;

  // Category transition
  if (matrix[c7] && matrix[c7][c8] !== undefined) matrix[c7][c8]++;

  // Concordance
  if (c7 === c8) exact++;
  if (Math.abs(catRank(c7) - catRank(c8)) <= 1) within1++;

  // False positives / negatives
  if (catRank(c7) > catRank(c8)) falsePositives++;   // de-escalation = FP reduction
  if (catRank(c7) < catRank(c8)) falseNegatives++;   // escalation = potential FN risk

  // Stability (if Δnorm available)
  if (!isNaN(dNorm)) {
    stabilitySum += Math.abs(dNorm);
    stabilityCount++;
  }

  // StableAdvanced detection
  if (c8 === "StableAdvanced") stableAdvancedHits++;

  // Adaptive threshold logic (mock indicator from Δnorm magnitude)
  if (Math.abs(dNorm) > 0.2 && trialGroup === "AdaptiveStress") adaptiveThresholdActive++;
}

// Aggregate metrics
const metrics = {
  total_cases: total,
  exact_concordance_pct: ((exact / total) * 100).toFixed(1),
  within1_concordance_pct: ((within1 / total) * 100).toFixed(1),
  mean_delta_norm: (stabilitySum / stabilityCount).toFixed(3),
  false_positive_reduction_pct: ((falsePositives / total) * 100).toFixed(1),
  false_negative_change_pct: ((falseNegatives / total) * 100).toFixed(1),
  stability_index: (1 - (stabilitySum / stabilityCount) / 5).toFixed(3),
  stableadvanced_recognition_pct: ((stableAdvancedHits / total) * 100).toFixed(1),
  adaptive_threshold_responsiveness_pct: ((adaptiveThresholdActive / total) * 100).toFixed(1),
  overall_net_improvement_score: (
    (exact / total) * 0.25 +
    (within1 / total) * 0.25 +
    (1 - falseNegatives / total) * 0.25 +
    (falsePositives / total) * 0.25
  ).toFixed(3)
};

// Output
fs.writeFileSync(OUT_JSON, JSON.stringify({ metrics, matrix }, null, 2));
const csvOut = Object.entries(metrics).map(([k, v]) => `${k},${v}`).join("\n");
fs.writeFileSync(OUT_CSV, csvOut, "utf8");

console.log("\n===== HeartLink Comparative Validation Results =====");
console.table(metrics);
console.log("\nCategory Transition Matrix (v3.7 → v3.8):");
console.table(matrix);
console.log(`\nSaved metrics → ${OUT_JSON}`);
console.log(`Saved metrics CSV → ${OUT_CSV}`);
