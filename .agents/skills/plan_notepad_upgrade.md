# Skill: Plan Notepad Upgrade

## Purpose

Turn the diff report into a safe, ordered, phased execution plan. Save the plan to `production_artifacts/build_plan.md`. Every phase has a self-audit. No phase skips a verification step.

---

## Planning Rules

- **Visual/CSS changes go first.** They are low-risk and reversible.
- **Behavioral JS changes go later.** Higher risk. Need more care.
- **Shortcuts go last.** Most delicate. Browser conflicts possible.
- **Backup is Phase 0.** Always. Non-negotiable.
- **Each sub-step is one atomic change.** Not a group. One thing.
- **ADAPT items get their own sub-steps** that include the browser-specific modification.
- **SKIP items are never in the plan.** If it's in the plan, it's PORT or ADAPT only.

---

## Phase Structure

Read the `production_artifacts/diff_report.md` and build the plan using this structure:

---

### Phase 0 — Backup and Safety Setup

0.1 Read `deployment.md` fully. Understand the exact backup procedure for this project.

0.2 Execute the backup procedure as documented in `deployment.md`:
   - Commit all current changes with message: `[BACKUP] Pre-upgrade snapshot - web notepad before Windows app feature port`
   - Push to GitHub
   - Confirm push succeeded (check remote HEAD matches local)

0.3 Record backup confirmation:
   - Git commit hash
   - Timestamp
   - Branch name
   Save to `production_artifacts/backup_confirmation.md`

0.4 Initialize `build_log.md` with:
```
# Notepad Web Upgrade — Build Log
Started: <timestamp>
Backup commit: <hash>
Backup branch: <name>
Plan: production_artifacts/build_plan.md
Diff report: production_artifacts/diff_report.md

## Progress
```

**Phase 0 self-audit:** Confirm backup exists on GitHub. Do not proceed until confirmed.

---

### Phase 1 — Visual and CSS Upgrades (Low Risk)

Port all PORT-classified visual improvements from diff report. These include:
- Notebook lines CSS improvements
- Checkbox styling upgrades
- Any other visual-only changes from diff report

For each item in this phase:
   1.X.1 Read the Windows app source for this specific CSS/visual feature
   1.X.2 Read the web version's current equivalent CSS
   1.X.3 Write the change — adapt if needed for browser (no desktop-specific units, no OS fonts unless web-safe fallbacks exist)
   1.X.4 Re-read the changed file. Confirm the change is isolated and correct.
   1.X.5 Log to build_log.md

**Phase 1 self-audit:** Open the web version mentally (or actually if browser preview available). Do the visual changes look correct? Did any CSS change break layout? Fix before Phase 2.

---

### Phase 2 — Context Menu Upgrades (Medium Risk)

Port all PORT/ADAPT-classified right-click context menu improvements. These include:
- Additional right-click tab options from Windows app
- Image right-click enhancements
- Any other context menu additions from diff report

For each item:
   2.X.1 Read the Windows app context menu handler for this option
   2.X.2 Verify the option does not rely on Electron/OS APIs
   2.X.3 Read the web version's current context menu code
   2.X.4 Add the option to the web context menu — using browser-compatible APIs only
   2.X.5 Re-read the changed file. Check for syntax errors. Check menu array is correct.
   2.X.6 Log to build_log.md

**Phase 2 self-audit:** Is every new menu option using browser-safe APIs? Is the clipboard access using `navigator.clipboard` (not Electron's clipboard module)? Is the menu still triggering correctly on right-click? Fix before Phase 3.

---

### Phase 3 — File Menu Upgrades (Medium Risk)

Port all PORT/ADAPT-classified File menu additions from the Windows app.

For each new menu option:
   3.X.1 Read what the option does in Windows app
   3.X.2 Determine if it relies on OS file system APIs or Electron IPC — if yes, SKIP it
   3.X.3 If web-compatible: read web version's menu code
   3.X.4 Add the option with browser-appropriate implementation
   3.X.5 Re-read changed file. Confirm no regressions to existing menu items.
   3.X.6 Log to build_log.md

**Phase 3 self-audit:** Does the File menu still work end-to-end? Are all existing items still there and functional? Did any new item accidentally shadow an existing one? Fix before Phase 4.

---

### Phase 4 — Behavioral Feature Upgrades (Higher Risk)

Port all remaining PORT/ADAPT-classified behavioral improvements. These include:
- Any smart copy/paste improvements that work in browsers
- Any tab management logic improvements
- Any other behavioral features from diff report classified as PORT or ADAPT

For each item:
   4.X.1 Read the Windows app implementation fully
   4.X.2 Identify any Electron-specific APIs used — replace with browser equivalents or remove
   4.X.3 Read the web version's current equivalent code
   4.X.4 Port the feature with browser-safe implementation
   4.X.5 Re-read the full function/component that was changed
   4.X.6 Check for edge cases: what happens with empty state? What happens with multiple tabs open?
   4.X.7 Log to build_log.md

**Phase 4 self-audit:** Did any behavioral change alter existing functionality? Are there event listener conflicts? Is state management still correct? Fix before Phase 5.

---

### Phase 5 — Keyboard Shortcut Updates (Most Delicate)

Handle shortcuts precisely per the rules:

5.1 Port Ctrl+H dual-binding for highlight:
   - Read current highlight shortcut code in web version
   - Add `Ctrl+H` as additional binding alongside existing `Ctrl+Shift+H` (or vice versa)
   - Both must trigger the same handler
   - Re-read the keyboard event handler. Confirm no conflict with other bound keys.
   - Log to build_log.md

5.2 Port Ctrl+F for Find dialog:
   - Read how Windows app intercepts Ctrl+F
   - In web version: use `event.preventDefault()` carefully — only prevent default when the app's editor/text area is focused
   - If user is NOT in the editor, allow browser Find to work normally
   - Test the logic mentally: focused on editor → app Find opens; focused outside → browser Find opens
   - Re-read the keyboard handler. Confirm the condition is correct.
   - Log to build_log.md

5.3 Audit all shortcuts from diff report classified as PORT:
   - For each one, verify it does not conflict with Chrome shortcuts
   - If conflict found, reclassify as SKIP and log the decision
   - Log to build_log.md

**Phase 5 self-audit:** Is Ctrl+F safely intercepted without breaking browser navigation? Does Ctrl+H work? Does Ctrl+Shift+H still work? Are Chrome's own shortcuts (Ctrl+T, Ctrl+W, Ctrl+N, Ctrl+L, Ctrl+R, Ctrl+Shift+J etc.) untouched? Fix anything wrong.

---

### Phase 6 — Final Audit and Cleanup

6.1 Re-read every file modified during Phases 1-5

6.2 Run a mental walkthrough of the web notepad:
   - Open app
   - Create a tab
   - Right-click tab — verify all new options present
   - Open File menu — verify all new options present
   - Use checkbox — verify upgraded behavior
   - Check notebook lines — verify improved rendering
   - Right-click on image — verify new options
   - Press Ctrl+H — verify highlight
   - Press Ctrl+Shift+H — verify highlight still works
   - Press Ctrl+F — verify app Find opens (when in editor)
   - Press Ctrl+T — verify browser opens new tab (NOT intercepted)

6.3 Write final summary to `production_artifacts/final_summary.md`:
   - Features ported: list
   - Features skipped and why: list
   - Features adapted and how: list
   - Files changed: list
   - Any known limitations

6.4 Final build_log.md entry:
```
[UPGRADE COMPLETE] <timestamp>
All phases executed. See production_artifacts/final_summary.md for full report.
```

**Phase 6 self-audit:** Is everything logged? Is the backup still safe on GitHub? Is the website version better than it was, without any regressions? If yes — done.

---

## Save the Plan

Write the full plan (with all sub-steps filled in from the diff report) to:
`production_artifacts/build_plan.md`

Log to build_log.md:
```
[PLAN COMPLETE] <timestamp>
- Phases: 0-6
- Total sub-steps: X
- PORT items: X | ADAPT items: X | SKIP items: X
- Ready for execution
```
