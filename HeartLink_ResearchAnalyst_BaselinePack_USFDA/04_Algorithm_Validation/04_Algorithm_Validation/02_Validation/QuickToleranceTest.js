import calculateScore_ASE13 from "./calculateScore_ASE13a_FINAL_CL.js";

const baseline = { sob: 1.0, edema: 1.0, fatigue: 1.0 };
const input = { sob: 1.15, edema: 1.1, fatigue: 1.05 }; // all below Δ 0.17 threshold
const hist = {};

const result = calculateScore_ASE13(input, baseline, hist);
console.log("Δ small (should be Neutral):", result);

const input2 = { sob: 1.25, edema: 1.3, fatigue: 1.2 }; // above Δ 0.17 threshold
const result2 = calculateScore_ASE13(input2, baseline, hist);
console.log("Δ larger (should become Yellow):", result2);
