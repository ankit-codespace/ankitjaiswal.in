---
description: Resolve the notebook ruler line layout mismatch/delay where content is unaligned on startup/document switch and only aligns after typing/pressing Enter.
---

# Workflow: Notebook Ruler Layout Calibration Fix

## Trigger
User types: `/layout_calibration_fix`

This workflow runs completely autonomously to resolve the notebook background ruler line misalignment and typing delay, performs safety backups, and deploys changes to the live site.

---

## What This Resolves
- **Initial Load & Tab Switch Misalignment**: Resolves the bug where notebook background lines cross through text lines on load/switch and only calibrate after typing.
- **Root Cause Mitigation**: Triggers dynamic calibration immediately after the editor container display is set to `block` (making heights non-zero) and ensures async node views are painted before reading measurements.
- **Smoother UX**: Eliminates the lag/reflow stutter when starting the app or switching tabs.

---

## Pre-Flight Setup & Backup
1. **Directory Setup**:
   ```powershell
   New-Item -ItemType Directory -Force -Path production_artifacts/phase_audits/
   ```
2. **Safe Git Backup**:
   ```powershell
   $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
   git branch "backup_layout_calibration_$timestamp"
   ```
3. **Log Initialization**:
   Write starting details into `build_log.md`.

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_layout_calibration.md`
- Inspects target files: `notepad-win/src/renderer/src/App.tsx` and `artifacts/website/src/pages/tools/notepad.tsx`.
- Create report at `production_artifacts/layout_calibration_analysis_report.md`.

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_layout_calibration.md`
- Scaffolds `production_artifacts/build_plan.md`.

### Step 3 — Phase 1: Tab Switch Calibration implementation
Follow the execute loop from `.agents/skills/execute_phase.md`.
- In `App.tsx` and `notepad.tsx`, dispatch a deferred resize event when a tab becomes active to trigger immediate grid calibration.
- Wrote `production_artifacts/phase_audits/phase1_audit.md`.

### Step 4 — Phase 2: React Node View Deferral implementation
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Wrap grid alignment height measurement calculations in a `requestAnimationFrame` / `setTimeout` block to allow browser painting to settle.
- Wrote `production_artifacts/phase_audits/phase2_audit.md`.

### Step 5 — Phase 3: Build & Deployment
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Compile desktop renderer: `npm run build:renderer` under `notepad-win/src/renderer/`.
- Compile website bundle: `npm run build` under website root.
- Re-generate installers: `npm run build` under `notepad-win/` root.
- Update `build_log.md` status to `SUCCESS`.
- Update changelog files under `_changelog/`.
- Push to GitHub:
  ```powershell
  git add .
  git commit -m "feat(notepad): resolve layout calibration delay on startup and tab switch"
  git push origin main
  ```

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ruler Layout Calibration — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Ruler Calibration Fixed on Switch & Startup
Files modified:
  - notepad-win/src/renderer/src/App.tsx
  - artifacts/website/src/pages/tools/notepad.tsx

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Added deferred grid calibration dispatch on tab switch
  ✅ Defer block height query execution to ensure paint is settled
  ✅ Compiled local setup installers and website build
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: To deploy to your live website, SSH into CyberPanel and run:
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
