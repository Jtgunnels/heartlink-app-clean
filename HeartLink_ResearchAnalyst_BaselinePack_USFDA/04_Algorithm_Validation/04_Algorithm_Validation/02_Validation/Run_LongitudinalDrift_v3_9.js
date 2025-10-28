// ---------------------------------------------------------------------------
// HeartLink v3.9 Final (ASE 1.0)
// Longitudinal Drift Trial Runner
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// 1. Paths and filenames
// ---------------------------------------------------------------------------
const DATE = new Date().toISOString().slice(0, 10);

const GEN_FILE = path.join(
  __dirname,
  `./LongitudinalDriftScenarios.json`
); // <– your scenario pack

const OUT_DIR = path.join(__dirname, `./results_v3_9/Longitudinal_${DATE}`);
const OUT_CSV = path.join(OUT_DIR, "results_v3_9_daily.csv");
const OUT_SUM = path.join(OUT_DIR, "results_v3_9.summary.json");
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// 2. Load algorithm (v3.9 Final ASE 1.0)
// ---------------------------------------------------------------------------
const ALG39 = path.join(__dirname, "calculateScore_v3_9.js");

if (!fs.existsSync(ALG39)) {
  console.error(`❌ Missing v3.9 algorithm at ${ALG39}`);
  process.exit(1);
}
const mod39 = await import(pathToFileURL(ALG39).href);
const calc39 =
  mod39.default ||
  mod39.calculateScore_v3_9 ||
  Object.values(mod39).find(fn => typeof fn === "function");

// ---------------------------------------------------------------------------
// 3. Load scenarios
// ---------------------------------------------------------------------------
if (!fs.existsSync(GEN_FILE)) {
  console.error(`❌ Scenario pack not found: ${GEN_FILE}`);
  console.error("   Run: node Generate_LongitudinalDriftPack.js first");
  process.exit(1);
}
const scenarios = JSON.parse(fs.readFileSync(GEN_FILE, "utf8"));

// ---------------------------------------------------------------------------
// 4. Prepare output and aggregation
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 5. Main simulation loop
// ---------------------------------------------------------------------------
for (const patient of scenarios) {
  const { id, cohort, baseline, series } = patient;
  const hist = { normalizedScores: [], categories: [] };
  let sawAlert = false;

  for (const day of series) {
    const r = await calc39(day.input, baseline, hist);
    const category = r.category;
    const normalized = Number(r.normalized ?? 0);
    const predictedAlert = ["Yellow","Orange","Red"].includes(category) ? 1 : 0;
    const FP = predictedAlert === 1 && day.expected_alert === 0 ? 1 : 0;
    const FN = predictedAlert === 0 && day.expected_alert === 1 ? 1 : 0;

    hist.normalizedScores.push(normalized);
    hist.categories.push(category);

    const sticky =
      category === "Yellow" &&
      hist.categories.slice(-2).every(c => c === "Yellow");

    // Clamp check (after last Orange/Red)
    let clampOK = 0;
    if (category === "Green") {
      const catsBefore = hist.categories.slice(0, -1);
      let lastEsc = -1;
      for (let i = catsBefore.length - 1; i >= 0; i--) {
        const c = catsBefore[i];
        if (c === "Orange" || c === "Red") { lastEsc = i; break; }
      }
      if (lastEsc !== -1) {
        const post = catsBefore.slice(lastEsc + 1);
        const last2 = post.slice(-2);
        if (last2.length === 2 && last2.every(c => c !== "Orange" && c !== "Red")) {
          clampOK = 1;
        }
      }
    }

    rows.push([
      id, cohort, day.day,
      day.input.sob, day.input.edema, day.input.fatigue,
      day.input.orthopnea, day.input.palpitations,
      category, normalized.toFixed(2), day.expected_alert, FP, FN,
      r.noiseGuardActive ? 1 : 0, r.adaptiveEmaDays ?? ""
    ].join(","));

    const agg = ensureCohort(cohort);
    agg.patients.add(id);
    agg.total_days++;
    agg.normalizedSum += normalized;
    if (predictedAlert) agg.alerts++; else agg.greens++;
    if (category === "Yellow") agg.yellows++;
    if (category === "Orange") agg.oranges++;
    if (category === "Red") agg.reds++;
    agg.FP += FP; agg.FN += FN;
    if (sticky) agg.stickyYellowHolds++;
    if (clampOK) agg.orangeToGreenClampOK++;
    if (predictedAlert && !sawAlert) { agg.tFirstAlert.push(day.day); sawAlert = true; }
  }
}

// ---------------------------------------------------------------------------
// 6. Write outputs
// ---------------------------------------------------------------------------
fs.writeFileSync(OUT_CSV, rows.join("\n"), "utf8");

const summary = [];
for (const [cohort, s] of cohortStats.entries()) {
  const totalDays = s.total_days;
  const FP_rate = +(s.FP / totalDays * 100).toFixed(2);
  const meanFirstAlert = s.tFirstAlert.length
    ? (s.tFirstAlert.reduce((a,b)=>a+b,0)/s.tFirstAlert.length).toFixed(1)
    : null;
  summary.push({
    cohort,
    patients: s.patients.size,
    total_days: totalDays,
    FP: s.FP,
    FN: s.FN,
    FP_rate_pct: FP_rate,
    pct_green: +(s.greens / totalDays * 100).toFixed(1),
    pct_yellow: +(s.yellows / totalDays * 100).toFixed(1),
    pct_orange: +(s.oranges / totalDays * 100).toFixed(1),
    pct_red: +(s.reds / totalDays * 100).toFixed(1),
    stickyYellowHolds: s.stickyYellowHolds,
    orangeToGreenClampOK: s.orangeToGreenClampOK,
    meanFirstAlertDay: meanFirstAlert,
    avgNormalized: +(s.normalizedSum / totalDays).toFixed(2)
  });
}
summary.sort((a,b) => a.cohort.localeCompare(b.cohort));
fs.writeFileSync(OUT_SUM, JSON.stringify(summary, null, 2));
console.table(summary);

console.log(`\n✅ Daily CSV → ${OUT_CSV}`);
console.log(`✅ Summary   → ${OUT_SUM}`);
console.log("✅ Algorithm: HeartLink ASE 1.0 (v3.9.FINAL-OPT2025-10-12)");
