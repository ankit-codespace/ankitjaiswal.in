# UX Hardening — Tab Switch Scroll Recovery Build Plan

## Phase 1: Synchronous content sync and scroll restoration
- **Goal:** Eliminate the visual delay and flash at the top of the document during tab switches.
- **Sub-steps:**
  - **1.1:** Modify `App.tsx` -> `useEffect` [activeId, editor] to immediately toggle `isRestoringScrollRef.current = true` before the content update starts.
  - **1.2:** Trigger content synchronization with `editor.commands.setContent(activeDoc.content)`.
  - **1.3:** Immediately (synchronously in the same frame) perform `window.scrollTo({ top: savedScroll || 0, behavior: "auto" })` to ensure the layout starts at the correct coordinates on paint.

## Phase 2: Secure focus positioning and scroll listener suppression
- **Goal:** Focus the editor without letting the browser's native cursor scroll logic jump the viewport.
- **Sub-steps:**
  - **2.1:** Wrap focus and clean-up in a short timeout (e.g. 50ms) to allow layout reflow to settle.
  - **2.2:** Execute `editor.commands.focus()` inside the timeout.
  - **2.3:** Re-apply `window.scrollTo({ top: savedScroll || 0, behavior: "auto" })` immediately after focus to suppress focus-induced scroll overrides.
  - **2.4:** Toggle `isRestoringScrollRef.current = false` inside the timeout.

## Phase 3: Verification & Compilation
- **Goal:** Verify zero regressions, compilation completeness, and update package binaries.
- **Sub-steps:**
  - **3.1:** Execute production compiler via `npm run build:renderer` to check for TypeScript/build failures.
  - **3.2:** Re-run local executable generation (`npm run build`) and update local installed app.
  - **3.3:** Test note switching to verify instant scroll recovery without visual stutters.
