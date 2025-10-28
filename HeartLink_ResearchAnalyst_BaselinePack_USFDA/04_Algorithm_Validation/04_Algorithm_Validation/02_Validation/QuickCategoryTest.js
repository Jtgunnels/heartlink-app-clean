/**
 * HeartLink ASE 1.3x – Quick 3-Case Diagnostic Test
 * -------------------------------------------------
 * Verifies that calculateScore_x.js responds correctly to mild → moderate changes.
 * Run inside your 02_Validation folder:
 *   node QuickCategoryTest.js
 */

import calculateScore from "./calculateScore_ASE13b_FINAL_CL.js";

// Common baseline (typical NYHA II–III stable)
const baseline = { sob: 1.0, edema: 1.0, fatigue: 1.0 };

// Case 1 – Tiny change (below Δ-tolerance, should stay Neutral)
const case1 = {
  id: "tiny_change",
  input: { sob: 1.1, edema: 1.1, fatigue: 1.05 },
};

// Case 2 – Mild change (just above Δ-tolerance, should become Yellow)
const case2 = {
  id: "mild_change",
  input: { sob: 1.25, edema: 1.2, fatigue: 1.1 },
};

// Case 3 – Moderate change (clear worsening, should become Orange or Red)
const case3 = {
  id: "moderate_change",
  input: { sob: 1.5, edema: 1.4, fatigue: 1.3 },
};

const cases = [case1, case2, case3];

console.log("=== HeartLink ASE 1.3x Quick Category Test ===");
for (const c of cases) {
  const result = calculateScore(c.input, baseline, {}, true);
  console.log(`\nCase: ${c.id}`);
  console.log("Input:", c.input);
  console.log("→ Normalized:", result.normalized);
  console.log("→ Category:", result.cardCategory);
  console.log("→ Awareness:", result.awarenessLevel);
}
