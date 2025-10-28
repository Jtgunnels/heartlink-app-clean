import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created: ${dir}`);
  }
}

// Define folder targets
const dirs = {
  docs: path.join(ROOT, "00_Documentation"),
  algos: path.join(ROOT, "01_Algorithms"),
  utils: path.join(ROOT, "01_Algorithms", "utils"),
  validation: path.join(ROOT, "02_Validation"),
  inputs: path.join(ROOT, "02_Validation", "inputs"),
  trials: path.join(ROOT, "02_Validation", "Trial_v3_8_Validation"),
  archive: path.join(ROOT, "02_Validation", "Archive"),
  results: path.join(ROOT, "02_Validation", "Results"),
  reports: path.join(ROOT, "03_Reports")
};

// Create all directories
Object.values(dirs).forEach(ensureDir);

// Helper: move file if exists
function moveFile(name, dest) {
  const src = path.join(ROOT, name);
  if (fs.existsSync(src)) {
    const target = path.join(dest, name);
    fs.renameSync(src, target);
    console.log(`📦 Moved ${name} → ${dest}`);
  }
}

// --- Move files into place ---
moveFile("RunMigration_v3_8_Compare.js", dirs.validation);
moveFile("04c_RunSyntheticTest.js", dirs.validation);
moveFile("04d_Test_Audit_Trail.xlsx", dirs.validation);
moveFile("04_Algorithm_Validation.manifest", dirs.docs);
moveFile("04a_Synthetic_Test_Methodology.md", dirs.docs);
moveFile("04b_TestScenarios.json", dirs.docs);
moveFile("04b_TestScenarios_EdgeCases.json", dirs.docs);
moveFile("04e_Summary_Report_Template.md", dirs.docs);
moveFile("QA_Reviewer_Checklist_2025-10-10.docx", dirs.docs);
moveFile("QA_Reviewer_Attestation_2025-10-10.docx", dirs.docs);

["calculateScore_v3_6.js", "calculateScore_v3_7.js", "calculateScore_v3_8.js"].forEach(f =>
  moveFile(f, dirs.algos)
);

["emaUtils.js", "adaptiveThresholds.js", "cceEngine.js", "deEscalation.js"].forEach(f =>
  moveFile(f, dirs.utils)
);

// Move old trials and results into archive
["Trial_2025-10-LLC_Baseline", "Trial_2025-10-LLC_Validation", "Trial_2025-11-LLC_EdgeCase"].forEach(f =>
  moveFile(f, dirs.archive)
);

// Final output
console.log("\n✅ HeartLink file system organized successfully!");
console.log("📂 Clean structure is now ready for continued validation.");
