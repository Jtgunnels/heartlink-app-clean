// ---------------------------------------------------------------------------
/**
 * HeartLink v4.1-CL — ASE 1.3
 * Provider-Facing Reason Summary (Compact + ASE-consistent)
 * - One net direction per domain (no contradictory pairs).
 * - Concise output, capped list, aligned to ASE category when signals are sparse.
 * - Prefers objective baseline delta when level/trend disagree (no "mixed").
 * - Suppresses "improving" phrases when patient category is worsening or stable.
 */
// ---------------------------------------------------------------------------

export default function generateReasonSummary_Provider(entry = {}, category = "N/A", options = {}) {
  const { baseline = {}, prevWeights = [] } = options;

  const {
    sobLevel,
    edemaLevel,
    fatigueLevel,
    orthopnea,
    sobTrend,
    edemaTrend,
    fatigueTrend,
    weightToday,
  } = entry || {};

  const baseSOB = baseline?.sobLevel ?? baseline?.baselineSob ?? baseline?.sob ?? null;
  const baseEdema = baseline?.edemaLevel ?? baseline?.baselineEdema ?? baseline?.edema ?? null;
  const baseFatigue = baseline?.fatigueLevel ?? baseline?.baselineFatigue ?? baseline?.fatigue ?? null;
  const baseWeight = Number.isFinite(baseline?.weightToday)
    ? baseline.weightToday
    : Number.isFinite(baseline?.baselineWeight)
    ? baseline.baselineWeight
    : undefined;
  const baseOrthopnea =
    typeof baseline?.orthopnea === "boolean" ? baseline.orthopnea : undefined;

  const levels = ["None", "Mild", "Moderate", "Severe"];
  const idx = (v) => (typeof v === "string" ? levels.indexOf(v) : -1);

  const deltaLevel = (curr, base) => {
    const ci = idx(curr), bi = idx(base);
    if (ci < 0 || bi < 0) return 0;
    return ci - bi;
  };

  const normTrend = (t) => (t || "").toLowerCase();

  const combineDir = (d, t) => {
    const dirDelta = d > 0 ? "worse" : d < 0 ? "better" : null;
    const dirTrend = t === "worse" ? "worse" : t === "better" ? "better" : null;
    if (dirDelta && dirTrend) return dirDelta; // prefer baseline delta
    return dirDelta || dirTrend || null;
  };

  const sobDir = combineDir(deltaLevel(sobLevel, baseSOB), normTrend(sobTrend));

  let orthoDir = null;
  if (typeof orthopnea === "boolean" && typeof baseOrthopnea === "boolean") {
    if (orthopnea !== baseOrthopnea) orthoDir = orthopnea ? "worse" : "better";
  }

  const edemaDir = combineDir(deltaLevel(edemaLevel, baseEdema), normTrend(edemaTrend));
  const fatigueDir = combineDir(deltaLevel(fatigueLevel, baseFatigue), normTrend(fatigueTrend));

  let weightAbs = null;
  if (Number.isFinite(weightToday) && Number.isFinite(baseWeight)) {
    const d = weightToday - baseWeight;
    if (d >= 2) weightAbs = "gain";
    else if (d <= -2) weightAbs = "loss";
  }

  let weightTrendDir = null;
  if (Array.isArray(prevWeights) && prevWeights.length >= 2) {
    const delta = prevWeights[prevWeights.length - 1] - prevWeights[0];
    if (delta >= 2) weightTrendDir = "gain";
    else if (delta <= -2) weightTrendDir = "loss";
  }

  let weightDir = null;
  if (weightAbs && weightTrendDir) {
    weightDir = weightAbs === weightTrendDir ? weightAbs : "variable";
  } else {
    weightDir = weightAbs || weightTrendDir;
  }

  // ---------- Build phrases (one per domain) ----------
  const phrases = [];
  const cat = (category || "").toLowerCase();
  const allowImprovement =
    cat.includes("green") || cat.includes("stable") || cat.includes("improved");

  const pushSOB = () => {
    let merged = sobDir || orthoDir || null;
    if (sobDir && orthoDir) {
      if (sobDir === orthoDir) merged = sobDir;
      else if (sobDir === "worse" || orthoDir === "worse") merged = "worse";
      else merged = sobDir;
    }
    if (!merged) return;
    if (merged === "worse") phrases.push("SOB/orthopnea worsening");
    else if (merged === "better" && allowImprovement)
      phrases.push("SOB/orthopnea improving");
  };

  pushSOB();

  if (edemaDir === "worse") phrases.push("Edema worsening");
  else if (edemaDir === "better" && allowImprovement)
    phrases.push("Edema improving");

  if (fatigueDir === "worse") phrases.push("Fatigue worsening");
  else if (fatigueDir === "better" && allowImprovement)
    phrases.push("Fatigue improving");

  if (weightDir === "gain") phrases.push("Weight gain");

  // Cap to keep table compact
  const MAX_ITEMS = 4;
  const hasSignals = phrases.length > 0;
  const compact = (list) => (list.length > MAX_ITEMS ? list.slice(0, MAX_ITEMS) : list);

  // If we have signals, print them
  if (hasSignals) return compact(phrases).join(", ");

  // ASE-aligned fallback text
  if (cat.includes("red")) return "Urgent: severe change detected by algorithm.";
  if (cat.includes("orange")) return "Change detected vs baseline; review recommended.";
  if (cat.includes("yellow")) return "Mild change detected; monitor for progression.";
  return "No significant change vs baseline.";
}
