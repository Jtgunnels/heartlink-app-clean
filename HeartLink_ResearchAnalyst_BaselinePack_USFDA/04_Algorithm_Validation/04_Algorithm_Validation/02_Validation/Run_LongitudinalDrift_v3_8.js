// 04_Longitudinal/Run_LongitudinalDrift_v3_8.js
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATE = new Date().toISOString().slice(0,10);

const GEN_FILE = path.join(__dirname, `../03_Results/Longitudinal_${DATE}/LongitudinalDriftScenarios.json`);
const OUT_DIR  = path.join(__dirname, `../03_Results/Longitudinal_${DATE}`);
const OUT_CSV  = path.join(OUT_DIR, "results_v3_8_daily.csv");
const OUT_SUM  = path.join(OUT_DIR, "results_v3_8.summary.json");
fs.mkdirSync(OUT_DIR, { recursive: true });

// locate algorithm (mirror existing runners)
const ALG_DIR = path.resolve(__dirname, "../../01_Algorithms");
const ALG38   = path.join(ALG_DIR, "calculateScore_v3_8.js");
if (!fs.existsSync(ALG38)) {
  console.error(`❌ Missing v3.8 algorithm at ${ALG38}`);
  process.exit(1);
}
const mod38 = await import(pathToFileURL(ALG38).href);
const calc38 = mod38.default ?? mod38.calculateScore_v3_8;

// load scenarios created by generator
if (!fs.existsSync(GEN_FILE)) {
  console.error(`❌ Scenario pack not found: ${GEN_FILE}`);
  console.error("   Run: node 04_Longitudinal/Generate_LongitudinalDriftPack.js");
  process.exit(1);
}
const scenarios = JSON.parse(fs.readFileSync(GEN_FILE, "utf8"));

const header = [
  "id","cohort","day",
  "sob","edema","fatigue","orthopnea","palpitations",
  "category","normalized","expected_alert","FP","FN",
  "noiseGuard","emaDays"
];
const rows = [header.join(",")];

const cohortStats = new Map();

function ensureCohort(c) {
  if (!cohortStats.has(c)) {
    cohortStats.set(c, {
      patients: new Set(),
      total_days: 0,
      alerts: 0, greens: 0, yellows: 0, oranges: 0, reds: 0,
      FP: 0, FN: 0, tFirstAlert: [],
      stickyYellowHolds: 0,
      orangeToGreenClampOK: 0,
      normalizedSum: 0
    });
  }
  return cohortStats.get(c);
}

for (const patient of scenarios) {
  const { id, cohort, baseline, series } = patient;

  // rolling history for v3.8
  const hist = { normalizedScores: [], categories: [] };

  let sawAlert = false;
  let lastWasOrange = false;
  let yellowStreak = 0;

  for (const day of series) {
    const r = await calc38(day.input, baseline, hist);

    const category = r.category;
    const normalized = Number(r.normalized ?? 0);
    const predictedAlert = ["Yellow","Orange","Red"].includes(category) ? 1 : 0;
    const FP = predictedAlert===1 && day.expected_alert===0 ? 1 : 0;
    const FN = predictedAlert===0 && day.expected_alert===1 ? 1 : 0;

    // update history for next day
    hist.normalizedScores.push(normalized);
    hist.categories.push(category);

    // sticky yellow detection (held Yellow after a prior Yellow while slope ≤ 0)
    const sticky = (category==="Yellow" && hist.categories.slice(-2).every(c=>c==="Yellow"));
    if (sticky) yellowStreak++;

    // Orange→Green clamp check (if we were Orange yesterday, require ≥2 stable days before Green)
    let clampOK = 0;
    if (lastWasOrange && category==="Green") {
      const lastTwo = hist.categories.slice(-3, -1); // previous 2 (excluding today)
      if (!lastTwo.includes("Orange") && !lastTwo.includes("Red")) {
        // if it returned too fast (i.e., immediate Green after Orange), this will be 0
        clampOK = (lastTwo.length >= 2) ? 1 : 0;
      }
    }
    lastWasOrange = (category==="Orange");

    // write row
    rows.push([
      id, cohort, day.day,
      day.input.sob, day.input.edema, day.input.fatigue, day.input.orthopnea, day.input.palpitations,
      category, normalized.toFixed(2), day.expected_alert, FP, FN,
      r.noiseGuardActive ? 1 : 0, r.adaptiveEmaDays ?? ""
    ].join(","));

    // aggregate
    const agg = ensureCohort(cohort);
    agg.patients.add(id);
    agg.total_days++;
    agg.normalizedSum += normalized;
    if (predictedAlert) agg.alerts++; else agg.greens++;
    if (category==="Yellow") agg.yellows++;
    if (category==="Orange") agg.oranges++;
    if (category==="Red") agg.reds++;
    agg.FP += FP; agg.FN += FN;
    agg.stickyYellowHolds += sticky ? 1 : 0;
    agg.orangeToGreenClampOK += clampOK;

    if (predictedAlert && !sawAlert) {
      agg.tFirstAlert.push(day.day);
      sawAlert = true;
    }
  }
}

// write CSV
fs.writeFileSync(OUT_CSV, rows.join("\n"), "utf8");

// summarize per cohort
const summary = [];
for (const [cohort, s] of cohortStats.entries()) {
  const benign = [...s.patients].length * 30; // total patient-days
  const FP_rate = +(s.FP / (benign - s.alerts + s.FP) * 100).toFixed(2); // approx per-day benign
  const meanFirstAlert = s.tFirstAlert.length
    ? (s.tFirstAlert.reduce((a,b)=>a+b,0)/s.tFirstAlert.length).toFixed(1)
    : null;
  summary.push({
    cohort,
    patients: s.patients.size,
    total_days: s.total_days,
    FP: s.FP,
    FN: s.FN,
    FP_rate_pct: isFinite(FP_rate) ? FP_rate : 0,
    pct_green: +(s.greens / s.total_days * 100).toFixed(1),
    pct_yellow: +(s.yellows / s.total_days * 100).toFixed(1),
    pct_orange: +(s.oranges / s.total_days * 100).toFixed(1),
    pct_red: +(s.reds / s.total_days * 100).toFixed(1),
    stickyYellowHolds: s.stickyYellowHolds,
    orangeToGreenClampOK: s.orangeToGreenClampOK,
    meanFirstAlertDay: meanFirstAlert,
    avgNormalized: +(s.normalizedSum / s.total_days).toFixed(2)
  });
}
summary.sort((a,b)=> a.cohort.localeCompare(b.cohort));
fs.writeFileSync(OUT_SUM, JSON.stringify(summary, null, 2));
console.table(summary);
console.log(`\n✅ Daily CSV → ${OUT_CSV}`);
console.log(`✅ Summary  → ${OUT_SUM}`);
