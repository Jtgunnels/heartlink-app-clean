// ---------------------------------------------------------------------------
// HeartLink Algorithm v3.9.PRE-B1 — Optimized Configuration Lock (2025-10-12)
// ---------------------------------------------------------------------------
// Includes: noise guard, adaptive EMA extension, and yellow stickiness
// ---------------------------------------------------------------------------

export const CONFIG_V38 = {
  EMA_WINDOW_DAYS: 8,
  DEESCALATION_DAYS: 2,
  MILD_WEIGHT_FACTOR: 0.85,
  VERSION: "3.9.PRE-B1-OPT2025-10-12",
  NOISE_THRESHOLD: 0.35,
  EXTENDED_EMA_WINDOW: 10,
  YELLOW_STICKINESS_DAYS: 2
};

// ---------------------------------------------------------------------------
// Allow environment variable overrides during parameter sweeps
// ---------------------------------------------------------------------------
for (const k of Object.keys(CONFIG_V38)) {
  if (process.env[k]) CONFIG_V38[k] = parseFloat(process.env[k]);
}
if (process.env.RECOVERY_CREDIT)
  globalThis.RECOVERY_CREDIT = parseFloat(process.env.RECOVERY_CREDIT);
if (process.env.RECOVERY_SLOPE_THRESHOLD)
  globalThis.RECOVERY_SLOPE_THRESHOLD = parseFloat(process.env.RECOVERY_SLOPE_THRESHOLD);

// ---------------------------------------------------------------------------
// Core algorithm logic
// ---------------------------------------------------------------------------

import { levels, ema, slopeUp, stsi } from "./utils/emaUtils.js";
import { cceBiasV1 } from "./utils/cceEngine.js";
import { buildAdaptiveBuckets } from "./utils/adaptiveThresholds.js";
import { applyOrangeGreenSmoothing } from "./utils/deEscalation.js";

export default function calculateScore_v3_8(
  input = {},
  baseline = {},
  hist = {},
  debug = false
) {
  const SYMPTOMS = ["sob", "edema", "fatigue", "orthopnea", "palpitations"];
  const base = {};

  // ----------------------------
  // Step 1: Baseline differences
  // ----------------------------
  for (const key of SYMPTOMS) {
    const diff = (levels(input[key]) ?? 0) - (levels(baseline[key]) ?? 0);
    base[key] = diff > 0 ? diff : 0;
  }

  // ----------------------------
  // Step 2: Detect jitter / noise
  // ----------------------------
  const diffs = Object.values(base);
  const avgNoise = diffs.reduce((a, b) => a + b, 0) / (diffs.length || 1);
  const highNoise =
    diffs.every((d) => d <= CONFIG_V38.NOISE_THRESHOLD) && avgNoise > 0;

  let noiseGuard = false;
  if (
    highNoise &&
    (hist.categories ?? []).every((c) => c === "Green" || c === "Yellow")
  ) {
    noiseGuard = true;
  }

  // ----------------------------
  // Step 3: Weighted symptom sum
  // ----------------------------
  const weightedSymptoms =
    (base.sob +
      base.edema +
      base.fatigue +
      base.orthopnea +
      base.palpitations) *
    CONFIG_V38.MILD_WEIGHT_FACTOR;

  // ----------------------------
  // Step 4: Adaptive EMA window
  // ----------------------------
  const jitter = hist.normalizedScores?.slice(-3) ?? [];
  const jitterVariance =
    jitter.length > 1
      ? jitter.reduce((a, b) => a + Math.abs(b - jitter[0]), 0) / jitter.length
      : 0;

  const EMA_DAYS =
    jitterVariance > 0.8
      ? CONFIG_V38.EXTENDED_EMA_WINDOW
      : CONFIG_V38.EMA_WINDOW_DAYS;
  const trendScore = ema(hist.normalizedScores ?? [], EMA_DAYS);

  // ----------------------------
  // Step 5: Adaptive bias
  // ----------------------------
  const adaptive = buildAdaptiveBuckets(
    base,
    hist.normalizedScores ?? [],
    EMA_DAYS
  );

  // ----------------------------
  // Step 6: Compute normalized total
  // ----------------------------
  const ws = Number(weightedSymptoms) || 0;
  const ts = Number(trendScore) || 0;
  const ab = Number(adaptive?.bias) || 0;

  let normalized = Math.min(10, +(ws + ts + ab).toFixed(2));
  if (noiseGuard) normalized = Math.min(normalized, 1.8);

  // ----------------------------
  // Step 6b: Recovery guard (reduce FP during improvement)
  // ----------------------------
  const lastN = (hist.normalizedScores ?? []).slice(-5);
  const slopeThresh = globalThis.RECOVERY_SLOPE_THRESHOLD ?? -0.15;
  const credit = globalThis.RECOVERY_CREDIT ?? 0.3;
  const improving = lastN.length >= 3 && slopeUp(lastN) < slopeThresh;
  if (improving) {
    normalized = Math.max(0, normalized - credit);
  }

  // ----------------------------
  // Step 7: Category classification
  // ----------------------------
  let proposed =
    normalized < 2.5
      ? "Green"
      : normalized < 5
      ? "Yellow"
      : normalized < 7.5
      ? "Orange"
      : "Red";

  // ----------------------------
  // Step 8: De-escalation (Orange→Green + Yellow stickiness)
  // ----------------------------
  const lastCats = hist.categories ?? [];
  const priorYellow = lastCats.slice(-CONFIG_V38.YELLOW_STICKINESS_DAYS);
  const yellowHold =
    proposed === "Green" &&
    priorYellow.every((c) => c === "Yellow") &&
    slopeUp(hist.normalizedScores) < 0;

  let category = applyOrangeGreenSmoothing({
    lastCats,
    proposed,
    stableDays: CONFIG_V38.DEESCALATION_DAYS,
  });

  if (yellowHold) category = "Yellow";

  // ----------------------------
  // Step 9: Contextual bias (CCE)
  // ----------------------------
  const safeInput = {
    sob: Number(input?.sob ?? 0),
    edema: Number(input?.edema ?? 0),
    fatigue: Number(input?.fatigue ?? 0),
    orthopnea: Number(input?.orthopnea ?? 0),
    palpitations: Number(input?.palpitations ?? 0),
  };

  const adjusted = cceBiasV1?.(category, hist ?? {}, safeInput);
  let finalCategory;

  if (typeof adjusted === "object" && adjusted?.adjustedCategory) {
    finalCategory = adjusted.adjustedCategory;
  } else if (typeof adjusted === "string") {
    finalCategory = adjusted;
  } else {
    finalCategory = category;
  }

  // ----------------------------
  // Step 10: Return results
  // ----------------------------
  const result = {
    normalized,
    category: finalCategory,
    noiseGuardActive: noiseGuard,
    adaptiveEmaDays: EMA_DAYS,
    cceBias: adjusted,
    version: CONFIG_V38.VERSION,
  };

  if (debug) console.log("v3.8 result →", result);
  return result;
}
