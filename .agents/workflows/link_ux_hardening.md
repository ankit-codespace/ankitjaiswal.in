---
description: Harden link selections, disable browser clicks, add custom Tippy.js Link BubbleMenus for tooltips, and remove window.prompt.
---

# Workflow: Link UX & Selection Hardening

## Trigger
User types: `/link_ux_hardening`

This workflow runs completely autonomously to resolve link selection bugs (including shift-clicking and click cursor placement inside links), replaces outdated blocky `window.prompt` dialogs with modern inline popover menus, builds installers, and deploys.

---

## What This Resolves
This workflow implements a premium, SaaS-standard link editing and selection system:
- **Selection Fix**: Injects CSS pointer bypass (`pointer-events: none` inside ProseMirror) to restore normal click positioning and Shift-selection over link marks.
- **Link Tooltip Menu**: Adds a custom floating `<BubbleMenu>` for active link selections, rendering a clean tooltip containing the target link URL, an "Edit" button, and an "Unlink" action.
- **Modern Inline Input Popover**: Replaces the browser's blocky `window.prompt` dialog with an elegant inline input card triggered by toolbar clicks or `Ctrl + K`.
- **Packaging & Builds**: Verifies correct rendering on web and desktop shells.
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
     git branch "backup_link_ux_$timestamp"
     ```
   - Log backup details to `build_log.md`.

Initialize `build_log.md`:
```markdown
# Link UX & Selection Hardening — Build Log
Triggered: [timestamp]
Status: RUNNING

## Log Entries
[PRE-FLIGHT BACKUP] Created backup branch backup_link_ux_[timestamp]
[WORKFLOW STARTED] [timestamp]
```

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_link_ux.md`
- Audits the link configuration, CSS link styling, selection events, and toolbar triggers in `App.tsx` and `notepad.tsx`.
- Create a status overview and write it to `production_artifacts/link_ux_analysis_report.md`.
- Log: `[ANALYSIS COMPLETE] [timestamp]`

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_link_ux.md`
- Create a detailed step-by-step implementation plan.
- Save it to `production_artifacts/build_plan.md`.
- Log: `[PLAN COMPLETE] [timestamp]`

### Step 3 — Phase 1: CSS Selection Bypass
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Inject pointer events bypass to editor stylesheet files (`index.css` files).
- Wrote `production_artifacts/phase_audits/phase1_audit.md`.
- Log: `[PHASE 1 COMPLETE] [timestamp]`

### Step 4 — Phase 2: Floating Tooltip BubbleMenu (Desktop)
Follow the execute loop from `.agents/skills/execute_phase.md`.
- In `App.tsx`, implement the secondary `<BubbleMenu>` for active link nodes.
- Wrote `production_artifacts/phase_audits/phase2_audit.md`.
- Log: `[PHASE 2 COMPLETE] [timestamp]`

### Step 5 — Phase 3: Floating Tooltip BubbleMenu (Web)
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Import `BubbleMenu` and inject it for links in `notepad.tsx`.
- Wrote `production_artifacts/phase_audits/phase3_audit.md`.
- Log: `[PHASE 3 COMPLETE] [timestamp]`

### Step 6 — Phase 4: Modern Popover Link Input & Ctrl+K
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Update `insertLink` toolbar clicks and `Ctrl + K` global listeners to control popover input state, removing `window.prompt()`.
- Wrote `production_artifacts/phase_audits/phase4_audit.md`.
- Log: `[PHASE 4 COMPLETE] [timestamp]`

### Step 7 — Phase 5: Verification & Deployment
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Compile desktop app using `npm run build:renderer`.
- Compile website using `npm run build`.
- Generate NSIS setup installer.
- Update `build_log.md` status to `SUCCESS`.
- Update changelog files under `_changelog/`.
- Log: `[PHASE 5 COMPLETE] [timestamp]`
- Follow the DEPLOYMENT.md protocol to push to GitHub:
  ```powershell
  git add .
  git commit -m "feat(notepad): resolve link selection selection bugs and add custom popover link editor"
  git push origin main
  ```
- Log: `[DEPLOYMENT COMPLETE] [timestamp]`
- Log: `[WORKFLOW COMPLETE] [timestamp]`

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Link UX & Selection Hardening — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Link Selection Fixed, Inline Editors Injected & Pushed to GitHub
Files modified:
  - notepad-win/src/renderer/src/App.tsx
  - notepad-win/src/renderer/src/index.css
  - artifacts/website/src/pages/tools/notepad.tsx
  - artifacts/website/src/index.css

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Added ProseMirror anchor pointer bypass style to make links selectable
  ✅ Implemented floating Tippy.js Link BubbleMenus for active links
  ✅ Replaced primitive window.prompt dialogs with inline edit popovers
  ✅ Wired Ctrl+K and toolbar buttons to focus inline popovers
  ✅ Compiled local setup installer (NSIS setup .exe)
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: To deploy to your live server, SSH into CyberPanel and run:
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
