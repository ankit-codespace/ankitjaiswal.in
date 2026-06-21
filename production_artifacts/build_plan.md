# Build Plan: Window Presets Sizing

## Phase 1: IPC Sizing Setup in Main and Preload
- Add `set-window-size` IPC handler in `notepad-win/src/main/main.js`.
- Add `setWindowSize` to context bridge in `notepad-win/src/main/preload.js`.

## Phase 2: Add Preset Controls in File Menu
- Inject "Window Size" buttons container in the File Menu dropdown in `App.tsx` (Compact, Standard, Expanded).
- Wire buttons to call `window.electronAPI.setWindowSize` and close dropdown.
