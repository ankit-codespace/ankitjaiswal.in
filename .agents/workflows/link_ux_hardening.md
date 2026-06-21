---
description: Harden link selections, prevent note state leakage, decouple popover focus check in shouldShow, and remove window.prompt.
---

# Workflow: Link UX & Selection Hardening

## Trigger
User types: `/link_ux_hardening`

This workflow runs autonomously to resolve link selection issues, note switching popover leakage, focus-decoupling conflicts, and packaging/compilation safety checks.

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
   git branch "backup_link_ux_$timestamp"
   ```
   Log backup details to `build_log.md`.

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_link_ux.md`
- Audits the link configuration, CSS link styling, selection events, and toolbar triggers in `App.tsx` and `notepad.tsx`.
- Creates a status overview and writes it to `production_artifacts/link_ux_analysis_report.md`.

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_link_ux.md`
- Creates a detailed step-by-step implementation plan.
- Saves it to `production_artifacts/build_plan.md`.

### Step 3 — Phase 1: CSS Selection Bypass
- Inject `.ProseMirror a { pointer-events: none; }` to both `artifacts/website/src/index.css` and `notepad-win/src/renderer/src/index.css`.

### Step 4 — Phase 2: Web Note-Switching State Isolation
- Add a `useEffect` hook in `notepad.tsx` listening to `activeId` to reset the link popover states when notes change.

### Step 5 — Phase 3: Desktop Note-Switching State Isolation
- Add a `useEffect` hook in `App.tsx` listening to `activeId` to reset the link popover states.

### Step 6 — Phase 4: Decoupled Focus BubbleMenu (Web)
- Update the `shouldShow` callback on `<BubbleMenu>` in `notepad.tsx` to handle Tippy input focus correctly.
- Update `insertLink()` to refocus the editor view before opening the popover.

### Step 7 — Phase 5: Decoupled Focus BubbleMenu (Desktop)
- Apply the same focus-decoupled `shouldShow` and editor refocus logic to `App.tsx` on the desktop shell.

### Step 8 — Phase 6: Dev Verification & Packaging
- Run `npm run build` to verify the web client compiles successfully.
- Run `npm run build:renderer` inside `notepad-win` to compile the desktop renderer.
- Commit all changes to the repository and push to GitHub.

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Link UX & Selection Hardening — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Link Selection Fixed, Note State Isolation Injected, and Focus Decoupled
Files modified:
  - notepad-win/src/renderer/src/App.tsx
  - notepad-win/src/renderer/src/index.css
  - artifacts/website/src/pages/tools/notepad.tsx
  - artifacts/website/src/index.css

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Added ProseMirror anchor pointer bypass style to make links selectable
  ✅ Implemented note-switching activeId state resets to prevent leakage
  ✅ Implemented focus-decoupling check in BubbleMenu shouldShow
  ✅ Wired toolbar insertLink button to refocus editor prior to popover mount
  ✅ Compiled web and desktop bundles successfully
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: To deploy to your live website, SSH into CyberPanel and run:
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
