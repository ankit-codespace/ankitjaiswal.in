---
description: Run the AppX packaging and Microsoft Store configuration workflow for ILoveNotepad desktop app
---

# Workflow: ILoveNotepad Microsoft Store AppX Packaging

## Trigger

User types: `/ilovenotepad_msstore_appx`

This workflow runs completely autonomously from trigger to final summary.
No user input required. No permission requests. No stopping mid-loop.

---

## What This Fixes

| Phase | Target | Goal |
|-------|--------|------|
| 1 | AppX Store Assets | Generate all required store logo PNGs (50x50, 150x150, 44x44, 310x150) |
| 2 | electron-builder config | Add "appx" to builder targets and set matching identity fields |
| 3 | Package Generation | Build the .appx bundle from the desktop app source |
| 4 | Verification & Guides | Verify file integrity and create msstore_ready_checklist.md for manual upload |

---

## Pre-Flight Setup

Before anything else, create the output folder structure:

```bash
mkdir -p production_artifacts/phase_audits/
```

Initialize `production_artifacts/build_log.md`:

```markdown
# ILoveNotepad Microsoft Store AppX Packaging — Build Log
Started: [timestamp]
Agent: Microsoft Store Packaging & Deployment Engineer
Project: ILoveNotepad (Windows Desktop AppX)

## Log Entries
```

---

## Execution Order (Do Not Deviate)

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_msstore_appx.md`

Complete the full analysis skill from top to bottom.
Log: `[ANALYSIS STARTED] — [timestamp]`
On completion log: `[ANALYSIS COMPLETE] — [timestamp]`

---

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_msstore_appx.md`

Read the analysis report first.
Build the plan from actual findings.
Save to `production_artifacts/build_plan.md`
Log: `[PLAN SAVED] — [timestamp]`

---

### Step 3 — Execute Phase 1: Generate AppX Visual Assets

Follow the execute loop from `.agents/skills/execute_phase.md`

Run every sub-step in Phase 1 from `build_plan.md`:
- 1.1 through 1.5
- Self-audit after each sub-step
- Log each one

On phase completion:
- Write `production_artifacts/phase_audits/phase1_audit.md`
- Log: `[PHASE 1 COMPLETE] — [timestamp]`

---

### Step 4 — Execute Phase 2: Configure AppX in electron-builder

Follow the execute loop.

Run every sub-step in Phase 2:
- 2.1 through 2.4
- Self-audit after each sub-step
- Log each one

On phase completion:
- Write `production_artifacts/phase_audits/phase2_audit.md`
- Log: `[PHASE 2 COMPLETE] — [timestamp]`

---

### Step 5 — Execute Phase 3: Build and Package the App

Follow the execute loop.

Run every sub-step in Phase 3:
- 3.1 through 3.5
- Self-audit after each sub-step
- Log each one

On phase completion:
- Write `production_artifacts/phase_audits/phase3_audit.md`
- Log: `[PHASE 3 COMPLETE] — [timestamp]`

---

### Step 6 — Execute Phase 4: Verify Output and Create Checklist

Follow the execute loop.

Run every sub-step in Phase 4:
- 4.1 through 4.5
- Self-audit after each sub-step
- Log each one

On phase completion:
- Write `production_artifacts/phase_audits/phase4_audit.md`
- Log: `[PHASE 4 COMPLETE] — [timestamp]`

---

## Final Output to User

After Phase 4 completes, deliver this summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ILoveNotepad AppX Packaging — Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1 — AppX Visual Assets
  ✅ StoreLogo.png (50x50): generated
  ✅ Square150x150Logo.png (150x150): generated
  ✅ Square44x44Logo.png (44x44): generated
  ✅ Wide310x150Logo.png (310x150): generated

Phase 2 — Config updates
  ✅ target updated to build "appx"
  ✅ identity properties verified in package.json

Phase 3 — Build
  ✅ Package built: [file details]
  ✅ Size: [size]

Phase 4 — Submission Readiness
  ✅ Manual upload checklist: saved to production_artifacts/msstore_ready_checklist.md

Logs:
  production_artifacts/build_log.md
  production_artifacts/phase_audits/phase1_audit.md
  production_artifacts/phase_audits/phase2_audit.md
  production_artifacts/phase_audits/phase3_audit.md
  production_artifacts/phase_audits/phase4_audit.md

Next steps:
  → Follow instructions in production_artifacts/msstore_ready_checklist.md
  → Upload the generated .appx package directly to the Microsoft Partner Center
  → Microsoft will automatically sign the app for free!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Loop Safety Rules

- If a step fails: log the failure, attempt a fix, continue.
- If assets are missing: identify a source image, generate them, continue.
- Never halt for user input unless the configuration is completely missing and cannot be automatically determined.
