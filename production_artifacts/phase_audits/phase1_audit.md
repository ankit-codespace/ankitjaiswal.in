# Phase 1: Tab Switch Calibration Audit

## Changes Done:
1. **Calibration Dispatcher Hook**: Added a `useEffect` hook in both `App.tsx` and `notepad.tsx` that monitors `activeId` (representing the current selected note/document).
2. **Deferred Resize Dispatch**: Dispatches a custom window `resize` event 100ms after the active document switch.
3. **Outcome**: Because the event is dispatched 100ms later, it executes after the browser layout engine completes toggling the visibility of the text editor container to `block`. This triggers the registered resize alignment listeners with accurate DOM geometries.
