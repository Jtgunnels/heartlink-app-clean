// ---------------------------------------------------------------------------
// HeartLink — Generate a 500-case synthetic pack (single-file scenarios)
// Writes: 02_Validation/TestScenarios_Bulk.json
// Cohorts (counts):
//   1) Baseline normals (50)
//   2) Mild singles (100)
//   3) Multi-domain moderate (80)
//   4) Severe / critical triggers (40)
//   5) Orthopnea cases (60)
//   6) Weight-trend gain / fluid (60)
//   7) Recovery smoothing sequences (40)
//   8) StableAdvanced (NYHA III/IV) (40)
//   9) Noisy/adaptive-threshold stress (30)
// Total: 10000
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.resolve(__dirname, "./");
const OUT_FILE = path.resolve(__dirname, "./TestScenarios_Bulk.json");

// --- deterministic PRNG so results are reproducible
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(0x1F5500); // fixed seed

// helpers
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const jitter = (base, spread) => base + (rnd() * 2 - 1) * spread;
const dateISO = (offsetDays = 0) =>
  new Date(Date.now() - offsetDays * 86400000).toISOString().slice(0, 19) + "Z";

function makeWeights(start, days, dailyGainMin = 0, dailyGainMax = 0) {
  const arr = [start];
  for (let i = 1; i < days; i++) {
    const gain = dailyGainMin + rnd() * (dailyGainMax - dailyGainMin);
    arr.push(Number((arr[i - 1] + gain).toFixed(1)));
  }
  return arr;
}

function makeNoisyNorms(days, base = 3.0, noise = 1.2) {
  return Array.from({ length: days }, () => Number(Math.max(0, base + (rnd() * 2 - 1) * noise).toFixed(1)));
}

function makeCatsFrom(norms, greenMax = 2.6, yellowMax = 4.9, orangeMax = 7.4) {
  return norms.map((n) => (n <= greenMax ? "Green" : n <= yellowMax ? "Yellow" : n <= orangeMax ? "Orange" : "Red"));
}

function idStr(n) {
  return String(n).padStart(3, "0");
}

function caseBase(n, name, group) {
  return {
    id: `case_${idStr(n)}`,
    name,
    subjectId: `SYNTH${idStr(n)}`,
    trialGroup: group,
    timestamp: dateISO(Math.floor(rnd() * 10)),
  };
}

// main pack
const cases = [];
let idx = 1;

// 1) Baseline normals (50)
for (let i = 0; i < 50; i++, idx++) {
  cases.push({
    ...caseBase(idx, "Baseline normal", "Baseline"),
    input: { sob: "none", edema: "none", fatigue: "none" },
    baseline: { baselineSob: "none", baselineEdema: "none", baselineFatigue: "none" },
    hist: {},
  });
}

// 2) Mild singles (100) — mix SOB/edema/fatigue mild only
for (let i = 0; i < 100; i++, idx++) {
  const sym = pick(["sob", "edema", "fatigue"]);
  const input = { sob: "none", edema: "none", fatigue: "none" };
  input[sym] = "mild";
  cases.push({
    ...caseBase(idx, `Mild single symptom (${sym})`, "Core_Mild"),
    input,
    baseline: { baselineSob: "none", baselineEdema: "none", baselineFatigue: "none" },
    hist: {},
  });
}

// 3) Multi-domain moderate (80) — combos of moderate with/without mild
for (let i = 0; i < 80; i++, idx++) {
  const combos = [
    { sob: "moderate", edema: "mild", fatigue: "none" },
    { sob: "moderate", edema: "moderate", fatigue: "mild" },
    { sob: "mild", edema: "moderate", fatigue: "moderate" },
  ];
  const input = pick(combos);
  cases.push({
    ...caseBase(idx, "Multi-domain moderate", "Core_Moderate"),
    input,
    baseline: { baselineSob: "none", baselineEdema: "none", baselineFatigue: "none" },
    hist: {},
  });
}

// 4) Severe/critical triggers (40) — ensure Red override via severe SOB or rapid gain
for (let i = 0; i < 40; i++, idx++) {
  const mode = pick(["severeSOB", "rapidGain"]);
  if (mode === "severeSOB") {
    cases.push({
      ...caseBase(idx, "Critical severe SOB", "Critical"),
      input: { sob: "severe", edema: pick(["none", "mild"]), fatigue: pick(["none", "mild"]) },
      baseline: { baselineSob: "none", baselineEdema: "none", baselineFatigue: "none" },
      hist: {},
    });
  } else {
    const startW = Math.round(jitter(180, 10));
    const weights = makeWeights(startW, 7, 1.2, 2.2); // rising fast
    cases.push({
      ...caseBase(idx, "Critical rapid weight gain", "Critical"),
      input: { sob: pick(["none", "mild"]), edema: pick(["none", "mild"]), fatigue: "none", weightChange: 3 + Math.round(rnd() * 3) },
      baseline: { baselineSob: "none", baselineEdema: "none", baselineFatigue: "none", weight: startW },
      hist: { weights },
    });
  }
}

// 5) Orthopnea cases (60) — mix mild→severe orthopnea with otherwise low symptoms
for (let i = 0; i < 60; i++, idx++) {
  const level = pick(["mild", "moderate", "severe"]);
  cases.push({
    ...caseBase(idx, `Orthopnea ${level}`, "Orthopnea"),
    input: { sob: "none", edema: "none", fatigue: "none", orthopnea: level },
    baseline: { baselineSob: "none", baselineEdema: "none", baselineFatigue: "none", baselineOrthopnea: "none" },
    hist: {},
  });
}

// 6) Weight-trend gain / fluid (60) — slow & moderate fluid patterns
for (let i = 0; i < 60; i++, idx++) {
  const startW = Math.round(jitter(175, 12));
  const mode = pick(["slow", "moderate"]);
  const weights =
    mode === "slow" ? makeWeights(startW, 10, 0.15, 0.35) : makeWeights(startW, 10, 0.35, 0.6);
  const input = { sob: pick(["none", "mild"]), edema: pick(["none", "mild"]), fatigue: pick(["none", "mild"]), weightChange: Number(jitter(2.5, 1.0).toFixed(1)) };
  cases.push({
    ...caseBase(idx, `Weight trend (${mode})`, "FluidTrend"),
    input,
    baseline: { baselineSob: "none", baselineEdema: "none", baselineFatigue: "none", weight: startW },
    hist: { weights },
  });
}

// 7) Recovery smoothing sequences (40) — recent Orange→Yellow→Green history
for (let i = 0; i < 40; i++, idx++) {
  const input = { sob: "none", edema: "none", fatigue: "none" };
  const base = { baselineSob: "none", baselineEdema: "none", baselineFatigue: "none" };
  const hist = { categories: ["Orange", pick(["Orange", "Yellow"]), "Green"] };
  cases.push({
    ...caseBase(idx, "Recovery smoothing (OG test)", "Recovery"),
    input,
    baseline: base,
    hist,
  });
}

// 8) StableAdvanced (40) — NYHA III/IV baseline, no new worsening
for (let i = 0; i < 40; i++, idx++) {
  const nyha = pick(["III", "IV"]);
  const baseLv = pick(["moderate", "severe"]);
  const base = {
    baselineSob: baseLv,
    baselineEdema: baseLv === "severe" ? "moderate" : "moderate",
    baselineFatigue: baseLv,
    nyha,
  };
  const input = { sob: baseLv, edema: base.baselineEdema, fatigue: baseLv };
  const norms = makeNoisyNorms(7, baseLv === "severe" ? 7.2 : 6.6, 0.3); // chronic high but stable
  cases.push({
    ...caseBase(idx, `StableAdvanced NYHA ${nyha}`, "StableAdvanced"),
    input,
    baseline: base,
    hist: { normalizedScores: norms },
  });
}

// 9) Noisy/adaptive-threshold stress (30) — high variance users
for (let i = 0; i < 30; i++, idx++) {
  const input = { sob: pick(["none", "mild", "moderate"]), edema: pick(["none", "mild"]), fatigue: pick(["none", "mild"]) };
  const base = { baselineSob: "none", baselineEdema: "none", baselineFatigue: "none" };
  const norms = makeNoisyNorms(20, 3.5 + rnd() * 2.0, 2.2); // wide variance
  cases.push({
    ...caseBase(idx, "Adaptive thresholds stress (noisy user)", "AdaptiveStress"),
    input,
    baseline: base,
    hist: { normalizedScores: norms },
  });
}

// Final safety check
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(cases, null, 2));
console.log(`✅ Wrote ${cases.length} cases → ${OUT_FILE}`);
