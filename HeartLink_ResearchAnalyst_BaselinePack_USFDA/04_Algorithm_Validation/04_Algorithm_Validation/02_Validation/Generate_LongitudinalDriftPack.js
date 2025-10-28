// 04_Longitudinal/Generate_LongitudinalDriftPack.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATE = new Date().toISOString().slice(0,10);

const OUT_DIR = path.join(__dirname, `../03_Results/Longitudinal_${DATE}`);
const OUT_FILE = path.join(OUT_DIR, "LongitudinalDriftScenarios.json");
fs.mkdirSync(OUT_DIR, { recursive: true });

const COHORTS = [
  { name: "Stable", count: 50 },
  { name: "CyclicNoiseLow", count: 50 },
  { name: "WeekendBounce", count: 50 },
  { name: "SlowDriftUp", count: 50 },
  { name: "SlowDriftDown", count: 50 },
  { name: "StepWorseningMid", count: 50 },
  { name: "AdherenceLapse10to14", count: 50 },
  { name: "RecoveryClampCheck", count: 50 },
];

const DAYS = 30;
const clamp = (n, lo=0, hi=3) => Math.max(lo, Math.min(hi, Math.round(n)));
const jitter = (sigma=0.2) => (Math.random()*2-1)*sigma;

function baselineForCohort(cohort) {
  // Keep conservative baselines so drift signal drives alerts
  return { sob: 0, edema: 0, fatigue: 0, orthopnea: 0, palpitations: 0 };
}

function daySeriesForCohort(cohort) {
  const series = [];
  for (let d=1; d<=DAYS; d++) {
    let sob=0, edema=0, fatigue=0, orthopnea=0, palpitations=0;

    switch (cohort) {
      case "Stable":
        sob = clamp(0 + jitter(0.1));
        edema = clamp(0 + jitter(0.1));
        fatigue = clamp(0 + jitter(0.15));
        break;

      case "CyclicNoiseLow": {
        const wave = Math.sin((2*Math.PI*d)/7)*0.4; // small weekly rhythm
        sob = clamp(wave + jitter(0.15));
        edema = clamp(wave*0.6 + jitter(0.15));
        fatigue = clamp(0.5 + wave*0.5 + jitter(0.2));
        break;
      }

      case "WeekendBounce": {
        const isWeekend = (d % 7 === 6) || (d % 7 === 0);
        const bump = isWeekend ? 1 : 0;
        sob = clamp(bump + jitter(0.2));
        edema = clamp(bump + jitter(0.2));
        fatigue = clamp(0.5 + 0.5*bump + jitter(0.2));
        break;
      }

      case "SlowDriftUp": {
        const t = d / DAYS; // 0→1
        const lvl = 0 + 2.0*t; // 0→2
        sob = clamp(lvl + jitter(0.15));
        edema = clamp(0.6*lvl + jitter(0.15));
        fatigue = clamp(0.8*lvl + jitter(0.2));
        break;
      }

      case "SlowDriftDown": {
        const t = d / DAYS;
        const lvl = 2.0*(1 - t); // 2→0
        sob = clamp(lvl + jitter(0.15));
        edema = clamp(0.6*lvl + jitter(0.15));
        fatigue = clamp(0.8*lvl + jitter(0.2));
        break;
      }

      case "StepWorseningMid": {
        const step = d >= 15 ? 2 : 0;
        sob = clamp(step + jitter(0.2));
        edema = clamp(Math.max(0, step-1) + jitter(0.2));
        fatigue = clamp(Math.max(0, step-1) + jitter(0.2));
        orthopnea = d >= 15 ? 1 : 0;
        break;
      }

      case "AdherenceLapse10to14": {
        const lapse = d >= 10 && d <= 14;
        sob = clamp((lapse?1:0) + jitter(0.2));
        edema = clamp((lapse?2:0) + jitter(0.3));
        fatigue = clamp((lapse?1:0) + jitter(0.2));
        orthopnea = lapse ? 1 : 0;
        break;
      }

      case "RecoveryClampCheck": {
        if (d <= 5) {
          sob = 2; edema = 2; fatigue = 1; orthopnea = 1;
        } else {
          // gradual improvement — tests Orange→Green clamp + yellow stickiness
          const dec = Math.max(0, 2 - 0.3*(d-5));
          sob = clamp(dec + jitter(0.2));
          edema = clamp(dec + jitter(0.2));
          fatigue = clamp(Math.max(0, 1 - 0.2*(d-5)) + jitter(0.2));
          orthopnea = d <= 8 ? 1 : 0;
        }
        break;
      }
    }

    series.push({
      day: d,
      input: { sob, edema, fatigue, orthopnea, palpitations },
      expected_alert:
        cohort === "Stable" ? 0 :
        cohort === "CyclicNoiseLow" ? 0 :
        cohort === "WeekendBounce" ? ( (d%7===6||d%7===0) ? 1 : 0 ) :
        cohort === "SlowDriftUp" ? (d >= 18 ? 1 : 0) :
        cohort === "SlowDriftDown" ? 0 :
        cohort === "StepWorseningMid" ? (d >= 15 ? 1 : 0) :
        cohort === "AdherenceLapse10to14" ? (d >=10 && d<=14 ? 1 : 0) :
        cohort === "RecoveryClampCheck" ? (d <= 5 ? 1 : 0) : 0
    });
  }
  return series;
}

const scenarios = [];
for (const c of COHORTS) {
  for (let p=1; p<=c.count; p++) {
    const id = `${c.name}_P${String(p).padStart(3,"0")}`;
    scenarios.push({
      id,
      cohort: c.name,
      baseline: baselineForCohort(c.name),
      series: daySeriesForCohort(c.name)
    });
  }
}

fs.writeFileSync(OUT_FILE, JSON.stringify(scenarios, null, 2));
console.log(`✅ Longitudinal pack created → ${OUT_FILE}`);
