---
description: Upgrades the web Notepad tool with features ported from the Windows desktop app version
---

# Workflow: /notepad_upgrade

## Trigger

User types: `/notepad_upgrade`

## What This Does

Runs the full pipeline — analyze both versions, backup, plan, execute, audit — with zero user input required after the trigger. The agent handles everything.

---

## Pipeline

### STEP 1 — Initialize

1. Read `.agents/agents.md` — load persona and rules
2. Create `production_artifacts/` directory if it does not exist
3. Create `production_artifacts/analysis/` subdirectory
4. Create `build_log.md` with header:
   ```
   # Notepad Web Upgrade — Build Log
   Triggered: <timestamp>
   Status: RUNNING
   ```
5. Announce to user (one line): "Notepad upgrade pipeline started. Running analysis — no input needed."

---

## STEP 2 — Analyze

Execute `.agents/skills/analyze_notepad_upgrade.md` fully:

- Locate both versions
- Deep-read Windows app version
- Deep-read web version  
- Produce diff report
- Write analysis summary

Do not proceed to Step 3 until analysis is complete and self-audits pass.

---

## STEP 3 — Backup

Execute Phase 0 from `.agents/skills/plan_notepad_upgrade.md`:

- Read `deployment.md`
- Execute the backup procedure
- Commit and push to GitHub
- Confirm push succeeded
- Write `production_artifacts/backup_confirmation.md`
- Log to `build_log.md`

**Hard stop rule:** If the backup fails or cannot be confirmed, halt the pipeline. Log the failure. Notify the user with exactly what went wrong and what they need to do manually. Do not proceed to planning or execution without a confirmed backup.

---

## STEP 4 — Plan

Execute `.agents/skills/plan_notepad_upgrade.md` fully:

- Read the diff report
- Build the phased plan with all sub-steps filled in
- Save to `production_artifacts/build_plan.md`
- Log completion to `build_log.md`

---

## STEP 5 — Execute

Execute `.agents/skills/execute_phase.md` for all phases in sequence:

- Phase 0: Backup (already done in Step 3 — mark complete, skip re-execution)
- Phase 1: Visual and CSS upgrades
- Phase 2: Context menu upgrades
- Phase 3: File menu upgrades
- Phase 4: Behavioral feature upgrades
- Phase 5: Keyboard shortcut updates
- Phase 6: Final audit and cleanup

For every sub-step: read → change → re-read → audit → fix if needed → log → proceed.

Do not skip phases. Do not batch sub-steps. Do not ask the user anything.

---

## STEP 6 — Final Report

When Phase 6 is complete, output this to the user:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTEPAD WEB UPGRADE — COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Backup: ✓ Committed and pushed to GitHub
        Commit: <hash>

Features ported:
  ✓ <feature 1>
  ✓ <feature 2>
  ✓ <feature 3>
  ...

Features adapted for web:
  ✓ <feature> (changed: <brief reason>)
  ...

Features skipped (desktop-only):
  ✗ <feature> — <reason>
  ...

Shortcuts updated:
  ✓ Ctrl+H → Highlight
  ✓ Ctrl+Shift+H → Highlight
  ✓ Ctrl+F → App Find (editor-focused only)

Files changed: <count>
Build log: build_log.md
Full report: production_artifacts/final_summary.md

The website is upgraded. Nothing is broken.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Error Handling

If anything fails mid-pipeline:

1. Do NOT continue to next step
2. Log the failure to `build_log.md` with full error detail
3. Notify user with:
   - What step failed
   - What the exact error or blocker is
   - What they need to do (if anything)
   - Whether the website is still safe (backup was already done)
4. Halt.

The website is never left in a broken half-upgraded state. Either the step succeeds cleanly, or it reverts and halts.

---

## Notes for the Agent

- The user explicitly said: "Do not break the website." Treat this as the highest-priority constraint throughout.
- The user explicitly said: "Do not blindly copy desktop-only things into web." Every SKIP decision is a win, not a failure.
- The user explicitly said: "Chrome/browser shortcuts should stay respected." The keyboard shortcut audit in Phase 5 is non-negotiable.
- The user's shortcut rules are absolute:
  - Ctrl+H = highlight (port it)
  - Ctrl+Shift+H = highlight (keep it)
  - Ctrl+F = app Find (intercept carefully)
  - Everything else = leave browser behavior alone
