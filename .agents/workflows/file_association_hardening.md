---
description: Register file associations, add right-click context menu "Edit with I Love Notepad" in NSIS installer, and compile installers.
---

# Workflow: Desktop File Association & Context Menu Hardening

## Trigger
User types: `/file_association_hardening`

This workflow runs autonomously to configure OS file associations (`.txt`, `.md`, `.html`, `.htm`, `.json`) and implement the right-click explorer context menu handler using NSIS custom macros.

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
   git branch "backup_file_associations_$timestamp"
   ```
   Log backup details to `build_log.md`.

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_file_association.md`
- Audits the startup arg parsing inside `main.js` and builder targets inside `package.json`.
- Creates a status overview and writes it to `production_artifacts/file_association_analysis_report.md`.

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_file_association.md`
- Creates a detailed step-by-step implementation plan.
- Saves it to `production_artifacts/build_plan.md`.

### Step 3 — Phase 1: Builder File Association Configuration
- Add file formats (`.txt`, `.md`, `.html`, `.htm`, `.json`) under `"build.fileAssociations"` inside `notepad-win/package.json`.

### Step 4 — Phase 2: NSIS Right-Click Context Menu Scripting
- Create `notepad-win/build/installer.nsh` and add custom install/uninstall macros to write/delete the `"Edit with I Love Notepad"` registry key inside `HKCU\Software\Classes\*\shell`.

### Step 5 — Phase 3: Dev Verification & Packaging
- Run renderer and electron build scripts inside `notepad-win` to compile and output installers.
- Commit all changes and push to GitHub.

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Desktop File Association Hardening — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: File Associations Configured & Context Menu Registry Keys Wired
Files modified:
  - notepad-win/package.json
  - notepad-win/build/installer.nsh

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Registered .txt, .md, .html, .htm, and .json associations in package.json
  ✅ Implemented UAC-safe custom registry installer script in installer.nsh
  ✅ Compiled renderer and main electron-builder installers successfully
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: Double-click a file inside File Explorer post-installation to test opening.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
