# Skill: Plan Tab Switch Scroll Stabilization

## Objective
Establish a phased plan to refactor tab-switching scroll restoration inside `App.tsx` and save the plan to `production_artifacts/build_plan.md`.

## Phased Plan Requirements

The plan must address:
- **Phase 1: Safe Layout Locking and Content Sync**
  - **1.1:** Lock `editorWrap` min-height to the maximum of `document.documentElement.scrollHeight`, `(savedScroll || 0) + window.innerHeight`, and `window.innerHeight`.
  - **1.2:** Update editor content with `editor.commands.setContent()`.
  - **1.3:** Synchronously scroll viewport to the target position.
  - **1.4:** Keep the min-height lock active (do NOT unlock it synchronously!).

- **Phase 2: Deferred Focus, Scroll Re-enforcement, and Unlock**
  - **2.1:** Inside the `setTimeout` (50ms), native focus the editor using `editor.view.dom.focus({ preventScroll: true })`.
  - **2.2:** Re-run `window.scrollTo` in the timeout as a final safety check.
  - **2.3:** Unlock the min-height lock by restoring it to its original value (or `""`).
  - **2.4:** Release the scroll restoration lock (`isRestoringScrollRef.current = false`).

- **Phase 3: Verification & Compilation**
  - **3.1:** Run `npm run build:renderer` to check for compilation and TypeScript correctness.
  - **3.2:** Perform scroll verification across multiple document tabs of varying heights.

## Expected Deliverables
Write the detailed plan to `production_artifacts/build_plan.md`.
Log: `[PLAN SAVED] — [timestamp]`
