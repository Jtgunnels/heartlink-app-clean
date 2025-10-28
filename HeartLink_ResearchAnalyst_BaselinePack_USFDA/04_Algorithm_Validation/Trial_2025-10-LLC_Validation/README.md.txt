---
Author: Joshua Gunnels, PA-C
Role: Founder & Clinical Developer, HeartLink LLC
Trial ID: LLC_BASELINE_TRIAL_001
Date: 2025-10-10
Reviewed by: [QA Reviewer – TBD]
Approval Status: Pending
---

# HeartLink Synthetic Validation — Trial 2025-10-LLC

## 1. Purpose
This trial documents the baseline synthetic validation of HeartLink’s scoring algorithms under the newly formed HeartLink LLC entity.  
The goal is to confirm functional equivalence between v3.6 (active) and v3.7 (shadow) scoring engines before regulatory and clinical expansion.

---

## 2. Folder Contents
| File / Folder | Description |
|----------------|-------------|
| `trial_manifest.json` | Metadata record for this validation run (objective, date, signatures, results summary). |
| `Inputs/` | Contains the scenario definitions (`04b_TestScenarios.json`). |
| `Outputs/` | Stores the generated JSON and CSV result files created by `04c_RunSyntheticTest.js`. |
| `Reports/` | Holds the completed `04e_Summary_Report_Template.md` for QA review and signature. |
| `../04d_Test_Audit_Trail.csv` | Global audit log updated automatically after each run. |

---

## 3. How to Execute a Synthetic Trial
1. Ensure Node.js ≥ 18 is installed.  
2. Open a terminal in this directory.  
3. Run:
   ```bash
   node ../../04_Algorithm_Validation/04c_RunSyntheticTest.js
