# Skill: Execute Phase

## Purpose

Execute the build plan one sub-step at a time. Never batch. Never skip. After every sub-step: re-read, audit, fix if needed, log. Repeat until all phases complete.

---

## Execution Loop

```
WHILE there are uncompleted sub-steps in build_plan.md:
  1. Read the next sub-step from build_plan.md
  2. Read ALL relevant source files before making any change
  3. Make exactly ONE atomic change
  4. Re-read the changed file immediately
  5. Self-audit: is the change correct? any bugs? any regressions?
  6. If bugs found: fix them NOW, re-read again, re-audit
  7. Log the sub-step to build_log.md
  8. Mark sub-step complete in build_plan.md
  9. Move to next sub-step
END WHILE
```

---

## Pre-Execution Checklist (Run Before First Sub-Step)

- [ ] Read `build_log.md` — confirm backup was completed (Phase 0 logged)
- [ ] Read `production_artifacts/build_plan.md` — know the full plan
- [ ] Read `production_artifacts/diff_report.md` — keep diff context in mind
- [ ] Identify which sub-step to start from (check last log entry)

---

## Per Sub-Step Protocol

### Before the Change

1. Read the sub-step description in `build_plan.md`
2. Read the Windows app source file(s) relevant to this sub-step
3. Read the web version source file(s) that will be modified
4. Understand: what is changing, why, and what must NOT change around it

### Making the Change

5. Make the change — one thing only
6. Be surgical: touch only what the sub-step says to touch
7. If you discover mid-change that something is more complex than expected:
   - Stop
   - Log the finding to build_log.md
   - Do not make a partial change
   - Re-assess and adjust the plan sub-step if needed
   - Then proceed cleanly

### After the Change

8. Re-read the entire file that was modified (not just the changed lines)
9. Run this audit checklist:

**Web Safety Checklist:**
   - [ ] No Electron imports or APIs used (`ipcRenderer`, `shell`, `dialog`, etc.)
   - [ ] No `require()` calls that only work in Node.js/Electron context
   - [ ] No `window.process` or Node-specific globals
   - [ ] Clipboard uses `navigator.clipboard` API (not Electron clipboard)
   - [ ] File operations use browser File API or download trick (not `fs` module)
   - [ ] Context menus use custom DOM-based menus (not native OS menus)
   - [ ] No hardcoded OS paths (`C:\`, `/Users/`, etc.)
   - [ ] Keyboard shortcuts do not override: Ctrl+T, Ctrl+W, Ctrl+N, Ctrl+L, Ctrl+R, Ctrl+Tab, Ctrl+Shift+J, Ctrl+Shift+I, Ctrl+U, Ctrl+S (unless intentional and safe for web)

**Shortcut-Specific Checklist (for Phase 5 sub-steps):**
   - [ ] Ctrl+H triggers highlight (correct)
   - [ ] Ctrl+Shift+H triggers highlight (correct)
   - [ ] Ctrl+F triggers app Find ONLY when editor is focused
   - [ ] Ctrl+F does NOT prevent browser Find when editor is NOT focused
   - [ ] Chrome History shortcut not accidentally intercepted

**Visual-Specific Checklist (for Phase 1 sub-steps):**
   - [ ] CSS change is scoped correctly (no unintended global overrides)
   - [ ] Font families have web-safe fallbacks
   - [ ] No pixel values that only make sense on desktop resolution
   - [ ] Dark/light mode still works (if applicable)

10. If any checklist item fails: fix it immediately, re-read, re-audit
11. Only proceed to logging when all relevant checklist items pass

### Logging

Write this to `build_log.md` after every completed sub-step:

```markdown
### [Phase X.Y] <sub-step title>
- Timestamp: <timestamp>
- Files read: <list>
- Files changed: <list>
- Change summary: <1-2 sentence plain English description of what changed>
- Port decision: PORT | ADAPT | (with reason if ADAPT)
- Web safety audit: PASSED
- Notes: <anything unusual found or decided>
```

---

## Handling Discoveries Mid-Execution

Sometimes you find something during execution that was not in the analysis. Handle it:

**If you find a new PORT item:**
- Add it to the build plan as a new sub-step
- Do not execute it yet — finish the current sub-step first
- Log the discovery

**If you find a new SKIP item (something in the plan that turns out to be unsafe for web):**
- Stop. Do not execute that sub-step.
- Log the reason in build_log.md
- Mark it SKIPPED in build_plan.md
- Move to next sub-step

**If you find a bug in the Windows app code you were about to port:**
- Do not port the bug
- Port the intent of the feature correctly for the web
- Log the decision

**If a change breaks something unexpectedly:**
- Revert the change immediately (restore file to pre-change state)
- Log what happened
- Analyze why
- Adjust the sub-step approach
- Attempt again with the corrected approach

---

## Phase Transition Protocol

When all sub-steps in a phase are complete:

1. Re-read all files modified in that phase
2. Run the phase-level self-audit from `plan_notepad_upgrade.md`
3. Log phase completion:

```markdown
## [PHASE X COMPLETE] <timestamp>
- Sub-steps completed: X
- Files changed: <list>
- Phase audit: PASSED
- Moving to Phase X+1
```

4. Do not start Phase X+1 until Phase X audit passes

---

## Final Step

When ALL phases are complete:

1. Execute Phase 6 (Final Audit and Cleanup) from the plan
2. Write `production_artifacts/final_summary.md`
3. Write final entry to `build_log.md`
4. The task is done
