---
description: Harden Find & Replace tool styling, buttons visibility across dark/light themes, add Ctrl+F keydown triggers, build desktop/web targets, and deploy.
---

# Workflow: Find & Replace UX Hardening

## Trigger
User types: `/find_replace_hardening`

This workflow runs completely autonomously to redesign the Find & Replace panel for premium visibility and aesthetics across light/dark themes, maps missing keyboard triggers like `Ctrl+F`, runs local compilation tests, and pushes code to production.

---

## What This Resolves
This workflow implements a premium, high-contrast, theme-aware Find & Replace card:
- **Keyboard Shortcuts**: Restores `Ctrl + F` and `Ctrl + Shift + F` / `Ctrl + H` keydown bindings to the global listener in the Windows desktop app.
- **High-Contrast Theme Styling**: Specifies explicit, theme-compliant backgrounds, borders, text colors, and hover states for all panel buttons ("Replace", "All", navigation chevrons, and the close button), resolving near-invisible button labels.
- **Polished Input target sizing**: Sized input containers to `28px` with clean border focus states.
- **Dual-Build Compilation**: Verifies compile stability of both Electron and Web clients.
- **Git Safety Backup**: Creates a pre-flight backup branch.
- **Production Deployment**: Pushes code to GitHub and provides server pull commands.

---

## Pre-Flight Setup & Backup
1. Initialize/clean `build_log.md` and directories:
   ```powershell
   New-Item -ItemType Directory -Force -Path production_artifacts/phase_audits/
   ```
2. **Safe Backup Protocol**:
   - Since the repository uses Git, create a backup tag/branch before proceeding.
   - Run:
     ```powershell
     $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
     git branch "backup_find_replace_$timestamp"
     ```
   - Log backup details to `build_log.md`.

Initialize `build_log.md`:
```markdown
# Find & Replace UX Hardening — Build Log
Triggered: [timestamp]
Status: RUNNING

## Log Entries
[PRE-FLIGHT BACKUP] Created backup branch backup_find_replace_[timestamp]
[WORKFLOW STARTED] [timestamp]
```

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_find_replace.md`
- Audits keyboard triggers and CSS styling patterns of Find & Replace in `App.tsx` and `notepad.tsx`.
- Create a status overview and write it to `production_artifacts/find_replace_analysis_report.md`.
- Log: `[ANALYSIS COMPLETE] [timestamp]`

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_find_replace.md`
- Create a detailed step-by-step implementation plan.
- Save it to `production_artifacts/build_plan.md`.
- Log: `[PLAN COMPLETE] [timestamp]`

### Step 3 — Phase 1: Keyboard Shortcut Wiring
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Wire `Ctrl+F` and `Ctrl+Shift+F` keydown listeners into `App.tsx`.
- Wrote `production_artifacts/phase_audits/phase1_audit.md`.
- Log: `[PHASE 1 COMPLETE] [timestamp]`

### Step 4 — Phase 2: Premium Visual Styles (Desktop)
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Refactor inputs, button styling, hover visual states, text colors, and transitions in `App.tsx`.
- Wrote `production_artifacts/phase_audits/phase2_audit.md`.
- Log: `[PHASE 2 COMPLETE] [timestamp]`

### Step 5 — Phase 3: Premium Visual Styles (Web)
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Refactor Find & Replace panel styles, buttons, and navigation elements in `notepad.tsx` to align with the new desktop standard.
- Wrote `production_artifacts/phase_audits/phase3_audit.md`.
- Log: `[PHASE 3 COMPLETE] [timestamp]`

### Step 6 — Phase 4: Dev Verification & Packaging
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Compile desktop app using `npm run build:renderer`.
- Compile website using `npm run build`.
- Generate NSIS setup installer.
- Wrote `production_artifacts/phase_audits/phase4_audit.md`.
- Update `build_log.md` status to `SUCCESS`.
- Update changelog files under `_changelog/`.
- Log: `[PHASE 4 COMPLETE] [timestamp]`

### Step 7 — Phase 5: Production Deployment
Follow the DEPLOYMENT.md protocol:
- Run:
  ```powershell
  git add .
  git commit -m "feat(notepad): harden find and replace panel aesthetics, buttons contrast, inputs focus, and keyboard shortcuts"
  git push origin main
  ```
- Log: `[DEPLOYMENT COMPLETE] [timestamp]`
- Log: `[WORKFLOW COMPLETE] [timestamp]`

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Find & Replace UX Hardening — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Windows App & Web Portfolo Updated, Installers Generated, & Pushed to GitHub
Files modified:
  - notepad-win/src/renderer/src/App.tsx
  - artifacts/website/src/pages/tools/notepad.tsx

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Wired Ctrl+F and Ctrl+Shift+F triggers into App.tsx
  ✅ Refactored floating card padding, shadows, and blur
  ✅ Sized inputs to 28px height with clean hover/active borders
  ✅ Updated Replace & All button text colors and backgrounds for light/dark modes
  ✅ Bound chevrons and close icon colors to the theme
  ✅ Compiled local setup installer (NSIS setup .exe)
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: To deploy to your live server, SSH into CyberPanel and run:
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
