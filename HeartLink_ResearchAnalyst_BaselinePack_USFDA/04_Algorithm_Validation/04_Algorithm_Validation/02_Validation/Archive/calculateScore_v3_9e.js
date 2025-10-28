// ---------------------------------------------------------------------------
// HeartLink Algorithm v3.9e-A – ASE 1.2 (Specificity-First)
// FINAL: Noise-cap 1.95 + Delta tolerance 0.18
// ---------------------------------------------------------------------------

import { levels, ema } from "./utils/emaUtils.js";
import { applyOrangeGreenSmoothing } from "./utils/deEscalation.js";

export const CONFIG_V39E = {
  EMA_WINDOW_DAYS: 26,
  EXTENDED_EMA_WINDOW: 32,
  MILD_WEIGHT_FACTOR: 0.52,
  DELTA_TOLERANCE_BASE: 0.19,          // Patch A: raised from 0.17 → 0.18
  DELTA_TOLERANCE_EARLY: 0.20,
  DEESCALATION_DAYS: 5,
  RECOVERY_CREDIT: 1.30,
  RECOVERY_GREEN_BAND: 3.8,
  ACUTE_WS_JUMP: 0.80,
  VERSION: "3.9e-A.ASE1.2-Specificity-Noisecap195-2025-10-21"
};

// Helpers
const catRank = (c) => (c === "Green" ? 0 : c === "Yellow" ? 1 : c === "Orange" ? 2 : 3);
const rankToCat = (r) => (r <= 0 ? "Green" : r === 1 ? "Yellow" : r === 2 ? "Orange" : "Red");
const median = (a) => (!a?.length ? 0 : a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)]);

// ---------------------------------------------------------------------------
// MAIN FUNCTION
// ---------------------------------------------------------------------------
export default function calculateScore_v3_9e(input = {}, baseline = {}, hist = {}, debug = false) {
  const SYMPTOMS = ["sob", "edema", "fatigue"];
  const ACUTE_CORE = ["sob", "edema"];
  const base = {};

  const baselineDays = hist.normalizedScores?.length ?? 0;
  const tol = baselineDays < 14 ? CONFIG_V39E.DELTA_TOLERANCE_EARLY : CONFIG_V39E.DELTA_TOLERANCE_BASE;

  // 1️⃣ Adaptive delta weighting + merged noise filter
  let smallChangeCount = 0;
  for (const k of SYMPTOMS) {
    const cur = Number(levels(input[k]) ?? 0);
    const baseVal = Number(levels(baseline[k]) ?? 0);
    let delta = cur - baseVal;

    if (Math.abs(delta) < tol) { delta = 0; smallChangeCount++; }
    base[k] = delta > 0 ? delta * 2.0 : delta * 1.2;
  }
  const mergedNoiseGuard = (smallChangeCount >= 2);

  // 2️⃣ Orthopnea binary trigger
  const orthopneaFlag = !!input.orthopnea && !baseline.orthopnea;

  // 3️⃣ Weighted symptom pressure
  const weightedSymptoms = (base.sob + base.edema + base.fatigue) * CONFIG_V39E.MILD_WEIGHT_FACTOR;

  // 4️⃣ EMA smoothing
  const wsHist = Array.isArray(hist.wsSeries) ? hist.wsSeries.slice() : [];
  if (wsHist.length < 3) wsHist.push(weightedSymptoms, weightedSymptoms, weightedSymptoms);

  let trendScore = 0;
  try {
    const emaOut = ema(wsHist, CONFIG_V39E.EMA_WINDOW_DAYS);
    trendScore = Array.isArray(emaOut) ? emaOut.at(-1) : emaOut;
  } catch {}
  if (!Number.isFinite(trendScore)) trendScore = 0;

  // 5️⃣ Normalized composite
  let normalized = Math.min(10, Math.max(0, +((weightedSymptoms + trendScore - 0.05).toFixed(2))));
  // Noise-cap: force micro-noise days to stay Green
  if (mergedNoiseGuard) normalized = Math.min(normalized, 1.95);

  // 6️⃣ Category thresholds
  let proposed =
    normalized < 2.0 ? "Green" :
    normalized < 4.5 ? "Yellow" :
    normalized < 7.5 ? "Orange" : "Red";

  // 7️⃣ Acute escalation
  const recent = wsHist.slice(-3);        // ✅ removed stray 'f'
  const deltaWs = weightedSymptoms - median(recent);
  const coreCount = ACUTE_CORE.reduce((a, k) => a + (base[k] >= 0.3 ? 1 : 0), 0);

  if (deltaWs >= CONFIG_V39E.ACUTE_WS_JUMP && (orthopneaFlag || coreCount >= 2)) {
    proposed = rankToCat(Math.max(catRank(proposed), coreCount >= 2 ? 2 : 1));
    if (debug) console.log("🔥 ACUTE ESCALATION", { deltaWs, coreCount, orthopneaFlag, proposed });
  }

  // 8️⃣ Clamp / cool-down smoothing
  const category = applyOrangeGreenSmoothing({
    lastCats: hist.categories ?? [],
    proposed,
    stableDays: CONFIG_V39E.DEESCALATION_DAYS
  });

  (hist.wsSeries ??= []).push(weightedSymptoms);
  return { category, normalized, weightedSymptoms, orthopneaFlag, version: CONFIG_V39E.VERSION };
}
