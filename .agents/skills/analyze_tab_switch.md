# Skill: Analyze Tab Switch Scroll Jumps

## Objective
Diagnose why switching document tabs triggers a visible scroll stutter or jump.

## Diagnostic Checklist & Analysis

1. **Scroll Collapse Mechanism:**
   - In `App.tsx`, we have a single editor instance.
   - When switching tabs, `editor.commands.setContent()` is called.
   - The editor wrapper's height is temporarily locked, but then unlocked *synchronously* in the same block.
   - Because the height is unlocked immediately, the browser reflows the page with the new content before it has finished painting.
   - If the new content is short, or if the browser hasn't calculated the height yet, the document height collapses to 0 or a very small number.
   - The browser automatically caps `window.scrollY` to the new height (which is 0 or very small), scrolling the viewport to the top.
   - After a `50ms` delay, the `setTimeout` fires, focuses the editor, and scrolls the page back to the correct position.
   - This creates a visible flash at the top of the page for 1-3 frames.

2. **Capping Target Height:**
   - When transitioning from a short document to a long document, the previous document's scroll height is small.
   - If we only lock the height to the previous document's scroll height, the locked height is not enough to cover the new `savedScroll` target.
   - The browser will cap the scroll position to the small height, causing another source of scroll jumps.
   - Therefore, the locked height must be at least `savedScroll + window.innerHeight`.

3. **PreventScroll Focus:**
   - Standard `editor.commands.focus()` can trigger native browser scroll-into-view behavior if the cursor is at the top of the new document.
   - Using `editor.view.dom.focus({ preventScroll: true })` bypasses this, but we must also ensure that the scroll position is re-applied right after focusing in the deferred timeout.

## Conclusion & Action Item
Update the layout lock to remain active until the `setTimeout` callback runs. Remove the synchronous unlocking and perform the unlock inside the deferred frame.
