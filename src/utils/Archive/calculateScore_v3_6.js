// src/utils/calculateScore.js
// HeartLink Algorithm v3.1 — Diagnostic-corrected
// Adds refined category gating, StableAdvanced detection, and trend safeguards

export const BUCKETS = { GREEN_MAX: 2.6, YELLOW_MAX: 4.9, ORANGE_MAX: 7.4 };

const W = {
  sob: 2.25,
  orthopnea: 1.75,
  fatigue: 0.75,
  edema: 1.25,
  fluid: 1.6,
  missedMeds: 2.0,
  heartRate: 1.5,
  sbp: 2.0,
  appetiteLoss: 1.0,
  lowUrine: 1.0,
};

const GROSS_TREND_ESCALATION = { tier1Pct: 0.25, tier2Pct: 0.5, minAvg: 3, minAbsRise: 0.8 };

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function toCategory(n, b = BUCKETS) {
  if (n <= b.GREEN_MAX) return "Green";
  if (n <= b.YELLOW_MAX) return "Yellow";
  if (n <= b.ORANGE_MAX) return "Orange";
  return "Red";
}
function mapLevel(x) {
  if (x == null) return 0;
  if (typeof x === "number") return clamp(Math.round(x), 0, 3);
  const s = String(x).toLowerCase().trim();
  return s === "none" ? 0 : s === "mild" ? 1 : s === "moderate" ? 2 : s === "severe" ? 3 : 0;
}
function clampPhysiology(hr, sbp) {
  const num = (v) => (v == null || v === "" ? null : Number(v));
  const safeHR = num(hr);
  const safeSBP = num(sbp);
  return {
    safeHR: safeHR != null ? clamp(safeHR, 30, 200) : null,
    safeSBP: safeSBP != null ? clamp(safeSBP, 60, 220) : null,
  };
}
function ema(values = [], alpha = 0.6) {
  if (!Array.isArray(values) || values.length === 0) return [];
  let s = values[0];
  const out = [s];
  for (let i = 1; i < values.length; i++) {
    const v = typeof values[i] === "number" ? values[i] : out[i - 1];
    s = alpha * v + (1 - alpha) * s;
    out.push(s);
  }
  return out;
}
function deltasFromSeries(series = []) {
  if (!Array.isArray(series) || series.length < 2) return [];
  const d = [];
  for (let i = 1; i < series.length; i++)
    if (typeof series[i - 1] === "number" && typeof series[i] === "number")
      d.push(series[i] - series[i - 1]);
  return d;
}
function compute3dWeightTrendFlag(a) {
  if (!Array.isArray(a) || a.length < 3) return null;
  const g = a.slice(-3).reduce((x, b) => x + (b > 0 ? b : 0), 0);
  return g >= 2;
}
function last(a = []) { return Array.isArray(a) && a.length ? a[a.length - 1] : null; }
function stdDev(a = []) {
  const x = a.filter((n) => typeof n === "number");
  if (x.length < 2) return 0;
  const m = x.reduce((p, c) => p + c, 0) / x.length;
  const v = x.reduce((p, c) => p + Math.pow(c - m, 2), 0) / (x.length - 1);
  return Math.sqrt(v);
}
function adaptBuckets(base, { userCheckIns = 0, normalizedScores = [] } = {}) {
  const B = { ...base };
  if (userCheckIns > 0 && userCheckIns < 7) {
    B.GREEN_MAX += 0.6;
    B.YELLOW_MAX += 0.6;
    B.ORANGE_MAX += 0.6;
    return B;
  }
  const sigma = stdDev(normalizedScores.slice(-10));
  const adj = clamp(sigma * 0.25, -0.5, 0.5);
  B.GREEN_MAX += adj;
  B.YELLOW_MAX += adj;
  B.ORANGE_MAX += adj;
  return B;
}
function escalateCategory(cat, t = 1) {
  const o = ["Green", "Yellow", "Orange", "Red"];
  return o[clamp(o.indexOf(cat) + t, 0, o.length - 1)];
}

// ---------- MAIN ----------
export async function calculateScore(input = {}, baseline = {}, hist = {}, debugMode = false) {
  let category = "Green";
  const reasons = [];

  const historyNorm = Array.isArray(hist.normalizedScores) ? hist.normalizedScores : [];
  const weightsHist = Array.isArray(hist.weights) ? hist.weights : [];
  const userCheckIns =
    typeof hist.userCheckIns === "number" ? hist.userCheckIns : historyNorm.length || 0;
  const ADAPTIVE_BUCKETS = adaptBuckets(BUCKETS, {
    userCheckIns,
    normalizedScores: historyNorm,
  });

  const sobLevel = mapLevel(input.sobLevel ?? input.sob);
  const fatigueLevel = mapLevel(input.fatigueLevel ?? input.fatigue);
  const edemaLevel = mapLevel(input.edemaLevel ?? input.edema);
  const { safeHR, safeSBP } = clampPhysiology(input.heartRate, input.sbp);

  // --- Weight trend
  const weights = [...weightsHist];
  if (typeof input.weightToday === "number") weights.push(input.weightToday);
  const dayDelta =
    typeof input.weightToday === "number" && typeof input.weightYesterday === "number"
      ? input.weightToday - input.weightYesterday
      : 0;
  const dryWeight = baseline.weight ?? baseline.baselineWeight ?? null;
  const weekGain =
    typeof input.weightToday === "number" && typeof dryWeight === "number"
      ? input.weightToday - dryWeight
      : null;
  const emaSeries = ema(weights.slice(-7), 0.6);
  const emaDeltas = deltasFromSeries(emaSeries);
  const trendUpFlag = compute3dWeightTrendFlag(emaDeltas);

  // --- Critical override (Red)
  const severeSOB = sobLevel >= 3;
  const tachy = safeHR != null && safeHR > 110;
  const hypo = safeSBP != null && safeSBP < 90;
  const rapidGainDay = dayDelta >= 3;
  const rapidGainWeek = weekGain > 5;
  if (severeSOB || tachy || hypo || rapidGainDay || rapidGainWeek) {
    reasons.push("Critical sign detected (SOB, HR, BP, or weight change).");
    return {
      category: "Red",
      normalized: 10,
      score: 10,
      reasons,
      flags: { criticalOverride: true },
    };
  }

  // --- Base scoring
  const baseSob = mapLevel(baseline.baselineSob);
  const baseFatigue = mapLevel(baseline.baselineFatigue);
  const baseEdema = mapLevel(baseline.baselineEdema);
  const theoreticalMax = 3 * 2.25 + 3 * 1.25 + 3 * 0.75;
  const earned =
    sobLevel * 2.25 + edemaLevel * 1.25 + fatigueLevel * 0.75;
  const normalized = clamp((earned / theoreticalMax) * 10, 0, 10);
  category = toCategory(normalized, ADAPTIVE_BUCKETS);

  // --- Baseline deviation logic
  const sobDiff = sobLevel - baseSob;
  const edemaDiff = edemaLevel - baseEdema;
  const fatigueDiff = fatigueLevel - baseFatigue;
  const worsenedDomains = [sobDiff, edemaDiff, fatigueDiff].filter((d) => d >= 1).length;

  // --- Yellow for single mild change
  if (worsenedDomains === 1 && category === "Green") {
    category = "Yellow";
    reasons.push("One symptom is slightly worse than usual today.");
  }

  // --- Orange for multiple changes
  if (worsenedDomains >= 2 && category !== "Red") {
    category = "Orange";
    reasons.push("Several symptoms have worsened together and need attention.");
  }

  // --- Composite Red escalation (multi-domain + trend)
  if (worsenedDomains >= 2 && trendUpFlag && (sobLevel >= 3 || edemaLevel >= 3)) {
    category = "Red";
    reasons.push("Multiple severe symptoms with upward trend detected. Contact provider.");
  }

  // --- StableAdvanced detection
  const baselineSevere =
    baseSob >= 2 || baseEdema >= 2 || baseFatigue >= 2 || baseline.baselineOrthopnea === true;
  const advancedSymptomsNow =
    (sobLevel >= 2 && edemaLevel >= 2 && fatigueLevel >= 2) ||
    (sobLevel >= 3 && edemaLevel >= 3) ||
    (sobLevel >= 3 && fatigueLevel >= 3) ||
    (edemaLevel >= 3 && fatigueLevel >= 3);
  const noEscalationNow =
    !trendUpFlag && !rapidGainDay && !rapidGainWeek && safeHR <= 110 && safeSBP >= 90;
  if ((baselineSevere || advancedSymptomsNow) && noEscalationNow) {
    category = "StableAdvanced";
    reasons.push(
      "Your symptoms remain at your usual advanced level. Continue daily tracking and stay alert for any changes."
    );
  }

  // --- Green gating (only mild baselines)
  if (
    category === "Green" &&
    (baseSob >= 2 || baseEdema >= 2 || baseFatigue >= 2)
  ) {
    category = "StableAdvanced";
  }

  // --- Orange/Red threshold protection
  if (category === "Red" && !tachy && !hypo && worsenedDomains < 2) {
    category = "Orange";
  }

  if (debugMode) {
    console.log({
      sobLevel,
      edemaLevel,
      fatigueLevel,
      worsenedDomains,
      trendUpFlag,
      baselineSevere,
      advancedSymptomsNow,
      category,
      reasons,
    });
  }

  return {
    category,
    normalized: +normalized.toFixed(1),
    score: +normalized.toFixed(1),
    reasons: [...new Set(reasons)].slice(0, 5),
    flags: { criticalOverride: false },
  };
}

export default calculateScore;
