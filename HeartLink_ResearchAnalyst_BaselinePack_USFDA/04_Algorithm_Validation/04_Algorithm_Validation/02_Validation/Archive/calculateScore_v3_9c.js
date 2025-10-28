// ---------------------------------------------------------------------------
// HeartLink Algorithm v3.9c – Adaptive Stability Engine (ASE 1.0)
// CLINICAL-SIMPLIFIED BUILD — 2025-10-20 (FINAL)
// ---------------------------------------------------------------------------

import { levels, ema, slopeUp } from "./utils/emaUtils.js";
import { applyOrangeGreenSmoothing } from "./utils/deEscalation.js";

export const CONFIG_V39 = {
  EMA_WINDOW_DAYS: 26,
  EXTENDED_EMA_WINDOW: 32,
  MILD_WEIGHT_FACTOR: 0.55,
  NOISE_THRESHOLD: 0.95,
  DEESCALATION_DAYS: 5,
  YELLOW_STICKINESS_DAYS: 2,
  RECOVERY_CREDIT: 1.30,
  RECOVERY_GREEN_BAND: 3.8,
  RECOVERY_GRACE_DAYS: 2,
  ACUTE_WS_JUMP: 0.80,
  VERSION: "3.9c.FINAL-ASE1.0-CLINICAL-SIMPLIFIED-2025-10-20"
};

// Helpers
function catRank(c){return c==="Green"?0:c==="Yellow"?1:c==="Orange"?2:3;}
function rankToCat(r){return r<=0?"Green":r===1?"Yellow":r===2?"Orange":"Red";}
function median(a){if(!a?.length)return 0;const b=a.slice().sort((x,y)=>x-y);const m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;}

// ---------------------------------------------------------------------------
// MAIN ALGORITHM
// ---------------------------------------------------------------------------
export default function calculateScore_v3_9c(input={}, baseline={}, hist={}, debug=false) {
  const SYMPTOMS = ["sob","edema","fatigue"];
  const ACUTE_CORE_SYMPTOMS = ["sob","edema"];
  const base = {};

  // 1️⃣  Raw symptom intensities (no baseline subtraction)
  for (const key of SYMPTOMS) {
    const val = Number(levels(input[key]) ?? 0);
    base[key] = Number.isFinite(val) && val > 0 ? val * 2 : 0;
  }

  // 2️⃣  Orthopnea optional acute flag
  const orthopneaFlag = !!input.orthopnea && !baseline.orthopnea;

  // 3️⃣  Weighted symptom pressure
  const weightedSymptoms = (base.sob + base.edema + base.fatigue) *
                           CONFIG_V39.MILD_WEIGHT_FACTOR;

  // 4️⃣  EMA smoothing
  const wsHist = Array.isArray(hist.wsSeries) ? hist.wsSeries.slice() : [];
  if (wsHist.length < 3)
    wsHist.push(weightedSymptoms, weightedSymptoms, weightedSymptoms);

  let trendScore = 0;
  try {
    const emaOut = ema(wsHist, CONFIG_V39.EMA_WINDOW_DAYS);
    trendScore = Array.isArray(emaOut) ? emaOut.at(-1) : emaOut;
  } catch {}
  if (!Number.isFinite(trendScore)) trendScore = 0;

  // 5️⃣  Normalized total score
  let normalized = Math.min(10, Math.max(0, +(weightedSymptoms + trendScore - 0.05).toFixed(2)));

  // 6️⃣  Category thresholds
  let proposed = normalized < 2.0 ? "Green"
               : normalized < 4.5 ? "Yellow"
               : normalized < 7.5 ? "Orange" : "Red";

  // 7️⃣  Acute escalation (orthopnea acts as binary booster)
  const recent = wsHist.slice(-3);
  const deltaWs = weightedSymptoms - median(recent);
  const coreCount = ACUTE_CORE_SYMPTOMS.reduce((a,k)=>a+(base[k]>=2?1:0),0);

  if (deltaWs >= CONFIG_V39.ACUTE_WS_JUMP && (orthopneaFlag || coreCount>=2)) {
    proposed = rankToCat(Math.max(catRank(proposed), coreCount>=2?2:1));
    if (debug) console.log("🔥 ACUTE ESCALATION", { deltaWs, coreCount, orthopneaFlag, proposed });
  }

  // 8️⃣  Clamp & smoothing
  const category = applyOrangeGreenSmoothing({
    lastCats: hist.categories ?? [],
    proposed,
    stableDays: CONFIG_V39.DEESCALATION_DAYS
  });

  (hist.wsSeries ??= []).push(weightedSymptoms);

  return {
    category,
    normalized,
    weightedSymptoms,
    orthopneaFlag,
    version: CONFIG_V39.VERSION
  };
}
