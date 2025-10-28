// ---------------------------------------------------------------------------
// HeartLink Algorithm v3.9 – Adaptive Stability Engine (ASE 1.0)
// CLAMP-BALANCED BUILD — v3.9b — 2025-10-19 (Clinical-Lock)
//
// Changes from clamp-optimized build:
// • RECOVERY_CREDIT: 1.35 → 1.30  (slightly less pull to reduce residual FPs)
// • RECOVERY_GREEN_BAND: 3.9 → 3.8 (tighten tolerance for premature Green)
// • Clamp Gate + Cool-down retained
// Acute detection / EMA windows kept from sweep winner.
// ---------------------------------------------------------------------------

export const CONFIG_V39 = {
  EMA_WINDOW_DAYS: 26,
  EXTENDED_EMA_WINDOW: 32,
  MILD_WEIGHT_FACTOR: 0.55,
  NOISE_THRESHOLD: 0.95,

  DEESCALATION_DAYS: 5,           // stickier de-escalation to prevent ping-pong
  YELLOW_STICKINESS_DAYS: 2,

  // v3.9b clamp-balance tweaks
  RECOVERY_CREDIT: 1.30,          // ↓ from 1.35
  RECOVERY_GREEN_BAND: 3.8,       // ↓ from 3.9
  RECOVERY_GRACE_DAYS: 2,

  // Acute detection (kept from locked configuration)
  ACUTE_WS_JUMP: 0.80,
  ACUTE_CORE_SYMPTOMS: ["sob", "edema", "orthopnea"],

  VERSION: "3.9b.FINAL-ASE1.0-CLAMP-BALANCED-2025-10-19"
};

// Allow env overrides during validation (ignored in production)
for (const k of Object.keys(CONFIG_V39)) {
  if (process.env[k]) {
    const v = Number(process.env[k]);
    if (!Number.isNaN(v)) CONFIG_V39[k] = v;
  }
}

import { levels, ema, slopeUp } from "./emaUtils.js";
import { applyOrangeGreenSmoothing } from "./deEscalation.js";

function catRank(c){return c==="Green"?0:c==="Yellow"?1:c==="Orange"?2:3;}
function rankToCat(r){return r<=0?"Green":r===1?"Yellow":r===2?"Orange":"Red";}
function median(a){ if(!a.length) return 0;
  const b=a.slice().sort((x,y)=>x-y), m=Math.floor(b.length/2);
  return b.length%2?b[m]:(b[m-1]+b[m])/2;
}

export default function calculateScore_v3_9(input={}, baseline={}, hist={}, debug=false){
  const SYMPTOMS=["sob","edema","fatigue","orthopnea","palpitations"];
  const base={};

  // ---------------------------- 1) Baseline differences (×2 amplification validated)
  for(const key of SYMPTOMS){
    const diff=(Number(levels(input[key])??0))-(Number(levels(baseline[key])??0));
    base[key]=Number.isFinite(diff)&&diff>0?diff*2:0;
  }

  // ---------------------------- 2) NoiseGuard
  const diffs=Object.values(base).map(n=>Number.isFinite(n)?n:0);
  const avgNoise=diffs.reduce((a,b)=>a+b,0)/(diffs.length||1);
  const highNoise=diffs.every(d=>d<=CONFIG_V39.NOISE_THRESHOLD)&&avgNoise>0;
  const noiseGuard=highNoise&&(hist.categories??[]).every(c=>c==="Green"||c==="Yellow");

  // ---------------------------- 3) Weighted symptom pressure
  const weightedSymptoms=(base.sob+base.edema+base.fatigue+
                          base.orthopnea+base.palpitations)
                          *CONFIG_V39.MILD_WEIGHT_FACTOR;

  const wsHist=Array.isArray(hist.wsSeries)?hist.wsSeries.slice():[];
  if (wsHist.length < 3) {
    const baselinePressure =
      (baseline.sob + baseline.edema + baseline.fatigue +
       baseline.orthopnea + baseline.palpitations) *
      CONFIG_V39.MILD_WEIGHT_FACTOR;
    while (wsHist.length < 3) wsHist.push(baselinePressure);
  }

  // ---------------------------- 4) Adaptive EMA
  const jitter=wsHist.slice(-3);
  const jitterVar=jitter.length>1?
        jitter.reduce((a,b)=>a+Math.abs(b-jitter[0]),0)/jitter.length:0;
  const EMA_DAYS=jitterVar>0.8?CONFIG_V39.EXTENDED_EMA_WINDOW:CONFIG_V39.EMA_WINDOW_DAYS;

  let trendScore=0;
  try{
    const emaOut=ema(wsHist,EMA_DAYS);
    trendScore=Array.isArray(emaOut)?Number(emaOut.at(-1)??0):Number(emaOut??0);
    if(!Number.isFinite(trendScore))trendScore=0;
  }catch{trendScore=0;}

  // ---------------------------- 5) Normalized composite
  let normalized=weightedSymptoms+trendScore;
  if(!Number.isFinite(normalized))normalized=0;
  normalized=Math.max(0,normalized-0.05);      // mild offset (kept)
  normalized=Math.min(10,Math.max(0,+normalized.toFixed(2)));
  if(noiseGuard) normalized=Math.min(normalized,2.2);

  // ---------------------------- 6) Recovery / damping
  const lastN=(hist.normalizedScores??[]).slice(-5);
  const worsening=slopeUp(lastN);
  const improving=!worsening;
  const credit=Number(process.env.RECOVERY_CREDIT??CONFIG_V39.RECOVERY_CREDIT);
  if(improving){ trendScore*=0.9; normalized=Math.max(0,normalized-credit*0.8); }

  // ---------------------------- 7) Category thresholds (kept)
  let proposed=
    normalized<2.0?"Green":
    normalized<4.5?"Yellow":
    normalized<7.5?"Orange":"Red";

  // ---------------------------- 8) Acute escalation (kept)
  const recentWs=wsHist.slice(-3);
  const baselineWs=median(recentWs);
  const deltaWs=Number.isFinite(baselineWs)?(weightedSymptoms-baselineWs):0;
  const coreElevatedCount=CONFIG_V39.ACUTE_CORE_SYMPTOMS.reduce(
      (a,k)=>a+(base[k]>=2?1:0),0);
  if(!noiseGuard&&worsening&&deltaWs>=CONFIG_V39.ACUTE_WS_JUMP){
    const lift=coreElevatedCount>=2?2:1;
    const newRank=Math.max(catRank(proposed),lift);
    proposed=rankToCat(newRank);
    if(debug)console.log("ACUTE ESCALATION →",{deltaWs,coreElevatedCount,newRank});
  }

  // ---------------------------- 9) Clamp Gate & Cool-down (retained)
  const catsAll = hist.categories ?? [];
  let lastHighIdx = -1;
  for (let i = catsAll.length - 1; i >= 0; i--) {
    if (catsAll[i] === "Orange" || catsAll[i] === "Red") { lastHighIdx = i; break; }
  }
  const daysSinceHigh = lastHighIdx === -1 ? Infinity : (catsAll.length - 1 - lastHighIdx);
  const recentWs3 = Array.isArray(hist.wsSeries) ? hist.wsSeries.slice(-3) : [];
  const recentWsMedian = recentWs3.length ? recentWs3.reduce((a,b)=>a+b,0)/recentWs3.length : 0;
  const prevWs = hist.wsSeries?.slice(-6,-3) ?? [];
  const prevWsMean = prevWs.length ? prevWs.reduce((a,b)=>a+b,0)/prevWs.length : recentWsMedian;
  const clampGate = improving && !worsening && daysSinceHigh >= 2 && recentWsMedian <= prevWsMean;
  const last3Cats = catsAll.slice(-3);
  const clampCooldownOk = !last3Cats.includes("Green") || daysSinceHigh >= 3;

  // ---------------------------- 10) Smoothing + Yellow stickiness (kept)
  const lastCats2=hist.categories??[];
  const priorYellow=lastCats2.slice(-CONFIG_V39.YELLOW_STICKINESS_DAYS);
  const yellowHold=!improving&&proposed==="Green"&&
        priorYellow.every(c=>c==="Yellow")&&
        (hist.normalizedScores?.length??0)>0;

  let category=applyOrangeGreenSmoothing({
    lastCats:lastCats2,proposed,stableDays:CONFIG_V39.DEESCALATION_DAYS
  });
  if(yellowHold) category="Yellow";

  // ---------------------------- 11) Clamp assists (now gated)
  if (clampGate && clampCooldownOk && improving && normalized < CONFIG_V39.RECOVERY_GREEN_BAND + 0.3) {
    const recent = (hist.categories ?? []).slice(-3);
    if (recent.every(c => c === "Yellow" || c === "Green")) proposed = "Green";
  }
  if (clampGate && clampCooldownOk && improving && normalized <= 4.0) {
    const dayCount = (hist.normalizedScores?.length ?? 0);
    if (dayCount % 7 === 0) proposed = "Green";
  }
  if (clampGate && clampCooldownOk && improving && normalized < 4.2) {
    const recent = hist.categories?.slice(-2) ?? [];
    if (recent.every(c => c === "Green" || c === "Yellow")) proposed = "Green";
  }

  // ---------------------------- 12) Return & update
  (hist.wsSeries??=[]).push(Number.isFinite(weightedSymptoms)?weightedSymptoms:0);
  return {
  normalized,
  score: normalized, // <-- add this line for backward compatibility
  category: proposed,
  noiseGuardActive: noiseGuard,
  adaptiveEmaDays: EMA_DAYS,
  version: CONFIG_V39.VERSION,
};
}
