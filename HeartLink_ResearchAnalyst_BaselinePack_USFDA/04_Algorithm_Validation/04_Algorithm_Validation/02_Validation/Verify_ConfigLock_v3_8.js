// ---------------------------------------------------------------------------
// HeartLink v3.8 — Configuration Integrity Verifier (with version tag check)
// ---------------------------------------------------------------------------
// Compares CONFIG_V38 constants and version tag in calculateScore_v3_8.js
// against the reference "gold-standard" baseline established 2025-10-12.
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CONFIG_V38 } from "../../01_Algorithms/calculateScore_v3_8.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REFERENCE = {
  EMA_WINDOW_DAYS: 5,
  DEESCALATION_DAYS: 2,
  MILD_WEIGHT_FACTOR: 0.9,
  VERSION: "3.8.OPT2025-10-12",
};

const OUT_DIR = path.join(__dirname, "../03_Results");
fs.mkdirSync(OUT_DIR, { recursive: true });
const OUT_FILE = path.join(OUT_DIR, "ConfigIntegrity_Audit.json");
const DATE = new Date().toISOString();

let status = "PASS";
const diffs = [];

for (const key of Object.keys(REFERENCE)) {
  const current = CONFIG_V38[key];
  const expected = REFERENCE[key];
  if (current !== expected) {
    status = "FAIL";
    diffs.push({
      key,
      expected,
      found: current,
      message: `Mismatch: expected ${expected} but found ${current}`,
    });
  }
}

const logEntry = {
  timestamp: DATE,
  status,
  differences: diffs,
  reference: REFERENCE,
  current: CONFIG_V38,
};

if (status === "FAIL") {
  console.error("❌ CONFIGURATION INTEGRITY FAILURE:");
  diffs.forEach((d) => console.error(`   ${d.message}`));
} else {
  console.log("✅ Configuration integrity check passed (v3.8 constants & version verified).");
}

const previous = fs.existsSync(OUT_FILE)
  ? JSON.parse(fs.readFileSync(OUT_FILE, "utf8"))
  : [];

previous.push(logEntry);
fs.writeFileSync(OUT_FILE, JSON.stringify(previous, null, 2));
