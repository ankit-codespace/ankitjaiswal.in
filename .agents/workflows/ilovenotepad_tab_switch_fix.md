---
description: Run the tab switch scroll stabilization and visual stutter hardening workflow
---

# Workflow: ILoveNotepad Tab Switch Scroll Stabilization

## Trigger
User types: `/ilovenotepad_tab_switch_fix`

This workflow runs completely autonomously from trigger to final summary.
No user input required. No permission requests. No stopping mid-loop.

---

## What This Fixes
This workflow resolves the browser repaint latency and layout-driven scroll jitter that occurs when switching note tabs:
- Bypasses delayed asynchronous timers (`setTimeout`) during content swaps.
- Synchronously updates content and scroll offsets in the same task frame to prevent visual "flashes at the top" before jumping.
- Protects the scroll position data store from capturing transient scroll events during document focus adjustments.

---

## Pre-Flight Setup
Create the artifacts directories and clean/initialize `production_artifacts/build_log.md`:

```bash
mkdir -p production_artifacts/phase_audits/
```

Initialize `production_artifacts/build_log.md`:
```markdown
# ILoveNotepad Tab Switch Scroll Hardening — Build Log
Triggered: [timestamp]
Status: RUNNING

Known issues to address:
- Viewport scroll jumping and flashing on tab switch
- Timeouts delaying scroll position restoration

## Log Entries
[WORKFLOW STARTED] [timestamp]
```

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_tab_switch.md`
- Inspect `App.tsx` tab sync and scroll restoration code.
- Write findings to `production_artifacts/ux_analysis_report.md`.
- Log: `[ANALYSIS COMPLETE] [timestamp]`

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_tab_switch.md`
- Draft a phased stabilization plan.
- Save the plan to `production_artifacts/build_plan.md`.
- Log: `[PLAN COMPLETE] [timestamp]`

### Step 3 — Phase 1: Synchronous Content and Scroll Restoration
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Run all Phase 1 sub-steps in `build_plan.md`.
- Wrote `production_artifacts/phase_audits/phase1_audit.md`.
- Log: `[PHASE 1 COMPLETE] [timestamp]`

### Step 4 — Phase 2: Secure Focus & Reflow Handling
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Run all Phase 2 sub-steps in `build_plan.md`.
- Wrote `production_artifacts/phase_audits/phase2_audit.md`.
- Log: `[PHASE 2 COMPLETE] [timestamp]`

### Step 5 — Phase 3: Build Verification & Testing
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Run all Phase 3 sub-steps in `build_plan.md`.
- Run `npm run build:renderer` to check for compilation issues.
- Wrote `production_artifacts/phase_audits/phase3_audit.md`.
- Update `build_log.md` status to `SUCCESS`.
- Log: `[PHASE 3 COMPLETE] [timestamp]`
- Log: `[WORKFLOW COMPLETE] [timestamp]`

---

## Final Output to User
Upon successful execution, present a clean summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tab Switch Scroll Hardening — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Rebuilt and Local App Updated
Files modified:
  - App.tsx (Tab sync scroll logic)

Checklist:
  ✅ Removed asynchronous timeouts in tab switches
  ✅ Synchronously aligned document updates and scroll recovery
  ✅ Locked scroll listeners during editor focus events
  ✅ Verified compiler type-safety (exit code 0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
