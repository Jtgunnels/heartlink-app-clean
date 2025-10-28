// CCE v1.0 — Contextual Correlation Engine (symptom-only; no vitals)

const CAP = 0.8;

export function cceBiasV1({ lv, baseLv, trendUp }) {
  let mildUps = 0;
  const why = [];

  if (lv.sob > baseLv.sob) { mildUps++; why.push("SOB higher than usual."); }
  if (lv.edema > baseLv.edema) { mildUps++; why.push("Edema higher than usual."); }
  if (lv.fatigue > baseLv.fatigue) { mildUps++; why.push("Fatigue higher than usual."); }
  if (lv.orthopnea > baseLv.orthopnea) { mildUps++; why.push("Orthopnea higher than usual."); }

  if (mildUps === 0) return { bias: 0, why: [], confidence: 0.0 };

  let bias = mildUps === 1 ? 0.15 : mildUps === 2 ? 0.35 : 0.6;
  if (trendUp) bias += 0.15;
  bias = Math.min(CAP, bias);
  const confidence = Math.min(1, 0.3 * mildUps + (trendUp ? 0.2 : 0));

  return { bias, why, confidence };
}
