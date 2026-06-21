# Skill: Analyze Desktop File Association and Shell Integration

This skill conducts a deep architectural audit of the Electron application package configuration, shell arguments passing mechanisms, and Windows registry guidelines for registering file handlers.

## Analysis & Findings

### 1. File Launch Arguments & Single-Instance Mechanics
- **Startup Launch:** When a user double-clicks an associated file, Windows launches the application executable with the target file path passed as a command-line argument: `app.exe "C:\path\to\file.txt"`.
- **First Instance Handling:** `src/main/main.js` correctly parses `process.argv` on startup using `getFilePathFromArgs(process.argv)`. If a file is matched, it triggers `openFileInWindow()` which reads the file content and sends it to the renderer via the `'open-file-channel'` IPC channel once `did-finish-load` fires.
- **Second Instance Handling:** If the app is already running, a new instance is launched but immediately exits because of `app.requestSingleInstanceLock()`. It passes its command-line arguments to the primary instance via the `second-instance` event. The primary instance parses these arguments, reads the file, and sends it to the renderer via IPC.
- **Renderer Capability:** `src/renderer/src/App.tsx` has a `useEffect` hook listening to `window.electronAPI.onOpenFile`. It correctly receives the file data, creates a new note, saves it to state/localStorage, and switches tabs. No changes are required in the renderer!

### 2. Windows Default Application Policies & Registry Safety
- **Anti-Hijacking Policy:** Windows 10 and 11 prevent installers from programmatically forcing file associations as the system-wide default (tampering with `UserChoice` registry subkeys triggers a Windows reset event). Apps must register as "Capability Handlers" and let the user select the default using the OS UI.
- **Top 1% SaaS Solution:**
  1. Add file associations (`.txt`, `.md`, `.html`, `.htm`) under the `fileAssociations` configuration block in `package.json`. Electron Builder translates these into standard registry capability handler keys.
  2. Implement a Windows Explorer context menu option: `"Edit with I Love Notepad"`. This adds a right-click entry for all files, allowing instant editing in the app without forcing default overrides.

### 3. NSIS Context Menu Registry Scripting
- **Safe Keys:** Write to `HKEY_CURRENT_USER\Software\Classes` (`HKCU\Software\Classes`). This merges into `HKEY_CLASSES_ROOT` for the active user, avoiding any administrator/UAC elevation prompts during installation.
- **NSIS Macros (`installer.nsh`):**
  Create a script at `notepad-win/build/installer.nsh` declaring:
  ```nsis
  !macro customInstall
    WriteRegStr HKCU "Software\Classes\*\shell\Edit with I Love Notepad" "" "Edit with I Love Notepad"
    WriteRegStr HKCU "Software\Classes\*\shell\Edit with I Love Notepad" "Icon" "$INSTDIR\I Love Notepad.exe,0"
    WriteRegStr HKCU "Software\Classes\*\shell\Edit with I Love Notepad\command" "" '"$INSTDIR\I Love Notepad.exe" "%1"'
  !macroend

  !macro customUninstall
    DeleteRegKey HKCU "Software\Classes\*\shell\Edit with I Love Notepad"
  !macroend
  ```

## Analysis Self-Audit
- **IPC Paths:** Inspected `main.js`, `preload.js`, and `App.tsx`. Verified that the IPC listener channels are fully wired up and ready to consume incoming file events.
- **Registry Keys:** Confirmed that `HKCU` keys do not trigger Windows security center warnings or UAC elevation dialogues, ensuring a smooth user setup.
