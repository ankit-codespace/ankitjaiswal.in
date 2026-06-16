---
description: Run the application size optimization and package cleanup workflow for ILoveNotepad
---

# Workflow: ILoveNotepad Size Optimization

## Trigger
User types: `/ilovenotepad_size_opt`

This workflow runs completely autonomously from trigger to final summary.
No user input required. No permission requests. No stopping mid-loop.

---

## What This Optimizes
This workflow optimizes the Electron-builder packaging configuration to reduce installer size and installed disk size:
- Excludes unused locales / language `.pak` files from the final package.
- Minimizes the files packaged into the final ASAR archive by filtering development assets.
- Adjusts compression parameters for the NSIS build.

---

## Pre-Flight Setup
Create the artifacts directories and clean/initialize `production_artifacts/build_log.md`:

```powershell
New-Item -ItemType Directory -Force -Path production_artifacts/phase_audits/
```

Initialize `production_artifacts/build_log.md`:
```markdown
# ILoveNotepad Size Optimization — Build Log
Triggered: [timestamp]
Status: RUNNING

Known issues to address:
- Bundled Chromium locale files bloating installation size
- Extraneous development files in package ASAR

## Log Entries
[WORKFLOW STARTED] [timestamp]
```

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_size_opt.md`
- Inspect `package.json` build settings and packaged file structure.
- Write findings to `production_artifacts/size_analysis_report.md`.
- Log: `[ANALYSIS COMPLETE] [timestamp]`

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_size_opt.md`
- Draft a phased packaging pruning plan.
- Save the plan to `production_artifacts/build_plan.md`.
- Log: `[PLAN COMPLETE] [timestamp]`

### Step 3 — Phase 1: Locale Pruning Configuration
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Run all Phase 1 sub-steps in `build_plan.md`.
- Wrote `production_artifacts/phase_audits/phase1_audit.md`.
- Log: `[PHASE 1 COMPLETE] [timestamp]`

### Step 4 — Phase 2: File Exclusion Configuration
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Run all Phase 2 sub-steps in `build_plan.md`.
- Wrote `production_artifacts/phase_audits/phase2_audit.md`.
- Log: `[PHASE 2 COMPLETE] [timestamp]`

### Step 5 — Phase 3: Build Verification & Testing
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Run all Phase 3 sub-steps in `build_plan.md`.
- Run `npm run build` to package the optimized application.
- Wrote `production_artifacts/phase_audits/phase3_audit.md`.
- Update `build_log.md` status to `SUCCESS`.
- Log: `[PHASE 3 COMPLETE] [timestamp]`
- Log: `[WORKFLOW COMPLETE] [timestamp]`

---

## Final Output to User
Upon successful execution, present a clean summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Size Optimization — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Rebuilt and Local App Size Reduced
Files modified:
  - package.json (build settings & locales whitelist)

Checklist:
  ✅ Filtered locales to retain only English language files (~30MB saved)
  ✅ Excluded test and typescript maps from ASAR packaging
  ✅ Verified compiler type-safety and package integrity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
