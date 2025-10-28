// ---------------------------------------------------------------------------
// HeartLink ASE 1.0 v3.9 – Clinical-Ready Parameter Sweep
// ---------------------------------------------------------------------------
// Purpose: validate robustness of the final v3.9 parameter set
// across small ±10% variations in key parameters.
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import calculateScore from "./calculateScore_v3_9.js";

const SCENARIOS_FILE = "./LongitudinalDriftScenarios_TestSet.json";
const OUT_DIR = "./results_v3_9/sweep_" + new Date().toISOString().slice(0,10);
fs.mkdirSync(OUT_DIR, { recursive: true });

// === Parameter grid: around best combo ====================================
const grid = {
  ACUTE_WS_JUMP: [0.8, 0.85, 0.9],
  MILD_WEIGHT_FACTOR: [0.55, 0.57, 0.6, 0.65],
  EMA_WINDOW_DAYS: [26, 28, 30],
  EXTENDED_EMA_WINDOW: [32, 34, 36],
  RECOVERY_CREDIT: [1.2, 1.25, 1.3],
  RECOVERY_GREEN_BAND: [3.7, 3.8, 3.9]
};

// === Load scenario pack ====================================================
if (!fs.existsSync(SCENARIOS_FILE)) {
  console.error(`❌ Scenario pack not found: ${SCENARIOS_FILE}`);
  process.exit(1);
}
const scenarios = JSON.parse(fs.readFileSync(SCENARIOS_FILE, "utf8"));
console.log(`Loaded ${scenarios.length} scenarios.`);

const isNonGreen = c => ["Yellow","Orange","Red"].includes(c);
const isOrangePlus = c => ["Orange","Red"].includes(c);
function median(a){if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y);const m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;}
function percent(n,d){return d>0?+(100*n/d).toFixed(2):0;}
function clampOKCount(cats){
  let n=0;
  for(let i=0;i<cats.length;i++){
    if(cats[i]==="Green"){
      const prev1=cats[i-1],prev2=cats[i-2];
      if((prev1&&isOrangePlus(prev1))||(prev2&&isOrangePlus(prev2)))n++;
    }
  }
  return n;
}

// === Run one parameter combo ==============================================
function runSimulation(params){
  let FP_stable=0,N_stable=0,FP_noise=0,N_noise=0,clampOK=0,stepFirstYellow=null;
  for(const sc of scenarios){
    if(!sc||(!sc.inputSeries&&!sc.input))continue;
    const inputs=Array.isArray(sc.inputSeries)?sc.inputSeries:[sc.input];
    const hist={categories:[],normalizedScores:[],wsSeries:[]};

    for(let day=0;day<inputs.length;day++){
      const res=calculateScore(inputs[day],sc.baseline,hist,false);
      hist.categories.push(res.category);
      hist.normalizedScores.push(res.normalized);
      if(sc.cohort==="StepWorseningMid" && stepFirstYellow===null && isNonGreen(res.category)) stepFirstYellow=day+1;
    }
    const cats=hist.categories;
    if(sc.cohort==="Stable"){N_stable+=cats.length;FP_stable+=cats.filter(isNonGreen).length;}
    if(["CyclicNoiseLow","WeekendBounce"].includes(sc.cohort)){N_noise+=cats.length;FP_noise+=cats.filter(isNonGreen).length;}
    if(["RecoveryClampCheck","SlowDriftDown"].includes(sc.cohort)) clampOK+=clampOKCount(cats);
  }

  return {
    ...params,
    FP_percent_overall: percent(FP_stable+FP_noise,N_stable+N_noise),
    FP_percent_stable: percent(FP_stable,N_stable),
    ClampOK_total: clampOK,
    StepFirstYellow: stepFirstYellow
  };
}

// === Main sweep loop ======================================================
const results=[];
for(const jump of grid.ACUTE_WS_JUMP)
 for(const weight of grid.MILD_WEIGHT_FACTOR)
  for(const ema of grid.EMA_WINDOW_DAYS)
   for(const ext of grid.EXTENDED_EMA_WINDOW)
    for(const credit of grid.RECOVERY_CREDIT)
     for(const band of grid.RECOVERY_GREEN_BAND){
       const combo={ACUTE_WS_JUMP:jump,MILD_WEIGHT_FACTOR:weight,
         EMA_WINDOW_DAYS:ema,EXTENDED_EMA_WINDOW:ext,
         RECOVERY_CREDIT:credit,RECOVERY_GREEN_BAND:band};
       Object.entries(combo).forEach(([k,v])=>process.env[k]=String(v));
       console.log("▶ Running combo",combo);
       results.push(runSimulation(combo));
     }

// === Write results ========================================================
const outCSV=path.join(OUT_DIR,"parameter_sweep_summary.csv");
const cols=Object.keys(results[0]??{});
const header=cols.join(",")+"\n";
const lines=results.map(r=>cols.map(k=>r[k]).join(",")).join("\n");
fs.writeFileSync(outCSV,header+lines);
console.log(`✅ Parameter sweep complete → ${outCSV}`);
