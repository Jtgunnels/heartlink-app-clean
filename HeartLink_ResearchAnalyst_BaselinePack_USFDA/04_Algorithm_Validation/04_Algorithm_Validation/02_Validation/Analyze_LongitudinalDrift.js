// 04_Longitudinal/Analyze_LongitudinalDrift.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATE = new Date().toISOString().slice(0,10);
const SUM = path.join(__dirname, `../03_Results/Longitudinal_${DATE}/results_v3_8.summary.json`);
if (!fs.existsSync(SUM)) {
  console.error("❌ Run the longitudinal trial first.");
  process.exit(1);
}
const rows = JSON.parse(fs.readFileSync(SUM,"utf8"));

const issues = [];
for (const r of rows) {
  if (r.cohort==="Stable" && r.pct_green < 90) {
    issues.push(`Stable green too low (${r.pct_green}%): review noise guard & thresholds.`);
  }
  if (r.cohort==="RecoveryClampCheck" && r.orangeToGreenClampOK < r.patients*1.5) {
    issues.push(`Clamp may be too loose in RecoveryClampCheck (OK=${r.orangeToGreenClampOK}).`);
  }
  if (r.cohort==="CyclicNoiseLow" && r.FP_rate_pct > 8) {
    issues.push(`CyclicNoiseLow false alerts too high (${r.FP_rate_pct}%). Consider EMA extension.`);
  }
}
console.log("\n=== Heuristic QA flags ===");
console.log(issues.length ? issues.join("\n") : "No obvious issues detected.");
