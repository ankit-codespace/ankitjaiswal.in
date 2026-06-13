# Windows App Build Plan

This plan outlines the conversion of the web Notepad tool into a native Windows 10/11 desktop application using Electron.

## Tech Stack
- **Shell & Bridge**: Electron (v30+) with `contextBridge` for secure IPC.
- **Renderer**: React 18 + Vite (built to static files, loaded via `loadFile()`).
- **Styling**: TailwindCSS & custom styles matching the original design.
- **Packaging**: `electron-builder` configured for NSIS (`.exe` installer).
- **Windows Features**: Registry configuration for `.txt` file association and "Open with Our Notepad" explorer context menu.

---

## Phased Build Steps

### Phase 1: Electron Project Scaffold
- **1.1** Create directory `notepad-win/` inside the workspace.
- **1.2** Setup `notepad-win/package.json` with main process dependencies (`electron`, `electron-builder`) and build scripts.
- **1.3** Create `src/main/main.js` (main Electron process) and `src/main/preload.js` (bridge script).
- **1.4** Confirm `main.js` uses `mainWindow.loadFile()` pointing to built assets.
- **1.5** Verify: Electron window opens successfully.

### Phase 2: Port Notepad UI to Renderer
- **2.1** Initialize Vite + React project inside `notepad-win/src/renderer`.
- **2.2** Extract the Notepad component from `notepad.tsx`. Strip all SEO sections, FAQ accordions, and external routing.
- **2.3** Bring in TailwindCSS and custom variables from `ToolStyles.tsx` to replicate themes exactly.
- **2.4** Stub out web-only dependencies (e.g. Google Drive integration) to ensure zero network requests on startup.
- **2.5** Build the React app to static assets (`dist/`).
- **2.6** Verify: The Electron window correctly displays the Notepad UI with active themes, styling, and working TipTap editor functionality.

### Phase 3: Native File Operations
- **3.1** Define Electron IPC channels for filesystem operations (`save-file`, `open-file`, `select-file-dialog`).
- **3.2** Implement main process IPC handlers in `src/main/fileOps.js` using Node's `fs` and `path` modules.
- **3.3** Implement "Save", "Save As...", and "Open File" dialogs using Electron's `dialog.showSaveDialog` and `dialog.showOpenDialog`.
- **3.4** Integrate IPC calls into the React editor toolbar for file export (TXT, MD, PDF, HTML) and import.
- **3.5** Verify: Creating, editing, saving, and opening files works natively without sandbox errors.

### Phase 4: .txt File Association
- **4.1** Update `package.json` `build` configuration to define `.txt` file association.
- **4.2** Add command line argument parsing in `main.js` (`process.argv`) to catch file paths when double-clicked.
- **4.3** Implement a custom IPC/preload hook to read double-clicked file contents and open them in the React editor upon launch.
- **4.4** Verify: Double-clicking a `.txt` file launches the editor and loads the file content correctly.

### Phase 5: Context Menu Registration
- **5.1** Configure `electron-builder` to register a context menu item "Open with Our Notepad" in the Windows registry for `.txt` files.
- **5.2** Verify the build configuration defines file associations with register option `true`.

### Phase 6: Package to .exe
- **6.1** Setup NSIS installer options, installer/app icons, and developer name configuration in `package.json` (or `electron-builder.yml`).
- **6.2** Run the packaging script `npm run build` to output an installer `.exe` in `dist/`.
- **6.3** Verify: Build finishes without errors and outputs a distributable installer.

### Phase 7: Final Audit
- **7.1** Run the packaged app to verify all features (editing, saving, opening, themes, and offline functionality).
- **7.2** Check file associations and right-click menu options.
- **7.3** Save the final audit results to `production_artifacts/final_audit.md`.
