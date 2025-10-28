import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import calculateScore from "./calculateScore_ASE13f_FINAL_CL.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATE = new Date().toISOString().slice(0, 10);

const FILE_MILD = path.join(__dirname, "MildChangeScenarios_ASE13.json");
const OUT_CSV   = path.join(__dirname, `MildChange_ASE13g_Results_${DATE}.csv`);
const OUT_SUM   = path.join(__dirname, `MildChange_ASE13g_Summary_${DATE}.json`);

function loadJSON(fp) {
  if (!fs.existsSync(fp)) {
    console.error("File missing:", fp);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(fp, "utf8"));
  console.log(`Loaded ${data.length} mild-change cases from ${path.basename(fp)}`);
  return data;
}

const mildCases = loadJSON(FILE_MILD);

let TP = 0, FN = 0;
const rows = ["id,cohort,normalized,category,alert,correct"];

for (const s of mildCases) {
  try {
    const res = calculateScore(s.input || {}, s.baseline || {}, s.hist || {});
    const category = res?.category || "Undefined";
    const alert = ["Yellow", "Orange", "Red"].includes(category);
    if (alert) TP++; else FN++;
    const correct = alert ? "pass" : "fail";
    rows.push(`${s.id},${s.cohort || ""},${res.normalized.toFixed(2)},${category},${alert ? 1 : 0},${correct}`);
  } catch (e) {
    console.error("Error case", s.id, e.message);
    rows.push(`${s.id},${s.cohort || ""},0,Error,0,"fail"`);
    FN++;
  }
}

// Summary
const total = TP + FN;
const sensitivity = total ? (TP / total) * 100 : 0;

const summary = {
  total_cases: total,
  true_positives: TP,
  false_negatives: FN,
  sensitivity_pct: +sensitivity.toFixed(2),
  version: calculateScore({}, {}, {}).version,
  date: DATE
};

fs.writeFileSync(OUT_CSV, rows.join("\n"), "utf8");
fs.writeFileSync(OUT_SUM, JSON.stringify(summary, null, 2), "utf8");

console.table(summary);
console.log("Results CSV:", OUT_CSV);
console.log("Summary JSON:", OUT_SUM);
