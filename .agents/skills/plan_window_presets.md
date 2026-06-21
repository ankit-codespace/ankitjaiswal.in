# Skill: Plan Desktop Window Presets Sizing

This skill establishes a phased implementation plan for registering main process resize IPC channels, exposing preload methods, and integrating the sizing presets panel in the renderer file menu.

## Implementation Phases

### Phase 1: Pre-Flight Setup & Backups
- **Step 1.1:** Initialize the build log (`build_log.md`).
- **Step 1.2:** Create a Git safety backup branch `backup_window_presets_[timestamp]`.
- **Step 1.3:** Initialize the build plan artifact at `production_artifacts/build_plan.md`.

### Phase 2: Main Process IPC Setup
- **Step 2.1:** Open `notepad-win/src/main/main.js`.
- **Step 2.2:** Register the `set-window-size` IPC handle method (clamping, unmaximizing, resizing, and centering `mainWindow`).

### Phase 3: Preload Script Expansion
- **Step 3.1:** Open `notepad-win/src/main/preload.js`.
- **Step 3.2:** Expose the `setWindowSize(w, h)` function inside the `electronAPI` context bridge.

### Phase 4: Renderer File Menu Sizing Segment
- **Step 4.1:** Open `notepad-win/src/renderer/src/App.tsx`.
- **Step 4.2:** Declare typescript type signature or override checks for `setWindowSize` if necessary.
- **Step 4.3:** Find the File Menu dropdown container in the markup (around line 3370).
- **Step 4.4:** Insert the "Window Size" options block. This will contain a header and 3 button options: "Compact" (380x600), "Standard" (800x600), and "Expanded" (1200x800).
- **Step 4.5:** Wire the buttons to call `window.electronAPI.setWindowSize(w, h)` and close the menu.

### Phase 5: Verification & Compilation
- **Step 5.1:** Compile the renderer via `npm run build:renderer` inside `notepad-win`.
- **Step 5.2:** Build the application using `npm run build` inside `notepad-win`.
- **Step 5.3:** Open the app and test all 3 size presets. Verify that the window scales smoothly without component clipping.
- **Step 5.4:** Commit and push changes.
