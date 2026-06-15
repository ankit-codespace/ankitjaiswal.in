# Skill: Execute Phase Loop — Microsoft Store AppX Packaging

## The Core Rule

**Read → Change → Re-read → Audit → Log → Next**

Every single sub-step follows this pattern. No exceptions.
No batching two steps into one. No skipping the re-read.
No logging "done" before you verified it actually worked.

---

## The Loop

```
WHILE there are uncompleted sub-steps in build_plan.md:

  PICK the next sub-step

  CLASSIFY it:
    Type A — Reading a file
    Type B — Writing or modifying a file
    Type C — Running a terminal command
    Type D — Verification / audit
    Type E — Logging / documentation

  EXECUTE based on type:

  --- TYPE A: Reading ---
    Read the file COMPLETELY. Not partially.
    Extract every relevant piece of information.
    If the file is not where expected: search for it, update the plan, log the correction.
    If the file doesn't exist: flag it, check if it should be created, log finding.

  --- TYPE B: Writing or Modifying ---
    FIRST: Read the current file completely (even if read 2 steps ago — things change)
    THEN: Make exactly the change described in the sub-step
    THEN: Re-read the file you just modified
    CHECK:
      - Did the change land correctly?
      - Did it break anything adjacent in the same file?
      - Is there a syntax error introduced?
      - Is the indentation correct (JS/JSON formatting)?
      - For package.json: is it still valid JSON?
    If any check fails: fix it NOW before moving to the next step.

  --- TYPE C: Running a Command ---
    Run the command.
    Read the FULL output.
    If it errored:
      Read the error message completely.
      Diagnose the root cause (don't guess — read the stack trace).
      Fix the root cause.
      Re-run the command.
      Repeat until it succeeds OR document clearly why it cannot.
    If it succeeded:
      Verify the output matches expectations.
      Save relevant output to the log.

  --- TYPE D: Verification ---
    This is not a formality. Actually verify.
    Run the grep, the ls, the file check — get real output.
    Document what the verification showed.
    If verification fails: return to the step that should have fixed it and fix it properly.
    Do not proceed until verification passes.

  --- TYPE E: Logging / Documentation ---
    Write it. Don't abbreviate. Future-you needs to understand what happened.
    Format: [STATUS] [PHASE.STEP] [TIMESTAMP] — [WHAT] — [WHY] — [FILES TOUCHED]

  AFTER EVERY SUB-STEP:
    Ask yourself three questions:
    1. "Did this step do what it said it would do?"
    2. "Could this change break anything else in the project?"
    3. "Is there something I noticed while doing this step that needs to be fixed?"

    If Q1: NO → go back and fix it
    If Q2: YES → fix the breakage before moving on
    If Q3: YES → if it's quick, fix it now and log as BONUS FIX
                  if it's large, add it to build_log.md as DEFERRED and note why

  LOG TO build_log.md:
    [DONE] Phase [N.M] — [description]
    Files modified: [list or "none"]
    Audit result: PASS | PASS+BONUS | FIXED (describe what was wrong and corrected)
    Bonus fixes: [describe] | none
    Bonus fixes: [describe] | none

  CONTINUE to next sub-step
```

---

## Phase Boundary Protocol

When you finish the last sub-step of a phase:

```
1. Re-read the phase audit file you just wrote
2. Cross-check: did every sub-step in the plan get executed?
3. Any item marked BLOCKED or SKIPPED? Revisit now.
4. If all clear: log PHASE N COMPLETE
5. Immediately proceed to Phase N+1 — no pause, no waiting for user
```

---

## AppX Asset Verification Protocol

After Phase 1 (generating logo assets), verify with:

```bash
# Confirm the files exist and are PNGs with the correct dimensions
# (Substitute path based on current workspace)
ls notepad-win/build/appx/StoreLogo.png
ls notepad-win/build/appx/Square150x150Logo.png
ls notepad-win/build/appx/Square44x44Logo.png
ls notepad-win/build/appx/Wide310x150Logo.png
```

---

## AppX Package Config Verification Protocol

After Phase 2 (editing configs), verify with:

```bash
# Verify appx is configured correctly in package.json
cat notepad-win/package.json | grep -A 10 '"appx"'
# Ensure target includes appx
cat notepad-win/package.json | grep -A 5 '"win"'
```

---

## Build Package Verification Protocol

After Phase 3 (running the build), verify with:

```bash
# Confirm the .appx package was generated successfully in dist/ or out/
ls notepad-win/dist/*.appx
```

---

## Completion

After the final sub-step of Phase 4:

```
Write to build_log.md:

═══════════════════════════════════════════════════
ILOVEUNOTEPAD APPX PACKAGING — COMPLETE
═══════════════════════════════════════════════════
Session ended: [timestamp]

RESULTS:
  AppX visual assets generated: ✅
  electron-builder configured: ✅
  AppX Package built successfully: ✅
  Submission checklist created: ✅

FILES MODIFIED:
  [complete list with what changed in each]

TOTAL SUB-STEPS EXECUTED: [N]
TOTAL BUILD LOG ENTRIES: [N]
═══════════════════════════════════════════════════
```

Deliver the final summary to the user in a clean, readable format.
