// ---------------------------------------------------------------------------
// Quick QA validator for HeartLink synthetic trial results
// ---------------------------------------------------------------------------
import fs from "fs";

const FILE = process.argv[2];
if (!FILE) {
  console.error("Usage: node Validate_ResultsFile.js <path/to/results.csv>");
  process.exit(1);
}

const rows = fs.readFileSync(FILE, "utf8").split(/\r?\n/).slice(1).filter(Boolean);
if (rows.length === 0) {
  console.error("❌ File empty or unreadable.");
  process.exit(1);
}

const cats = rows.map(l => l.split(",")[1]);
const scores = rows.map(l => parseFloat(l.split(",")[2]) || 0);

const objBug = cats.includes("[object Object]");
const allZero = scores.every(v => v === 0);

if (objBug) console.error("❌ Detected [object Object] serialization bug.");
if (allZero) console.error("❌ All scores are zero — algorithm likely not invoked.");
if (!objBug && !allZero) console.log("✅ File passes validation sanity check.");

console.log(`Unique categories: ${[...new Set(cats)].join(", ")}`);
console.log(`Average score: ${(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(2)}`);
