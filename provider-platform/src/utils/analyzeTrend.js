// src/utils/analyzeTrend.js — Universal EMA + Slope Trend Analysis

/**
 * Analyze trend direction for any numeric dataset.
 * @param {Array} data - Array of objects with a numeric key (default: "value").
 * @param {string} key - Key to analyze (e.g., "value", "score", "adherence").
 * @returns {Object} { direction, slope, rate, changeText }
 */
export function analyzeTrend(data, key = "value") {
  if (!Array.isArray(data) || data.length < 5) {
    return { direction: "—", slope: 0, rate: 0, changeText: "No data" };
  }

  const vals = data.map((d) => Number(d[key] ?? 0)).filter((v) => !isNaN(v));
  if (vals.length < 5) {
    return { direction: "—", slope: 0, rate: 0, changeText: "No data" };
  }

  // 1️⃣ Smooth with exponential moving average (EMA)
  const alpha = 0.3;
  const smoothed = vals.reduce((acc, val, i) => {
    if (i === 0) return [val];
    acc.push(alpha * val + (1 - alpha) * acc[i - 1]);
    return acc;
  }, []);

  // 2️⃣ Compute linear regression slope
  const n = smoothed.length;
  const xMean = (n - 1) / 2;
  const yMean = smoothed.reduce((a, b) => a + b, 0) / n;
  const numerator = smoothed.reduce(
    (sum, y, i) => sum + (i - xMean) * (y - yMean),
    0
  );
  const denominator = smoothed.reduce(
    (sum, _, i) => sum + Math.pow(i - xMean, 2),
    0
  );
  const slope = numerator / denominator;

  // 3️⃣ Calculate percent rate of change
  const first = smoothed[0];
  const last = smoothed[smoothed.length - 1];
  const rate = ((last - first) / first) * 100;

  // 4️⃣ Direction labels
  let direction = "Stable";
  if (slope > 0.03) direction = "Improving";
  else if (slope < -0.03) direction = "Declining";

  const changeText =
    rate > 0
      ? `+${rate.toFixed(1)}%`
      : rate < 0
      ? `${rate.toFixed(1)}%`
      : "No change";

  return { direction, slope, rate, changeText };
}
