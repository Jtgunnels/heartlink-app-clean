---
Author: Joshua Gunnels, PA-C  
Role: Founder & Clinical Developer, HeartLink LLC  
Trial ID: LLC_EDGECASE_TRIAL_002  
Date Created: 2025-10-10  
Reviewed by: [QA Reviewer – TBD]  
Status: In Progress  
---

# HeartLink Edge-Case Sensitivity Validation Trial 002

## 1. Purpose
To evaluate HeartLink algorithm v3.7 (Shadow) against v3.6 (Active) under boundary and missing-data conditions.  
This confirms proportional category weighting and proper safety behavior at clinical thresholds.

## 2. Folder Contents
| File / Folder | Description |
|----------------|-------------|
| `trial_manifest.json` | Metadata and execution record for Trial 002 |
| `Inputs/04b_TestScenarios_EdgeCases.json` | Edge-case synthetic scenarios |
| `Outputs/Results/` | Generated JSON and CSV results |
| `Outputs/Logs/` | Console or debug logs (if any) |
| `Reports/04e_Summary_Report_Template.md` | Final summary report for review |
| `../04d_Test_Audit_Trail.csv` | Global audit trail (auto-appended) |

## 3. Execution
From the `04_Algorithm_Validation` folder:  
```bash
node 04c_RunSyntheticTest.js
