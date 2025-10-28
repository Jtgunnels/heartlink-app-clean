// HeartLink Synthetic Validation Runner (Final Path-Safe + Smart Detection)
// Works in Node ≥18 with "type": "module" enabled in package.json

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import v36 from "../calculateScore_v3_6.js";
import v37 from "../calculateScore_v3_7.js";

// ---------------------------------------------------------------------
//  SAFE PATH ANCHORING (prevents nested /04_Algorithm_Validation folders)
// ---------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // always = /04_Algorithm_Validation

// ---------------------------------------------------------------------
//  AUTO-DETECT ACTIVE TRIAL FOLDER
// ---------------------------------------------------------------------
const baseDir = __dirname;

const trialFolders = fs
  .readdirSync(baseDir)
  .filter(
    f =>
      f.startsWith("Trial_20") &&
      fs.statSync(path.join(baseDir, f)).isDirectory()
  );

if (trialFolders.length === 0) {
  console.error(
    "⚠️  No trial folders found in /04_Algorithm_Validation/. Create one (e.g., Trial_2025-11-LLC_EdgeCase) before running."
  );
  process.exit(1);
}

const trialFolder = trialFolders
  .map(f => ({
    name: f,
    mtime: fs.statSync(path.join(baseDir, f)).mtime
  }))
  .sort((a, b) => b.mtime - a.mtime)[0].name;

console.log(`📁 Active Trial Folder Detected: ${trialFolder}`);

// ---------------------------------------------------------------------
//  AUTO-DETECT SCENARIO FILE
// ---------------------------------------------------------------------
let scenarioFile = path.join(baseDir, "04b_TestScenarios.json");
if (trialFolder.toLowerCase().includes("edgecase")) {
  scenarioFile = path.join(baseDir, "04b_TestScenarios_EdgeCases.json");
}

if (!fs.existsSync(scenarioFile)) {
  console.error(`❌ Scenario file not found:\n${scenarioFile}`);
  process.exit(1);
}
console.log(`📄 Using scenario file: ${path.basename(scenarioFile)}`);

// ---------------------------------------------------------------------
//  LOAD SCENARIOS
// ---------------------------------------------------------------------
const scenarios = JSON.parse(fs.readFileSync(scenarioFile, "utf8"));
if (!Array.isArray(scenarios) || scenarios.length === 0) {
  console.error("⚠️  Scenario file is empty or invalid. Add test cases before running.");
  process.exit(1);
}
console.log(`🧩 Loaded ${scenarios.length} test cases.`);

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

// ---------------------------------------------------------------------
//  OUTPUT PATHS (anchored safely to __dirname)
// ---------------------------------------------------------------------
const resultsDir = path.join(__dirname, "Results");
const trialLogsDir = path.join(__dirname, trialFolder, "Outputs", "Logs");
const jsonPath = path.join(resultsDir, `SyntheticResults_${timestamp}.json`);
const csvPath = path.join(resultsDir, `SyntheticResults_${timestamp}.csv`);
const auditTrail = path.join(__dirname, "04d_Test_Audit_Trail.csv");
const runLogPath = path.join(trialLogsDir, `run_log_${timestamp}.txt`);

[resultsDir, trialLogsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`🛠️  Created missing folder: ${dir}`);
  }
});

// ---------------------------------------------------------------------
//  RUN TRIAL
// ---------------------------------------------------------------------
(async () => {
  console.log(`\n🧠 HeartLink Synthetic Validation — ${timestamp}\n`);
  const summary = [];
  let logText = `🧠 HeartLink Synthetic Validation — ${timestamp}\nTrial: ${trialFolder}\n\n`;

  for (const s of scenarios) {
    const res36 = await v36(s.input, s.baseline, {});
    const res37 = await v37(s.input, s.baseline, {});
    const same = res36.category === res37.category;
    const direction = same
      ? "– same"
      : res37.normalized > res36.normalized
      ? "↑ v3.7 more conservative"
      : "↓ v3.7 less conservative";

    const line = `🩺 Case ${s.id}: ${s.name}
       v3.6 → ${res36.category} (${res36.normalized})
       v3.7 → ${res37.category} (${res37.normalized})
       Δ ${Number(res37.normalized - res36.normalized).toFixed(3)} | ${direction}\n`;

    console.log(line);
    logText += line + "\n";

    summary.push({
      id: s.id,
      title: s.name,
      description: s.description,
      v36_category: res36.category,
      v37_category: res37.category,
      v36_score: res36.normalized,
      v37_score: res37.normalized,
      delta: Number((res37.normalized - res36.normalized).toFixed(3)),
      direction
    });
  }

  // ---------------------------------------------------------------------
  //  SAVE OUTPUTS
  // ---------------------------------------------------------------------
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

  const header =
    "id,title,v36_category,v37_category,v36_score,v37_score,delta,direction\n";
  const rows = summary
    .map(
      r =>
        `${r.id},"${r.title.replace(/"/g, '""')}",${r.v36_category},${r.v37_category},${r.v36_score},${r.v37_score},${r.delta},${r.direction}`
    )
    .join("\n");
  fs.writeFileSync(csvPath, header + rows);

  // ---------------------------------------------------------------------
  //  APPEND AUDIT ENTRY
  // ---------------------------------------------------------------------
  const auditLine = `RUN-${timestamp},${new Date().toISOString()},v3.7_shadow,Synthetic_Trial,Joshua Gunnels,${summary.length},${summary.filter(
    x => x.v36_category === x.v37_category
  ).length},${summary.filter(x =>
    x.direction.includes("↑")
  ).length},${summary.filter(x =>
    x.direction.includes("↓")
  ).length},"Auto-run via script",QA Reviewer,Pending\n`;

  fs.appendFileSync(auditTrail, auditLine);

  // ---------------------------------------------------------------------
  //  SAVE RUN LOG
  // ---------------------------------------------------------------------
  fs.writeFileSync(runLogPath, logText);
  console.log(`📝 Run log saved to: ${runLogPath}`);

  console.log(`✅ Results saved to:
   ${jsonPath}
   ${csvPath}
   and logged in 04d_Test_Audit_Trail.csv`);
})();
