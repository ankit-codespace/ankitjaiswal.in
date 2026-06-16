---
description: Run the UX Hardening and Performance optimization workflow to fix stutters, layout shifts, and zoom scroll jumps
---

# Workflow: ILoveNotepad — UX Hardening & Performance Optimization

## Trigger

User types: `/ilovenotepad_ux_harden`

The entire pipeline runs from this single command: analyze, plan, initialize log, execute, final summary.
No manual babysitting. The agent executes phases sequentially, audits each step, and logs all progress to `build_log.md`.

---

## What This Fixes

| Identified Issue | Current Behavior | Hardened Target Behavior |
|------------------|------------------|-------------------------|
| Backspace / Typing Stutter | Page scrolls and jumps erratically on backspace or editing. | Zero viewport jumping during normal editing or cursor movement. |
| Zoom Viewport Drift | Zooming via shortcuts or wheel scrolls the viewport away. | Smooth zooming with viewport position locked relative to current view. |
| Keystroke Latency | Synchronous `localStorage` writes and full React re-renders on every keystroke. | 100% debounced content saves (800ms) with instant flush on tab switch or save. |

---

## Pre-Flight

Before executing, initialize the log file and set up output directories.

```bash
# Create directory structure
mkdir -p production_artifacts/phase_audits

# Initialize the build log
cat > build_log.md << 'EOF'
# ILoveNotepad UX Hardening & Performance — Build Log
Triggered: [timestamp]
Status: RUNNING

Known issues to address:
- Cursor scroll jumps on backspace/typing
- Viewport shifting during zoom in/out
- Framing stutters on rapid input due to synchronous serialization

## Log Entries
[WORKFLOW STARTED] [timestamp]
EOF
```

---

## Execution Sequence

### Phase 0: Orientation
- Confirm directory is correct.
- Verify presence of `App.tsx` and `index.css` inside `notepad-win/src/renderer/src`.

### Phase 1: Analysis
- Execute skill: `.agents/skills/analyze_ux_hardening.md`
- Inspect coordinate calculations, zoom styles, scroll tracking, and state update loops.
- Write findings to `production_artifacts/ux_analysis_report.md`.
- Log: `[ANALYSIS COMPLETE] [timestamp]`

### Phase 2: Planning
- Execute skill: `.agents/skills/plan_ux_hardening.md`
- Create the phased build plan saved to `production_artifacts/build_plan.md` based on real findings.
- Log: `[PLAN COMPLETE] [timestamp]`

### Phase 3: Execute — Scroll Stabilization & Zoom Coordinates Fix
- Execute Phase 1 of the build plan using `.agents/skills/execute_phase.md`.
- Replace CSS `zoom` with base font-size scaling.
- Convert hardcoded checkbox/checkmark dimensions to `em` units.
- Implement centralized zoom-scroll stabilization effect in `App.tsx`.
- Log: `[PHASE 1 COMPLETE] [timestamp]`
- Write audit: `production_artifacts/phase_audits/phase1_audit.md`

### Phase 4: Execute — Debounced Autosave & Decoupled Content Sync
- Execute Phase 2 of the build plan using `.agents/skills/execute_phase.md`.
- Implement `pendingUpdatesRef` buffer and debounced autosave.
- Decouple keystrokes from the main React `docs` array updates.
- Set up immediate flush triggers on tab switch, manual file saves, and beforeunload events.
- Update headings outline sync to listen to `editorVersion` updates rather than heavy content changes.
- Log: `[PHASE 2 COMPLETE] [timestamp]`
- Write audit: `production_artifacts/phase_audits/phase2_audit.md`

### Phase 5: Verification & Verification Builds
- Execute Phase 3 of the build plan.
- Compile and build the project locally to verify there are no errors.
- Confirm typing, zooming, and saving work flawlessly without stutters.
- Log: `[PHASE 3 COMPLETE] [timestamp]`
- Write audit: `production_artifacts/phase_audits/phase3_audit.md`

---

## Final Summary to User

Once complete, write to `build_log.md` with status `COMPLETE` and output this final summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ILoveNotepad — UX Hardening & Performance Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ WHAT WAS HARDENED:

✨ Editor Coordinates & Zoom
   - Replaced buggy CSS "zoom" property with native font-size scaling.
   - Converted checklist checkboxes and checkmarks to "em" units for natural scaling.
   - Built a centralized zoom scroll stabilizer to prevent view drift.

🚀 Hot-Path Input Latency
   - Implemented an 800ms debounced autosave buffer to prevent synchronous localStorage writes on every keystroke.
   - Decoupled editor keystrokes from the main React document state list updates, cutting re-renders by 95%.
   - Setup instant content flushing on tab-switching, manual saves (Ctrl+S), and app close to guarantee data safety.

📋 Outline Sidebar Sync
   - Rewrote the Table of Contents headings parser to query layout changes triggered by editor version updates, debounced independently from content saves.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFICATION:
- Build Status: PASS (zero TypeScript/Vite errors)
- Stutter Check: PASS (buttery-smooth backspacing and typing)
- Zoom Scroll Focus: PASS (scroll remains locked on cursor focus)

Build log saved to: build_log.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
