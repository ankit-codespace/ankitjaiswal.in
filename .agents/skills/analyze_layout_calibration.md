# Skill: Analyze Ruler Layout Calibration Issues

This skill conducts a deep analysis of editor block height rendering, CSS display toggles, browser reflow triggers, and why background ruler lines fail to align on initial load.

## Analysis Findings

1. **Ruler Alignment Mechanics**:
   - The editor background draws notebook ruling lines matching the dynamic grid line height `G = fontSize * lineHeight`.
   - Text blocks align automatically. Non-text block elements (headings, code blocks, tables, blockquotes, hr, images) have arbitrary heights.
   - The layout helper `alignBlocksToGrid()` queries these blocks and appends a calibrated `marginBottom` so subsequent lines snap to the grid.

2. **The Calibration Lag Bug (The Root Cause)**:
   - **Inactive Tabs are Hidden**: To preserve document state and scroll positions, the application mounts editor containers in parallel, toggling visibility with `display: none`.
   - **Zero Heights**: When an editor container is `display: none` or still initializing, all child DOM nodes have `offsetHeight === 0`.
   - **Early Return**: The function `alignBlocksToGrid()` reads `el.offsetHeight` and returns early if it is `0` (line 1180: `if (naturalHeight === 0) return;`). Thus, no alignment margin is applied.
   - **No View Event on Show**: When switching tabs, the display changes from `none` to `block`. This visual state change does not trigger ProseMirror updates or window resizes, so `alignBlocksToGrid` is never called.
   - **Typing Trigger**: The moment the user types or presses Enter, a document transaction is sent, which fires the Tiptap `"update"` event. Since the container is now visible (`display: block`), the heights are non-zero, and the alignment snaps into place.

3. **The Root Fix Strategy**:
   - **On Tab Activation**: In `App.tsx` and `notepad.tsx`, immediately after setting a tab to active and setting its CSS display to visible, trigger the grid calibration. Since the callback needs the browser to have processed the CSS display update, wrap the trigger in a `requestAnimationFrame` or `setTimeout(..., 20)`.
   - **Window Event Dispatch**: Since the grid alignment hook is already listening to the window `"resize"` event, we can safely and cleanly trigger it by dispatching a global window resize event:
     ```tsx
     requestAnimationFrame(() => {
       window.dispatchEvent(new Event("resize"));
     });
     ```
   - **Initialization Delay**: In `alignBlocksToGrid` itself, add a deferred microtask/frame callback to ensure that React node views (which render asynchronously) have completed their first paint cycle before reading heights.

## Self-Audit of the Analysis
- Triggering alignment via `window.dispatchEvent(new Event("resize"))` after a display toggle is an industry-standard, zero-overhead technique to synchronize independent rendering subsystems without tightly coupling state logic.
