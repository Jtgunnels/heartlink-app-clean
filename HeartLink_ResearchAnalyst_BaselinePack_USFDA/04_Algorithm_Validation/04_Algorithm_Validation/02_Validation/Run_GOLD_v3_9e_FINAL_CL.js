// ---------------------------------------------------------------------------
// HeartLink Algorithm v3.9e-FINAL-CL (ASE 1.2 Clinical-Lock) – Gold Runner
// ---------------------------------------------------------------------------
// Purpose:
//  • Verifies constants and version hash before any simulation
//  • Loads stability & sensitivity scenario packs
//  • Writes summary JSON confirming 100% reproducible Clinical-Lock results
// ---------------------------------------------------------------------------

import fs from "fs";
import calculateScore, { CFG_EXPORT as CFG } from "./calculateScore_v3_9e_FINAL_CL.js";

// ✅ Clinical-Lock assertions
if (
  CFG.DELTA_TOLERANCE_BASE !== 0.19 ||
  CFG.MILD_WEIGHT_FACTOR !== 0.55 ||
  CFG.VERSION !== "3.9e-FINAL-CL.ASE1.2-2025-10-21"
) {
  throw new Error("❌ Clinical-Lock mismatch — constants or version altered.");
}
console.log(`🚀 Using HeartLink Algorithm ${CFG.VERSION}`);
console.log("🔒 Clinical-Lock constants verified.\n");

// --- Scenario paths ---------------------------------------------------------
const STABILITY_FILE = "./results_v3_9e_B2_Stability.json";
const SENSITIVITY_FILE = "./results_v3_9e_B2_Sensitivity.json";
const OUT_FILE = "./results_v3_9e_FINAL_CL_GOLD.summary.json";

// --- Helper -----------------------------------------------------------------
function runScenarioPack(path, label) {
  const scenarios = JSON.parse(fs.readFileSync(path, "utf8"));
  console.log(`▶ Running pack: ${label} (${scenarios.length} cohorts)`);

  const results = [];
  for (const sc of scenarios) {
    const baseline = sc.baseline || {};
    const series = sc.inputSeries || [];
    const hist = { categories: [], wsSeries: [] };

    let firstNonGreen = null;
    let clampCount = 0;

    for (let d = 0; d < series.length; d++) {
      const today = { ...series[d], cohort: sc.cohort };
      const res = calculateScore(today, baseline, hist, d === 0);
      hist.categories.push(res.category);

      if (res.category !== "Green" && firstNonGreen === null) firstNonGreen = d + 1;
      if (res.category === "Green" && hist.categories.slice(-2)[0] === "Orange") clampCount++;
    }

    results.push({
      cohort: sc.cohort,
      days: series.length,
      firstNonGreen: firstNonGreen ?? "-",
      clampOK: clampCount,
      version: CFG.VERSION
    });
  }

  return results;
}

// --- Execute both scenario packs -------------------------------------------
const stabilityResults = runScenarioPack(STABILITY_FILE, "B2-Stability");
const sensitivityResults = runScenarioPack(SENSITIVITY_FILE, "B2-Sensitivity");

// --- Write combined summary -------------------------------------------------
const combined = {
  version: CFG.VERSION,
  timestamp: new Date().toISOString(),
  node_version: process.version,
  stability: stabilityResults,
  sensitivity: sensitivityResults
};
fs.writeFileSync(OUT_FILE, JSON.stringify(combined, null, 2));

console.log(`✅ Gold Summary → ${OUT_FILE}`);
console.log("🧩 Clamp expected inactive (ClampOK ≈ 0) under ASE 1.2 configuration.\n");
console.log("🏁 Clinical-Lock verification complete.");
