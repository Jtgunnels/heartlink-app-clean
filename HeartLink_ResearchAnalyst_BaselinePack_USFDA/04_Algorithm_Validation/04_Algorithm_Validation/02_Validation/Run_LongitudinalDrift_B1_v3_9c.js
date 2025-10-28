// ---------------------------------------------------------------------------
// HeartLink ASE v3.9c – B1 Sensitivity Trial Runner
// Validates acute escalation, lead-time, clamp, and FP behavior
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import calculateScore_v3_9c from "./calculateScore_v3_9c.js";

const SCEN_FILE = "./LongitudinalDrift_B1_Sensitivity.json";
const OUT_DIR = "./results_v3_9c/B1_Sensitivity_" + new Date().toISOString().slice(0,10);
fs.mkdirSync(OUT_DIR, { recursive: true });

if (!fs.existsSync(SCEN_FILE)) {
  console.error(`❌ Scenario pack not found: ${SCEN_FILE}`);
  process.exit(1);
}

console.log(`📦 Running B1 Sensitivity Pack → ${SCEN_FILE}`);
const scenarios = JSON.parse(fs.readFileSync(SCEN_FILE,"utf8"));

const isNonGreen = c=>["Yellow","Orange","Red"].includes(c);
const isOrangePlus = c=>["Orange","Red"].includes(c);
const percent = (n,d)=>d>0?+(100*n/d).toFixed(2):0;
function clampOKCount(cats){
  let n=0;
  for(let i=0;i<cats.length;i++){
    if(cats[i]==="Green"){
      const p1=cats[i-1],p2=cats[i-2];
      if((p1&&isOrangePlus(p1))||(p2&&isOrangePlus(p2)))n++;
    }
  }
  return n;
}

const summary=[];
for(const sc of scenarios){
  const inputs=sc.inputSeries??sc.series??[sc.input];
  const baseline=sc.baseline||{};
  const hist={categories:[],normalizedScores:[],wsSeries:[]};
  let firstYellow=null,FP=0,N=0;

  for(let day=0;day<inputs.length;day++){
    const today={...inputs[day]};
    if(today.orthopnea===undefined)today.orthopnea=false;
    const res=calculateScore_v3_9c(today,baseline,hist,false);
    hist.categories.push(res.category);
    hist.normalizedScores.push(res.normalized);
    if(firstYellow===null&&isNonGreen(res.category))firstYellow=day+1;
    if(["Stable","CyclicNoiseLow","WeekendBounce"].includes(sc.cohort)){
      N++;if(isNonGreen(res.category))FP++;
    }
  }

  summary.push({
    cohort:sc.cohort,
    daysSimulated:inputs.length,
    FP_percent:percent(FP,N),
    firstNonGreenDay:firstYellow??"",
    clampOK:clampOKCount(hist.categories)
  });
}

const outSummary=path.join(OUT_DIR,"results_v3_9c_B1.summary.json");
fs.writeFileSync(outSummary,JSON.stringify(summary,null,2));
console.log(`✅ Summary written → ${outSummary}`);
console.log("📊 Cohorts analyzed:",summary.map(s=>s.cohort).join(", "));
