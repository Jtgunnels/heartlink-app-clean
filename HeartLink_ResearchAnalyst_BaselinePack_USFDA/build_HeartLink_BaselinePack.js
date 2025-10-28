import fs from "fs";
import path from "path";

const author = "Joshua Gunnels, PA-C — Independent Clinical Developer (HeartLink)";
const date = "2025-10-10";
const base = "HeartLink_ResearchAnalyst_BaselinePack_USFDA";

const folders = [
  "01_Study_Overview",
  "02_Regulatory_Position",
  "03_Design_History_File",
  "04_Algorithm_Validation",
  "05_Privacy_and_Security",
  "06_Clinical_Correlation",
  "07_Publication_and_Dissemination"
];

folders.forEach(f => fs.mkdirSync(path.join(base, f), { recursive: true }));

// Executive Summary
fs.writeFileSync(
  path.join(base, "Executive_Summary_for_Reviewers.md"),
`# HeartLink – Executive Summary for Reviewers

**Author:** ${author}
**Version:** 0.1-Draft
**Date:** ${date}

---

## Overview
HeartLink is a clinician-developed mobile application designed to help adults with heart-failure–related symptoms monitor daily trends in weight, swelling, and shortness of breath. It currently functions as a *general wellness* tool under FDA guidance and provides educational, non-diagnostic feedback.

This archive documents the baseline Design History, Risk Management, and Verification & Validation framework needed for future FDA SaMD submission readiness.

---

## Scope
Organized per FDA-recognized standards (21 CFR 820.30, ISO 14971, IEC 62304) including:

- Regulatory Position Summary and 510(k) Transition Checklist
- Software Requirements, Risk Management, and Validation Plans
- Algorithm Validation Evidence (v3.6 → v3.7)
- Privacy, Security, and Clinical Guideline Mapping
- Publication-ready materials

---

**Prepared by:** ${author}
**Reviewed by:** [Regulatory QA Reviewer – TBD]
**Approval Status:** Pending
`
);

// README for analysts
fs.writeFileSync(
  path.join(base, "README_FOR_ANALYSTS.md"),
`# Analyst Read-Me — HeartLink Baseline System

**Author:** ${author}  
**Date:** ${date}

## Purpose
This guide explains how to maintain and version the HeartLink Design History File (DHF) and associated documentation.

### Version Control
- Update \`01_Study_Overview/01c_Version_History_Log.csv\` whenever files change.  
- Increment the \`Version\` field in each document header.

### Audit Trail
Synthetic test results are stored under \`04_Algorithm_Validation/\`.
Each execution appends to \`04d_Test_Audit_Trail.csv\`.

### Change Control
For any future algorithm revision:
1. Create new test scenarios.
2. Record outcome deltas.
3. Log analyst approval and reviewer sign-off.

This repository follows FDA 21 CFR 820.30 and ISO 13485 documentation control conventions.
`
);

// Manifest placeholder
fs.writeFileSync(
  path.join(base, "manifest.json"),
JSON.stringify({
  package_name: base,
  author,
  version: "0.1-Draft",
  date_created: date,
  regulatory_focus: "US FDA General Wellness → SaMD Transition Framework",
  structure: folders.reduce((a,f)=>({ ...a, [f]: []}), {}),
  notes: "Checksums will be auto-generated once files are finalized."
}, null, 2)
);

console.log(`✅ Folder structure and baseline files created in: ${path.resolve(base)}`);
