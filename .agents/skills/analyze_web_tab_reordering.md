# Skill: Analyze Web Tab Reordering & Layout Alignment

This skill guides the read-only analysis of the web notepad tab reordering implementation, visual spacing, switcher layouts, and shortcut conflicts.

## Analysis Instructions

1. **Locate Target Files**:
   - Web version: `artifacts/website/src/pages/tools/notepad.tsx`
   - Desktop version: `notepad-win/src/renderer/src/App.tsx`

2. **Conduct Complete File Reading**:
   - Read the target files in their entirety before forming findings.
   - Pay close attention to styling, layouts, drag-and-drop event handlers, note switcher dropdown code, and the keyboard shortcut event listener.

3. **Analyze Tab Drag-and-Drop & Visual Sliding**:
   - Locate the `onDragStart`, `onDragOver`, and `onDragEnd` event handlers in both files.
   - Inspect how state updates (`setDocs`) are triggered. Note that instant state mutation in `onDragOver` causes tabs to swap immediately, causing layout flickering.
   - Plan how to introduce dynamic CSS translation offsets (`transform: translateX()`) based on a transient `dragOverIdx` state, ensuring adjacent tabs slide out of the way smoothly while dragging, and state is committed only in `onDragEnd`.

4. **Analyze Layout & Visual Differences**:
   - Compare the Plus button size, margins, and icons on both Web and Desktop.
   - Compare the divider separator offsets around the Plus button and Note Switcher trigger.
   - Inspect the Note Switcher dropdown panel tail (e.g. "New note" button and "Clear all notes" confirm block) to match label names ("New note" vs "New document") and hover/active states.

5. **Analyze Keyboard Shortcuts Conflicts**:
   - Locate the keydown shortcut listener in both files.
   - Verify that `Ctrl + Shift + T` is intercepted on both, but is blocked by browsers on Web.
   - Document how to conditionally check `isElectron` to use `Ctrl + Shift + T` on Desktop and `Ctrl + Alt + T` (or similar) on Web.
   - Check the Keyboard Shortcuts modal content (`showShortcuts` element) and verify that tooltips/help text reflect the correct shortcut mapping.

## Required Documentation

Produce an analysis summary in `build_log.md` detailing:
1. **What Exists**: Currently implemented drag-and-drop reordering, switcher layouts, and shortcuts.
2. **What Is Missing**: Discrepancies between the web page and desktop app implementations.
3. **Risks**: Potential side-effects on tab state, drag handlers, keyboard listener, or type check errors.
4. **Dependencies**: React drag event types, Lucide icons, and Tailwind/Vanilla CSS rules.
5. **Unknowns**: Any browser-specific keyboard event interception limits.

## Self-Audit of the Analysis
Before concluding the analysis phase:
- Double check that no edit actions were performed.
- Ensure that the documented findings are based on actual code inspection, not assumptions.
- Verify that every target file was inspected.
