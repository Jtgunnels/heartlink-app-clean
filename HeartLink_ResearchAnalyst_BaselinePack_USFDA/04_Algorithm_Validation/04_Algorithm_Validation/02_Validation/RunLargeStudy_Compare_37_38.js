// ---------------------------------------------------------------------------
// HeartLink Large-Scale Study – v3.7 vs v3.8
// Pure ESM version – comment-tolerant input, verified paths, single CSV/JSON
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

// Identify current file/folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// PATHS
// ---------------------------------------------------------------------------

// 01_Algorithms directory (two levels up)
const ALG_DIR = path.resolve(__dirname, "../../01_Algorithms");
const ALG37 = path.join(ALG_DIR, "calculateScore_v3_7.js");
const ALG38 = path.join(ALG_DIR, "calculateScore_v3_8.js");

// Input & Output locations
const INPUT_FILE = path.resolve(__dirname, "./TestScenarios_Bulk.json");
const OUT_DIR = path.resolve(__dirname, "./Trial_v3_8_Validation");
const OUT_CSV = path.join(OUT_DIR, "large_study_v3_7_vs_v3_8.csv");
const OUT_SUMMARY = path.join(OUT_DIR, "large_study_v3_7_vs_v3_8.summary.json");

// Ensure output dir exists
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// VERIFY ALGORITHM FILES
// ---------------------------------------------------------------------------

for (const file of [ALG37, ALG38]) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Cannot locate required algorithm file:\n   ${file}`);
    process.exit(1);
  }
}
console.log("✅ Located both algorithm versions.");

// Dynamic imports
const mod37 = await import(pathToFileURL(ALG37).href);
const mod38 = await import(pathToFileURL(ALG38).href);

const calc37 = mod37.default ?? mod37.calculateScore_v3_7;
const calc38 = mod38.default ?? mod38.calculateScore_v3_8;

// ---------------------------------------------------------------------------
// LOAD AND PARSE SCENARIOS (COMMENT-TOLERANT)
// ---------------------------------------------------------------------------

function parseCommentedJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Input file not found:\n   ${filePath}`);
    process.exit(1);
  }
  let txt = fs.readFileSync(filePath, "utf8");
  // Remove "//" comment lines
  txt = txt
    .split("\n")
    .filter(line => !line.trim().startsWith("//"))
    .join("\n");
  try {
    const data = JSON.parse(txt);
    if (!Array.isArray(data)) throw new Error("Top-level JSON must be an array of cases.");
    return data;
  } catch (err) {
    console.error(`❌ Failed to parse JSON (${path.basename(filePath)}):`, err.message);
    process.exit(1);
  }
}

const scenarios = parseCommentedJSON(INPUT_FILE);
console.log(`📦 Loaded ${scenarios.length} scenarios from ${path.basename(INPUT_FILE)}.`);

// ---------------------------------------------------------------------------
// COMPARISON RUN
// ---------------------------------------------------------------------------

const header = [
  "id",
  "name",
  "trialGroup",
  "v3_7_category",
  "v3_8_category",
  "v3_7_norm",
  "v3_8_norm",
  "Δnorm",
  "changed"
];
const rows = [header.join(",")];

let matches = 0;
let within1 = 0;

function catRank(c) {
  const map = { Green: 0, Yellow: 1, Orange: 2, Red: 3, StableAdvanced: 2.5 };
  return map[c] ?? 0;
}

for (const [i, c] of scenarios.entries()) {
  const { id, name, trialGroup, input = {}, baseline = {}, hist = {} } = c;
  try {
    const r7 = await calc37(input, baseline, hist, false);
    const r8 = await calc38(input, baseline, hist, false);
    const dn = Number((r8.normalized - r7.normalized).toFixed(2));
    const changed = r7.category !== r8.category;
    if (!changed) matches++;
    const dist = Math.abs(catRank(r7.category) - catRank(r8.category));
    if (dist <= 1) within1++;

    rows.push([
      id || i + 1,
      (name || "").replaceAll(",", ";"),
      trialGroup || "",
      r7.category,
      r8.category,
      r7.normalized,
      r8.normalized,
      dn,
      changed
    ].join(","));
  } catch (err) {
    console.warn(`⚠️  Case ${id || i + 1} failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// OUTPUTS
// ---------------------------------------------------------------------------

fs.writeFileSync(OUT_CSV, rows.join("\n"), "utf8");

const summary = {
  total_cases: scenarios.length,
  exact_matches: matches,
  within1_category: within1,
  accuracy_pct: ((matches / scenarios.length) * 100).toFixed(1),
  tolerance_pct: ((within1 / scenarios.length) * 100).toFixed(1),
  csv_path: OUT_CSV,
  timestamp: new Date().toISOString()
};
fs.writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2), "utf8");

console.log("\n===== Large-Scale Study Complete =====");
console.table(summary);
console.log(`CSV → ${OUT_CSV}`);
console.log(`JSON → ${OUT_SUMMARY}`);
console.log("=====================================\n");
