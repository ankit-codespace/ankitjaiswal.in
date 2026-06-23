---
description: Execute visual layout alignment, tab adjustments, and button relocations to match premium UI standards.
---

# Workflow: Tab Alignment

## Trigger
User types: `/tab_alignment`

## Steps

1. **Analyze**: Run `analyze_tab_alignment` to identify the elements, heights, and layout rules in `notepad.tsx`.
2. **Plan**: Run `plan_tab_alignment` to generate `production_artifacts/build_plan_tab_alignment.md`.
3. **Execute**: Run `execute_tab_alignment` to apply edits in phases:
   - **Phase 1**: Sizing and offset alignments for Row 1 navigation.
   - **Phase 2**: Relocating the Plus button and cleanup of separators.
   - **Phase 3**: Relocating Shortcuts & Feedback buttons, updating File Menu items, and adjusting menu heights.
4. **Verify**: Compile/build the site (`pnpm run build`) to ensure zero errors.
5. **Finalize**: Record details in the dated history log under `_changelog/history/` and update `_tasks/QUEUE.md`.
