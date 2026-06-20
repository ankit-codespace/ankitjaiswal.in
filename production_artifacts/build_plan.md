# Layout Calibration Build Plan

## Phase 1: Tab Switch Calibration Event Dispatch
- In `notepad-win/src/renderer/src/App.tsx` and `artifacts/website/src/pages/tools/notepad.tsx`, add a `useEffect` hook listening to `activeId` changes.
- Within this hook, use a `setTimeout` of 100ms to dispatch a window `resize` event. This will trigger the alignment function after the display state resolves to `block`.

## Phase 2: Paint Settle Deferrals
- In the `alignBlocksToGrid` functions of both files, wrap the layout height measurements in a `requestAnimationFrame` block.
- Add a subsequent `setTimeout` execution of the calculations to handle asynchronous custom component paintings.
