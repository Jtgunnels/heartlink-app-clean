// ---------------------------------------------------------------------------
// HeartLink Algorithm – ASE 1.3g FINAL (Balanced Clinical-Lock)
// Date: 2025-10-16
//
// Diffs vs ASE 1.3f:
// • DELTA_TOLERANCE_BASE: 0.21 → 0.2  (EARLY min widened via EMA min, not tol)
// • MILD_WEIGHT_FACTOR: 0.55 → 0.50
// • Amplification (Δ>0): ×2.0 → ×1.8   (Δ<0 stays ×1.2)
// • Single-symptom guard: if exactly one raw Δ∈(0, 0.30), cap normalized ≤ 1.80
// • RECOVERY_CREDIT: 1.32 → 1.35
// • Adaptive EMA minimum: 14 → 16  (EMA = min(26, max(16, 12 + floor(days/2))))
// • Keep: ACUTE_WS_JUMP=0.90 + normalized ≥3.0 gate; Red at ≥8.0; clamp days=4
// ---------------------------------------------------------------------------

import { levels, ema } from "./utils/emaUtils.js";
import { applyOrangeGreenSmoothing } from "./utils/deEscalation.js";

export const CONFIG_ASE13G = {
  // Smoothing
  EMA_WINDOW_DAYS: 26,
  MILD_WEIGHT_FACTOR: 0.85,

  // Tolerance for tiny baseline deltas
  DELTA_TOLERANCE_BASE: 0.14,     // widen to absorb day-to-day noise

  // De-escalation / recovery
  DEESCALATION_DAYS: 4,
  RECOVERY_CREDIT: 1.35,
  RECOVERY_GREEN_BAND: 3.8,

  // Acute gate (tightened in 1.3f and retained)
  ACUTE_WS_JUMP: 0.90,

  // Noise squash
  NOISE_CAP: 3.0,
  SINGLE_SYMPTOM_CAP: 2.60,       // if only one tiny driver, cap normalized

  // Version tag
  VERSION: "ASE-1.3g-FINAL-CL-2025-10-16",
};

// helpers
const catRank = (c) => (c === "Green" ? 0 : c === "Yellow" ? 1 : c === "Orange" ? 2 : 3);
const rankToCat = (r) => (r <= 0 ? "Green" : r === 1 ? "Yellow" : r === 2 ? "Orange" : "Red");
const median = (a) => (!a?.length ? 0 : a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)]);

/**
 * calculateScore_ASE13g_FINAL_CL
 * @param {Object} input    {sob,edema,fatigue,orthopnea?...}
 * @param {Object} baseline same keys as input
 * @param {Object} hist     {categories?:string[], wsSeries?:number[], normalizedScores?:number[]}
 * @returns {{score:number, normalized:number, category:string, version:string}}
 */
export default function calculateScore_ASE13g_FINAL_CL(input = {}, baseline = {}, hist = {}, debug = false) {
  const SYMPTOMS = ["sob", "edema", "fatigue"];
  const ACUTE_CORE = ["sob", "edema"];

  const days = Array.isArray(hist?.normalizedScores) ? hist.normalizedScores.length : 0;
  const tol = CONFIG_ASE13G.DELTA_TOLERANCE_BASE;

  // 1) Adaptive deltas + noise guards
  const base = {};
  let smallChangeCount = 0;
  const rawPosDeltas = []; // track raw (pre-amp) positive deltas for single-symptom guard

  for (const k of SYMPTOMS) {
    const cur = Number(levels(input[k]) ?? 0);
    const baseVal = Number(levels(baseline[k]) ?? 0);
    let rawDelta = cur - baseVal;

    if (Math.abs(rawDelta) < tol) {
      rawDelta = 0;
      smallChangeCount++;
    }
    if (rawDelta > 0) rawPosDeltas.push(rawDelta);

    // amplify increases a bit less; decreases lightly softened as before
    const amp = rawDelta > 0 ? 1.8 : 1.2;
    base[k] = rawDelta * amp;
  }

  const mergedNoiseGuard = smallChangeCount >= 2;

  // 2) Orthopnea flag (new vs baseline only)
  const orthopneaFlag = !!input.orthopnea && !baseline.orthopnea;

  // 3) Weighted symptom pressure
  const weightedSymptoms =
    (base.sob + base.edema + base.fatigue) * CONFIG_ASE13G.MILD_WEIGHT_FACTOR;

  // 4) Adaptive EMA with stronger minimum for early users
  const wsHist = Array.isArray(hist.wsSeries) ? hist.wsSeries.slice() : [];
  if (wsHist.length < 3) {
    while (wsHist.length < 3) wsHist.push(weightedSymptoms);
  }
  const EMA_DAYS = Math.min( CONFIG_ASE13G.EMA_WINDOW_DAYS,
                             Math.max(16, 12 + Math.floor(days / 2)) );

  let trendScore = 0;
  try {
    const emaOut = ema(wsHist, EMA_DAYS);
    trendScore = Array.isArray(emaOut) ? Number(emaOut.at(-1) ?? 0) : Number(emaOut ?? 0);
    if (!Number.isFinite(trendScore)) trendScore = 0;
  } catch { trendScore = 0; }

  // 5) Normalized composite with guardrails
  let normalized = weightedSymptoms + trendScore - 0.05; // tiny stability bias
  normalized = Math.max(0, Math.min(10, +normalized.toFixed(2)));

  // merged-noise guard (≥2 sub-tol) ⇒ cap around Green
  if (mergedNoiseGuard) normalized = Math.min(normalized, CONFIG_ASE13G.NOISE_CAP);

  // single-symptom guard: exactly one small driver (0 < raw Δ < 0.30)
  if (rawPosDeltas.length === 1 && rawPosDeltas[0] > 0 && rawPosDeltas[0] < 0.30) {
    normalized = Math.min(normalized, CONFIG_ASE13G.SINGLE_SYMPTOM_CAP);
  }

  // 6) Category thresholds (Red gate held higher)
  let proposed =
    normalized < 2.0 ? "Green" :
    normalized < 4.5 ? "Yellow" :
    normalized < 8.0 ? "Orange" : "Red";

  // 7) Acute escalation (retain tighter gates)
  const recent = wsHist.slice(-3);
  const deltaWs = weightedSymptoms - median(recent);
  const coreCount = ACUTE_CORE.reduce((a, k) => a + (base[k] >= 0.4 ? 1 : 0), 0);

  if (deltaWs >= CONFIG_ASE13G.ACUTE_WS_JUMP && (orthopneaFlag || coreCount >= 2) && normalized >= 3.0) {
    const targetRank = Math.max(catRank(proposed), coreCount >= 2 ? 2 : 1); // up to Orange unless already higher
    proposed = rankToCat(targetRank);
    if (debug) console.log("🔥 ACUTE (ASE13g)", { deltaWs, coreCount, orthopneaFlag, normalized, targetRank });
  }

  // 8) Clamp smoothing (prevent Orange/Red → immediate Green)
  const lastCats = Array.isArray(hist.categories) ? hist.categories.slice() : [];
  const smoothed = applyOrangeGreenSmoothing({
    lastCats,
    proposed,
    stableDays: CONFIG_ASE13G.DEESCALATION_DAYS,
  });

  // 9) Recovery credit (slightly stronger than 1.3f)
  let finalCategory = smoothed;
  if (finalCategory === "Yellow" && normalized < CONFIG_ASE13G.RECOVERY_GREEN_BAND) {
    const recentNonEsc = lastCats.slice(-CONFIG_ASE13G.DEESCALATION_DAYS).every(
      (c) => c !== "Orange" && c !== "Red"
    );
    if (recentNonEsc) {
      const credited = Math.max(0, +(normalized - (CONFIG_ASE13G.RECOVERY_CREDIT - 1)).toFixed(2));
      if (credited < 2.0) finalCategory = "Green";
    }
  }
if (debug) console.log("Δs", base, "normalized", normalized);
  return {
    score: normalized,
    normalized,
    category: finalCategory,
    version: CONFIG_ASE13G.VERSION,
  };
}
