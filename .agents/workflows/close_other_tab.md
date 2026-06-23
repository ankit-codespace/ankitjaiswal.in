---
description: Execute alignment of close confirmation prompts, preserve pinned tabs during mass closures, and restore batches of mass-closed tabs together.
---

# Workflow: Close Tab Behavior

## Trigger
User types: `/close_other_tab`

## Steps

1. **Analyze**: Run `analyze_close_other_tab` to identify close handlers and confirm states.
2. **Plan**: Run `plan_close_other_tab` to design precise modifications.
3. **Execute**: Run `execute_close_other_tab` to apply adjustments to `notepad.tsx` and `App.tsx`.
4. **Verify**: Run `pnpm run build` from the workspace root to check compilation.
5. **Finalize**: Record the history log under `_changelog/history/` and update `_tasks/QUEUE.md`.
