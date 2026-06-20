# Skill: Analyze Tab Switch Scroll Stutter & Width Shift

This skill conducts a deep analysis of the tab-switching, scroll recovery, and width rendering mechanics in `App.tsx` and `notepad.tsx` to diagnose visual stutter and layout shifts.

## Analysis Steps

1. **Verify State Updates & Key Props**:
   - Locate the rendering of `NotepadEditor` in `App.tsx`.
   - Observe that `key={activeDoc.id}` forces React to unmount the previous editor and mount the new editor on every tab switch.
2. **Analyze Page Collapse & Scroll Reset**:
   - When the active editor is unmounted, the page height temporarily collapses.
   - The browser detects this collapse and native scroll behavior resets the viewport position to 0.
   - Because the event listener for window scrolls (`handleScroll`) is active during this transition, it is triggered by the scroll-to-0 event and overwrites the saved scroll position of the previous tab with 0.
3. **Analyze the Restoration Race Condition**:
   - The `useEffect` hook that restores scroll runs asynchronously *after* the browser has already painted the page with a collapsed height and scroll position at 0.
   - The 50ms timeout calls `.focus()` on the editor. This triggers the browser or ProseMirror to perform selection-alignment scroll checks, causing a second jump.
   - Finally, the timeout forces `window.scrollTo` to the saved position, causing a third visible layout jump (stutter/lag).
4. **Analyze Tab Width Resizing & Scroll-Into-View Jitter**:
   - Observe that switching tabs triggers a dynamic layout shift because the active tab expands (`flex: 1 1 auto`, `minWidth: 80`, `maxWidth: 160`, and larger padding) while inactive tabs shrink.
   - Observe that `scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })` runs blindly on every tab change. When there are only a few tabs, no scrolling is needed, but the call causes layout jitter/stutter.
   - **Remediation**:
     - Implement **Chrome-like uniform tab widths**: Map unpinned tabs to a static base style (`flex: 0 1 150px` for both active and inactive unpinned tabs) so tabs stay the same width when space allows.
     - Squeeze inactive tabs to a lower min-width (`50px`) than active tabs (`80px`) *only* when space is constrained (tabs are overflowing).
     - Implement a **boundary-checking tab scroll**: Only scroll the tab strip container if the active tab is actually cut off or overflowing. Do nothing if it is fully visible.
5. **Research Permanent Fixes (Notion / Google Docs approach)**:
   - **Keep Mounted**: Instead of unmounting the editor, mount all open tabs simultaneously and toggle their visibility via CSS `display: activeId === doc.id ? "block" : "none"`.
   - **Synchronous Restoration**: Replace `useEffect` with `useLayoutEffect` for scroll restoration. Since `useLayoutEffect` runs synchronously after DOM mutations but before browser paint, the display toggle, focus call, and scroll adjustment are batched into a single paint frame, ensuring zero layout jumps.
   - **Early Scroll Capture**: In the tab-change event handlers, capture and save the current scroll position *before* changing `activeId` state, bypassing the scroll event race condition.
