// ---------------------------------------------------------------------------
// HeartLink v3.8 — Recovery Clamp Audit Pack Generator
// ---------------------------------------------------------------------------
// Purpose: Simulate day-to-day recovery scenarios (Orange→Green)
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT = path.join(__dirname, "RecoveryAuditScenarios.json");

const TOTAL_CASES = 1000;
const scenarios = [];

for (let i = 0; i < TOTAL_CASES; i++) {
  const phase = i % 5; // 5-day segments
  const baseline = { sob: 1, edema: 1, fatigue: 1 };
  const input = {
    sob: Math.max(1, 5 - phase),       // gradual improvement
    edema: Math.max(1, 4.5 - phase),
    fatigue: Math.max(1, 4 - phase),
  };
  const hist = {
    categories: ["Orange", "Orange", "Yellow"], // last 3 days history
    normalizedScores: [6.5, 5.8, 4.2],
  };
  scenarios.push({
    id: `recovery_${(i + 1).toString().padStart(4, "0")}`,
    cohort: "RecoveryAudit",
    input,
    baseline,
    hist,
    expected_alert: phase < 2 ? 1 : 0, // first 2 days still alerting
    notes: "Simulated gradual recovery from congestion",
  });
}

fs.writeFileSync(OUT, JSON.stringify(scenarios, null, 2));
console.log(`✅ Generated ${scenarios.length} recovery cases → ${OUT}`);
