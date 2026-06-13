# Skill: Execute Build Phase

## Objective
Execute phases from production_artifacts/build_plan.md one sub-step at a time, self-auditing after each, logging progress, and automatically continuing without stopping.

## Execution Loop

1. Read production_artifacts/build_plan.md to know the full plan
2. Read build_log.md to find the last completed sub-step
3. Identify the next incomplete sub-step
4. Execute that sub-step only. Write the code or make the change.
5. After writing:
   a. Re-read every file you just created or modified
   b. Check for: missing imports, broken require() paths, syntax errors, any loadURL() pointing to a website domain, any hardcoded file paths that should use path.join()
   c. Fix every issue you find
   d. Only after a clean audit, append to build_log.md: done [sub-step number] [sub-step name]
6. Move to the next sub-step automatically
7. Repeat until all sub-steps in the current phase are done
8. After a full phase is complete, append to build_log.md: Phase [N] complete, proceeding to Phase [N+1]
9. Begin the next phase immediately

## Hard Rules
- If any file uses loadURL() with a non-file:// URL, refactor it before continuing
- All require() paths must be verified to exist
- All fs operations must have error handling
- Never mark a sub-step done if you found and fixed a bug. Re-audit after the fix first.
- If npm install or npm run build fails, read the error, fix the root cause, then retry

## Stopping Condition
Stop only when build_log.md contains the entry: Phase 7 complete, Windows app build finished
