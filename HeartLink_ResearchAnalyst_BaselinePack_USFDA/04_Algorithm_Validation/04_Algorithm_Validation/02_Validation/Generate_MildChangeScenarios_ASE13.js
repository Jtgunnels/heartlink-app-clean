/**
 * HeartLink ASE 1.3 – Mild-Change Scenario Generator
 * ---------------------------------------------------
 * Creates a synthetic dataset of mild or borderline-worsening cases
 * for validating Yellow/Orange thresholds and sensitivity.
 *
 * Output:
 *   MildChangeScenarios_ASE13.json  (same folder)
 *
 * Usage:
 *   node Generate_MildChangeScenarios_ASE13.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======= tunable parameters =======
const NUM_CASES = 100;       // how many scenarios to generate
const SEED = 42;             // random seed for reproducibility
const MAX_DELTA = 0.5;       // max numeric rise from baseline (mild-moderate)
const BASELINE_RANGE = [1.0, 1.8];
const VARIANCE = 0.4;        // random noise ± range
const OUT_PATH = path.join(__dirname, "MildChangeScenarios_ASE13.json");
// =================================

// deterministic pseudo-random
let seed = SEED;
function rand() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}
function randRange(min, max) {
  return min + rand() * (max - min);
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

const scenarios = [];
const now = new Date();
const baselineDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

for (let i = 0; i < NUM_CASES; i++) {
  const id = `mild_${(i + 1).toString().padStart(4, "0")}`;
  const cohort = "MildChange";

  // baseline values
  const baseline = {
    sob: +(randRange(...BASELINE_RANGE).toFixed(1)),
    edema: +(randRange(...BASELINE_RANGE).toFixed(1)),
    fatigue: +(randRange(...BASELINE_RANGE).toFixed(1)),
    baselineSavedAt: baselineDate,
  };

  // small random deltas
  const deltas = {
    sob: +(randRange(0, MAX_DELTA).toFixed(1)),
    edema: +(randRange(0, MAX_DELTA).toFixed(1)),
    fatigue: +(randRange(0, MAX_DELTA).toFixed(1)),
  };

  // randomly decide which are worse or same (≈60% worse)
  const compare = {};
  for (const k of ["sob", "edema", "fatigue"]) {
    const isWorse = rand() < 0.6;
    compare[`${k}Compare`] = isWorse ? "Worse" : "Same";
  }

  const input = {
    sob: +(baseline.sob + (compare.sobCompare === "Worse" ? deltas.sob : 0)).toFixed(1),
    edema: +(baseline.edema + (compare.edemaCompare === "Worse" ? deltas.edema : 0)).toFixed(1),
    fatigue: +(baseline.fatigue + (compare.fatigueCompare === "Worse" ? deltas.fatigue : 0)).toFixed(1),
    ...compare,
  };

  // synthetic prior history near threshold
  const histScores = [
    +(baseline.sob + baseline.edema + baseline.fatigue) / 3,
    +(input.sob + input.edema + input.fatigue) / 3 + randRange(-0.1, 0.3),
  ].map(v => +v.toFixed(2));

  const hist = {
    categories: ["Green", "Yellow"],
    cardCategories: ["Green", "Yellow"],
    normalizedScores: histScores,
    wsSeries: histScores,
  };

  scenarios.push({ id, cohort, input, baseline, hist });
}

fs.writeFileSync(OUT_PATH, JSON.stringify(scenarios, null, 2));
console.log(`✅ Generated ${NUM_CASES} mild-change scenarios`);
console.log(`📄 Saved to: ${OUT_PATH}`);
