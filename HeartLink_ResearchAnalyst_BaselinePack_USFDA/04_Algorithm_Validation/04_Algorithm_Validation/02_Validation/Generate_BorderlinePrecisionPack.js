// ---------------------------------------------------------------------------
// HeartLink v3.8  —  Borderline Precision Pack Generator
// ---------------------------------------------------------------------------
// Purpose: build synthetic cases near category boundaries to test scoring
// sensitivity (Green↔Yellow↔Orange).
// Output: BorderlineScenarios.json
// ---------------------------------------------------------------------------

import "../02_Validation/Verify_ConfigLock_v3_8.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT = path.join(__dirname, "BorderlineScenarios.json");

// Define category transition anchor points (approximate symptom intensities)
const TRANSITIONS = [
  { label: "GreenToYellow_low", sob: 1, edema: 1, fatigue: 1, weight: 0.5 },
  { label: "GreenToYellow_high", sob: 2, edema: 2, fatigue: 2, weight: 1 },
  { label: "YellowToOrange_low", sob: 2.5, edema: 2.5, fatigue: 2, weight: 2 },
  { label: "YellowToOrange_high", sob: 3, edema: 3, fatigue: 3, weight: 2.5 },
];

const TOTAL_CASES = 2000;
const scenarios = [];

for (let i = 0; i < TOTAL_CASES; i++) {
  const t = TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)];
  const noise = () => (Math.random() - 0.5) * 0.6; // small variability
  const caseObj = {
    id: `case_${(i + 1).toString().padStart(4, "0")}`,
    cohort: "BorderlinePrecision",
    anchor: t.label,
    input: {
      sob: Math.max(1, t.sob + noise()),
      edema: Math.max(1, t.edema + noise()),
      fatigue: Math.max(1, t.fatigue + noise()),
      weight: +(t.weight + noise()).toFixed(1),
    },
    expected_alert: /Orange/.test(t.label) ? 1 : 0,
    notes: "Borderline transition scenario",
  };
  scenarios.push(caseObj);
}

fs.writeFileSync(OUT, JSON.stringify(scenarios, null, 2));
console.log(`✅ Generated ${scenarios.length} borderline cases → ${OUT}`);
