// Adaptive thresholds based on user variance (14-day lookback).
// Reduces false positives in noisy users.

export function buildAdaptiveBuckets(baseBuckets, norms = [], lookback = 14) {
  const arr = Array.isArray(norms) ? norms.slice(-lookback) : [];
  if (arr.length < 6) return baseBuckets;

  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  const std = Math.sqrt(variance);

  const shift = Math.min(0.3, std * 0.1);
  return {
    GREEN_MAX: baseBuckets.GREEN_MAX - shift,
    YELLOW_MAX: baseBuckets.YELLOW_MAX - shift,
    ORANGE_MAX: baseBuckets.ORANGE_MAX - Math.max(0, shift - 0.05)
  };
}
