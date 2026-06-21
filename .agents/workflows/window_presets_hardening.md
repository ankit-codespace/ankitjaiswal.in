---
description: Register IPC resize handlers, expose preload method, add Window Size options in File Menu, and build/verify desktop app.
---

# Workflow: Desktop Window Preset Layout Sizing

## Trigger
User types: `/window_presets_hardening`

This workflow runs autonomously to implement predefined window sizes (Compact, Standard, Expanded) in the desktop application, enabling users to calibrate window sizes with two clicks.

---

## Pre-Flight Setup & Backup
1. Initialize/clean `build_log.md` and directories:
   ```powershell
   New-Item -ItemType Directory -Force -Path production_artifacts/phase_audits/
   ```
2. **Safe Backup Protocol**:
   Create a safety backup branch:
   ```powershell
   $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
   git branch "backup_window_presets_$timestamp"
   ```
   Log backup details to `build_log.md`.

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_window_presets.md`
- Audits the Electron resize APIs and custom File Menu layout.
- Writes findings to `production_artifacts/window_presets_analysis_report.md`.

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_window_presets.md`
- Creates a detailed step-by-step implementation plan.
- Saves it to `production_artifacts/build_plan.md`.

### Step 3 — Phase 1: IPC Sizing Setup in Main and Preload
- Add the `set-window-size` IPC handler in `notepad-win/src/main/main.js` to unmaximize, resize, and center the window.
- Add `setWindowSize` to the context bridge in `notepad-win/src/main/preload.js`.

### Step 4 — Phase 2: Add Preset Controls in File Menu
- Inject the "Window Size" buttons container in the File Menu dropdown in `App.tsx`.
- Wire buttons to call `window.electronAPI.setWindowSize` for Compact (380x600), Standard (800x600), and Expanded (1200x800).

### Step 5 — Phase 3: Dev Verification & Compilation
- Run `npm run build` inside `notepad-win` to compile the renderer and package the installers.
- Commit all changes and push to GitHub.

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Desktop Window Sizing Presets — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: IPC Resize Handlers Wired & Sizing Presets Integrated into File Menu
Files modified:
  - notepad-win/src/main/main.js
  - notepad-win/src/main/preload.js
  - notepad-win/src/renderer/src/App.tsx

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Added main process unmaximize/resize/centering IPC handler
  ✅ Exposed setWindowSize in preload contextBridge
  ✅ Added Compact, Standard, and Expanded layout options under the File Menu dropdown
  ✅ Compiled renderer and main electron-builder installers successfully
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: Re-install the updated local package to test the sizing options.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
