// HeartLink — Generate a targeted stress-test pack with ground truth
// Outputs: ./Trial_v3_8_Optimization_<date>/TargetedScenarios.json

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const CFG_PATH = path.resolve(__dirname, "./config_trial.json");
const cfg = JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
const TOTAL = Number(cfg.TOTAL_CASES || 2000);

// deterministic PRNG
function mulberry32(a){return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}}
const rnd = mulberry32(cfg.seed || 123456);
const pick = a => a[Math.floor(rnd()*a.length)];
const jitter = (v, s) => v + (rnd()*2 - 1)*s;

function dateISO(off=0){return new Date(Date.now()-off*86400000).toISOString();}

function makeWeights(start, days, gMin, gMax){
  const out=[start];
  for(let i=1;i<days;i++){const g=gMin + rnd()*(gMax-gMin); out.push(Number((out[i-1]+g).toFixed(1)));}
  return out;
}
function makeNoisyNorms(days, base=3.2, noise=1.2){
  return Array.from({length:days},()=>Number(Math.max(0, base + (rnd()*2-1)*noise).toFixed(2)));
}

// Cohort quotas (sum = 2000 by default)
const splits = {
  Borderline: 600,          // around G/Y and Y/O cutoffs
  SingleMild: 400,          // tune FP
  Recovery: 300,            // OG smoothing
  Orthopnea: 250,           // orthopnea only/combos
  FluidTrend: 300,          // EMA sensitivity
  AdaptiveNoise: 150        // variance spikes
};

// Helper to push case
let counter=0;
const cases=[];

function addCase(group, input, baseline, hist, expected_alert, notes){
  counter++;
  cases.push({
    id: `TS_${String(counter).padStart(4,"0")}`,
    trialGroup: group,
    timestamp: dateISO(Math.floor(rnd()*7)),
    input, baseline, hist: hist || {},
    expected_alert, // 0 benign, 1 acute/alert expected
    notes
  });
}

// 1) Borderline thresholds (±5% around cutoffs)
for(let i=0;i<splits.Borderline;i++){
  // near green/yellow or yellow/orange
  const edge = pick(["GY","YO"]);
  const mild = pick(["sob","edema","fatigue"]);
  const input = { sob:"none", edema:"none", fatigue:"none" };
  input[mild] = pick(["mild","moderate"]);
  const baseline = { baselineSob:"none", baselineEdema:"none", baselineFatigue:"none" };
  const hist = { normalizedScores: makeNoisyNorms(7, edge==="GY"? 2.6 : 5.1, 0.25) };
  const expected_alert = edge==="GY" ? 0 : 1; // near GY benign; near YO should alert
  addCase("Borderline", input, baseline, hist, expected_alert, `near ${edge}`);
}

// 2) Single mild permutations (should be benign)
for(let i=0;i<splits.SingleMild;i++){
  const s = pick(["sob","edema","fatigue"]);
  const input = { sob:"none", edema:"none", fatigue:"none" };
  input[s] = "mild";
  const baseline = { baselineSob:"none", baselineEdema:"none", baselineFatigue:"none" };
  addCase("SingleMild", input, baseline, {}, 0, `single mild ${s}`);
}

// 3) Recovery smoothing OG
for(let i=0;i<splits.Recovery;i++){
  const baseline = { baselineSob:"none", baselineEdema:"none", baselineFatigue:"none" };
  const input = { sob:"none", edema:"none", fatigue:"none" };
  const hist = { categories: ["Orange", pick(["Orange","Yellow"]), "Green"] };
  addCase("Recovery", input, baseline, hist, 0, "OG smoothing; should remain non-alert");
}

// 4) Orthopnea (often alert, depending on severity)
for(let i=0;i<splits.Orthopnea;i++){
  const level = pick(["mild","moderate","severe"]);
  const input = { sob:"none", edema:"none", fatigue:"none", orthopnea: level };
  const baseline = { baselineSob:"none", baselineEdema:"none", baselineFatigue:"none", baselineOrthopnea:"none" };
  const expected_alert = (level==="moderate" || level==="severe") ? 1 : 0;
  addCase("Orthopnea", input, baseline, {}, expected_alert, `orthopnea ${level}`);
}

// 5) FluidTrend (EMA sensitivity)
for(let i=0;i<splits.FluidTrend;i++){
  const startW = Math.round(jitter(180,12));
  const mode = pick(["slow","moderate","rapid"]);
  const weights = mode==="slow" ? makeWeights(startW, 7, 0.1, 0.25)
                  : mode==="moderate" ? makeWeights(startW, 7, 0.3, 0.5)
                  : makeWeights(startW, 5, 0.8, 1.6);
  const input = { sob: pick(["none","mild"]), edema: pick(["none","mild"]), fatigue: pick(["none","mild"]), weightChange: Number(jitter(2.6,1.2).toFixed(1)) };
  const baseline = { baselineSob:"none", baselineEdema:"none", baselineFatigue:"none", weight: startW };
  const expected_alert = mode==="rapid" ? 1 : 0; // rapid gain should alert
  addCase("FluidTrend", input, baseline, { weights }, expected_alert, `fluid ${mode}`);
}

// 6) AdaptiveNoise (noisy benign users)
for(let i=0;i<splits.AdaptiveNoise;i++){
  const input = { sob: pick(["none","mild"]), edema: pick(["none","mild"]), fatigue: pick(["none","mild"]) };
  const baseline = { baselineSob:"none", baselineEdema:"none", baselineFatigue:"none" };
  const norms = makeNoisyNorms(20, 3.6 + rnd()*1.6, 2.0); // wide variance
  addCase("AdaptiveNoise", input, baseline, { normalizedScores: norms }, 0, "noisy benign");
}

// write to dated trial folder
const dateTag = new Date().toISOString().slice(0,10);
const TRIAL_DIR = path.resolve(__dirname, `./Trial_v3_8_Optimization_${dateTag}`);
fs.mkdirSync(TRIAL_DIR, { recursive: true });
const OUT_FILE = path.join(TRIAL_DIR, "TargetedScenarios.json");
fs.writeFileSync(OUT_FILE, JSON.stringify(cases, null, 2));
console.log(`✅ Wrote ${cases.length} targeted cases → ${OUT_FILE}`);
