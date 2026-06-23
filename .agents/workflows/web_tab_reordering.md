---
description: Implement web-compatible smooth tab reordering, layout alignment parity, and browser-safe restore shortcuts.
---

# Workflow: Web Tab Reordering & Layout Alignment

## Trigger
User types: `/web_tab_reordering`

## Steps

1. **Analyze**: Run `analyze_web_tab_reordering` to identify discrepancies, drag-and-drop mechanics, spacing layouts, and shortcut conflicts.
2. **Plan**: Run `plan_web_tab_reordering` to draft `production_artifacts/build_plan.md` with structured execution phases.
3. **Initialize Logs**: Verify `build_log.md` exists and initialize the current session entry.
4. **Execute**:
   - Execute Phase 1: Web-Compatible Tab Drag-and-Drop & Sliding.
   - Execute Phase 2: Tab Bar & Plus Button Layout Parity.
   - Execute Phase 3: Shortcut Conflict Resolution & Modal Help Parity.
5. **Verify Completion**: Build the codebase using `pnpm run build` and run check loops.
6. **Finalize**: Write `_changelog/LATEST.md` and dated history files following the session changelog standards.
