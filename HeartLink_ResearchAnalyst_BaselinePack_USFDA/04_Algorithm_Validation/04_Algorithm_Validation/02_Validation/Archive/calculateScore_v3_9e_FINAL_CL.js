// ---------------------------------------------------------------------------
// HeartLink Algorithm – ASE 1.3 Overlay (No Clamp, No Core Category Export)
// Baseline: 3.9e core math (EMA + Δ-tolerance) preserved internally.
// Outputs a single UI category ("cardCategory") for display.
// - Clamp/de-escalation removed
// - Neutral state for "no change"
// - Advanced-baseline escalation (Severe SOB worse => Red; others => Orange/Red by count)
// - Temporal persistence promotion (3rd day -> Red)
// - 30-day baseline refresh flag
// - Incomplete check-ins -> Neutral + incomplete:true
// - No vitals messaging here (collection handled elsewhere)
// ---------------------------------------------------------------------------

import { levels, ema } from "./utils/emaUtils.js";

// =========================
// Tunable configuration
// =========================
export const CONFIG_ASE13 = {
  EMA_WINDOW_DAYS: 28,               // single fixed EMA window
  MILD_WEIGHT_FACTOR: 0.55,          // same as 3.9e
  DELTA_TOLERANCE: 0.17,             // ignore |Δ| < 0.17 (noise gate)

  // Legacy threshold map (used internally to seed default category from normalized)
  GREEN_MAX: 2.2,                    // < 2.2 => Green
  YELLOW_MAX: 4.5,                   // 2.2–4.5 => Yellow
  ORANGE_MAX: 7.0,                   // 4.5–7.0 => Orange; >7 => Red

  NOISE_CAP_WITH_MERGED_GUARD: 1.95, // cap when merged noise detected

  // Temporal persistence overlay
  PERSISTENCE_PROMOTE_DAYS: 2,       // if last 2 days were Orange/Red and today worsens => promote
  PERSISTENCE_PROMOTE_TO: "Red",

  // Baseline freshness reminder
  BASELINE_REFRESH_DAYS: 30,

  VERSION: "ASE_1.3_Overlay_NoClamp_NoCore_2025-10-16"
};

// ===============
// Small helpers
// ===============
const SYMPTOMS = ["sob", "edema", "fatigue"];
const catFromScore = (n, C=CONFIG_ASE13) =>
  (n < C.GREEN_MAX)  ? "Green"  :
  (n < C.YELLOW_MAX) ? "Yellow" :
  (n < C.ORANGE_MAX) ? "Orange" : "Red";

const isSevereLabel = (v) => v === "Severe" || v === 3 || v === "3" || v === 3.0;
const cmpNorm = (s) => (typeof s === "string" ? s.toLowerCase() : "");
const isEmpty = (x) => x === undefined || x === null || x === "";

// ==================================
// Core score (3.9e-compatible math)
// ==================================
function computeCoreScore(input = {}, baseline = {}, hist = {}) {
  const C = CONFIG_ASE13;

  // Require all three core symptoms
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

  // Baseline age
  const baselineSavedAt = baseline?.baselineSavedAt ? new Date(baseline.baselineSavedAt) : null;
  const needsBaselineRefresh = baselineSavedAt
    ? ((Date.now() - baselineSavedAt.getTime()) / (1000 * 60 * 60 * 24)) >= C.BASELINE_REFRESH_DAYS
    : false;

  // Build deltas with tolerance and 3.9e asymmetry
  const base = {};
  let smallChangeCount = 0;
  for (const k of SYMPTOMS) {
    const cur = Number(levels(input[k] ?? input[`${k}Level`]) ?? 0);
    const b   = Number(levels(baseline[k] ?? baseline[`${k}Level`]) ?? 0);
    let delta = cur - b;

    if (Math.abs(delta) < C.DELTA_TOLERANCE) {
      delta = 0;
      smallChangeCount++;
    }
    base[k] = delta > 0 ? delta * 2.0 : delta * 1.2; // retain 3.9e weighting asymmetry
  }
  const mergedNoiseGuard = (smallChangeCount >= 2);

  // Weighted symptom composite (3.9e)
  const weightedSymptoms = (base.sob + base.edema + base.fatigue) * C.MILD_WEIGHT_FACTOR;

  // EMA smoothing on historical series
  const wsHist = Array.isArray(hist.wsSeries) ? hist.wsSeries.slice() : [];
  if (wsHist.length < 3) {
    wsHist.push(weightedSymptoms, weightedSymptoms, weightedSymptoms);
  }
  let trendScore = 0;
  try {
    const emaOut = ema(wsHist, C.EMA_WINDOW_DAYS);
    trendScore = Array.isArray(emaOut) ? emaOut.at(-1) : emaOut;
  } catch (_e) {
    trendScore = 0;
  }
  if (!Number.isFinite(trendScore)) trendScore = 0;

  // Normalized composite, cap in merged-noise
  let normalized = Math.min(10, Math.max(0, +((weightedSymptoms + trendScore - 0.05).toFixed(2))));
  if (mergedNoiseGuard) normalized = Math.min(normalized, C.NOISE_CAP_WITH_MERGED_GUARD);

  // Update wsSeries for caller persistence
  (hist.wsSeries ??= []).push(weightedSymptoms);

  return {
    incomplete: false,
    needsBaselineRefresh,
    normalized,
    weightedSymptoms,
    mergedNoiseGuard
  };
}

// =====================================
// Overlay: single "cardCategory" output
// =====================================
function overlayCardCategory({ input = {}, baseline = {}, hist = {}, defaultCategory }) {
  // Read explicit compare answers if present
  const sobC = cmpNorm(input.sobCompare);
  const edC  = cmpNorm(input.edemaCompare);
  const fatC = cmpNorm(input.fatigueCompare);

  // Fallback: infer "worse" from delta when no compare answer exists
  const worseFromDelta = (k) => {
    const cur = Number(levels(input[k] ?? input[`${k}Level`]) ?? 0);
    const b   = Number(levels(baseline[k] ?? baseline[`${k}Level`]) ?? 0);
    return (cur - b) >= 0.35; // ~ one level up
  };

  const isWorse = {
    sob: sobC === "worse" || (!sobC && worseFromDelta("sob")),
    edema: edC === "worse" || (!edC && worseFromDelta("edema")),
    fatigue: fatC === "worse" || (!fatC && worseFromDelta("fatigue")),
  };

  const isBetterAny = (sobC === "better") || (edC === "better") || (fatC === "better");
  const todayHasWorsening = isWorse.sob || isWorse.edema || isWorse.fatigue;

  const severeBase = {
    sob:     isSevereLabel(baseline.sobLevel ?? baseline.sob),
    edema:   isSevereLabel(baseline.edemaLevel ?? baseline.edema),
    fatigue: isSevereLabel(baseline.fatigueLevel ?? baseline.fatigue),
  };
  const anySevereBase = severeBase.sob || severeBase.edema || severeBase.fatigue;
  const severeWorseningCount =
    (severeBase.sob && isWorse.sob ? 1 : 0) +
    (severeBase.edema && isWorse.edema ? 1 : 0) +
    (severeBase.fatigue && isWorse.fatigue ? 1 : 0);

  // Start from legacy default category (Green/Yellow/Orange/Red) mapped from normalized
  let cardCategory = defaultCategory;

  // Neutral for true "no change" (no better, no worse)
  const noChanges = !isBetterAny && !todayHasWorsening;
  if (noChanges) {
    cardCategory = "Neutral";
  }

  // If any "Better" and no "Worse" -> Green
  if (isBetterAny && !todayHasWorsening) {
    cardCategory = "Green";
  }

  // Advanced-baseline escalation
  if (anySevereBase) {
    if (severeBase.sob && isWorse.sob) {
      cardCategory = "Red"; // automatic Red for SOB severe + worse
    } else if (severeWorseningCount >= 2) {
      cardCategory = "Red"; // multiple severe symptoms worsening
    } else if (severeWorseningCount === 1) {
      cardCategory = (cardCategory === "Red") ? "Red" : "Orange"; // at least Orange
    } else if (noChanges) {
      cardCategory = "Neutral"; // stable severe baseline shows neutral
    }
  } else {
    // Non-advanced users: allow slight change = Yellow when default would otherwise be Green
    const minorOnlyOneWorse =
      (isWorse.sob ? 1 : 0) + (isWorse.edema ? 1 : 0) + (isWorse.fatigue ? 1 : 0) === 1;

    if (minorOnlyOneWorse && cardCategory === "Green") {
      cardCategory = "Yellow";
    }
  }

  // Temporal persistence: promote Orange/Red on 3rd consecutive day
  const lastCards = Array.isArray(hist.cardCategories)
    ? hist.cardCategories.slice(-CONFIG_ASE13.PERSISTENCE_PROMOTE_DAYS)
    : [];
  const lastWereOrangeOrRed =
    lastCards.length === CONFIG_ASE13.PERSISTENCE_PROMOTE_DAYS &&
    lastCards.every(c => c === "Orange" || c === "Red");

  if (cardCategory !== "Red" && lastWereOrangeOrRed && todayHasWorsening) {
    cardCategory = CONFIG_ASE13.PERSISTENCE_PROMOTE_TO; // => Red
  }

  return cardCategory;
}

// ======================
// Public API (exported)
// ======================
export default function calculateScore_ASE13(input = {}, baseline = {}, hist = {}, debug = false) {
  // Core normalized math
  const core = computeCoreScore(input, baseline, hist);

  // Incomplete: return Neutral + minimal fields
  if (core.incomplete) {
    const out = {
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
    if (debug) console.log("[ASE1.3] OUT (incomplete):", out);
    return out;
  }

  // Seed default category from normalized (legacy thresholds), but do not export it
  const defaultCategory = catFromScore(core.normalized, CONFIG_ASE13);

  // Compute overlay card category (single UI-facing category)
  const cardCategory = overlayCardCategory({
    input, baseline, hist, defaultCategory
  });

  // Lightweight 7-day trend descriptor (non-diagnostic)
  const ns = Array.isArray(hist?.normalizedScores) ? hist.normalizedScores.slice(-7) : [];
  let slope = 0, direction = "stable";
  if (ns.length >= 2) {
    slope = +(ns[ns.length - 1] - ns[0]).toFixed(2);
    direction = (slope > 0.4) ? "worsening" : (slope < -0.4) ? "improving" : "stable";
  }

  // Final payload (single category for UI)
  const out = {
    version: CONFIG_ASE13.VERSION,
    buildVersion: CONFIG_ASE13.VERSION,

    normalized: core.normalized,
    weightedSymptoms: core.weightedSymptoms,
    mergedNoiseGuard: core.mergedNoiseGuard,

    cardCategory,                 // "Neutral" | "Green" | "Yellow" | "Orange" | "Red"
    awarenessLevel: cardCategory, // 1:1 map for theming
    needsBaselineRefresh: core.needsBaselineRefresh,

    trend: { direction, slope }
  };

  // Append to history (for persistence outside this module)
  (hist.cardCategories ??= []).push(cardCategory);
  (hist.normalizedScores ??= []).push(core.normalized);

  if (debug) console.log("[ASE1.3] OUT:", out);
  return out;
}

// Export config for tests/analytics
export { CONFIG_ASE13 as CFG_EXPORT };
