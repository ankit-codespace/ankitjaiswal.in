---
description: Harden keyboard shortcuts in the web portfolio notepad to resolve browser key collisions, compile the site, verify correctness, and deploy to live site.
---

# Workflow: Keyboard Shortcuts Hardening

## Trigger
User types: `/shortcuts_hardening`

This workflow runs completely autonomously to resolve native browser keyboard shortcut collisions in the web-based portfolio notepad, provides a premium, conflict-free typing experience, performs safety backups, and deploys changes to the live server.

---

## What This Resolves
This workflow implements a professional, dual-mode keyboard shortcuts architecture:
- Detects the environment (Web Browser vs. Electron Desktop Shell).
- Preserves native, standard operating system shortcuts in the Windows desktop app (Electron).
- Remaps conflicting browser-native shortcuts on the web portfolio (e.g. History tab conflicts on `Ctrl+H`, Bookmarks bar toggles on `Ctrl+Shift+B`, browser tab switches on `Ctrl+Tab`, and double-zoom conflicts on page scale keys).
- Adds the missing `Ctrl+Shift+T` key binding to the web version keydown listener.
- Updates bulk tab close operations to preserve closed documents in history for both Web and Electron.
- Dynamically displays environment-specific hotkeys in the Keyboard Shortcuts Modal cheatsheet.
- Verifies compilation and browser-compatibility of the web application.
- Pushes code to GitHub and provides server pull commands.

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
     git branch "backup_shortcuts_$timestamp"
     ```
   - Log backup details to `build_log.md`.

Initialize `build_log.md`:
```markdown
# Keyboard Shortcuts Hardening — Build Log
Triggered: [timestamp]
Status: RUNNING

## Log Entries
[PRE-FLIGHT BACKUP] Created backup branch backup_shortcuts_[timestamp]
[WORKFLOW STARTED] [timestamp]
```

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_shortcuts.md`
- Audits keyboard shortcut listeners, cheatsheet bindings, and bulk tab deletion behaviors in `notepad.tsx` and `App.tsx`.
- Create a status overview and write it to `production_artifacts/shortcuts_analysis_report.md`.
- Log: `[ANALYSIS COMPLETE] [timestamp]`

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_shortcuts.md`
- Create a detailed step-by-step implementation plan.
- Save it to `production_artifacts/build_plan.md`.
- Log: `[PLAN COMPLETE] [timestamp]`

### Step 3 — Phase 1: Environment Detection
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Define the environment check helpers in `notepad.tsx` and verify references.
- Wrote `production_artifacts/phase_audits/phase1_audit.md`.
- Log: `[PHASE 1 COMPLETE] [timestamp]`

### Step 4 — Phase 2: Web-Compatible Key Listeners & Web Restore Shortcut
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Update keyboard event listeners in `notepad.tsx` to handle browser-safe remapped shortcuts, add `Ctrl+Shift+T` key binding to trigger undo, and guard zoom shortcuts.
- Wrote `production_artifacts/phase_audits/phase2_audit.md`.
- Log: `[PHASE 2 COMPLETE] [timestamp]`

### Step 5 — Phase 3: Bulk-Close Data Preservation
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Update bulk tab close functions (`closeOtherDocs` and `closeDocsToTheRight`) in both `App.tsx` and `notepad.tsx` to save closed documents to history before modifying state.
- Wrote `production_artifacts/phase_audits/phase3_audit.md`.
- Log: `[PHASE 3 COMPLETE] [timestamp]`

### Step 6 — Phase 4: Dynamic Cheatsheet Modal & Building
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Refactor the Keyboard Shortcuts modal in `notepad.tsx` to show remapped keys on the Web, and original keys in Electron.
- Compile the website bundle using `npm run build` or `vite build` in the website folder.
- Confirm compilation and verify there are no type errors.
- Wrote `production_artifacts/phase_audits/phase4_audit.md`.
- Update `build_log.md` status to `SUCCESS`.
- Update changelog files under `_changelog/`.
- Log: `[PHASE 4 COMPLETE] [timestamp]`

### Step 7 — Phase 5: Production Deployment
Follow the DEPLOYMENT.md protocol:
- Run:
  ```powershell
  git add .
  git commit -m "feat(notepad): harden keyboard shortcuts on web, implement Ctrl+Shift+T, and preserve bulk close tab history"
  git push origin main
  ```
- Log: `[DEPLOYMENT COMPLETE] [timestamp]`
- Log: `[WORKFLOW COMPLETE] [timestamp]`

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Keyboard Shortcuts Hardening — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Web Notepad Keyboard Shortcuts Interceptor Hardened & Pushed to GitHub
Files modified:
  - artifacts/website/src/pages/tools/notepad.tsx
  - notepad-win/src/renderer/src/App.tsx

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Added isElectron check to separate web and desktop shells
  ✅ Remapped conflicting document hotkeys (Ctrl+Alt+N, Ctrl+Alt+W) on Web
  ✅ Remapped conflicting formatting hotkeys (Ctrl+Shift+H, Ctrl+Shift+Q, Ctrl+Alt+E)
  ✅ Implemented Ctrl+Shift+T web shortcut to restore closed notes from undo stack
  ✅ Preserved tab data in history/undo for bulk close actions on both Web and Electron
  ✅ Removed web keydown listener for zoom keys to allow native browser zoom
  ✅ Dynamically rendered the shortcuts cheatsheet based on active environment
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: To deploy to your live server, SSH into CyberPanel and run:
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
