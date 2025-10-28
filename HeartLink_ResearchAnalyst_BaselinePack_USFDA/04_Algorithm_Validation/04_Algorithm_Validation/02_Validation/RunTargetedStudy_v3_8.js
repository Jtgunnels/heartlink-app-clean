// HeartLink — Run targeted scenarios through v3.8 and log FP/FN
// Inputs: ./Trial_v3_8_Optimization_<date>/TargetedScenarios.json
// Outputs (same folder): results_v3_8.csv, results_v3_8.summary.json

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// locate latest Trial_v3_8_Optimization_* folder
const trialsRoot = __dirname;
const trialDirs = fs.readdirSync(trialsRoot)
  .filter(d => d.startsWith("Trial_v3_8_Optimization_"))
  .map(d => path.join(trialsRoot, d))
  .filter(p => fs.statSync(p).isDirectory())
  .sort(); // lexicographic by date suffix
if (trialDirs.length === 0) {
  console.error("❌ No Trial_v3_8_Optimization_* folder found. Run the generator first.");
  process.exit(1);
}
const TRIAL_DIR = trialDirs[trialDirs.length - 1];
const INPUT_FILE = path.join(TRIAL_DIR, "TargetedScenarios.json");

// algorithms path (two levels up to 01_Algorithms)
const ALG_DIR = path.resolve(__dirname, "../../01_Algorithms");
const ALG38   = path.join(ALG_DIR, "calculateScore_v3_8.js");
if (!fs.existsSync(ALG38)) {
  console.error(`❌ Missing v3.8 algorithm at ${ALG38}`);
  process.exit(1);
}
const mod38 = await import(pathToFileURL(ALG38).href);
const calc38 = mod38.default ?? mod38.calculateScore_v3_8;

// read scenarios (tolerant)
let raw = fs.readFileSync(INPUT_FILE, "utf8").replace(/^\uFEFF/, "").trimStart();
if (!raw.startsWith("[")) raw = raw.slice(raw.indexOf("["));
const scenarios = JSON.parse(raw);
console.log(`📦 Loaded ${scenarios.length} scenarios from ${path.basename(INPUT_FILE)}.`);

// run cases
const OUT_CSV = path.join(TRIAL_DIR, "results_v3_8.csv");
const OUT_SUM = path.join(TRIAL_DIR, "results_v3_8.summary.json");
const header = [
  "id","trialGroup","timestamp","expected_alert",
  "category","normalized","predictedAlert","FP","FN","notes"
];
const rows = [header.join(",")];

let benign=0, acute=0, FPs=0, FNs=0;
for (const c of scenarios) {
  const { id, trialGroup, timestamp, input={}, baseline={}, hist={}, expected_alert=0, notes="" } = c;
  const r = await calc38(input, baseline, hist, false);
  const predictedAlert = ["Yellow","Orange","Red"].includes(r.category) ? 1 : 0;
  const FP = (predictedAlert===1 && expected_alert===0) ? 1 : 0;
  const FN = (predictedAlert===0 && expected_alert===1) ? 1 : 0;

  if (expected_alert===0) benign++; else acute++;
  FPs += FP; FNs += FN;

  rows.push([
    id, trialGroup, timestamp, expected_alert,
    r.category, r.normalized, predictedAlert, FP, FN,
    String(notes).replaceAll(",",";")
  ].join(","));
}

fs.writeFileSync(OUT_CSV, rows.join("\n"), "utf8");

const summary = {
  total_cases: scenarios.length,
  benign_cases: benign,
  acute_cases: acute,
  FP: FPs,
  FN: FNs,
  FP_rate_pct: benign ? Number((FPs/benign*100).toFixed(1)) : 0,
  FN_rate_pct: acute ? Number((FNs/acute*100).toFixed(1)) : 0,
  specificity_pct: benign ? Number((100 - (FPs/benign*100)).toFixed(1)) : 100,
  sensitivity_pct: acute ? Number((100 - (FNs/acute*100)).toFixed(1)) : 100,
  csv_path: OUT_CSV
};
fs.writeFileSync(OUT_SUM, JSON.stringify(summary, null, 2), "utf8");

console.log("\n===== HeartLink v3.8 Targeted Study Complete =====");
console.table(summary);
console.log(`CSV → ${OUT_CSV}`);
