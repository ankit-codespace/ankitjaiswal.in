---
description: Register ruler lines settings configuration, add UI controls in settings panel, support light/dark theme opacity, and compile builds.
---

# Workflow: Notebook Ruler Line Customization & Hardening

## Trigger
User types: `/ruler_lines_hardening`

This workflow runs autonomously to implement customizable background ruler lines (Faint, Normal, Distinct) in both the web and desktop clients, adding custom CSS variable opacity hooks and settings controls.

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
   git branch "backup_ruler_opacity_$timestamp"
   ```
   Log backup details to `build_log.md`.

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_ruler_lines.md`
- Audits the repeating linear gradient lines inside CSS stylesheets and settings state interfaces.
- Writes findings to `production_artifacts/ruler_lines_analysis_report.md`.

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_ruler_lines.md`
- Creates a detailed step-by-step implementation plan.
- Saves it to `production_artifacts/build_plan.md`.

### Step 3 — Phase 1: CSS Linear Gradient Upgrades
- Update `.notepad-ruled` and `.surface-light .notepad-ruled` definitions in `index.css` (and website stylesheet if separate) to use the `--np-ruler-opacity` and `--np-ruler-opacity-light` custom variables.

### Step 4 — Phase 2: Interface Expansion & Style Injection
- Add `rulerOpacity` to `NotepadSettings` interfaces and `DEFAULT_SETTINGS` in both `App.tsx` and `notepad.tsx`.
- Modify `editorInnerStyle` styling block in both files to dynamically compute and inject the custom CSS variables into the container element inline style property.

### Step 5 — Phase 3: Settings Panel UI controls
- Inject the conditional "Line Opacity" toggles container inside the Settings modal component structure.
- Wire buttons to call `updateSetting("rulerOpacity", val)` for Faint, Normal, and Distinct states.

### Step 6 — Phase 4: Dev Verification & Compilation
- Run `npm run build` inside website root.
- Run renderer and desktop installer build scripts inside `notepad-win` root.
- Commit all changes and push to GitHub.

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ruler Line Hardening — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Ruler Line Opacity Setting Configured & UI Controls Integrated
Files modified:
  - notepad-win/src/renderer/src/index.css
  - notepad-win/src/renderer/src/App.tsx
  - artifacts/website/src/pages/tools/notepad.tsx

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Refactored CSS background-image linear gradient to use custom properties
  ✅ Integrated rulerOpacity property into NotepadSettings interfaces and defaults
  ✅ Setup inline style bindings to reactive CSS variables in editorInnerStyle
  ✅ Added conditional Line Opacity controls in the Settings Modal panel
  ✅ Compiled web and desktop targets successfully
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: To deploy to your live website, SSH into CyberPanel and run:
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
