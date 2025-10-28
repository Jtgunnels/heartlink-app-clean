// ---------------------------------------------------------------------------
// HeartLink v3.8 — Chronic Stability Analyzer
// ---------------------------------------------------------------------------
// Reads results_v3_8.csv from the most recent ChronicStability trial,
// computes FP rate per noise bin, and plots stability persistence.
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "nodeplotlib";
const { plot } = pkg;   // CommonJS interop

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- locate latest ChronicStability result ----
const resultsRoot = path.join(__dirname, "../03_Results");
const dirs = fs.readdirSync(resultsRoot).filter(d => d.startsWith("ChronicStability_"));
if (dirs.length === 0) {
  console.error("❌ No ChronicStability results found.");
  process.exit(1);
}
dirs.sort();
const latestDir = path.join(resultsRoot, dirs.at(-1));
const csvPath = path.join(latestDir, "results_v3_8.csv");
console.log(`📄 Using latest file → ${csvPath}`);

// ---- read & parse ----
const rows = fs.readFileSync(csvPath, "utf8").split(/\r?\n/).slice(1).filter(Boolean);

// noise proxy = normalized score spread (1.0–3.0 roughly)
const bins = { low: [], med: [], high: [] };
for (const line of rows) {
  const [id, category, scoreStr, alertFlagStr] = line.split(",");
  const score = parseFloat(scoreStr);
  const alertFlag = parseInt(alertFlagStr);
  if (isNaN(score)) continue;

  const band = score < 1.8 ? "low" : score < 2.4 ? "med" : "high";
  bins[band].push(alertFlag);
}

const calcRate = arr =>
  arr.length === 0 ? 0 : (arr.reduce((a,b)=>a+b,0) / arr.length) * 100;

const FP_low = calcRate(bins.low);
const FP_med = calcRate(bins.med);
const FP_high = calcRate(bins.high);
const overallFP = calcRate([...bins.low, ...bins.med, ...bins.high]);

console.log("\n🩺 False-Positive Rates by Noise Band");
console.table({
  "Low Noise (≤1.8)": FP_low.toFixed(2)+"%",
  "Medium Noise (1.8–2.4)": FP_med.toFixed(2)+"%",
  "High Noise (≥2.4)": FP_high.toFixed(2)+"%",
  "Overall": overallFP.toFixed(2)+"%"
});

// ---- plot ----
plot(
  [
    {
      x: ["Low", "Medium", "High"],
      y: [FP_low, FP_med, FP_high],
      type: "bar",
      marker: { color: ["#5cb85c", "#f0ad4e", "#d9534f"] },
      name: "FP Rate %",
    },
  ],
  {
    title: "HeartLink v3.8 — False-Positive Rate vs Noise Level",
    xaxis: { title: "Noise Level" },
    yaxis: { title: "False Positive Rate (%)", range: [0, Math.max(5, FP_high + 1)] },
  }
);
