// HeartLink Health — deEscalation.js (v4.1-CL, ASE 1.3)
// If we are proposing Green but there was Orange/Red in the recent window,
// hold at Yellow to avoid ping-pong.

export function applyOrangeGreenSmoothing(recentCategories, proposed, coolDays = 5) {
  if (proposed !== "Green") return proposed;
  const last = Array.isArray(recentCategories)
    ? recentCategories.slice(-coolDays)
    : [];
  const hadHot = last.some((c) => c === "Orange" || c === "Red");
  return hadHot ? "Yellow" : "Green";
}
