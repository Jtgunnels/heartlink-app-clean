// ---------------------------------------------------------------------------
// HeartLink Algorithm – ASE 1.3a Overlay (No Clamp, No Core Category Export)
// ---------------------------------------------------------------------------

import { levels, ema } from "./utils/emaUtils.js";

export const CONFIG_ASE13 = {
  EMA_WINDOW_DAYS: 28,
  MILD_WEIGHT_FACTOR: 0.55,
  DELTA_TOLERANCE: 0.17,
  GREEN_MAX: 2.2,
  YELLOW_MAX: 4.5,
  ORANGE_MAX: 7.0,
  NOISE_CAP_WITH_MERGED_GUARD: 1.95,
  PERSISTENCE_PROMOTE_DAYS: 2,
  PERSISTENCE_PROMOTE_TO: "Red",
  BASELINE_REFRESH_DAYS: 30,
  VERSION: "ASE_1.3a_Overlay_NoClamp_NoCore_2025-10-16"
};

const SYMPTOMS = ["sob", "edema", "fatigue"];
const catFromScore = (n, C = CONFIG_ASE13) =>
  (n < C.GREEN_MAX) ? "Green" :
  (n < C.YELLOW_MAX) ? "Yellow" :
  (n < C.ORANGE_MAX) ? "Orange" : "Red";

const isSevereLabel = (v) => v === "Severe" || v === 3 || v === "3" || v === 3.0;
const cmpNorm = (s) => (typeof s === "string" ? s.toLowerCase() : "");
const isEmpty = (x) => x === undefined || x === null || x === "";

// ========================= Core math =========================
function computeCoreScore(input = {}, baseline = {}, hist = {}) {
  const C = CONFIG_ASE13;

  for (const k of SYMPTOMS) {
    const v = input[k] ?? input[`${k}Level`];
    if (isEmpty(v)) {
      return {
        incomplete: true,
        needsBaselineRefresh: false,
        normalized: 0,
        weightedSymptoms: 0,
        mergedNoiseGuard: false
      };
    }
  }

  const baselineSavedAt = baseline?.baselineSavedAt ? new Date(baseline.baselineSavedAt) : null;
  const needsBaselineRefresh = baselineSavedAt
    ? ((Date.now() - baselineSavedAt.getTime()) / (1000 * 60 * 60 * 24)) >= C.BASELINE_REFRESH_DAYS
    : false;

  const base = {};
  let smallChangeCount = 0;
  for (const k of SYMPTOMS) {
    const cur = Number(levels(input[k] ?? input[`${k}Level`]) ?? 0);
    const b = Number(levels(baseline[k] ?? baseline[`${k}Level`]) ?? 0);
    let delta = cur - b;

    if (Math.abs(delta) < C.DELTA_TOLERANCE) {
      delta = 0;
      smallChangeCount++;
    }
    base[k] = delta > 0 ? delta * 2.0 : delta * 1.2;
  }
  const mergedNoiseGuard = (smallChangeCount >= 2);

  const weightedSymptoms = (base.sob + base.edema + base.fatigue) * C.MILD_WEIGHT_FACTOR;

  const wsHist = Array.isArray(hist.wsSeries) ? hist.wsSeries.slice() : [];
  if (wsHist.length < 3) wsHist.push(weightedSymptoms, weightedSymptoms, weightedSymptoms);

  let trendScore = 0;
  try {
    const emaOut = ema(wsHist, C.EMA_WINDOW_DAYS);
    trendScore = Array.isArray(emaOut) ? emaOut.at(-1) : emaOut;
  } catch { trendScore = 0; }

  if (!Number.isFinite(trendScore)) trendScore = 0;

  let normalized = Math.min(10, Math.max(0, +((weightedSymptoms + trendScore - 0.05).toFixed(2))));
  if (mergedNoiseGuard) normalized = Math.min(normalized, C.NOISE_CAP_WITH_MERGED_GUARD);

  (hist.wsSeries ??= []).push(weightedSymptoms);

  return { incomplete: false, needsBaselineRefresh, normalized, weightedSymptoms, mergedNoiseGuard };
}

// ========================= Overlay logic =========================
function overlayCardCategory({ input = {}, baseline = {}, hist = {}, defaultCategory }) {
  const sobC = cmpNorm(input.sobCompare);
  const edC  = cmpNorm(input.edemaCompare);
  const fatC = cmpNorm(input.fatigueCompare);

  // ✅ use configurable Δ-tolerance
  const worseFromDelta = (k) => {
    const cur = Number(levels(input[k] ?? input[`${k}Level`]) ?? 0);
    const b   = Number(levels(baseline[k] ?? baseline[`${k}Level`]) ?? 0);
    return (cur - b) >= CONFIG_ASE13.DELTA_TOLERANCE;
  };

  const isWorse = {
    sob: sobC === "worse" || (!sobC && worseFromDelta("sob")),
    edema: edC === "worse" || (!edC && worseFromDelta("edema")),
    fatigue: fatC === "worse" || (!fatC && worseFromDelta("fatigue")),
  };

  const isBetterAny = (sobC === "better") || (edC === "better") || (fatC === "better");
  const todayHasWorsening = isWorse.sob || isWorse.edema || isWorse.fatigue;

  const severeBase = {
    sob: isSevereLabel(baseline.sobLevel ?? baseline.sob),
    edema: isSevereLabel(baseline.edemaLevel ?? baseline.edema),
    fatigue: isSevereLabel(baseline.fatigueLevel ?? baseline.fatigue),
  };
  const anySevereBase = severeBase.sob || severeBase.edema || severeBase.fatigue;
  const severeWorseningCount =
    (severeBase.sob && isWorse.sob ? 1 : 0) +
    (severeBase.edema && isWorse.edema ? 1 : 0) +
    (severeBase.fatigue && isWorse.fatigue ? 1 : 0);

  let cardCategory = defaultCategory;
  const noChanges = !isBetterAny && !todayHasWorsening;
  if (noChanges) cardCategory = "Neutral";
  if (isBetterAny && !todayHasWorsening) cardCategory = "Green";

  if (anySevereBase) {
    if (severeBase.sob && isWorse.sob) cardCategory = "Red";
    else if (severeWorseningCount >= 2) cardCategory = "Red";
    else if (severeWorseningCount === 1) cardCategory = "Orange";
    else if (noChanges) cardCategory = "Neutral";
  } else {
    const numWorse = (isWorse.sob ? 1 : 0) + (isWorse.edema ? 1 : 0) + (isWorse.fatigue ? 1 : 0);
    if (numWorse === 1 && (cardCategory === "Green" || cardCategory === "Neutral")) cardCategory = "Yellow";
    if (numWorse >= 2 && cardCategory !== "Red") cardCategory = "Orange";
  }

  const lastCards = Array.isArray(hist.cardCategories)
    ? hist.cardCategories.slice(-CONFIG_ASE13.PERSISTENCE_PROMOTE_DAYS)
    : [];
  const lastWereOrangeOrRed =
    lastCards.length === CONFIG_ASE13.PERSISTENCE_PROMOTE_DAYS &&
    lastCards.every(c => c === "Orange" || c === "Red");

  if (cardCategory !== "Red" && lastWereOrangeOrRed && todayHasWorsening)
    cardCategory = CONFIG_ASE13.PERSISTENCE_PROMOTE_TO;

  return cardCategory;
}

// ====================== Export ======================
export default function calculateScore_ASE13(input = {}, baseline = {}, hist = {}, debug = false) {
  const core = computeCoreScore(input, baseline, hist);
  if (core.incomplete) {
    return {
      version: CONFIG_ASE13.VERSION,
      buildVersion: CONFIG_ASE13.VERSION,
      incomplete: true,
      needsBaselineRefresh: false,
      normalized: 0,
      weightedSymptoms: 0,
      mergedNoiseGuard: false,
      cardCategory: "Neutral",
      awarenessLevel: "Neutral",
      trend: { direction: "stable", slope: 0 }
    };
  }

  const defaultCategory = catFromScore(core.normalized, CONFIG_ASE13);
  const cardCategory = overlayCardCategory({ input, baseline, hist, defaultCategory });

  const ns = Array.isArray(hist?.normalizedScores) ? hist.normalizedScores.slice(-7) : [];
  let slope = 0, direction = "stable";
  if (ns.length >= 2) {
    slope = +(ns[ns.length - 1] - ns[0]).toFixed(2);
    direction = (slope > 0.4) ? "worsening" : (slope < -0.4) ? "improving" : "stable";
  }

  const out = {
    version: CONFIG_ASE13.VERSION,
    buildVersion: CONFIG_ASE13.VERSION,
    normalized: core.normalized,
    weightedSymptoms: core.weightedSymptoms,
    mergedNoiseGuard: core.mergedNoiseGuard,
    cardCategory,
    awarenessLevel: cardCategory,
    needsBaselineRefresh: core.needsBaselineRefresh,
    trend: { direction, slope }
  };

  (hist.cardCategories ??= []).push(cardCategory);
  (hist.normalizedScores ??= []).push(core.normalized);
  if (debug) console.log("[ASE1.3a] OUT:", out);
  return out;
}

export { CONFIG_ASE13 as CFG_EXPORT };
