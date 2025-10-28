// HeartLink — FP/FN + Cohort stability analyzer (single-version v3.8 run)
// Reads latest Trial_v3_8_Optimization_*/results_v3_8.csv
// Writes FP_FN_Audit.json / .csv with cohort breakdown

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// find latest trial dir
const trialDirs = fs.readdirSync(__dirname)
  .filter(d => d.startsWith("Trial_v3_8_Optimization_"))
  .map(d => path.join(__dirname, d))
  .filter(p => fs.statSync(p).isDirectory())
  .sort();
if (trialDirs.length===0) {
  console.error("❌ No Trial_v3_8_Optimization_* folder found.");
  process.exit(1);
}
const TRIAL_DIR = trialDirs[trialDirs.length-1];
const CSV = path.join(TRIAL_DIR, "results_v3_8.csv");
if (!fs.existsSync(CSV)) {
  console.error("❌ results_v3_8.csv not found. Run the study first.");
  process.exit(1);
}

const lines = fs.readFileSync(CSV, "utf8").trim().split("\n");
const head = lines.shift().split(",");
const idx = Object.fromEntries(head.map((h,i)=>[h,i]));
const rows = lines.map(l => l.split(","));

const cohorts = {};
function addCoh(grp, fp, fn, ben, ac){
  if(!cohorts[grp]) cohorts[grp] = { total:0, benign:0, acute:0, FP:0, FN:0 };
  const c = cohorts[grp];
  c.total++; c.benign += ben; c.acute += ac; c.FP += fp; c.FN += fn;
}

let tot=0, ben=0, ac=0, FP=0, FN=0;
for (const r of rows) {
  const grp = r[idx.trialGroup];
  const exp = Number(r[idx.expected_alert]);
  const fp = Number(r[idx.FP]);
  const fn = Number(r[idx.FN]);
  addCoh(grp, fp, fn, exp===0?1:0, exp===1?1:0);
  tot++; FP+=fp; FN+=fn; ben += (exp===0?1:0); ac += (exp===1?1:0);
}

// overall
const overall = {
  total_cases: tot,
  benign_cases: ben,
  acute_cases: ac,
  FP, FN,
  FP_rate_pct: ben ? Number((FP/ben*100).toFixed(1)) : 0,
  FN_rate_pct: ac ? Number((FN/ac*100).toFixed(1)) : 0,
  specificity_pct: ben ? Number((100 - (FP/ben*100)).toFixed(1)) : 100,
  sensitivity_pct: ac ? Number((100 - (FN/ac*100)).toFixed(1)) : 100
};

// per-cohort table
const perCoh = Object.entries(cohorts).map(([k,v]) => ({
  trialGroup: k,
  total: v.total,
  benign: v.benign,
  acute: v.acute,
  FP: v.FP,
  FN: v.FN,
  FP_rate_pct: v.benign ? Number((v.FP/v.benign*100).toFixed(1)) : 0,
  FN_rate_pct: v.acute ? Number((v.FN/v.acute*100).toFixed(1)) : 0,
  specificity_pct: v.benign ? Number((100 - (v.FP/v.benign*100)).toFixed(1)) : 100,
  sensitivity_pct: v.acute ? Number((100 - (v.FN/v.acute*100)).toFixed(1)) : 100
}));

// write outputs
const OUT_JSON = path.join(TRIAL_DIR, "FP_FN_Audit.json");
const OUT_CSV  = path.join(TRIAL_DIR, "FP_FN_Audit.csv");
fs.writeFileSync(OUT_JSON, JSON.stringify({ overall, perCoh }, null, 2), "utf8");

const csvHead = ["trialGroup","total","benign","acute","FP","FN","FP_rate_pct","FN_rate_pct","specificity_pct","sensitivity_pct"];
const csvLines = [csvHead.join(",")].concat(
  perCoh.map(r => csvHead.map(h => r[h]).join(","))
);
csvLines.push(["OVERALL", overall.total_cases, overall.benign_cases, overall.acute_cases, overall.FP, overall.FN, overall.FP_rate_pct, overall.FN_rate_pct, overall.specificity_pct, overall.sensitivity_pct].join(","));
fs.writeFileSync(OUT_CSV, csvLines.join("\n"), "utf8");

console.log("\n===== HeartLink v3.8 FP/FN Audit =====");
console.table(overall);
console.log("Per-cohort breakdown saved:");
console.log(OUT_JSON);
console.log(OUT_CSV);
