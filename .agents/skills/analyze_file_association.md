# Skill: Analyze Desktop File Association and Shell Integration

This skill conducts a deep architectural audit of the Electron application package configuration, shell arguments passing mechanisms, Windows registry guidelines for registering file handlers, and file importing safety features.

## Analysis & Findings

### 1. File Launch Arguments & Single-Instance Mechanics
- **Startup Launch:** When a user double-clicks an associated file, Windows launches the application executable with the target file path passed as a command-line argument: `app.exe "C:\path\to\file.txt"`.
- **First Instance Handling:** `src/main/main.js` correctly parses `process.argv` on startup using `getFilePathFromArgs(process.argv)`. If a file is matched, it triggers `openFileInWindow()` which reads the file content and sends it to the renderer via the `'open-file-channel'` IPC channel once `did-finish-load` fires.
- **Second Instance Handling:** If the app is already running, a new instance is launched but immediately exits because of `app.requestSingleInstanceLock()`. It passes its command-line arguments to the primary instance via the `second-instance` event. The primary instance parses these arguments, reads the file, and sends it to the renderer via IPC.

### 2. File Sizing and Binary Content Safety Checks
- **The Issue:** Opening non-text binary files (like PDFs, EXEs, images) or very large text files (> 1.5MB) causes the Tiptap/ProseMirror rendering parser in the renderer thread to freeze. The blocked main thread triggers an "Application Unresponsive" crash dialog. Even worse, because this document is saved as the active note in localStorage, the application gets locked in an infinite crash/black-screen loop upon restart.
- **Root Cause Prevention (Main Process):**
  We must intercept unsupported file loading early in `src/main/main.js` (both inside `openFileInWindow` and the `native-open-file` dialog handler):
  - **Size Limit:** Check `fs.statSync(filePath).size`. If it exceeds **1.5MB** (1,572,864 bytes), block opening and display a standard native error dialog via `dialog.showErrorBox`.
  - **Binary Content Check:** Read the first 1024 bytes of the file. If it contains null bytes (`\x00` / `\u0000`), treat it as a binary file. Block it and display a standard native error dialog.
- **Fail-Safe Recovery (Renderer Process):**
  To rescue users from the infinite black-screen loop (if corrupt/huge notes are already stored in localStorage):
  - Implement a `sanitizeDocContent(doc)` function inside `loadDocs()` in both `notepad-win/src/renderer/src/App.tsx` and `artifacts/website/src/pages/tools/notepad.tsx`.
  - If a stored document starts with `%PDF`, contains null bytes, or is > 1.5MB in length, replace its content with an informative error message: `[Error: Unsupported Format]`.
  - Update the note's title to `[Filename] (Unsupported Format)` and set the unsaved flag to true. This allows the app to boot up in under a second and lets the user close/delete the broken tab safely.

### 3. Windows Default Application Policies & Registry Safety
- **Anti-Hijacking Policy:** Windows 10 and 11 prevent installers from programmatically forcing file associations as the default.
- **Top 1% SaaS Solution:**
  1. Add file associations (`.txt`, `.md`, `.html`, `.htm`, `.json`) under the `fileAssociations` configuration block in `package.json`. Electron Builder translates these into standard registry capability handler keys.
  2. Implement a Windows Explorer context menu option: `"Edit with I Love Notepad"`. This adds a right-click entry for all files, allowing instant editing in the app without forcing default overrides.

### 4. NSIS Context Menu Registry Scripting
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
- **IPC Paths:** Inspected `main.js`, `preload.js`, and `App.tsx`. Verified that the IPC listener channels are fully wired up.
- **Recovery Path:** Verified that sanitizing documents inside `loadDocs()` will immediately break any infinite crash loop without removing the tab item itself, maintaining user context.
