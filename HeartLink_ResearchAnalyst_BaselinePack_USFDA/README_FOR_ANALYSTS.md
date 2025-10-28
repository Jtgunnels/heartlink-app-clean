# Analyst Read-Me — HeartLink Baseline System

**Author:** Joshua Gunnels, PA-C — Independent Clinical Developer (HeartLink)  
**Date:** 2025-10-10

## Purpose
This guide explains how to maintain and version the HeartLink Design History File (DHF) and associated documentation.

### Version Control
- Update `01_Study_Overview/01c_Version_History_Log.csv` whenever files change.  
- Increment the `Version` field in each document header.

### Audit Trail
Synthetic test results are stored under `04_Algorithm_Validation/`.
Each execution appends to `04d_Test_Audit_Trail.csv`.

### Change Control
For any future algorithm revision:
1. Create new test scenarios.
2. Record outcome deltas.
3. Log analyst approval and reviewer sign-off.

This repository follows FDA 21 CFR 820.30 and ISO 13485 documentation control conventions.
