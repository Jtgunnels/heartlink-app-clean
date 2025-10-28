// EMA / Levels / Trend utilities for v3.8

export function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

export function levels(x) {
  if (x == null) return 0;
  if (typeof x === "number" && Number.isFinite(x)) return clamp(Math.round(x), 0, 3);
  const s = String(x).toLowerCase().trim();
  if (s === "none") return 0;
  if (s === "mild") return 1;
  if (s === "moderate") return 2;
  if (s === "severe") return 3;
  return 0;
}

export function ema(series = [], alpha = 0.6) {
  if (!Array.isArray(series) || series.length === 0) return [];
  const out = [];
  let prev = Number(series[0]) || 0;
  out.push(prev);
  for (let i = 1; i < series.length; i++) {
    const v = Number(series[i]);
    prev = Number.isFinite(v) ? alpha * v + (1 - alpha) * prev : prev;
    out.push(prev);
  }
  return out;
}

export function slopeUp(series = [], k = 3, minSum = 1.5) {
  if (!Array.isArray(series) || series.length < k + 1) return false;
  let sum = 0;
  for (let i = series.length - 1; i > series.length - 1 - k; i--) {
    const d = series[i] - series[i - 1];
    if (Number.isFinite(d)) sum += d;
  }
  return sum >= minSum;
}

export function stsi(norms = [], n = 7) {
  const arr = Array.isArray(norms) ? norms.slice(-n) : [];
  if (arr.length < 3) return 0.5;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  const varNorm = Math.min(1, variance / 9);
  return 1 - varNorm;
}
