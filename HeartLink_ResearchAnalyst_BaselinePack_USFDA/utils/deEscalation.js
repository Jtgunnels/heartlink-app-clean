// De-escalation smoothing (Orange→Green only).
// Requires 2 consecutive Green days before final drop. Never applied to Red.

export function applyOrangeGreenSmoothing({ lastCats = [], proposed }) {
  if (proposed !== "Green") return proposed;
  const recent = Array.isArray(lastCats) ? lastCats.slice(-3) : [];
  const hadOrange = recent.includes("Orange");
  if (!hadOrange) return proposed;

  const last2 = recent.slice(-2);
  const twoGreen = last2.length === 2 && last2[0] === "Green" && last2[1] === "Green";
  return twoGreen ? "Green" : "Yellow";
}

export default { applyOrangeGreenSmoothing };
