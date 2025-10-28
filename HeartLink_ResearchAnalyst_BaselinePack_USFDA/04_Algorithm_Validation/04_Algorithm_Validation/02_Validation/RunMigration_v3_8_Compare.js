// ---------------------------------------------------------------------------
// HeartLink Migration Runner — Compare v3.7 vs v3.8 using archived inputs
// ---------------------------------------------------------------------------
// Requirements:
//   • Node ≥18, package.json { "type": "module" }
//   • calculateScore_v3_7.js, calculateScore_v3_8.js
//   • Inputs in ./Archive_PreV3.8/inputs or ./Trial_v3_8_Validation/inputs
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import calc37 from "../01_Algorithms/calculateScore_v3_7.js";
import calc38 from "../01_Algorithms/calculateScore_v3_8.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_DIR = path.resolve(__dirname, "./inputs");
const NEW_ROOT = path.resolve(__dirname, "./Trial_v3_8_Validation");
const OUT7_DIR = path.join(NEW_ROOT, "outputs_v3_7");
const OUT8_DIR = path.join(NEW_ROOT, "outputs_v3_8");
const COMP_DIR = path.join(NEW_ROOT, "comparisons");
const LOG_DIR = path.join(NEW_ROOT, "logs");

[NEW_ROOT, OUT7_DIR, OUT8_DIR, COMP_DIR, LOG_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error("❌ JSON parse error:", file, e.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main migration loop
// ---------------------------------------------------------------------------
const inputFiles = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith(".json"));
const summaryRows = [];

for (const file of inputFiles) {
  const data = readJSON(path.join(INPUT_DIR, file));
  if (!data) continue;

  const { id, name, input, baseline, hist } = data;
  const caseId = id ?? path.basename(file, ".json");
  console.log(`\n▶ Processing ${caseId}`);

  try {
    const r37 = await calc37(input ?? {}, baseline ?? {}, hist ?? {}, false);
    const r38 = await calc38(input ?? {}, baseline ?? {}, hist ?? {}, false);

    const deltaNorm = +(r38.normalized - r37.normalized).toFixed(2);
    const changed = r37.category !== r38.category;

    // --- Save individual outputs
    fs.writeFileSync(
      path.join(OUT7_DIR, `${caseId}_v3_7.json`),
      JSON.stringify(r37, null, 2)
    );
    fs.writeFileSync(
      path.join(OUT8_DIR, `${caseId}_v3_8.json`),
      JSON.stringify(r38, null, 2)
    );

    // --- Write per-case comparison
    const comp = {
      id: caseId,
      name: name || "",
      v3_7_category: r37.category,
      v3_8_category: r38.category,
      v3_7_norm: r37.normalized,
      v3_8_norm: r38.normalized,
      deltaNorm,
      categoryChanged: changed,
      v3_8_cceScore: r38.meta?.cceScore ?? null,
      v3_8_fluidIndex: r38.meta?.fluidIndex ?? null,
      v3_8_stsi7: r38.meta?.stsi7 ?? null
    };

    fs.writeFileSync(
      path.join(COMP_DIR, `${caseId}_compare.json`),
      JSON.stringify(comp, null, 2)
    );

    summaryRows.push([
      caseId,
      name || "",
      r37.category,
      r38.category,
      r37.normalized,
      r38.normalized,
      deltaNorm,
      changed
    ]);

    console.log(
      `  3.7 → ${r37.category.padEnd(13)} | 3.8 → ${r38.category.padEnd(13)} | Δ ${deltaNorm}`
    );
  } catch (err) {
    console.error(`❌ Error running ${caseId}:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// Write summary + manifest
// ---------------------------------------------------------------------------
const summaryPath = path.join(NEW_ROOT, "summary_v3_7_vs_v3_8.csv");
const header =
  "caseId,name,v3.7_category,v3.8_category,v3.7_norm,v3.8_norm,deltaNorm,categoryChanged";
fs.writeFileSync(
  summaryPath,
  [header, ...summaryRows.map(r => r.join(","))].join("\n")
);

const manifest = {
  algorithms: ["3.7", "3.8"],
  run_date: new Date().toISOString(),
  total_cases: summaryRows.length,
  output_dirs: { v3_7: OUT7_DIR, v3_8: OUT8_DIR, comparisons: COMP_DIR },
  summary_csv: summaryPath,
  notes:
    "Comparison between validated v3.7 and v3.8 algorithms. Data reflects post-migration re-validation set."
};
fs.writeFileSync(
  path.join(NEW_ROOT, "manifest.json"),
  JSON.stringify(manifest, null, 2)
);

console.log(
  `\n✅ Comparison complete — ${summaryRows.length} cases processed.\nSummary written to ${summaryPath}`
);
