# Skill: Execute Phase Loop

## The Core Rule
**Read → Change → Re-read → Audit → Log → Next**

Every sub-step in `production_artifacts/build_plan.md` must follow this exact loop. No exceptions.
Do not skip verification. Do not bundle multiple risky changes together. Catch and resolve issues immediately.

---

## The Execution Loop

```
WHILE there are uncompleted sub-steps in build_plan.md:

  1. PICK the next sub-step (e.g. Phase 1.1)

  2. EXECUTE based on the task type:
     
     --- TYPE A: File Editing (Writing/Modifying) ---
     • Read the target file region completely first to ensure full local context.
     • Apply the code change cleanly. Keep comments intact.
     • Re-read the modified region to verify correctness.
     • Check for syntax errors, TypeScript warnings, or React hooks rules breaks.
     • If any issues are found, resolve them immediately before continuing.

     --- TYPE B: Terminal Command Execution ---
     • Run the terminal command.
     • Read the full terminal output.
     • If a compilation error or build failure occurs, read the log/stack trace, address the root cause, and re-run.

     --- TYPE C: Verification & Audit ---
     • Run manual check commands, verify file content, or build verification packages.
     • Confirm the target behavior actually works.

  3. PERFORM SELF-AUDIT:
     • "Did this step accomplish exactly what the plan specified?"
     • "Could this change break adjacent features or introduce regression?"
     • "Is the layout still aligned and type-safe?"

  4. LOG TO build_log.md:
     Write a clean entry formatted as:
     [DONE] Phase [N.M] — [Brief summary of change]
     Files modified: [file path]
     Audit result: PASS | FIXED (describe what was fixed)

  5. PROCEED to the next sub-step.
```

---

## Phase Boundary Protocol
When completing a phase:
1. Re-read the files modified in that phase.
2. Confirm all sub-steps in that phase are marked done in `build_plan.md`.
3. If anything was skipped, resolve it now.
4. Log `[PHASE COMPLETE] Phase [N] — [Timestamp]` to `build_log.md`.
5. Move immediately to Phase N+1.
