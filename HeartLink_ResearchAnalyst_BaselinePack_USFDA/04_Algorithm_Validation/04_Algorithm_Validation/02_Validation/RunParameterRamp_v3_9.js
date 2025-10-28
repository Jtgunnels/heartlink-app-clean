// ---------------------------------------------------------------------------
// HeartLink ASE 1.0 v3.9 – Parameter Ramp Study (Clinical-Ready Ramp, v2)
// Measures: first non-Green alert (Yellow+), first Orange+, FP% by cohort,
// ClampOK as Green after recent Orange/Red (within 2 days), robust to
// scenario formats with either inputSeries[] or single input.
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import calculateScore from "./calculateScore_v3_9.js";

// === Paths ================================================================
const SCENARIOS_FILE = "./LongitudinalDriftScenarios.json";
const OUT_DIR = "./results_v3_9/ramp_" + new Date().toISOString().slice(0,10);
fs.mkdirSync(OUT_DIR, { recursive: true });

// === Parameter grid =======================================================
const grid = {
  ACUTE_WS_JUMP: [1.0, 0.95, 0.9, 0.85],
  EMA_WINDOW_DAYS: [28, 26],
  EXTENDED_EMA_WINDOW: [34, 32],
  RECOVERY_CREDIT: [1.35],        // can widen after we locate acute knee
  RECOVERY_GREEN_BAND: [3.7],     // optionally add 3.8 if clamp FPs trend high
};

// === Load scenarios =======================================================
if (!fs.existsSync(SCENARIOS_FILE)) {
  console.error(`❌ Scenario pack not found: ${SCENARIOS_FILE}`);
  process.exit(1);
}
const scenarios = JSON.parse(fs.readFileSync(SCENARIOS_FILE, "utf8"));
console.log(`Loaded ${scenarios.length} scenarios from ${SCENARIOS_FILE}`);

// === Helpers ==============================================================
const isNonGreen = c => c === "Yellow" || c === "Orange" || c === "Red";
const isOrangePlus = c => c === "Orange" || c === "Red";
function toInputs(sc) {
  if (Array.isArray(sc.inputSeries)) return sc.inputSeries;
  if (sc.input && typeof sc.input === "object") return [sc.input];
  return []; // malformed
}
function clampReactivationCount(cats) {
  // Count Green days that occur with any Orange/Red in the previous 1–2 days
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

// === Run a single parameter combo ========================================
function runSimulation(params) {
  // Aggregate metrics
  let FP_stable = 0, N_stable = 0;
  let FP_cyclic = 0, N_cyclic = 0;     // CyclicNoiseLow + WeekendBounce
  let clampOK = 0;

  let stepFirstYellow = null;
  let stepFirstOrange = null;

  for (const sc of scenarios) {
    if (!sc || (!sc.inputSeries && !sc.input)) {
      console.warn(`⚠️ Skipping malformed scenario: ${sc?.id ?? "unknown"}`);
      continue;
    }
    const inputs = toInputs(sc);
    if (!inputs.length) {
      console.warn(`⚠️ Empty inputs for scenario: ${sc?.id ?? "unknown"}`);
      continue;
    }

    const hist = { categories: [], normalizedScores: [], wsSeries: [] };

    // Apply calculateScore over days
    for (let day = 0; day < inputs.length; day++) {
      const res = calculateScore(inputs[day], sc.baseline, hist, false);
      hist.categories.push(res.category);
      hist.normalizedScores.push(res.normalized);

      // Capture first alert days for StepWorseningMid
      if (sc.cohort === "StepWorseningMid") {
        if (stepFirstYellow === null && isNonGreen(res.category)) {
          stepFirstYellow = day + 1;
        }
        if (stepFirstOrange === null && isOrangePlus(res.category)) {
          stepFirstOrange = day + 1;
        }
      }
    }

    // Cohort-specific tallies
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

  const FP_percent_stable = percent(FP_stable, N_stable);
  const FP_percent_cyclic = percent(FP_cyclic, N_cyclic);
  const FP_percent_overall = percent(FP_stable + FP_cyclic, N_stable + N_cyclic);

  return {
    ...params,
    FP_percent_overall: FP_percent_overall,
    FP_percent_stable: FP_percent_stable,
    FP_percent_cyclic: FP_percent_cyclic,
    ClampOK_total: clampOK,
    StepFirstYellow: stepFirstYellow,  // early detection marker
    StepFirstOrange: stepFirstOrange   // stricter marker (optional)
  };
}

// === Main ramp loop =======================================================
const results = [];
for (const jump of grid.ACUTE_WS_JUMP) {
  for (const ema of grid.EMA_WINDOW_DAYS) {
    for (const ext of grid.EXTENDED_EMA_WINDOW) {
      for (const credit of grid.RECOVERY_CREDIT) {
        for (const band of grid.RECOVERY_GREEN_BAND) {
          const combo = {
            ACUTE_WS_JUMP: jump,
            EMA_WINDOW_DAYS: ema,
            EXTENDED_EMA_WINDOW: ext,
            RECOVERY_CREDIT: credit,
            RECOVERY_GREEN_BAND: band,
          };
          // Pass overrides via env (used in calculateScore_v3_9)
          Object.entries(combo).forEach(([k,v]) => (process.env[k] = String(v)));

          console.log(`▶ Running combo →`, combo);
          const r = runSimulation(combo);
          results.push(r);
        }
      }
    }
  }
}

// === Save CSV & print table ==============================================
const outCSV = path.join(OUT_DIR, "parameter_ramp_summary.csv");
const cols = Object.keys(results[0] ?? {});
const header = cols.join(",") + "\n";
const lines = results.map(r => cols.map(k => r[k]).join(",")).join("\n");
fs.writeFileSync(outCSV, header + lines);
console.log(`✅ Ramp study complete → ${outCSV}`);

console.table(results.map(r => ({
  JUMP: r.ACUTE_WS_JUMP,
  EMA: r.EMA_WINDOW_DAYS,
  EXT: r.EXTENDED_EMA_WINDOW,
  FP_overall: r.FP_percent_overall,
  FP_stable: r.FP_percent_stable,
  FP_cyclic: r.FP_percent_cyclic,
  ClampOK: r.ClampOK_total,
  StepYellow: r.StepFirstYellow,
  StepOrange: r.StepFirstOrange,
})));
