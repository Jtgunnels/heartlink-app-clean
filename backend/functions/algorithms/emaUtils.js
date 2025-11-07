// HeartLink Health — emaUtils.js (v4.1-CL, ASE 1.3)

export function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

export function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const b = [...arr].sort((a, b) => a - b);
  const m = Math.floor(b.length / 2);
  return b.length % 2 === 1 ? b[m] : (b[m - 1] + b[m]) / 2;
}

export function emaSeries(values, days) {
  if (!values || values.length === 0) return 0;
  const alpha = 2 / (days + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) {
    e = alpha * values[i] + (1 - alpha) * e;
  }
  return e;
}

// Normalize symptom “level” input into 0..3 numeric scale
export function levelize(x) {
  if (x == null) return 0;
  if (typeof x === "number") return clamp(x, 0, 3);
  const t = String(x).toLowerCase();
  const map = { none: 0, mild: 1, moderate: 2, severe: 3 };
  return map[t] ?? 0;
}
