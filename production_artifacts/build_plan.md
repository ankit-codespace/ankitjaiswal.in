# Build Plan: Desktop File Association & Context Menu Hardening

## Phase 1: Builder File Association Configuration
- Add file formats (`.txt`, `.md`, `.html`, `.htm`, `.json`) under `"build.fileAssociations"` inside `notepad-win/package.json`.

## Phase 2: Main Process File Size and Binary Filtering
- Open `notepad-win/src/main/main.js`.
- Add size limit check (> 1.5MB / 1,572,864 bytes) and null-byte checks (first 1024 bytes) in `openFileInWindow`.
- Intercept the `native-open-file` handler and perform the same checks.
- If checks fail, show a native message box using `dialog.showErrorBox` and prevent file loading.

## Phase 3: LocalStorage Sanitization & Recovery
- Open `notepad-win/src/renderer/src/App.tsx` and `artifacts/website/src/pages/tools/notepad.tsx`.
- Declare `sanitizeDocContent` to catch corrupt binary contents or files > 1.5MB length.
- Map and sanitize documents inside `loadDocs()` on application boot.

## Phase 4: NSIS Right-Click Context Menu Scripting
- Create `notepad-win/build/installer.nsh` and add custom install/uninstall macros to write/delete the `"Edit with I Love Notepad"` registry key inside `HKCU\Software\Classes\*\shell`.

## Phase 5: Dev Verification & Packaging
- Run renderer and electron build scripts inside `notepad-win` to compile and output installers.
- Commit all changes and push to GitHub.
