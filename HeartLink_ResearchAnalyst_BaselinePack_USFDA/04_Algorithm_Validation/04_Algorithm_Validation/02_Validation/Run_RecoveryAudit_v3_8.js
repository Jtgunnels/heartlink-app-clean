// ---------------------------------------------------------------------------
// HeartLink v3.8 — Recovery Clamp Audit Runner
// ---------------------------------------------------------------------------
// Evaluates how fast Orange→Green transitions occur and if clamp (2 days) holds.
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import calculateScore from "../../01_Algorithms/calculateScore_v3_8.js";
import "../02_Validation/Verify_ConfigLock_v3_8.js"; // auto-check constants

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATE = new Date().toISOString().slice(0, 10);

const IN_FILE = path.join(__dirname, "RecoveryAuditScenarios.json");
const OUT_DIR = path.join(__dirname, `../03_Results/RecoveryAudit_${DATE}`);
const OUT_CSV = path.join(OUT_DIR, "results_v3_8.csv");
const OUT_SUM = path.join(OUT_DIR, "results_v3_8.summary.json");

fs.mkdirSync(OUT_DIR, { recursive: true });

const scenarios = JSON.parse(fs.readFileSync(IN_FILE, "utf8"));
const rows = ["id,phase,category,score,FP,FN"];

let FP = 0, FN = 0, benign = 0, acute = 0;

for (const s of scenarios) {
  const r = calculateScore(s.input, s.baseline, s.hist);
  const predictedAlert = ["Yellow", "Orange", "Red"].includes(r.category) ? 1 : 0;

  if (predictedAlert === 1 && s.expected_alert === 0) FP++;
  if (predictedAlert === 0 && s.expected_alert === 1) FN++;
  if (s.expected_alert === 0) benign++; else acute++;

  rows.push(`${s.id},${s.notes},${r.category},${r.normalized},${predictedAlert},${FN}`);
}

fs.writeFileSync(OUT_CSV, rows.join("\n"), "utf8");

const FP_rate = +(FP / benign * 100).toFixed(2);
const FN_rate = +(FN / acute * 100).toFixed(2);

const summary = {
  total_cases: scenarios.length,
  FP, FN, benign, acute,
  FP_rate_pct: FP_rate,
  FN_rate_pct: FN_rate,
  specificity_pct: +(100 - FP_rate).toFixed(2),
  sensitivity_pct: +(100 - FN_rate).toFixed(2),
  version: "3.8.OPT2025-10-12",
  date: DATE
};

fs.writeFileSync(OUT_SUM, JSON.stringify(summary, null, 2));
console.table(summary);
console.log(`✅ Results saved → ${OUT_DIR}`);
