// ---------------------------------------------------------------------------
// HeartLink v4.1-CL — ASE 1.3 (Clinical-Lock)
// Reason Summary Generator — contextual paragraph only
// Context rule: If category = Orange or Red → show only worsening findings
// Updates:
// - Accepts BOTH baseline {baselineSob, baselineEdema, baselineFatigue, baselineWeight}
//   and current {sobLevel, edemaLevel, fatigueLevel, weightToday}
// - Ignores weight reasoning if today's weight is missing
// - Normalizes naming to maintain category/reason alignment across screens
// ---------------------------------------------------------------------------

export default function generateReasonSummary(entry = {}, category = "N/A", options = {}) {
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

  // Normalize baseline naming (handles multiple schema versions)
  const baseSOB =
    baseline?.sobLevel ?? baseline?.baselineSob ?? baseline?.sob ?? null;
  const baseEdema =
    baseline?.edemaLevel ?? baseline?.baselineEdema ?? baseline?.edema ?? null;
  const baseFatigue =
    baseline?.fatigueLevel ?? baseline?.baselineFatigue ?? baseline?.fatigue ?? null;
  const baseWeight = Number.isFinite(baseline?.weightToday)
    ? baseline.weightToday
    : Number.isFinite(baseline?.baselineWeight)
    ? baseline.baselineWeight
    : undefined;
  const baseOrthopnea =
    typeof baseline?.orthopnea === "boolean" ? baseline.orthopnea : undefined;

  const levels = ["None", "Mild", "Moderate", "Severe"];
  const idx = (v) => (v ? levels.indexOf(v) : -1);
  const diffLevels = (curr, base) =>
    curr && base && idx(curr) >= 0 && idx(base) >= 0 ? idx(curr) - idx(base) : null;

  const worsening = [];
  const improving = [];

  // --- Shortness of breath (+orthopnea rolled in) ---
  if (sobLevel) {
    const d = diffLevels(sobLevel, baseSOB);
    const trend = (sobTrend || "").toLowerCase();

    if (d > 0 || trend === "worse") worsening.push("shortness of breath");
    if (d < 0 || trend === "better") improving.push("shortness of breath");

    if (orthopnea === true && baseOrthopnea === false && !worsening.includes("shortness of breath"))
      worsening.push("shortness of breath when lying flat");
    if (orthopnea === false && baseOrthopnea === true && !improving.includes("shortness of breath"))
      improving.push("shortness of breath when lying flat");
  }

  // --- Swelling / Edema ---
  if (edemaLevel) {
    const d = diffLevels(edemaLevel, baseEdema);
    const trend = (edemaTrend || "").toLowerCase();
    if (d > 0 || trend === "worse") worsening.push("swelling");
    if (d < 0 || trend === "better") improving.push("swelling");
  }

  // --- Fatigue ---
  if (fatigueLevel) {
    const d = diffLevels(fatigueLevel, baseFatigue);
    const trend = (fatigueTrend || "").toLowerCase();
    if (d > 0 || trend === "worse") worsening.push("fatigue");
    if (d < 0 || trend === "better") improving.push("fatigue");
  }

  // --- Weight ---
  if (Number.isFinite(weightToday)) {
    if (Number.isFinite(baseWeight)) {
      const d = weightToday - baseWeight;
      if (d >= 2) worsening.push("weight");
      else if (d <= -2) improving.push("weight");
    }

    // Check short-term trend only if today's weight is present
    if (prevWeights && prevWeights.length >= 3) {
      const recent = prevWeights.slice(-3);
      const delta = recent[2] - recent[0];
      if (delta >= 2) worsening.push("weight");
      else if (delta <= -2) improving.push("weight");
    } else if (prevWeights && prevWeights.length === 2) {
      const delta = prevWeights[1] - prevWeights[0];
      if (delta >= 2) worsening.push("weight");
      else if (delta <= -2) improving.push("weight");
    }
  } else {
    // No weight entered today → do not infer improvement/worsening
  }

  const joinList = (arr) => {
    if (!arr.length) return "";
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
    return `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
  };

  // --- Category-specific narrative logic ---
  const highAlert = category === "Orange" || category === "Red";
  let summaryParagraph = "";

  if (highAlert) {
    if (worsening.length) {
      summaryParagraph = `You reported worsening ${joinList(
        worsening
      )} compared with your usual pattern.`;
    } else {
      summaryParagraph = "Your reported symptoms were similar to your usual pattern.";
    }
  } else {
    if (worsening.length && improving.length) {
      summaryParagraph = `You reported worsening ${joinList(
        worsening
      )} compared with your usual pattern. You also reported improvement in ${joinList(
        improving
      )} compared with your baseline. All other findings were similar to your baseline.`;
    } else if (worsening.length) {
      summaryParagraph = `You reported worsening ${joinList(
        worsening
      )} compared with your usual pattern. All other findings were similar to your baseline.`;
    } else if (improving.length) {
      summaryParagraph = `You reported improvement in ${joinList(
        improving
      )} compared with your baseline. All other findings were similar to your baseline.`;
    } else {
      summaryParagraph = "Your reported symptoms were similar to your usual pattern.";
    }
  }

  return { summaryParagraph };
}
