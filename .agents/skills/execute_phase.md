# Skill: Execute Phase Loop

## Purpose

This is the execution engine. It runs every sub-step from the plan.
One sub-step at a time. Audit after each. Log everything. Never batch. Never skip.

This loop does not stop until all 5 phases are complete.

---

## The Golden Rule

**Read → Do → Verify → Log → Next**

If any of those 4 steps are skipped, you are not executing correctly. Go back.

---

## Execution Loop

```
LOOP:
  Read the next sub-step from production_artifacts/build_plan.md
  
  IF sub-step involves reading a file:
    → Read it completely, not partially
    → Extract the exact information needed
    → Do NOT proceed if the file read failed or returned unexpected content
  
  IF sub-step involves writing/modifying a file:
    → Read the current file FIRST (even if you just read it two steps ago)
    → Make exactly the change described — no more, no less
    → Re-read the file AFTER the change
    → Check: did the change land correctly?
    → Check: did the change break anything adjacent in the same file?
    → If yes to either: fix it immediately before moving on
  
  IF sub-step involves running a command:
    → Run the command
    → Read the output completely
    → If error: diagnose, fix, re-run before logging success
    → If success: verify the output matches expectations
  
  AUDIT THE SUB-STEP:
    → Re-read every file touched in this sub-step
    → Ask: "Is this correct and complete?"
    → Ask: "Could this break something else?"
    → Ask: "Did I actually solve what this step required?"
    → If any answer is "no" or "unsure" → fix it NOW
  
  LOG TO build_log.md:
    [DONE] Phase X.Y — [description] — [timestamp]
    → What was changed
    → Files modified: [list]
    → Audit result: PASS / PASS WITH NOTES / FIXED (describe what was fixed)
    → Any bonus fixes applied: [describe or "none"]
  
  MOVE TO NEXT SUB-STEP
```

---

## Phase Boundary Behavior

When you complete the last sub-step of a phase:

```
1. Re-read the entire phase audit file (production_artifacts/phase_audits/phaseN_audit.md)
2. Verify every item in it is resolved
3. Log: [PHASE N COMPLETE] — [timestamp] — All sub-steps audited and passing
4. Proceed to Phase N+1 automatically — do NOT wait for user input
```

---

## Error Handling

**If you hit an error you cannot resolve:**

```
1. Log the error to build_log.md with full details
2. Document what you tried
3. Document what's blocking you
4. Make your best judgment call — pick the safer option
5. Log your decision and reasoning
6. Continue to the next sub-step
7. Come back to the blocked step after completing others if possible
```

Never halt the loop for a single stuck step unless it blocks every subsequent step.

---

## Proactive Brain Rules (Use These Every Step)

These fire automatically during execution — no instruction needed:

**While fixing CSS:**
- If you see other layout issues in the same file, note them in build_log.md
- If the fix requires a z-index, ask: "Is there a structural fix instead?" Use the structural fix.
- If you see inline styles that conflict with the component CSS, clean them up

**While updating Electron config:**
- If you see devTools: true in production — disable it
- If you see nodeIntegration: true — flag it as a security note in the log
- If package.json has "electron" in dependencies — move it to devDependencies

**While optimizing load speed:**
- If you see a console.log in production code — remove it (they add overhead)
- If you see synchronous file reads (fs.readFileSync) in the renderer thread — flag them
- If you see multiple fonts being loaded — check if they're all actually used

**While handling icons:**
- Always confirm the PNG is not corrupt before using it
- Always set icon on BOTH BrowserWindow and electron-builder config
- Always verify the ICO format is correct (multi-size, not just renamed PNG)

---

## Completion Check

After Phase 5 sub-step 5.9:

```
Write to build_log.md:
═══════════════════════════════════════
ALL PHASES COMPLETE
═══════════════════════════════════════
Total sub-steps executed: [N]
Files modified: [list all]
Bonus fixes applied: [list or "none"]
Open items / known limitations: [list or "none"]
Ready for: [build / deploy / store submission]
═══════════════════════════════════════

Print summary to user:
"All 4 phases complete. Here's what was done: [brief summary per phase]
Build log is at production_artifacts/build_log.md
Phase audits are at production_artifacts/phase_audits/"
```

---

## What "Audit" Means (Be Precise)

An audit is NOT just re-reading. It is answering these questions:

For CSS changes:
- Does the navbar still render correctly on other pages?
- Does the notepad tool no longer show the navbar?
- Is the z-index fix using the minimum necessary value?

For icon changes:
- Is the icon path absolute-safe (uses path.join, not string concat)?
- Does the icon exist at the path specified?
- Will this work in both dev and production builds?

For size/performance changes:
- Did the change actually reduce something, or just move the problem?
- Is the ready-to-show pattern implemented completely (not just half-done)?
- Are source maps excluded from production?

For favicon:
- Is it scoped to Notepad only and not leaking to other tools?
- Is the local file path correct relative to the public folder?
- Does the manifest also reference the correct local path?
