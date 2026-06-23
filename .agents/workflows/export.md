---
description: Refactor web Export button to be a split button supporting smart exports, and remove focus button from desktop.
---

# Workflow: Export split button & Focus button

## Trigger
User types: `/export`

## Steps

1. **Analyze**: Run `analyze_export` to review layout positions.
2. **Plan**: Run `plan_export` to construct target modifications.
3. **Execute**: Run `execute_export` to modify source code in `notepad.tsx` and `App.tsx`.
4. **Verify**: Run `pnpm run build` from the workspace root to check for build errors.
5. **Finalize**: Record the session details in the changelog and update task queue statuses.
