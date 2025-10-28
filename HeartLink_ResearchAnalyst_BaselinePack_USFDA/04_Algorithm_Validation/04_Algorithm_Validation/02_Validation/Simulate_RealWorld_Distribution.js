/**
 * HeartLink — Real-World Simulation Template
 * ------------------------------------------
 * Generates synthetic cases representing real-world prevalence patterns
 * (Green-dominant, fewer Red/Orange cases) to evaluate v3.8 algorithm
 * performance under clinically realistic conditions.
 *
 * Output: ./realworld_v3_8_validation.csv
 *
 * Requirements:
 *   - Node 18+
 *   - ./utils/calculateScore_v3_8.js  (drop your current algorithm here)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import calculateScore_v3_8 from "../../01_Algorithms/calculateScore_v3_8.js"; // ⚠️ replace with your real v3.8 file

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------------
// 1. Define clinical archetypes
// ------------------------------
const archetypes = {
  StableMild: {
    weight: 0.55, // 55% of cases
    categoryDist: { Green: 0.85, Yellow: 0.10, Orange: 0.05 },
    sob: [0, 1], // none–mild
    edema: [0, 1],
    fatigue: [0, 1],
    weightRange: [150, 220],
  },
  StableAdvanced: {
    weight: 0.15,
    categoryDist: { StableAdvanced: 0.6, Yellow: 0.3, Orange: 0.1 },
    sob: [2, 3],
    edema: [2, 3],
    fatigue: [1, 3],
    weightRange: [160, 240],
  },
  EarlyDecomp: {
    weight: 0.20,
    categoryDist: { Yellow: 0.4, Orange: 0.4, Red: 0.2 },
    sob: [1, 3],
    edema: [1, 3],
    fatigue: [1, 3],
    weightRange: [160, 250],
  },
  HighRisk: {
    weight: 0.07,
    categoryDist: { Yellow: 0.25, Orange: 0.45, Red: 0.30 },
    sob: [2, 3],
    edema: [2, 3],
    fatigue: [2, 3],
    weightRange: [170, 260],
  },
  Recovered: {
    weight: 0.03,
    categoryDist: { Green: 0.95, Yellow: 0.05 },
    sob: [0, 0],
    edema: [0, 0],
    fatigue: [0, 1],
    weightRange: [140, 200],
  },
};

// Utility: random helper functions
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function weightedPick(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const r = Math.random() * total;
  let cum = 0;
  for (const [key, w] of Object.entries(weights)) {
    cum += w;
    if (r <= cum) return key;
  }
  return Object.keys(weights)[0];
}

// ------------------------------
// 2. Generate synthetic patients
// ------------------------------
const TOTAL_CASES = 10000;
const results = [];

for (const [group, meta] of Object.entries(archetypes)) {
  const n = Math.round(meta.weight * TOTAL_CASES);
  for (let i = 0; i < n; i++) {
    // Random baseline + input generation
    const sob = randInt(meta.sob[0], meta.sob[1]);
    const edema = randInt(meta.edema[0], meta.edema[1]);
    const fatigue = randInt(meta.fatigue[0], meta.fatigue[1]);
    const weightToday = randInt(meta.weightRange[0], meta.weightRange[1]);
    const orthopnea = Math.random() < 0.1;
    const appetiteLoss = Math.random() < 0.1;
    const missedMeds = Math.random() < 0.1;
    const lowUrine = Math.random() < 0.1;
    const heartRate = randInt(60, 115);
    const sbp = randInt(95, 145);

    const baseline = {
      baselineSob: randInt(0, 2),
      baselineEdema: randInt(0, 2),
      baselineFatigue: randInt(0, 2),
      baselineOrthopnea: Math.random() < 0.05,
      baselineWeight: weightToday - randInt(0, 4),
    };

    const hist = {
      normalizedScores: Array.from({ length: 7 }, () =>
        Number((Math.random() * 5).toFixed(1))
      ),
      weights: Array.from({ length: 5 }, () =>
        weightToday - randInt(-3, 3)
      ),
    };

    const input = {
      sobLevel: sob,
      edemaLevel: edema,
      fatigueLevel: fatigue,
      orthopnea,
      appetiteLoss,
      lowUrine,
      missedMeds,
      weightToday,
      heartRate,
      sbp,
    };

    // Assign “true” category (expected clinical label)
    const trueCat = weightedPick(meta.categoryDist);

    results.push({ group, input, baseline, hist, trueCat });
  }
}

// ------------------------------
// 3. Run algorithm & collect metrics
// ------------------------------
async function runSimulation() {
  const rows = [];

  for (const [i, r] of results.entries()) {
    const output = await calculateScore_v3_8(r.input, r.baseline, r.hist);
    rows.push({
      id: i + 1,
      trialGroup: r.group,
      true_category: r.trueCat,
      predicted_category: output.category,
      normalized: output.normalized,
    });
  }

  // Write CSV
  const header = "id,trialGroup,true_category,predicted_category,normalized\n";
  const csv = rows
    .map(
      (r) =>
        `${r.id},${r.trialGroup},${r.true_category},${r.predicted_category},${r.normalized}`
    )
    .join("\n");

  fs.writeFileSync(
    path.join(__dirname, "realworld_v3_8_validation.csv"),
    header + csv
  );
  console.log(`✅ Simulation complete. Saved ${rows.length} cases.`);
}

runSimulation();
