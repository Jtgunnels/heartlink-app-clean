// HeartLink Health — calculateScore_v41CL.js (ASE 1.3 Clinical-Lock)
// Inputs used in scoring: SOB, edema, fatigue, orthopnea (flag), weight context.
// Tracked but NOT scored: heartRate, bloodPressure, palpitations (FTC-safe).

import { clamp, median, emaSeries, levelize } from "./emaUtils.js";
import { applyOrangeGreenSmoothing } from "./deEscalation.js";

// ---- Tunables (Clinical-Lock) ----
export const CFG_V41CL = {
  EPS_TOL_BASE: 0.18,      // steady-state tolerance
  EPS_TOL_EARLY: 0.20,     // first 14 days
  POS_GAIN: 1.9,
  NEG_GAIN: 1.15,
  MILD_WEIGHT: 0.55,       // scales “symptom pressure”
  EMA_DAYS: 26,
  ACUTE_JUMP: 0.80,        // L5 trigger vs 3-day median
  CORE_STEP: 0.30,         // per-core delta step for coreCount
  NOISE_CAP: 1.95,         // L6 cap when >=2 trivial deltas
  COOL_DAYS: 5,            // L7 hold-down
  WEIGHT_BASE_DELTA: 2.0,  // ≥2 lb over baseline
  WEIGHT_SHORT3_DELTA: 2.0,// ≥2 lb over 3 days
  WEIGHT_MAX_PUSH: 0.8,    // context cap
  W_BASELINE: 1.0,         // L1
  W_SHORTSYM: 0.7,         // L2
  W_WEIGHT: 0.5,           // L3
  W_EMA: 0.6,              // L4

  ENABLE_L2: true,
  ENABLE_L3: true,
  ENABLE_L4: true,
  ENABLE_L5: true,
  ENABLE_L6: true,
  ENABLE_L7: true,
};

// Category thresholds
function categoryFromSSI(v) {
  return v < 2
    ? "Green"
    : v < 4.5
    ? "Yellow"
    : v < 7.5
    ? "Orange"
    : "Red";
}

/**
 * calculateScore_v41CL
 * @param {object} entry - today's inputs (sobLevel/edemaLevel/fatigueLevel 0..3; orthopnea:boolean; weightToday:number)
 *                         also allowed but not scored: heartRate, bp, palpitations
 * @param {object} baseline - { baselineSob, baselineEdema, baselineFatigue, orthopnea:boolean, baselineWeight:number }
 * @param {object} hist - mutable history object persisted by the app
 *                        { wsSeries:number[], normalizedScores:number[], categories:string[], weights:number[] }
 * @param {object} cfg - (optional) override CFG_V41CL
 * @returns {{ssi:number, category:string}}
 */
export default function calculateScore_v41CL(entry, baseline, hist = {}, cfg = CFG_V41CL) {
  const SYMPTOMS = ["sob", "edema", "fatigue"];
  const baselineDays = (hist.normalizedScores?.length ?? 0);
  const EPS = baselineDays < 14 ? cfg.EPS_TOL_EARLY : cfg.EPS_TOL_BASE;

  // Normalize inputs
  const today = {
    sob: levelize(entry.sobLevel ?? entry.sob),
    edema: levelize(entry.edemaLevel ?? entry.edema),
    fatigue: levelize(entry.fatigueLevel ?? entry.fatigue),
  };
  const basev = {
    sob: levelize(baseline.baselineSob ?? baseline.sob),
    edema: levelize(baseline.baselineEdema ?? baseline.edema),
    fatigue: levelize(baseline.baselineFatigue ?? baseline.fatigue),
  };

  // L1 — Baseline deltas with tolerance & gains
  let smallCount = 0;
  let baselinePressure = 0;
  for (const k of SYMPTOMS) {
    let d = (today[k] || 0) - (basev[k] || 0);
    if (Math.abs(d) < EPS) {
      d = 0;
      smallCount++;
    }
    const gain = d > 0 ? cfg.POS_GAIN : cfg.NEG_GAIN;
    baselinePressure += d * gain;
  }

  // Orthopnea flag (binary)
  const orthNow = !!entry.orthopnea;
  const orthBase = !!baseline.orthopnea;
  if (orthNow && !orthBase) baselinePressure += 1.0;
  else if (!orthNow && orthBase) baselinePressure -= 0.5;

  // Trend modifiers + severe-baseline overrides (Better/Same/Worse)
  // Special override: if baseline SOB >=3 and "worse" → force Red
  // Otherwise any "worse" on severe baseline pushes at least to Orange
  let forceRed = false;
  let forceOrange = false;

  for (const k of SYMPTOMS) {
    const baseSeverity = basev[k] || 0;
    const trend = (entry[`${k}Trend`] || "").toString().toLowerCase();
    if (!trend) continue;

    if (trend === "worse") {
      if (k === "sob" && baseSeverity >= 3) {
        forceRed = true;
      } else {
        baselinePressure += 0.4;
        forceOrange = true;
      }
    } else if (trend === "better") {
      baselinePressure -= 0.3;
    }
  }

  // L1 scaled
  const symptomPressure = clamp(baselinePressure * cfg.MILD_WEIGHT, 0, 10);
  const L1 = symptomPressure * cfg.W_BASELINE;

  // L2 — Short-term delta vs 3-day median
  let L2 = 0;
  if (cfg.ENABLE_L2) {
    const ws3 = (hist.wsSeries ?? []).slice(-3);
    const prevMed = ws3.length ? median(ws3) : 0;
    const shortSym = clamp(symptomPressure - prevMed, -2, 2);
    L2 = shortSym * cfg.W_SHORTSYM;
  }

  // L3 — Weight context (cap total push at WEIGHT_MAX_PUSH)
  let L3 = 0;
  if (cfg.ENABLE_L3) {
    const wt = entry.weightToday;
    const wb = baseline.baselineWeight;
    let weightPush = 0;

    // Absolute change vs baseline
    if (typeof wt === "number" && typeof wb === "number") {
      const d = wt - wb;
      if (d >= cfg.WEIGHT_BASE_DELTA) {
        weightPush += Math.min((d - cfg.WEIGHT_BASE_DELTA) * 0.15, cfg.WEIGHT_MAX_PUSH * 0.6);
      }
    }
    // Short 3-day change
    const wHist = (hist.weights ?? []).slice(-3);
    if (wHist.length === 3) {
      const wDelta3 = wHist[2] - wHist[0];
      if (wDelta3 >= cfg.WEIGHT_SHORT3_DELTA) {
        weightPush += Math.min((wDelta3 - cfg.WEIGHT_SHORT3_DELTA) * 0.2, cfg.WEIGHT_MAX_PUSH * 0.4);
      }
    }

    weightPush = Math.min(weightPush, cfg.WEIGHT_MAX_PUSH);
    L3 = weightPush * cfg.W_WEIGHT;
  }

  // L4 — EMA trend of symptomPressure
  let L4 = 0;
  if (cfg.ENABLE_L4) {
    const ws = (hist.wsSeries ?? []).slice();
    while (ws.length < 3) ws.push(symptomPressure); // warm-up
    const emaTrend = emaSeries(ws, cfg.EMA_DAYS);
    L4 = emaTrend * cfg.W_EMA;
  }

  // Compose SSI (pre-guards), with tiny normalization offset
  let ssi = clamp(Number((L1 + L2 + L3 + L4 - 0.05).toFixed(2)), 0, 10);

  // L6 — Noise guard when 2+ trivial deltas
  if (cfg.ENABLE_L6 && smallCount >= 2) {
    ssi = Math.min(ssi, cfg.NOISE_CAP);
  }

  // Category from SSI
  let category = categoryFromSSI(ssi);

  // L5 — Acute spike promotion (Δws vs 3-day median + orth/new or 2 core deltas)
  if (cfg.ENABLE_L5) {
    const ws3 = (hist.wsSeries ?? []).slice(-3);
    const baseMed = ws3.length ? median(ws3) : 0;
    const deltaWs = symptomPressure - baseMed;

    // count core symptoms over step
    const coreCount =
      (today.sob - basev.sob >= cfg.CORE_STEP ? 1 : 0) +
      (today.edema - basev.edema >= cfg.CORE_STEP ? 1 : 0);

    if (deltaWs >= cfg.ACUTE_JUMP && ((orthNow && !orthBase) || coreCount >= 2)) {
      // Lift category at least 1 level (to Orange), 2 levels if strong core evidence
      const levels = ["Green", "Yellow", "Orange", "Red"];
      const idx = levels.indexOf(category);
      const lift = coreCount >= 2 ? 2 : 1;
      category = levels[Math.min(idx + lift, levels.length - 1)];
    }
  }

  // Trend overrides (severe baseline handling)
  if (forceRed) category = "Red";
  else if (forceOrange && (category === "Green" || category === "Yellow")) category = "Orange";

  // L7 — De-escalation smoothing
  if (cfg.ENABLE_L7) {
    category = applyOrangeGreenSmoothing(hist.categories ?? [], category, cfg.COOL_DAYS);
  }

  // ---- Update history (persist by the host app) ----
  hist.wsSeries = [...(hist.wsSeries ?? []), symptomPressure];
  hist.normalizedScores = [...(hist.normalizedScores ?? []), ssi];
  hist.categories = [...(hist.categories ?? []), category];
  hist.weights = [...(hist.weights ?? []), typeof entry.weightToday === "number"
    ? entry.weightToday
    : (baseline.baselineWeight ?? null)];

  // Explicitly ignore vitals & palpitations in scoring (FTC-safe)
  // entry.heartRate, entry.sbp/dbp, entry.palpitations => tracked elsewhere, not used here.

  return { ssi, category };
}
