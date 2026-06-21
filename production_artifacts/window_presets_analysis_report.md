# Window Presets Sizing Audit Report

## 1. Findings
- **Electron Window Resize**: To resize windows smoothly in Electron, the main process calls `mainWindow.setSize(w, h, true)` after invoking `mainWindow.unmaximize()` if maximized, and then centers using `mainWindow.center()`.
- **Preload/IPC bridge**: A new IPC invocation handler `setWindowSize(w, h)` needs to be added to preload.js and registered in main.js.
- **File Menu Integration**: Integrating the size preset options in the dropdown in `App.tsx` allows smooth visual scaling in 2 clicks.
