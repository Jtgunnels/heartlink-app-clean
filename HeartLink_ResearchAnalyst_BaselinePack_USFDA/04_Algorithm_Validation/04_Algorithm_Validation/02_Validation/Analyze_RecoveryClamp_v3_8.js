// ---------------------------------------------------------------------------
// HeartLink v3.8 — Recovery Clamp Visual Analyzer
// ---------------------------------------------------------------------------
// Reads RecoveryAudit results and plots average category transition
// to confirm ~2-day Orange→Green clamp behavior.
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "nodeplotlib";
const { plot } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- locate most recent RecoveryAudit results ----
const resultsRoot = path.join(__dirname, "../03_Results");
const dirs = fs.readdirSync(resultsRoot).filter(d => d.startsWith("RecoveryAudit_"));
if (dirs.length === 0) {
  console.error("❌ No RecoveryAudit results found.");
  process.exit(1);
}
dirs.sort();
const latestDir = path.join(resultsRoot, dirs.at(-1));
const csvPath = path.join(latestDir, "results_v3_8.csv");
console.log(`📄 Using latest RecoveryAudit file → ${csvPath}`);

// ---- read and parse ----
const rows = fs.readFileSync(csvPath, "utf8").split(/\r?\n/).slice(1).filter(Boolean);
const phaseMap = {}; // day-phase averages

for (const line of rows) {
  const [id, notes, category, normalized] = line.split(",");
  const phase = parseInt(id.split("_")[1]) % 5; // simulated day
  const catVal = category === "Green" ? 1 : category === "Yellow" ? 2 : 3;
  if (!phaseMap[phase]) phaseMap[phase] = [];
  phaseMap[phase].push(catVal);
}

// ---- compute averages ----
const days = Object.keys(phaseMap).map(Number).sort((a,b)=>a-b);
const avgVals = days.map(d =>
  phaseMap[d].reduce((a,b)=>a+b,0) / phaseMap[d].length
);
const avgCats = avgVals.map(v =>
  v <= 1.5 ? "Green" : v <= 2.5 ? "Yellow" : "Orange"
);

console.log("\n🩺 Recovery Clamp Average Categories by Day");
days.forEach((d,i)=>console.log(`Day ${d+1}: ${avgCats[i]} (${avgVals[i].toFixed(2)})`));

// ---- plot ----
plot(
  [
    {
      x: days.map(d => d + 1),
      y: avgVals,
      type: "scatter",
      mode: "lines+markers",
      name: "Average Category Index",
      line: { shape: "spline" },
    },
  ],
  {
    title: "HeartLink v3.8 Recovery Clamp Behavior",
    xaxis: { title: "Simulated Day" },
    yaxis: {
      title: "Average Category (1=Green, 2=Yellow, 3=Orange)",
      dtick: 1,
      range: [1, 3.5],
    },
  }
);



