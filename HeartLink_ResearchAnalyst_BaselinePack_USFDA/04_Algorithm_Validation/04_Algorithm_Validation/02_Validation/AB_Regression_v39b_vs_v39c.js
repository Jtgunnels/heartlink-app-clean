// Compare v3.9b vs v3.9c on the same scenarios (A/B regression)
import fs from "fs";
import path from "path";
import calcB from "./calculateScore_v3_9.js";   // v3.9b (current locked)
import calcC from "./calculateScore_v3_9c.js";  // v3.9c (new simplified)

const SCEN_FILE = "./LongitudinalDriftScenarios.json";
const OUT_DIR = "./results_v3_ab/" + new Date().toISOString().slice(0,10);
fs.mkdirSync(OUT_DIR, { recursive: true });

if (!fs.existsSync(SCEN_FILE)) {
  console.error(`❌ Scenario pack not found: ${SCEN_FILE}`);
  process.exit(1);
}
const scenarios = JSON.parse(fs.readFileSync(SCEN_FILE, "utf8"));

const isNonGreen = c => ["Yellow","Orange","Red"].includes(c);
const isOrangePlus = c => ["Orange","Red"].includes(c);
function percent(n,d){return d>0?+(100*n/d).toFixed(2):0;}

function runAlgo(calc){
  const out = [];
  for (const sc of scenarios) {
    const inputs = Array.isArray(sc.inputSeries) ? sc.inputSeries : [sc.input];
    const hist = { categories:[], normalizedScores:[], wsSeries:[] };

    let FP=0,N=0, firstYellow=null;

    for (let day=0; day<inputs.length; day++){
      const today = { ...inputs[day] };
      // v3.9c expects boolean orthopnea; default false if missing
      if (today.orthopnea === undefined) today.orthopnea = false;

      const res = calc(today, sc.baseline || {}, hist, false);
      hist.categories.push(res.category);
      hist.normalizedScores.push(res.normalized);

      if (firstYellow === null && isNonGreen(res.category)) firstYellow = day+1;
      if (["Stable","CyclicNoiseLow","WeekendBounce"].includes(sc.cohort)) {
        N++; if (isNonGreen(res.category)) FP++;
      }
    }

    // ClampOK
    let clampOK=0;
    const cats = hist.categories;
    for(let i=0;i<cats.length;i++){
      if (cats[i]==="Green") {
        const p1=cats[i-1], p2=cats[i-2];
        if ((p1 && isOrangePlus(p1)) || (p2 && isOrangePlus(p2))) clampOK++;
      }
    }

    out.push({
      cohort: sc.cohort,
      FP_percent: percent(FP,N),
      firstNonGreenDay: firstYellow ?? "",
      clampOK
    });
  }
  return out;
}

const resB = runAlgo(calcB);
const resC = runAlgo(calcC);

const rows = [["cohort","FP_b","FP_c","firstDay_b","firstDay_c","clampOK_b","clampOK_c"]];
for (let i=0;i<resB.length;i++){
  const b = resB[i], c = resC[i]; // same order by source
  rows.push([b.cohort, b.FP_percent, c.FP_percent, b.firstNonGreenDay, c.firstNonGreenDay, b.clampOK, c.clampOK]);
}

const csv = rows.map(r=>r.join(",")).join("\n");
const outCSV = path.join(OUT_DIR, "AB_v39b_vs_v39c.csv");
fs.writeFileSync(outCSV, csv);
console.log("✅ A/B comparison →", outCSV);
