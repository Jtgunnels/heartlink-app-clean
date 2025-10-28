// ---------------------------------------------------------------------------
// HeartLink ASE v3.9e – Phase B2 Integrated Validation Runner
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import calculateScore, { CFG_EXPORT as CFG } from "./calculateScore_v3_9e_FINAL_CL.js";

if (CFG.DELTA_TOLERANCE_BASE !== 0.19 || CFG.MILD_WEIGHT_FACTOR !== 0.55) {
  throw new Error(`Wrong algorithm constants: tol=${CFG.DELTA_TOLERANCE_BASE}, weight=${CFG.MILD_WEIGHT_FACTOR}`);
}

console.log(`🚀 Using HeartLink Algorithm ${CFG.VERSION}`);

const PACKS = [
  { file: "./B2_Sensitivity.json", label: "Sensitivity" },
  { file: "./B2_Stability.json", label: "Stability" }
];

for (const pack of PACKS) {
  if (!fs.existsSync(pack.file)) {
    console.warn(`⚠️  Missing ${pack.label} pack → ${pack.file}`);
    continue;
  }

  const scenarios = JSON.parse(fs.readFileSync(pack.file, "utf8"));
  const OUT_DIR = `./results_v3_9e/B2_${pack.label}_${new Date().toISOString().slice(0,10)}`;
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const isNonGreen = c => ["Yellow","Orange","Red"].includes(c);
  const isOrangePlus = c => ["Orange","Red"].includes(c);
  const percent = (n,d)=>d>0?+(100*n/d).toFixed(2):0;

  function clampOKCount(cats){
    let n=0;
    for(let i=0;i<cats.length;i++){
      if(cats[i]==="Green"){
        const p1=cats[i-1],p2=cats[i-2];
        if((p1&&isOrangePlus(p1))||(p2&&isOrangePlus(p2))) n++;
      }
    }
    return n;
  }

  const summary=[];
  for(const sc of scenarios){
    const inputs=sc.inputSeries??[sc.input];
    const baseline=JSON.parse(JSON.stringify(sc.baseline||{}));
    const hist={categories:["Green"],normalizedScores:[1.0],wsSeries:[1.0]};
    let firstYellow=null,FP=0,N=0;

    for(let day=0;day<inputs.length;day++){
      const today=JSON.parse(JSON.stringify(inputs[day]));
      if(today.orthopnea===undefined) today.orthopnea=false;
      const res=calculateScore(today,baseline,hist,false);

      hist.categories.push(res.category);
      hist.normalizedScores.push(res.normalized);
      hist.wsSeries.push(res.weightedSymptoms);

      if(firstYellow===null&&isNonGreen(res.category)) firstYellow=day+1;
      if(["Stable","CyclicNoiseLow","WeekendBounce","SlowDriftUp","SlowDriftDown"].includes(sc.cohort)){
        N++; if(isNonGreen(res.category)) FP++;
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

  const outFile = path.join(OUT_DIR, `results_v3_9e_B2_${pack.label}.summary.json`);
  fs.writeFileSync(outFile, JSON.stringify(summary,null,2));
  console.log(`✅ ${pack.label} summary written → ${outFile}`);
}
