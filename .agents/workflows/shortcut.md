---
description: Standardize and unify tab restoration shortcuts and help documentation in both Web and Desktop clients.
---

# Workflow: Keyboard Shortcuts Consistency

## Trigger
User types: `/shortcut`

## Steps

1. **Analyze**: Run `analyze_shortcut` to review key handlers.
2. **Plan**: Run `plan_shortcut` to construct targets.
3. **Execute**: Run `execute_shortcut` to modify source code in both `notepad.tsx` and `App.tsx`.
4. **Verify**: Run `pnpm run build` from the workspace root to check for build errors.
5. **Finalize**: Record the session details in the changelog and update task queue statuses.
