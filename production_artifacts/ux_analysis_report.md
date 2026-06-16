# UX Hardening — Tab Switch Scroll Jump Analysis

## 1. Root Cause of Scroll Stutter on Tab Switch
The tab content synchronization and scroll recovery currently exist in `App.tsx` (lines 1191–1223):
- **Deferred Actions:** The `setTimeout(..., 80)` delays the scroll recovery after the content is replaced with `editor.commands.setContent(activeDoc.content)`.
- **Visual Flash:** Because the layout has already reflowed to the new content synchronously, the browser paints the scroll container at the default top `0` coordinate. Only after `80ms` does the timeout execute to snap the scroll to `savedScroll`. This 80ms lag results in a visible visual stutter or jump from the top.
- **Focus Hijack:** Calling `editor.commands.focus()` triggers native browser focusing on the editor container, which can force its own viewport scroll adjustment before the scroll recovery snaps.

## 2. Refactoring Solution
- **Synchronous Snap:** Set `isRestoringScrollRef.current = true` and call `window.scrollTo({ top: savedScroll || 0, behavior: "auto" })` synchronously *in the same task block* as `editor.commands.setContent`. This prevents the browser from rendering the top-level paint state.
- **Controlled Focus timing:** Wrap `editor.commands.focus()` and the final lock cleanup inside a short timeout, and repeat the `window.scrollTo` immediately after focus to suppress any browser-level cursor alignment jumps.
