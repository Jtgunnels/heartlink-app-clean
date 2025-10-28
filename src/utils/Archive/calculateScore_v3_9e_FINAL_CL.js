// ---------------------------------------------------------------------------
// HeartLink Algorithm v3.9e-FINAL-CL  – ASE 1.2 (Clinical-Lock)
// Balanced configuration: DELTA_TOLERANCE_BASE = 0.19, MILD_WEIGHT_FACTOR = 0.55
// Includes merged-noise guard (cap ~1.95), EMA smoothing, and clamp de-escalation
// ⚙️ Integration notes:
// - Accepts BOTH {sob,edema,fatigue,orthopnea} and {sobLevel,edemaLevel,fatigueLevel}+bool orthopnea
// - Accepts BOTH {sob,edema,fatigue} and {baselineSob,baselineEdema,baselineFatigue} for baseline
// ---------------------------------------------------------------------------

import { levels, ema } from "./emaUtils.js";
import { applyOrangeGreenSmoothing } from "./deEscalation.js";

export const CONFIG_V39E = {
  EMA_WINDOW_DAYS: 26,
  EXTENDED_EMA_WINDOW: 32,
  MILD_WEIGHT_FACTOR: 0.55,

  // Per-symptom tolerance for ignoring trivial changes (early days slightly looser)
  DELTA_TOLERANCE_BASE: 0.19,
  DELTA_TOLERANCE_EARLY: 0.20,

  // De-escalation smoothing
  DEESCALATION_DAYS: 5,

  // Recovery/clamp balance (carried forward from clamp-balanced line)
  RECOVERY_CREDIT: 1.30,
  RECOVERY_GREEN_BAND: 3.8,

  // Acute detection
  ACUTE_WS_JUMP: 0.80,

  VERSION: "3.9e-FINAL-CL.ASE1.2-2025-10-21"
};

// --- helpers ---------------------------------------------------------------
const catRank = (c)=>c==="Green"?0:c==="Yellow"?1:c==="Orange"?2:3;
const rankToCat = (r)=>r<=0?"Green":r===1?"Yellow":r===2?"Orange":"Red";
const median = (arr)=>!arr?.length?0:(arr.slice().sort((a,b)=>a-b)[Math.floor(arr.length/2)]);

// Normalize input/baseline field names so existing screens work unchanged
function coerceSymptoms(obj = {}) {
  return {
    sob: obj.sob ?? obj.sobLevel ?? obj.SOB ?? 0,
    edema: obj.edema ?? obj.edemaLevel ?? 0,
    fatigue: obj.fatigue ?? obj.fatigueLevel ?? 0,
    orthopnea: typeof obj.orthopnea === "boolean"
      ? obj.orthopnea
      : (obj.orthopnea === "Yes" ? true : (obj.orthopnea === "No" ? false : !!obj.orthopneaFlag))
  };
}
function coerceBaseline(base = {}) {
  return {
    sob: base.sob ?? base.baselineSob ?? base.sobLevel ?? 0,
    edema: base.edema ?? base.baselineEdema ?? base.edemaLevel ?? 0,
    fatigue: base.fatigue ?? base.baselineFatigue ?? base.fatigueLevel ?? 0,
    orthopnea: typeof base.orthopnea === "boolean"
      ? base.orthopnea
      : (typeof base.baselineOrthopnea === "boolean" ? base.baselineOrthopnea : undefined)
  };
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
export default function calculateScore(inputRaw = {}, baselineRaw = {}, hist = {}, debug = false) {
  const ACUTE_CORE = ["sob", "edema"];
  const input = coerceSymptoms(inputRaw);
  const baseline = coerceBaseline(baselineRaw);

  const SYMPTOMS = ["sob", "edema", "fatigue"];
  const base = {};

  const daysOfHistory = hist.normalizedScores?.length ?? 0;
  const tol = daysOfHistory < 14
    ? CONFIG_V39E.DELTA_TOLERANCE_EARLY
    : CONFIG_V39E.DELTA_TOLERANCE_BASE;

  // 1) Adaptive deltas + merged-noise guard
  let smallChangeCount = 0;
  for (const k of SYMPTOMS) {
    const cur = Number(levels(input[k]) ?? 0);
    const b   = Number(levels(baseline[k]) ?? 0);
    let delta = cur - b;

    if (Math.abs(delta) < tol) { delta = 0; smallChangeCount++; }
    base[k] = delta > 0 ? delta * 2.0 : delta * 1.2; // amplify worsening, dampen improvement
  }
  const mergedNoiseGuard = (smallChangeCount >= 2);

  // 2) Orthopnea binary (counts only if *new* vs baseline true)
  const orthopneaFlag = !!input.orthopnea && !baseline.orthopnea;

  // 3) Weighted symptom pressure (WS)
  const weightedSymptoms = (base.sob + base.edema + base.fatigue) * CONFIG_V39E.MILD_WEIGHT_FACTOR;

  // 4) EMA smoothing over WS series (seed if short)
  const wsHist = Array.isArray(hist.wsSeries) ? hist.wsSeries.slice() : [];
  if (wsHist.length < 3) { while (wsHist.length < 3) wsHist.push(weightedSymptoms); }

  let trendScore = 0;
  try {
    const emaOut = ema(wsHist, CONFIG_V39E.EMA_WINDOW_DAYS);
    trendScore = Array.isArray(emaOut) ? emaOut.at(-1) : emaOut;
  } catch {}
  if (!Number.isFinite(trendScore)) trendScore = 0;

  // 5) Normalized composite + noise cap
  let normalized = +(weightedSymptoms + trendScore - 0.05).toFixed(2);
  if (!Number.isFinite(normalized)) normalized = 0;
  normalized = Math.max(0, Math.min(10, normalized));
  if (mergedNoiseGuard) normalized = Math.min(normalized, 1.95);

  // 6) Category thresholds
  let proposed =
    normalized < 2.0 ? "Green" :
    normalized < 4.5 ? "Yellow" :
    normalized < 7.5 ? "Orange" : "Red";

  // 7) Acute escalation (requires WS jump + either new orthopnea or 2 core elevations)
  const recent = wsHist.slice(-3);
  const deltaWs = weightedSymptoms - median(recent);
  const coreCount = ACUTE_CORE.reduce((a, k) => a + (base[k] >= 0.3 ? 1 : 0), 0);
  if (deltaWs >= CONFIG_V39E.ACUTE_WS_JUMP && (orthopneaFlag || coreCount >= 2)) {
    proposed = rankToCat(Math.max(catRank(proposed), coreCount >= 2 ? 2 : 1));
    if (debug) console.log("🔥 ACUTE ESCALATION", { deltaWs, coreCount, orthopneaFlag, proposed });
  }

  // 8) De-escalation smoothing (Orange/Red → require clean days before Green)
  const category = applyOrangeGreenSmoothing({
    lastCats: hist.categories ?? [],
    proposed,
    stableDays: CONFIG_V39E.DEESCALATION_DAYS
  });

  // 9) Persist WS series for next run
  (hist.wsSeries ??= []).push(weightedSymptoms);

  return {
    category,
    normalized,
    weightedSymptoms,
    orthopneaFlag,
    version: CONFIG_V39E.VERSION
  };
}

// Named export for validation runners
export { CONFIG_V39E as CFG_EXPORT };
