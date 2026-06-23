---
description: Standardize the web notepad's visual design, ruler line snaps, and Lenis scroll behavior to match desktop standards.
---

# Workflow: Notepad Layout Alignment

## Trigger
User types: `/notepad_alignment`

## Steps

1. **Analyze**: Run `analyze_notepad_alignment` to identify discrepancies, scroll trapping bugs, and layout differences.
2. **Plan**: Run `plan_notepad_alignment` to draft `production_artifacts/build_plan.md` with structured execution phases.
3. **Initialize Logs**: Verify `build_log.md` exists and initialize the current session entry.
4. **Execute**:
   - Execute Phase 1: Scroll Recovery and Layout Sizing.
   - Execute Phase 2: Notebook Ruler Line Alignment.
   - Execute Phase 3: Active Tab Visual Standardizing.
5. **Verify Completion**: Build the codebase using `pnpm run build` and run check loops.
6. **Finalize**: Write `_changelog/LATEST.md` and dated history files following the session changelog standards.
