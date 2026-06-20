---
description: Implement the tab switch scroll stutter and dynamic tab width layout fixes, verify performance, build/install the local desktop application, and deploy to live site.
---

# Workflow: Tab Switch Scroll & Layout Fix

## Trigger
User types: `/tab_switch_fix`

This workflow runs completely autonomously to resolve scroll stutter, tab resizing layout shifts, and active tab scroll jitter when switching between tabs in the "I Love Notepad" app, performs safety backups, and deploys changes to the live server.

---

## What This Resolves
This workflow implements a professional, permanent fix for tab bar and scrolling UX:
- **Scroll Position Recovery**: Captures and stores active tab scroll coordinates immediately at the moment of a tab transition request.
- **DOM Preservation**: Keeps all open tabs mounted in the DOM using parallel containers toggled with CSS `display`, preventing page height collapse and React unmounting overhead.
- **Zero-Stutter Render**: Leverages React's `useLayoutEffect` to synchronously focus the active editor and restore scroll positions in a single paint tick before the browser draws.
- **Chrome-like Uniform Sizing**: Applies fixed tab width scaling (`flex: 0 1 150px`) so that tabs maintain a static, identical size when space is plenty, completely eliminating layout shifting animations during selection. Squeezes inactive tabs to a lower min-width than the active tab only under tight screen constraints.
- **Boundary-Checked Tab Scroll**: Replaces blind `scrollIntoView` calls with custom boundary measurements to scroll the tab strip container ONLY when the active tab is actually cut off or overflowing.
- **Bulk-Close Data Preservation**: Appends all closed tabs to `closedDocsHistory` in `App.tsx` and pushes state to `undoStackRef` in `notepad.tsx` during bulk-close actions so `Ctrl+Shift+T` can restore them.
- **Production Installer Build**: Packages and verifies the final desktop build installers.
- **Live Deployment**: Pushes code to GitHub and provides server pull commands.

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
     git branch "backup_tab_switch_$timestamp"
     ```
   - Log backup details to `build_log.md`.

Initialize `build_log.md`:
```markdown
# Tab Switch Scroll & Layout Fix — Build Log
Triggered: [timestamp]
Status: RUNNING

## Log Entries
[PRE-FLIGHT BACKUP] Created backup branch backup_tab_switch_[timestamp]
[WORKFLOW STARTED] [timestamp]
```

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_tab_switch.md`
- Audits scroll saving, editor mounting, tab width resizing, and scroll-into-view triggers in `App.tsx`.
- Create a status overview and write it to `production_artifacts/ux_analysis_report.md`.
- Log: `[ANALYSIS COMPLETE] [timestamp]`

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_tab_switch.md`
- Create a detailed step-by-step implementation plan.
- Save it to `production_artifacts/build_plan.md`.
- Log: `[PLAN COMPLETE] [timestamp]`

### Step 3 — Phase 1: Early Scroll Capture Wrapper
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Add `changeTab` wrapper to `App.tsx` and map all `setActiveId` calls.
- Wrote `production_artifacts/phase_audits/phase1_audit.md`.
- Log: `[PHASE 1 COMPLETE] [timestamp]`

### Step 4 — Phase 2: DOM Preservation & Uniform Tab Sizing
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Refactor the editor rendering blocks to mount all editors with CSS display toggles in `App.tsx`.
- Refactor tab styling in both `App.tsx` and `notepad.tsx` to apply uniform widths and padding, removing resizing jumps.
- Wrote `production_artifacts/phase_audits/phase2_audit.md`.
- Log: `[PHASE 2 COMPLETE] [timestamp]`

### Step 5 — Phase 3: Synchronous Layout Sync & Selective Scrolling
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Replace the tab switch sync hook with a `useLayoutEffect` hook.
- Remove timeouts, enabling synchronous focus and scrolling.
- Replace blind `scrollIntoView` calls with boundary checks for the tab container.
- Update bulk close operations (`closeOtherDocs` and `closeDocsToTheRight`) to preserve closed documents in history.
- Wrote `production_artifacts/phase_audits/phase3_audit.md`.
- Log: `[PHASE 3 COMPLETE] [timestamp]`

### Step 6 — Phase 4: Dev Verification & Packaging
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Complete the renderer build and package setup installers.
- Inform the user of setup execution.
- Wrote `production_artifacts/phase_audits/phase4_audit.md`.
- Update `build_log.md` status to `SUCCESS`.
- Update changelog files under `_changelog/`.
- Log: `[PHASE 4 COMPLETE] [timestamp]`

### Step 7 — Phase 5: Production Deployment
Follow the DEPLOYMENT.md protocol:
- Run:
  ```powershell
  git add .
  git commit -m "feat(notepad): resolve tab switch scroll stutter, layout jumps, and restore stack on bulk close"
  git push origin main
  ```
- Log: `[DEPLOYMENT COMPLETE] [timestamp]`
- Log: `[WORKFLOW COMPLETE] [timestamp]`

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tab Switch Scroll & Layout Fix — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Windows App Updated, Installers Generated, & Pushed to GitHub
Files modified:
  - notepad-win/src/renderer/src/App.tsx
  - artifacts/website/src/pages/tools/notepad.tsx

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Added changeTab wrapper to capture scroll state prior to state updates
  ✅ Mounted all active tabs in parallel to eliminate page height collapse
  ✅ Replaced useEffect with useLayoutEffect for synchronous scroll restoration
  ✅ Remapped tabs to uniform widths to prevent layout resizing jumps
  ✅ Restricted tab scrolling to only trigger when tab is overflowing
  ✅ Updated bulk-close operations to preserve closed documents in history
  ✅ Compiled local setup installer (NSIS setup .exe)
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: To deploy to your live server, SSH into CyberPanel and run:
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
