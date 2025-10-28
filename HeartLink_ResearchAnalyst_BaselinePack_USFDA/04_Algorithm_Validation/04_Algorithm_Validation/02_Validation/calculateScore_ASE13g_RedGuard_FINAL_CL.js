// ---------------------------------------------------------------------------
// HeartLink Algorithm – ASE 1.3k  (Rescale-Recenter, Pre-Clinical-Lock)
// ---------------------------------------------------------------------------
// Status: in-trial build — not yet clinical-lock
// Purpose:
//   • Down-scaled symptom amplification (1.4× instead of 2.0×)
//   • Higher thresholds (1.5 / 2.5 / 3.5)
//   • Booster minimal (4–8 %) capped at 0.25
//   • EMA 21 days
//   • Optional neutral-buffer toggle to restore Neutral zone (~20 %) for very stable users
// ---------------------------------------------------------------------------

import { levels, ema } from "./utils/emaUtils.js";

export const CONFIG_ASE13K = {
  EMA_WINDOW_DAYS: 21,
  MILD_WEIGHT_FACTOR: 0.56,
  DELTA_TOLERANCE: 0.17,
  GREEN_MAX: 1.5,
  YELLOW_MAX: 2.5,
  ORANGE_MAX: 3.5,
  NOISE_CAP_WITH_MERGED_GUARD: 1.95,
  BASELINE_REFRESH_DAYS: 30,
  ENABLE_NEUTRAL_BUFFER: true, // toggle true to restore ~20 % Neutral
  VERSION: "ASE_1.3k_RescaleRecenter_PreCL_2025-10-17"
};

const SYMPTOMS = ["sob","edema","fatigue"];
const isSevereLabel = v => v === "Severe" || v === 3 || v === "3" || v === 3.0;
const isEmpty = x => x === undefined || x === null || x === "";

// ---------- Core score ----------
function computeCoreScore(input={},baseline={},hist={}) {
  const C=CONFIG_ASE13K;

  for (const k of SYMPTOMS){
    const v=input[k]??input[`${k}Level`];
    if (isEmpty(v))
      return {incomplete:true,normalized:0,weightedSymptoms:0,mergedNoiseGuard:false};
  }

  const base={}; let smallChange=0;
  for (const k of SYMPTOMS){
    const cur=Number(levels(input[k]??input[`${k}Level`])??0);
    const b=Number(levels(baseline[k]??baseline[`${k}Level`])??0);
    let d=cur-b;
    if(Math.abs(d)<C.DELTA_TOLERANCE){d=0;smallChange++;}
    base[k]=d>0?d*1.30:d*1.15;     // down-scaled amplification
  }

  const mergedNoiseGuard=smallChange>=2;
  const weightedSymptoms=(base.sob+base.edema+base.fatigue)*C.MILD_WEIGHT_FACTOR;

  const wsHist=Array.isArray(hist.wsSeries)?hist.wsSeries.slice():[];
  if(wsHist.length<3)wsHist.push(weightedSymptoms,weightedSymptoms,weightedSymptoms);

  let trendScore=0;
  try{
    const emaOut=ema(wsHist,C.EMA_WINDOW_DAYS);
    trendScore=Array.isArray(emaOut)?emaOut.at(-1):emaOut;
  }catch{}
  if(!Number.isFinite(trendScore))trendScore=0;

  let normalized=Math.min(3.5,Math.max(0,+((weightedSymptoms+trendScore).toFixed(2))));
  if(mergedNoiseGuard)normalized=Math.min(normalized,C.NOISE_CAP_WITH_MERGED_GUARD);

  (hist.wsSeries??=[]).push(weightedSymptoms);
  return {incomplete:false,normalized,weightedSymptoms,mergedNoiseGuard};
}

// ---------- Booster ----------
function applyBooster({input={},baseline={},normalized}) {
  const C=CONFIG_ASE13K;

  const worse=k=>{
    const cur=Number(levels(input[k]??input[`${k}Level`])??0);
    const b=Number(levels(baseline[k]??baseline[`${k}Level`])??0);
    return (cur-b)>=C.DELTA_TOLERANCE;
  };

  const sob=worse("sob"), ed=worse("edema"), fat=worse("fatigue");
  const numWorse=(sob?1:0)+(ed?1:0)+(fat?1:0);

  const severeBase={
    sob:isSevereLabel(baseline.sobLevel??baseline.sob),
    edema:isSevereLabel(baseline.edemaLevel??baseline.edema),
    fatigue:isSevereLabel(baseline.fatigueLevel??baseline.fatigue)
  };
  const severeCount=
    (severeBase.sob&&sob?1:0)+
    (severeBase.edema&&ed?1:0)+
    (severeBase.fatigue&&fat?1:0);

  if(!(normalized>=2.0 && numWorse>=2))
    return {normalizedBoosted:normalized,boosterApplied:0};

  let booster=normalized*0.04;
  if(severeCount>=1)booster+=normalized*0.04;
  if(booster>0.25)booster=0.25;

  const nBoost=Math.min(3.5,+(normalized+booster).toFixed(2));
  return {normalizedBoosted:nBoost,boosterApplied:+booster.toFixed(2)};
}

// ---------- Category mapping ----------
function mapCategory(n,C=CONFIG_ASE13K){
  if(n<C.GREEN_MAX)return"Green";
  if(n<C.YELLOW_MAX)return"Yellow";
  if(n<C.ORANGE_MAX)return"Orange";
  return"Red";
}

// ---------- Optional neutral-buffer ----------
function applyNeutralBuffer(n,cat,C){
  if(!C.ENABLE_NEUTRAL_BUFFER)return{nOut:n,catOut:cat};
  if(cat==="Green"||cat==="Yellow"){
    const adjust=-0.2*(1-(n/C.ORANGE_MAX));
    const nAdj=Math.max(0,n+adjust);
    const catAdj=nAdj<C.GREEN_MAX?"Neutral":cat;
    return{nOut:nAdj,catOut:catAdj};
  }
  return{nOut:n,catOut:cat};
}

// ---------- Exported main ----------
export default function calculateScore_ASE13K(input={},baseline={},hist={},debug=false){
  const core=computeCoreScore(input,baseline,hist);
  if(core.incomplete)
    return {version:CONFIG_ASE13K.VERSION,cardCategory:"Neutral",normalized:0};

  const {normalizedBoosted,boosterApplied}=applyBooster({input,baseline,normalized:core.normalized});
  let cat=mapCategory(normalizedBoosted,CONFIG_ASE13K);
  const {nOut,catOut}=applyNeutralBuffer(normalizedBoosted,cat,CONFIG_ASE13K);

  const out={
    version:CONFIG_ASE13K.VERSION,
    normalized:nOut,
    weightedSymptoms:core.weightedSymptoms,
    mergedNoiseGuard:core.mergedNoiseGuard,
    cardCategory:catOut,
    awarenessLevel:catOut
  };
  if(debug)
    console.log("[ASE 1.3k]",core.normalized,"+boost",boosterApplied,"→",nOut,catOut);
  return out;
}

export { CONFIG_ASE13K as CFG_EXPORT };
