# Phase 2: Paint Settle Deferrals Audit

## Changes Done:
1. **Calibration Deferrals**: Wrapped measurement loops inside `requestAnimationFrame` block in both `App.tsx` and `notepad.tsx`.
2. **Fallback Execution Hooks**: Introduced subsequent `setTimeout` triggers inside `requestAnimationFrame` at 60ms and 180ms intervals.
3. **Outcome**: The deferrals resolve the race condition where `offsetHeight` calculations are performed before the browser paints asynchronous sub-elements (like custom React node views, table grids, embedded images, and blocks). Measurements are taken only when elements have settled at their correct final heights.
