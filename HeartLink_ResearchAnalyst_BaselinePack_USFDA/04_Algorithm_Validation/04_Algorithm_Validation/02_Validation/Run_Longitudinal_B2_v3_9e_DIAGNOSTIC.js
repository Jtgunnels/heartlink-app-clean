import fs from "fs";
import calculateScore from "./calculateScore_v3_9e_FINAL_CL_DIAGNOSTIC.js";

const SENS_FILE = "./B2_Sensitivity.json";
const OUT_FILE  = "./results_v3_9e_FINAL_CL_DIAGNOSTIC_B2_Sensitivity.summary.json";

const scenarios = JSON.parse(fs.readFileSync(SENS_FILE, "utf8"));
if (!Array.isArray(scenarios)) throw new Error("Scenario file must be an array of cohorts.");

const summary = [];
for (const sc of scenarios) {
  const baseline = sc.baseline || {};
  const series = sc.inputSeries || [];
  const hist = { categories: [], wsSeries: [] };
  let clampCount = 0;
  let firstNonGreen = null;

  for (let day = 0; day < series.length; day++) {
    const today = { ...series[day], cohort: sc.cohort };  // tag cohort
    const res = calculateScore(today, baseline, hist, day === 0);
    hist.categories.push(res.category);

    if (day === 0) console.log(`🚀 Cohort: ${sc.cohort}, Algo: ${res.version}`);
    if (res.category !== "Green" && firstNonGreen === null) firstNonGreen = day + 1;
    if (res.category === "Green" && hist.categories.slice(-2)[0] === "Orange") clampCount++;
  }

  summary.push({
    cohort: sc.cohort,
    days: series.length,
    firstNonGreen: firstNonGreen ?? "-",
    clampOK: clampCount,
  });
}

fs.writeFileSync(OUT_FILE, JSON.stringify(summary, null, 2));
console.log(`✅ Summary → ${OUT_FILE}`);
