# Layout Calibration Analysis Report

## Issue Description
When the user switches tabs or initially loads the application, the notebook ruler background lines and rich-text blocks (tables, code blocks, blockquotes, images) can become misaligned. The lines cross directly through the text rather than sitting underneath it, and the layout only corrects itself when the user types or resizes the window.

## Root Causes
1. **Hidden Container Layout Lack**:
   - The editor components corresponding to inactive tabs are styled with `display: none`.
   - When a tab is switched, its editor component becomes active (`display: block`).
   - The `alignBlocksToGrid` calibration runs synchronously before the DOM layout engine calculates and paints the updated dimensions of the container. Thus, `offsetHeight` reads `0` or outdated values.
2. **Asynchronous Node View Painting**:
   - Custom node views (e.g. TipTap custom components) render asynchronously in subsequent paint ticks.
   - Immediate measurement captures the layout before these subcomponents are fully rendered, leading to incorrect height estimations.

## Resolution Plan
1. **Deferred Event Trigger**:
   - Dispatch a custom window `resize` event inside a `useEffect` watching `activeId`. Wrap it in a `setTimeout` (e.g., 100ms) to ensure the tab's container is fully visible and painted.
2. **Safe Measurement Deferral**:
   - In `alignBlocksToGrid`, execute measurements inside `requestAnimationFrame` and a fallback `setTimeout` to let browser rendering settle and React Node Views paint.
