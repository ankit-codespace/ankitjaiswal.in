---
description: Run the production fix autonomous workflow for ILoveNotepad web and desktop app
---

# Workflow: ILoveNotepad Production Fix

## Trigger

User types: `/ilovenotepad_production_fix`

This workflow runs completely autonomously from trigger to final summary.
No user input required. No permission requests. No stopping mid-loop.

---

## What This Fixes

| Phase | Target | Goal |
|-------|--------|------|
| 1 | Web Notepad Tool | Fix navbar overlap + fix slow load |
| 2 | Windows Electron App | Strip Electron branding + add custom icon |
| 3 | Windows Electron App | Reduce size (~70MB → as lean as possible) + fix white screen |
| 4 | Web Notepad Tool | Replace external favicon with local file |
| 5 | Both | Final audit + shipping checklist |

---

## Pre-Flight Setup

Before anything else, create the output folder structure:

```
mkdir production_artifacts/
mkdir production_artifacts/phase_audits/
```

Initialize `production_artifacts/build_log.md`:

```markdown
# ILoveNotepad Production Fix — Build Log
Started: [timestamp]
Agent: ILoveNotepad Production Engineer
Project: ILoveNotepad (Web + Windows Electron App)

## Log Entries
```

---

## Execution Order (Do Not Deviate)

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_ilovenotepad.md`

Complete the full analysis skill from top to bottom.
Do not skip any analysis step — the plan depends on it.
Log: `[ANALYSIS STARTED] — [timestamp]`
On completion log: `[ANALYSIS COMPLETE] — [timestamp]`

---

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_ilovenotepad.md`

Read the analysis report first.
Build the plan from the actual findings.
Save to `production_artifacts/build_plan.md`
Log: `[PLAN SAVED] — [timestamp]`

---

### Step 3 — Execute Phase 1: Web Navbar + Load Speed

Follow the execute loop from `.agents/skills/execute_phase.md`

Run every sub-step in Phase 1 from `build_plan.md`:
- 1.1 through 1.14
- Self-audit after each sub-step
- Log each one

On phase completion:
- Write `production_artifacts/phase_audits/phase1_audit.md`
- Log: `[PHASE 1 COMPLETE] — [timestamp]`

---

### Step 4 — Execute Phase 2: Electron Icon + Branding

Follow the execute loop.

Run every sub-step in Phase 2:
- 2.1 through 2.14
- Self-audit after each sub-step
- Log each one

Key actions in this phase:
- Copy icon from: `C:\Users\LENOVO-PC\Downloads\ilovenotepad_store_assets_backup\ilovenotepad_logo_premium.png`
- Place it in the project's build/icons folder
- Generate .ico from the PNG (multi-resolution)
- Update BrowserWindow icon property
- Update electron-builder icon config
- Kill every "Electron" string in visible contexts

On phase completion:
- Write `production_artifacts/phase_audits/phase2_audit.md`
- Log: `[PHASE 2 COMPLETE] — [timestamp]`

---

### Step 5 — Execute Phase 3: Size Reduction + White Screen Fix

Follow the execute loop.

Run every sub-step in Phase 3:
- 3.1 through 3.17
- Self-audit after each sub-step
- Log each one

Key actions in this phase:
- Audit and clean up dependencies
- Exclude non-essential files from the build package
- Implement ready-to-show pattern in main.js
- Set backgroundColor on BrowserWindow
- Disable source maps in production renderer
- Disable devTools in production

On phase completion:
- Write `production_artifacts/phase_audits/phase3_audit.md`
- Log: `[PHASE 3 COMPLETE] — [timestamp]`

---

### Step 6 — Execute Phase 4: Web Favicon Replacement

Follow the execute loop.

Run every sub-step in Phase 4:
- 4.1 through 4.9
- Self-audit after each sub-step
- Log each one

Key actions in this phase:
- Copy icon to web project's public/icons/ folder
- Replace the external favicon URL with the local path
- Scope the change to the Notepad route only
- Update web manifest if needed

On phase completion:
- Write `production_artifacts/phase_audits/phase4_audit.md`
- Log: `[PHASE 4 COMPLETE] — [timestamp]`

---

### Step 7 — Execute Phase 5: Final Review

Run every sub-step in Phase 5:
- 5.1 through 5.9
- No sub-steps skipped

Write the shipping checklist to `production_artifacts/build_plan.md` (append at bottom)

Log: `[ALL PHASES COMPLETE] — [timestamp]`

---

## Final Output to User

After Phase 5 completes, deliver this summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ILoveNotepad — All 4 Phases Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1 — Web Navbar + Load Speed
  ✅ Navbar overlap: fixed (describe root cause and fix)
  ✅ Load speed: improved (describe what was done)

Phase 2 — Electron Branding + Icon
  ✅ Custom icon set on: taskbar, BrowserWindow, installer
  ✅ Electron branding removed from: [list locations]

Phase 3 — Size + Launch Speed
  ✅ Estimated size reduction: [X MB]
  ✅ White screen: fixed with ready-to-show + backgroundColor
  ✅ Additional improvements: [list bonus fixes]

Phase 4 — Web Favicon
  ✅ Favicon replaced with local file on Notepad route
  ✅ No other pages affected

Bonus Fixes Applied:
  [list any proactive improvements made]

Files Modified:
  [complete list]

Logs:
  production_artifacts/build_log.md
  production_artifacts/phase_audits/phase1_audit.md
  production_artifacts/phase_audits/phase2_audit.md
  production_artifacts/phase_audits/phase3_audit.md
  production_artifacts/phase_audits/phase4_audit.md

Next steps:
  → Rebuild Electron app: npm run build or electron-builder
  → Test web: check notepad route for navbar and favicon
  → Submit Windows app to Microsoft Store when ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Loop Safety Rules

- If a step fails: log the failure, attempt a fix, continue
- If a file is not found: log it, search for it using project tree, update the plan, continue
- If an unexpected project structure is found: adapt the plan to match reality, log the adaptation
- Never halt for user input unless the project structure is so different that proceeding would cause data loss

The loop runs until the final summary is delivered.
