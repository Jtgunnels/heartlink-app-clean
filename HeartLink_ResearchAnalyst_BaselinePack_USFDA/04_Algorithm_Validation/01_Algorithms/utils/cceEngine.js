// ---------------------------------------------------------------------------
// CCE v1.0 — Contextual Correlation Engine (symptom-only; no vitals)
// ---------------------------------------------------------------------------

const CAP = 0.8;

// ---------------------------------------------------------------------------
// HeartLink contextual correlation engine bias (v1) – merged null-safe version
// ---------------------------------------------------------------------------
export function cceBiasV1(category, hist = {}, input = {}) {
  // guarantee defined numeric values for all expected symptom fields
  const safe = {
    sob: Number(input.sob ?? 0),
    edema: Number(input.edema ?? 0),
    fatigue: Number(input.fatigue ?? 0),
    orthopnea: Number(input.orthopnea ?? 0),
    palpitations: Number(input.palpitations ?? 0),
  };

  // --- contextual mild-change bias logic (from your original CCE) ---
  let mildUps = 0;
  const why = [];

  if (safe.sob > 2) { mildUps++; why.push("SOB higher than usual."); }
  if (safe.edema > 2) { mildUps++; why.push("Edema higher than usual."); }
  if (safe.fatigue > 2) { mildUps++; why.push("Fatigue higher than usual."); }
  if (safe.orthopnea > 2) { mildUps++; why.push("Orthopnea higher than usual."); }

  let bias = 0;
  if (mildUps === 1) bias = 0.15;
  else if (mildUps === 2) bias = 0.35;
  else if (mildUps >= 3) bias = 0.6;

  // Trend-sensitive adjustment
  const recentAvg =
    (hist.normalizedScores?.slice(-3).reduce((a, b) => a + b, 0) ?? 0) / 3;
  const trendUp = recentAvg > 5;

  if (trendUp) bias += 0.15;

  bias = Math.min(CAP, bias);
  const confidence = Math.min(1, 0.3 * mildUps + (trendUp ? 0.2 : 0));

  // Category escalation rule
  let adjustedCategory = category;
  if (category === "Green" && bias > 0.5) adjustedCategory = "Yellow";

  return {
    bias,
    why,
    confidence,
    adjustedCategory,
  };
}
