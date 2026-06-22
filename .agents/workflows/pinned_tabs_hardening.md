---
description: Register premium theme-aware tab colors, clean up pinned tab layouts, assign category color to Pin icons, and build installers.
---

# Workflow: Pinned Tab & Theme Color Hardening

## Trigger
User types: `/pinned_tabs_hardening`

This workflow runs autonomously to implement theme-aware color categories (soft, rich dark/light shades), remove the distracting top-right corner dot on pinned tabs, and style the pin icon with the category color.

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
   git branch "backup_pinned_tabs_$timestamp"
   ```
   Log backup details to `build_log.md`.

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_pinned_tabs.md`
- Audits tab rendering loops, layout tensions, and category colors.
- Writes findings to `production_artifacts/pinned_tabs_analysis_report.md`.

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_pinned_tabs.md`
- Creates a detailed step-by-step implementation plan.
- Saves it to `production_artifacts/build_plan.md`.

### Step 3 — Phase 1: Theme-Aware Category Colors
- Update `TAB_COLORS` mapping in `App.tsx` and `notepad.tsx` with dedicated `darkValue` and `lightValue` hex codes.
- Map active border stroke (`activeTabStroke`) to fetch theme-based category values.

### Step 4 — Phase 2: Pinned Tab Layout Clean-up
- Edit the pinned tab rendering blocks in both files.
- Delete the absolute positioned top-right dot `div`.
- Set the `Pin` icon color to match the category color.

### Step 5 — Phase 3: Indicators and Picker Alignment
- Update unpinned tab dot indicators and context menu color circles to render theme-based category colors.

### Step 6 — Phase 4: Dev Verification & Compilation
- Run `npm run build` inside website root.
- Run renderer and desktop installer build scripts inside `notepad-win` root.
- Commit all changes and push to GitHub.

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pinned Tab & Color Hardening — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Pinned Tabs Cleaned & Premium Category Colors Configured
Files modified:
  - notepad-win/src/renderer/src/App.tsx
  - artifacts/website/src/pages/tools/notepad.tsx

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Refactored category colors to use premium dark/light hex codes
  ✅ Removed distracting floating dots from pinned tabs
  ✅ Wired category color directly onto Pin icons for visual hierarchy
  ✅ Updated unpinned tab indicators and context menu picker options
  ✅ Compiled web and desktop targets successfully
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: To deploy to your live website, SSH into CyberPanel and run:
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
