# Skill: Analyze Desktop Window Presets and Sizing Controls

This skill conducts a deep architectural audit of the desktop Electron window scaling APIs, custom title bar layouts, and IPC bridge capabilities to enable predefined window sizes in "I Love Notepad".

## Analysis & Findings

### 1. Electron Window Sizing Mechanics
- **API Capability:** Electron's `BrowserWindow` exposes `setSize(width, height, animate)` to resize windows programmatically. Specifying `animate: true` ensures a smooth, native OS sizing transition on macOS/Windows.
- **Maximized Logic:** If the window is currently maximized, calling `setSize` directly can cause glitches or fail because the OS controls maximization state. The main process must call `mainWindow.unmaximize()` prior to resizing.
- **Symmetrical Placement:** To prevent the window from rendering off-screen (e.g. if resized near a screen edge), calling `mainWindow.center()` immediately centers the window on the active display.

### 2. IPC Sizing Bridge
- **Preload Interface:** We need to register a new invocation bridge method inside `notepad-win/src/main/preload.js`:
  `setWindowSize: (w, h) => ipcRenderer.invoke('set-window-size', w, h)`
- **Main Process Handler:** Handle this invocation inside `notepad-win/src/main/main.js`:
  ```javascript
  ipcMain.handle('set-window-size', (event, w, h) => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      mainWindow.setSize(w, h, true);
      mainWindow.center();
    }
  });
  ```

### 3. File Menu Integration
- **Display Presets:**
  - **Compact (Pip Mode):** `380 x 600 px` - Optimized for snapping to screen sides for side-by-side reference notes.
  - **Standard (Classic):** `800 x 600 px` - Cozy default document writing workspace.
  - **Expanded (Focus):** `1200 x 800 px` - Wide workspace for split-screens and code blocks.
- **UI Element Layout:** We will add a new "Window Size" options segment inside the existing `showFileMenu` dropdown panel in `App.tsx` (above or below Close options). This will be styled in a horizontal list using clean button segments matching the dark/light active surface theme.

## Analysis Self-Audit
- **Resizing Mechanics:** Confirmed that `unmaximize()` prevents OS-level bounds lock conflicts.
- **Visual Design:** Placing the presets inside the File Menu guarantees they are accessible with exactly two clicks, preventing header clutter while keeping standard layouts close at hand.
