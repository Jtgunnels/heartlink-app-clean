// calculateScore.js

const calculateScore = (sob, edema, fatigue, weight, prevWeight, prevEntry) => {
  let score = 0;
  const reasons = [];

  const sobMap = { None: 0, Mild: 1, Moderate: 2, Severe: 3 };
  const fatigueMap = { None: 0, Mild: 1, Moderate: 2, Severe: 3 };
  const edemaMap = { None: 0, Mild: 1, Moderate: 2, Severe: 3 };

  // Weighted scoring (align with ACC/NYHA focus)
  score += (sobMap[sob] || 0) * 2;
  score += (fatigueMap[fatigue] || 0) * 2;
  score += (edemaMap[edema] || 0);

  // Weight change contribution
  let weightChange = 0;
  if (prevWeight) {
    const diff = parseFloat(weight) - parseFloat(prevWeight);
    if (diff >= 2 && diff < 3) weightChange = 1;
    else if (diff >= 3 && diff <= 5) weightChange = 2;
    else if (diff > 5) weightChange = 3;
  }
  score += weightChange;

  // 🔴 Acute overrides — collect ALL
  if (sob === "Severe") reasons.push("Severe shortness of breath at rest");
  if (fatigue === "Severe") reasons.push("Severe fatigue limiting activity");
  if (edema === "Severe") reasons.push("Severe swelling");

  if (weightChange >= 2) {
    if (weightChange === 3) reasons.push("Rapid weight gain >5 lbs");
    else reasons.push("Acute weight gain 3–5 lbs");
  }

  if (prevEntry) {
    if (sobMap[sob] - sobMap[prevEntry.sob] >= 2)
      reasons.push("Sudden worsening of shortness of breath");
    if (fatigueMap[fatigue] - fatigueMap[prevEntry.fatigue] >= 2)
      reasons.push("Sudden worsening of fatigue");
    if (edemaMap[edema] - edemaMap[prevEntry.edema] >= 2)
      reasons.push("Sudden worsening of swelling");
  }

  // Category assignment
  let category;
  if (reasons.some(r => r.toLowerCase().includes("severe") || r.includes(">5 lbs"))) {
    category = "Red";
  } else if (reasons.length > 0) {
    category = "Orange";
  } else if (score <= 2) {
    category = "Green";
  } else if (score <= 5) {
    category = "Yellow";
  } else if (score <= 8) {
    category = "Orange";
  } else {
    category = "Red";
  }

  return { category, score, reasons };
};

export default calculateScore;
