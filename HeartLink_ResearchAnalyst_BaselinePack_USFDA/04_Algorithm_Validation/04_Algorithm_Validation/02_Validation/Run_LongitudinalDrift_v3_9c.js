// ---------------------------------------------------------------------------
// Run_LongitudinalDrift_v3_9c.js (Patched + Synchronized Import)
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import calculateScore, { CFG_EXPORT as CFG } from "./calculateScore_v3_9e_FINAL_CL.js";

console.log("🔍 Using algorithm version:", CFG.VERSION);
console.log("🔍 DELTA_TOLERANCE_BASE =", CFG.DELTA_TOLERANCE_BASE, "MILD_WEIGHT_FACTOR =", CFG.MILD_WEIGHT_FACTOR);

if (CFG.DELTA_TOLERANCE_BASE !== 0.19 || CFG.MILD_WEIGHT_FACTOR !== 0.55) {
  throw new Error(`❌ Wrong algorithm constants loaded: tolerance=${CFG.DELTA_TOLERANCE_BASE}, weight=${CFG.MILD_WEIGHT_FACTOR}`);
}

const SCEN_FILE = "./LongitudinalDriftScenarios.json";
const OUT_DIR = "./results_v3_9c/Longitudinal_" + new Date().toISOString().slice(0,10);
fs.mkdirSync(OUT_DIR, { recursive: true });

if (!fs.existsSync(SCEN_FILE)) {
  console.error(`❌ Scenario pack not found: ${SCEN_FILE}`);
  process.exit(1);
}

console.log(`📦 Loading scenario pack from: ${SCEN_FILE}`);
const scenarios = JSON.parse(fs.readFileSync(SCEN_FILE, "utf8"));

const isNonGreen = c => ["Yellow","Orange","Red"].includes(c);
const isOrangePlus = c => ["Orange","Red"].includes(c);
const percent = (n,d)=> (d>0 ? +(100*n/d).toFixed(2) : 0);

function clampOKCount(cats){
  let n=0;
  for(let i=0;i<cats.length;i++){
    if(cats[i]==="Green"){
      const p1=cats[i-1], p2=cats[i-2];
      if((p1 && isOrangePlus(p1)) || (p2 && isOrangePlus(p2))) n++;
    }
  }
  return n;
}

const summary = [];

for (const sc of scenarios) {
  const inputs = sc.inputSeries ?? sc.series ?? [sc.input];
  const baseline = sc.baseline || {};
  const hist = { categories:[], normalizedScores:[], wsSeries:[] };

  let firstYellow=null, FP=0, N=0;

  for(let day=0; day<inputs.length; day++){
    const today={...inputs[day]};
    if(today.orthopnea===undefined) today.orthopnea=false;

    const res = calculateScore_v3_9c(today, baseline, hist, false);
    if(!res || typeof res.category!=="string"){
      console.warn(`⚠️ Missing category output on day ${day+1} for ${sc.cohort}.`, res);
      continue;
    }

    hist.categories.push(res.category);
    hist.normalizedScores.push(res.normalized);
    if(firstYellow===null && isNonGreen(res.category)) firstYellow=day+1;
    if(["Stable","CyclicNoiseLow","WeekendBounce"].includes(sc.cohort)){
      N++; if(isNonGreen(res.category)) FP++;
    }
  }

  const cats = hist.categories;
  summary.push({
    cohort: sc.cohort,
    daysSimulated: inputs.length,
    FP_percent: percent(FP,N),
    firstNonGreenDay: firstYellow ?? "",
    clampOK: clampOKCount(cats)
  });
}

const outSummary = path.join(OUT_DIR,"results_v3_9c.summary.json");
fs.writeFileSync(outSummary, JSON.stringify(summary,null,2));
console.log(`✅ Summary written → ${outSummary}`);
console.log("📊 Cohorts analyzed:", summary.map(s=>s.cohort).join(", "));
