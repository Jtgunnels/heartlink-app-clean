// ---------------------------------------------------------------------------
// HeartLink Algorithm v3.7 — Orthopnea Integration (Final)
// ---------------------------------------------------------------------------
// • Derived directly from v3.6 (clean clinical baseline).
// • No soft vitals, no medication penalties, null vitals ignored.
// • Orthopnea adds categorical bump (+1 mild/moderate, +2 severe).
// • Preserves StableAdvanced, weight-trend, and multi-symptom logic.
// ---------------------------------------------------------------------------

import calculateScore_v3_6 from "./calculateScore_v3_6.js";

export const VERSION = "3.7";

/**
 * Escalate category by 1–2 steps within Green→Yellow→Orange→Red
 */
function escalateCategory(cat, steps = 1) {
  const order = ["Green", "Yellow", "Orange", "Red"];
  const i = order.indexOf(cat);
  if (i < 0) return cat;
  return order[Math.min(order.length - 1, i + steps)];
}

/**
 * Convert orthopnea input into a numeric 0–3 level.
 */
function orthopneaLevel(value) {
  if (value == null) return 0;
  if (typeof value === "boolean") return value ? 2 : 0;
  if (typeof value === "number" && Number.isFinite(value))
    return Math.max(0, Math.min(3, Math.round(value)));

  const s = String(value).toLowerCase().trim();
  if (["none", "no", "false"].includes(s)) return 0;
  if (s === "mild") return 1;
  if (s === "moderate") return 2;
  if (s === "severe") return 3;
  return 0;
}

/**
 * calculateScore_v3_7
 * @param {object} input - user check-in (symptoms, weight, etc.)
 * @param {object} baseline - baseline symptom levels, weight, NYHA class
 * @param {object} hist - prior scores or categories
 * @param {boolean} debug
 */
export default async function calculateScore(input = {}, baseline = {}, hist = {}, debug = false) {
  // Step 1: Run baseline (v3.6)
  const base = await calculateScore_v3_6(input, baseline, hist, debug);
  let { category, normalized, score, reasons = [], flags = {} } = base;

  // Step 2: Evaluate orthopnea
  const orthoLvl = orthopneaLevel(input.orthopnea ?? input.orthopneaLevel);

  if (orthoLvl >= 1) {
    const steps = orthoLvl >= 3 ? 2 : 1;

    if (category !== "Red" && category !== "StableAdvanced") {
      const prevCat = category;
      category = escalateCategory(category, steps);
      reasons.push(
        `Orthopnea noted (breathing worsens when lying flat) — escalated from ${prevCat} to ${category}.`
      );
    }
    flags.orthopnea = true;
  }

  // Step 3: Standardize meta object for compatibility with later builds
  const meta = {
    version: VERSION,
    sourceVersion: base.meta?.version || "3.6",
    orthopneaLevel: orthoLvl,
    baseCategory: base.category,
    escalationApplied: category !== base.category,
    baselineUpdateApplied: base.meta?.baselineUpdateApplied ?? false
  };

  // Step 4: Output final structured result
  const result = {
    ...base,
    category,
    normalized,
    score: normalized,
    reasons: [...new Set(reasons)].slice(0, 6),
    flags: { ...flags, version: VERSION },
    meta
  };

  if (debug) console.log({ v37: result });
  return result;
}
