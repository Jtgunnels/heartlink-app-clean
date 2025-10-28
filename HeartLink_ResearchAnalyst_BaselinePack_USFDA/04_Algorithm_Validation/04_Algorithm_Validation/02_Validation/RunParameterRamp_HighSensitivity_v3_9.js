// ---------------------------------------------------------------------------
// HeartLink ASE 1.0 v3.9 – High-Sensitivity Verification Ramp
// ---------------------------------------------------------------------------
// Purpose: confirm that early acute detection (Yellow ≤ Day 16) activates
//          before running a full parameter sweep.
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import calculateScore from "./calculateScore_v3_9.js";

const SCENARIOS_FILE = "./LongitudinalDriftScenarios_TestSet.json";
const OUT_DIR = "./results_v3_9/high_sensitivity_" + new Date().toISOString().slice(0,10);
fs.mkdirSync(OUT_DIR, { recursive: true });

// --- Parameter grid (narrow, diagnostic) -----------------------------------
const grid = {
  ACUTE_WS_JUMP: [0.85, 0.8, 0.75],
  MILD_WEIGHT_FACTOR: [0.57, 0.60, 0.65],
  EMA_WINDOW_DAYS: [28, 24],
  EXTENDED_EMA_WINDOW: [34, 30],
  RECOVERY_CREDIT: [1.25],
  RECOVERY_GREEN_BAND: [3.8],
};

// --- Load scenario pack ----------------------------------------------------
if (!fs.existsSync(SCENARIOS_FILE)) {
  console.error(`❌ Scenario pack not found: ${SCENARIOS_FILE}`);
  process.exit(1);
}
const scenarios = JSON.parse(fs.readFileSync(SCENARIOS_FILE, "utf8"));
console.log(`Loaded ${scenarios.length} scenarios.`);

// --- Helpers ---------------------------------------------------------------
const isNonGreen = c => c === "Yellow" || c === "Orange" || c === "Red";
const isOrangePlus = c => c === "Orange" || c === "Red";
function toInputs(sc) {
  if (Array.isArray(sc.inputSeries)) return sc.inputSeries;
  if (sc.input && typeof sc.input === "object") return [sc.input];
  return [];
}
function clampReactivationCount(cats) {
  let n = 0;
  for (let i = 0; i < cats.length; i++) {
    if (cats[i] === "Green") {
      const prev1 = cats[i-1];
      const prev2 = cats[i-2];
      if ((prev1 && isOrangePlus(prev1)) || (prev2 && isOrangePlus(prev2))) n++;
    }
  }
  return n;
}
function percent(n, d) { return d > 0 ? +(100 * n / d).toFixed(2) : 0; }

// --- Run simulation for one parameter combo --------------------------------
function runSimulation(params) {
  let FP_stable = 0, N_stable = 0;
  let FP_cyclic = 0, N_cyclic = 0;
  let clampOK = 0;
  let stepFirstYellow = null, stepFirstOrange = null;

  for (const sc of scenarios) {
    if (!sc || (!sc.inputSeries && !sc.input)) continue;
    const inputs = toInputs(sc);
    if (!inputs.length) continue;
    const hist = { categories: [], normalizedScores: [], wsSeries: [] };

    for (let day = 0; day < inputs.length; day++) {
      const res = calculateScore(inputs[day], sc.baseline, hist, false);
      hist.categories.push(res.category);
      hist.normalizedScores.push(res.normalized);

      if (sc.cohort === "StepWorseningMid") {
        if (stepFirstYellow === null && isNonGreen(res.category)) stepFirstYellow = day + 1;
        if (stepFirstOrange === null && isOrangePlus(res.category)) stepFirstOrange = day + 1;
      }
    }

    const cats = hist.categories;
    if (sc.cohort === "Stable") {
      N_stable += cats.length;
      FP_stable += cats.filter(isNonGreen).length;
    }
    if (sc.cohort === "CyclicNoiseLow" || sc.cohort === "WeekendBounce") {
      N_cyclic += cats.length;
      FP_cyclic += cats.filter(isNonGreen).length;
    }
    if (sc.cohort === "RecoveryClampCheck" || sc.cohort === "SlowDriftDown") {
      clampOK += clampReactivationCount(cats);
    }
  }

  return {
    ...params,
    FP_percent_overall: percent(FP_stable + FP_cyclic, N_stable + N_cyclic),
    FP_percent_stable: percent(FP_stable, N_stable),
    ClampOK_total: clampOK,
    StepFirstYellow: stepFirstYellow,
    StepFirstOrange: stepFirstOrange
  };
}

// --- Main ramp loop --------------------------------------------------------
const results = [];
for (const jump of grid.ACUTE_WS_JUMP) {
  for (const weight of grid.MILD_WEIGHT_FACTOR) {
    for (const ema of grid.EMA_WINDOW_DAYS) {
      for (const ext of grid.EXTENDED_EMA_WINDOW) {
        for (const credit of grid.RECOVERY_CREDIT) {
          for (const band of grid.RECOVERY_GREEN_BAND) {
            const combo = {
              ACUTE_WS_JUMP: jump,
              MILD_WEIGHT_FACTOR: weight,
              EMA_WINDOW_DAYS: ema,
              EXTENDED_EMA_WINDOW: ext,
              RECOVERY_CREDIT: credit,
              RECOVERY_GREEN_BAND: band,
            };
            Object.entries(combo).forEach(([k,v]) => (process.env[k] = String(v)));
            console.log(`▶ Running combo:`, combo);
            results.push(runSimulation(combo));
          }
        }
      }
    }
  }
}

// --- Save results ----------------------------------------------------------
const outCSV = path.join(OUT_DIR, "high_sensitivity_ramp.csv");
const cols = Object.keys(results[0] ?? {});
const header = cols.join(",") + "\n";
const lines = results.map(r => cols.map(k => r[k]).join(",")).join("\n");
fs.writeFileSync(outCSV, header + lines);
console.log(`✅ High-sensitivity ramp complete → ${outCSV}`);

console.table(results.map(r => ({
  JUMP: r.ACUTE_WS_JUMP,
  WT: r.MILD_WEIGHT_FACTOR,
  EMA: r.EMA_WINDOW_DAYS,
  EXT: r.EXTENDED_EMA_WINDOW,
  FP: r.FP_percent_overall,
  Clamp: r.ClampOK_total,
  StepYellow: r.StepFirstYellow,
  StepOrange: r.StepFirstOrange
})));
