// ---------------------------------------------------------------------------
// HeartLink v3.9 Longitudinal Case Pack Generator
// ---------------------------------------------------------------------------
// Generates 30-day synthetic longitudinal cases across multiple cohorts
// Output: LongitudinalScenarios.json
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COHORTS = [
  { name: "StableBaseline", days: 30, cases: 300, pattern: "flat" },
  { name: "GradualDeterioration", days: 30, cases: 300, pattern: "drift" },
  { name: "RecoveryPhase", days: 30, cases: 200, pattern: "recovery" },
  { name: "StableAdvanced", days: 30, cases: 150, pattern: "chronic" },
  { name: "AdaptiveNoise", days: 30, cases: 100, pattern: "noisy" },
];

function generateDayData(pattern, day) {
  switch (pattern) {
    case "flat": return { sob: 1, edema: 1, fatigue: 1, weight: 0 };
    case "drift": return { sob: Math.min(4, 1 + day / 10), edema: Math.min(4, 1 + day / 12), fatigue: 2, weight: day / 5 };
    case "recovery": return { sob: Math.max(1, 4 - day / 10), edema: Math.max(1, 4 - day / 12), fatigue: 2, weight: -day / 6 };
    case "chronic": return { sob: 2, edema: 2, fatigue: 2, weight: 0 };
    case "noisy": return { sob: 1 + Math.random() * 2, edema: 1 + Math.random() * 2, fatigue: 1 + Math.random() * 2, weight: (Math.random() - 0.5) * 2 };
    default: return { sob: 1, edema: 1, fatigue: 1, weight: 0 };
  }
}

const scenarios = [];
let caseId = 1;

for (const c of COHORTS) {
  for (let i = 0; i < c.cases; i++) {
    const daily = [];
    for (let d = 1; d <= c.days; d++) daily.push(generateDayData(c.pattern, d));
    scenarios.push({
      id: `case_${caseId.toString().padStart(4,"0")}`,
      cohort: c.name,
      pattern: c.pattern,
      expected_alert: ["drift"].includes(c.pattern) ? 1 : 0,
      daily_data: daily,
    });
    caseId++;
  }
}

const OUT = path.join(__dirname, "LongitudinalScenarios.json");
fs.writeFileSync(OUT, JSON.stringify(scenarios, null, 2));
console.log(`✅ Generated ${scenarios.length} longitudinal cases → ${OUT}`);
