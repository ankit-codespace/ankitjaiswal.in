# Skill: Analyze Desktop File Association and Shell Integration

This skill conducts a deep architectural audit of the Electron application package configuration, shell arguments passing mechanisms, Windows registry guidelines for registering file handlers, and file importing safety features.

## Analysis & Findings

### 1. File Launch Arguments & Single-Instance Mechanics
- **Startup Launch:** When a user double-clicks an associated file, Windows launches the application executable with the target file path passed as a command-line argument: `app.exe "C:\path\to\file.txt"`.
- **First Instance Handling:** `src/main/main.js` correctly parses `process.argv` on startup using `getFilePathFromArgs(process.argv)`. If a file is matched, it triggers `openFileInWindow()` which reads the file content and sends it to the renderer via the `'open-file-channel'` IPC channel once `did-finish-load` fires.
- **Second Instance Handling:** If the app is already running, a new instance is launched but immediately exits because of `app.requestSingleInstanceLock()`. It passes its command-line arguments to the primary instance via the `second-instance` event. The primary instance parses these arguments, reads the file, and sends it to the renderer via IPC.

### 2. File Sizing and Binary Content Safety Checks
- **The Issue:** PDF is a compiled vector layout format, not a editable plain text format. Opening non-text binary files (like PDFs, EXEs, images) or very large text files (> 1.5MB) causes the Tiptap/ProseMirror rendering parser in the renderer thread to freeze. The blocked main thread triggers an "Application Unresponsive" crash dialog. Even worse, because this document is saved as the active note in localStorage, the application gets locked in an infinite crash/black-screen loop upon restart.
- **Top 1% SaaS Solution:**
  Instead of presenting crude system error dialog boxes from the main process, we route file safety states to the renderer so we can render an **Interactive Guidance Modal** matching the premium visual design of the app:
  - **Early Verification (Main Process):**
    Intercept unsupported files in `main.js` (both inside `openFileInWindow` and the `native-open-file` dialog handler). Check size (> 1.5MB) and inspect the first 1024 bytes for null bytes (`\x00`) or `%PDF` header. If unsupported, return a payload carrying `{ error: "unsupported", name: filename, reason: "pdf" | "large" | "binary" }` instead of raw file text content.
  - **Educational Guidance Modal (Renderer Process):**
    If the renderer receives an `"unsupported"` error payload, set the React state `unsupportedFile` carrying the file details. Show a beautiful custom modal matching the styling tokens of the app's standard dialogs.
    - If the reason is `"pdf"`, explain that PDF is a read-only export format, point out that their original note is still open in their tabs list, and recommend using Markdown (`.md`) or HTML (`.html`) for editing files offline.
    - If the reason is `"large"`, explain the 1.5MB size constraint to prevent editor lag.
    - If the reason is `"binary"`, explain that only plain text formats are editable.
  - **Fail-Safe Recovery (Renderer Process):**
    Implement a `sanitizeDocContent(doc)` function inside `loadDocs()` in both `App.tsx` and `notepad.tsx`. If a stored document starts with `%PDF`, contains null bytes, or is > 1.5MB in length, replace its content with an `[Error: Unsupported Format]` page to resolve startup crash loops automatically.

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
