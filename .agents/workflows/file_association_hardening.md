---
description: Register file associations, add right-click context menu "Edit with I Love Notepad" in NSIS installer, and compile installers.
---

# Workflow: Desktop File Association & Context Menu Hardening

## Trigger
User types: `/file_association_hardening`

This workflow runs autonomously to configure OS file associations (`.txt`, `.md`, `.html`, `.htm`, `.json`), implement the right-click explorer context menu handler using NSIS custom macros, and add file size/binary loading safety filters with interactive user education.

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
- Audits startup args, package.json builder configs, and binary file import issues.
- Creates report at `production_artifacts/file_association_analysis_report.md`.

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_file_association.md`
- Creates a detailed step-by-step implementation plan.
- Saves it to `production_artifacts/build_plan.md`.

### Step 3 — Phase 1: Builder File Association Configuration
- Add file formats (`.txt`, `.md`, `.html`, `.htm`, `.json`) under `"build.fileAssociations"` inside `notepad-win/package.json`.

### Step 4 — Phase 2: Main Process File size and Binary filtering
- Open `notepad-win/src/main/main.js`.
- Add size limit check (> 1.5MB) and null-byte/PDF binary checks in `openFileInWindow` and the `native-open-file` handler.
- If invalid, return an error payload `{ error: "unsupported", reason }` rather than reading raw data or throwing raw system errors.

### Step 5 — Phase 3: LocalStorage Sanitization & Recovery
- Open `notepad-win/src/renderer/src/App.tsx` and `artifacts/website/src/pages/tools/notepad.tsx`.
- Declare `sanitizeDocContent` to catch corrupt binary contents or files > 1.5MB length.
- Map and sanitize docs inside `loadDocs()` on application boot.

### Step 6 — Phase 4: Renderer Error Interception & Educational Modal
- Wire renderer `onOpenFile` and `handleOpenNativeFile` to handle `{ error: "unsupported" }` payloads.
- State-map to `unsupportedFile`.
- Inject a beautifully styled interactive Warning Modal explaining the difference between display formats (PDF) and editable documents (Markdown/HTML), preventing workspace cluttering.

### Step 7 — Phase 5: NSIS Right-Click Context Menu Scripting
- Create `notepad-win/build/installer.nsh` and add custom install/uninstall macros to write/delete the `"Edit with I Love Notepad"` registry key inside `HKCU\Software\Classes\*\shell`.

### Step 8 — Phase 6: Dev Verification & Packaging
- Run renderer and electron build scripts inside `notepad-win` to compile and output installers.
- Commit all changes and push to GitHub.

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Desktop File Association Hardening — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: File Associations Configured, Sizing Safety & Warning Modal Wired
Files modified:
  - notepad-win/package.json
  - notepad-win/src/main/main.js
  - notepad-win/src/renderer/src/App.tsx
  - artifacts/website/src/pages/tools/notepad.tsx
  - notepad-win/build/installer.nsh

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Registered .txt, .md, .html, .htm, and .json associations in package.json
  ✅ Implemented Early Main Process size limit (1.5MB) and Binary File Blockers
  ✅ Added startup localStorage recovery sanitizer to prevent black-screen crash loops
  ✅ Rendered premium Educational Warning Modal in React for PDF/unsupported uploads
  ✅ Implemented UAC-safe custom registry installer script in installer.nsh
  ✅ Compiled renderer and main electron-builder installers successfully
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: Double-click a file inside File Explorer post-installation to test opening.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
