// ---------------------------------------------------------------------------
// HeartLink v3.8 — Chronic Stability Pack Generator
// ---------------------------------------------------------------------------
// Purpose: simulate long-term stable patients with small noise in inputs
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT = path.join(__dirname, "ChronicStabilityScenarios.json");

const TOTAL_CASES = 1500;
const scenarios = [];

for (let i = 0; i < TOTAL_CASES; i++) {
  const baseline = { sob: 1, edema: 1, fatigue: 1 };
  const noise = () => +(Math.random() * 0.6).toFixed(1); // small fluctuation 0-0.6
  const input = {
    sob: baseline.sob + noise(),
    edema: baseline.edema + noise(),
    fatigue: baseline.fatigue + noise(),
  };
  const hist = {
    categories: Array(5).fill("Green"),
    normalizedScores: Array(5).fill(1.5 + Math.random() * 0.5),
  };
  scenarios.push({
    id: `stable_${(i + 1).toString().padStart(4, "0")}`,
    cohort: "ChronicStability",
    input,
    baseline,
    hist,
    expected_alert: 0,
    notes: "Stable patient with minor noise",
  });
}

fs.writeFileSync(OUT, JSON.stringify(scenarios, null, 2));
console.log(`✅ Generated ${scenarios.length} stable cases → ${OUT}`);
